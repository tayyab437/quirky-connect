import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, MessageSquare, Plus, Send, Sparkles, Hash, Lightbulb, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

type AgentType = "content" | "hashtag" | "strategy";

interface Chat {
  id: string;
  agent_type: string;
  title: string | null;
  created_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const agents: { type: AgentType; label: string; icon: typeof Bot; description: string; gradient: string }[] = [
  { type: "content", label: "Content Creator", icon: Sparkles, description: "Generate captions & post ideas", gradient: "gradient-primary" },
  { type: "hashtag", label: "Hashtag Expert", icon: Hash, description: "Find trending hashtags", gradient: "gradient-accent" },
  { type: "strategy", label: "Strategy Advisor", icon: Lightbulb, description: "Get content strategy tips", gradient: "gradient-warm" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const AgentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !selectedAgent) return;
    supabase
      .from("ai_chats")
      .select("*")
      .eq("user_id", user.id)
      .eq("agent_type", selectedAgent)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setChats(data ?? []));
  }, [user, selectedAgent]);

  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    supabase
      .from("ai_messages")
      .select("*")
      .eq("chat_id", activeChat)
      .order("created_at")
      .then(({ data }) => setMessages(data ?? []));
  }, [activeChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = async () => {
    if (!user || !selectedAgent) return;
    const { data, error } = await supabase
      .from("ai_chats")
      .insert({ user_id: user.id, agent_type: selectedAgent, title: "New Chat" })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setChats((prev) => [data, ...prev]);
    setActiveChat(data.id);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || !user) return;
    const userMsg = input.trim();
    setInput("");

    // Optimistic user message
    const tempId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: userMsg, created_at: new Date().toISOString() }]);

    // Save user message
    await supabase.from("ai_messages").insert({ chat_id: activeChat, role: "user", content: userMsg });

    // Update chat title if first message
    if (messages.length === 0) {
      await supabase.from("ai_chats").update({ title: userMsg.slice(0, 50) }).eq("id", activeChat);
    }

    setIsLoading(true);

    try {
      const allMessages = [...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })), { role: "user" as const, content: userMsg }];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, agentType: selectedAgent }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to get AI response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";
      const assistantId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.id === assistantId) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { id: assistantId, role: "assistant", content: assistantContent, created_at: new Date().toISOString() }];
              });
            }
          } catch {}
        }
      }

      // Save assistant message
      if (assistantContent) {
        await supabase.from("ai_messages").insert({ chat_id: activeChat, role: "assistant", content: assistantContent });
      }
    } catch (error: any) {
      toast({ title: "AI Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Agent selection view
  if (!selectedAgent) {
    return (
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">AI Agents</h1>
        <p className="text-muted-foreground text-sm mb-6">Choose an agent to start creating</p>
        <div className="space-y-3">
          {agents.map((agent, i) => (
            <motion.button
              key={agent.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedAgent(agent.type)}
              className="w-full flex items-center gap-4 bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow text-left"
            >
              <div className={`w-12 h-12 rounded-xl ${agent.gradient} flex items-center justify-center`}>
                <agent.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{agent.label}</p>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // Chat list view (no active chat)
  if (!activeChat) {
    const agentInfo = agents.find((a) => a.type === selectedAgent)!;
    return (
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
        <button onClick={() => setSelectedAgent(null)} className="flex items-center gap-1 text-muted-foreground text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-heading font-bold text-foreground">{agentInfo.label}</h1>
          <Button size="sm" className="gradient-primary text-primary-foreground gap-1" onClick={startNewChat}>
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        </div>
        {chats.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No conversations yet. Start one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className="w-full bg-card rounded-xl p-4 shadow-card text-left hover:shadow-elevated transition-shadow"
              >
                <p className="font-medium text-foreground text-sm truncate">{chat.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(chat.created_at).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-lg mx-auto">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <button onClick={() => setActiveChat(null)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Bot className="w-5 h-5 text-primary" />
        <span className="font-medium text-foreground text-sm">{agents.find((a) => a.type === selectedAgent)?.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "gradient-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-secondary-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse-soft" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse-soft" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="gradient-primary text-primary-foreground" disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AgentsPage;
