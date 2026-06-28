"use client";

import { useEffect, useState, useRef, type ReactNode, type SyntheticEvent } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Bot,
  User,
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ChatResponse {
  reply: string;
  messageId: string;
  suggestions: string[];
}

export default function AiChatPage(): ReactNode {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchConversations(): Promise<void> {
      try {
        const res = await api.get<Conversation[]>("/ai/conversations");
        if (res.data) setConversations(res.data);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
    }
    void fetchConversations();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async (id: string): Promise<void> => {
    try {
      setActiveId(id);
      const res = await api.get<{ messages: Message[] }>(`/ai/conversations/${id}`);
      if (res.data?.messages) setMessages(res.data.messages);
    } catch {
      // Silently handle failed load
    }
  };

  const newConversation = async (): Promise<void> => {
    try {
      const res = await api.post<Conversation>("/ai/conversations");
      const conv = res.data;
      if (conv) {
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        setMessages([]);
      }
    } catch {
      // Silently handle
    }
  };

  const deleteConversation = async (id: string): Promise<void> => {
    await api.delete(`/ai/conversations/${id}`);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const handleSend = async (e?: SyntheticEvent): Promise<void> => {
    e?.preventDefault();
    if (!input.trim() || !activeId || sending) return;

    const userMsg = input.trim();
    setInput("");
    setSending(true);

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userMsg, createdAt: new Date().toISOString() }]);

    try {
      const res = await api.post<ChatResponse>("/ai/chat", { conversationId: activeId, message: userMsg });
      const data = res.data;
      if (data) {
        setMessages((prev) => [...prev, { id: data.messageId, role: "assistant", content: data.reply, createdAt: new Date().toISOString() }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, something went wrong. Please try again.", createdAt: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <AiSkeleton />;

  return (
    <div className="flex gap-6" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Sidebar */}
      <div className="hidden w-64 shrink-0 flex-col gap-3 md:flex">
        <Button variant="primary" size="sm" fullWidth onClick={(): void => { void newConversation(); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={(): void => { void loadConversation(conv.id); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                activeId === conv.id
                  ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1 flex-1">{conv.title}</span>
              <button
                onClick={(e): void => { e.stopPropagation(); void deleteConversation(conv.id); }}
                className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-danger-500"
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              title="Ask El-bannawy AI"
              description="Start a new conversation to get help with your English learning."
              icon={<Sparkles className="h-16 w-16" />}
              actionLabel="Start New Chat"
              onAction={(): void => { void newConversation(); }}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto pb-4">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-neutral-500">Start the conversation by typing a message below.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary-500 text-white"
                      : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10">
                      <User className="h-4 w-4 text-primary-500" />
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={(e): void => { void handleSend(e); }} className="flex gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
              <input
                type="text"
                value={input}
                onChange={(e): void => { setInput(e.target.value); }}
                placeholder="Ask about grammar, vocabulary, or get homework help..."
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                disabled={sending}
              />
              <Button type="submit" variant="primary" size="icon" disabled={!input.trim() || sending} loading={sending}>
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function AiSkeleton(): ReactNode {
  return (
    <div className="flex gap-6">
      <div className="hidden w-64 shrink-0 space-y-2 md:block">
        <Skeleton className="h-10 w-full rounded-xl" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-2/3" : "w-3/4 self-end"}`} />
        ))}
      </div>
    </div>
  );
}
