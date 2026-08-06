"use client";

import { useEffect, useState, useRef, useCallback, type ReactNode, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  ArrowLeft,
  Coins,
  BadgeInfo,
  Star,
  RefreshCw,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  isFavorite?: boolean;
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  isError?: boolean;
  createdAt: string;
  sources?: { title: string; type: string; score: number }[];
  isStreaming?: boolean;
  feedback?: { rating: number | null };
  creditsExhausted?: boolean;
  walletBalance?: number;
}

interface ChatResponse {
  reply: string;
  messageId: string;
  suggestions: string[];
  creditsConsumed?: number;
  credits?: {
    allowed: boolean;
    remaining: number;
    plan: string;
  };
  sourcesUsed?: {
    title: string;
    type: string;
    score: number;
  }[];
  creditsExhausted?: boolean;
  walletBalance?: number;
}

interface CreditsInfo {
  allowed: boolean;
  remaining: number;
  plan: string;
  total?: number;
}

interface UserProfile {
  fullName?: string;
  englishName?: string;
  roleProfile?: {
    grade?: { name?: string } | null;
    stage?: { name?: string } | null;
    currentTerm?: { name?: string } | null;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isServerMessageId(id: string): boolean {
  return UUID_REGEX.test(id);
}

function extractFirstName(fullName?: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[0] : "";
}

/** Lightweight markdown renderer (headings, bold, italic, code, lists, links). */
function renderInline(text: string): ReactNode {
  const elements: ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      elements.push(
        <code key={key++} className="rounded bg-neutral-200/70 px-1 py-0.5 font-mono text-xs dark:bg-neutral-700/70">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      elements.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("_") && token.endsWith("_")) {
      elements.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      elements.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        elements.push(
          <a key={key++} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-primary-500 underline">
            {linkMatch[1]}
          </a>,
        );
      } else {
        elements.push(token);
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) elements.push(text.slice(lastIndex));
  return elements;
}

function MarkdownContent({ content }: { content: string }): ReactNode {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={key++} className="overflow-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100 dark:bg-neutral-950">
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = `h${String(level)}` as "h1" | "h2" | "h3" | "h4";
      blocks.push(
        <Tag key={key++} className="mt-2 font-semibold text-neutral-900 dark:text-neutral-100">
          {renderInline(headingMatch[2])}
        </Tag>,
      );
      i++;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="mt-1 list-inside list-disc space-y-0.5">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="mt-1 list-inside list-decimal space-y-0.5">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    blocks.push(<p key={key++}>{renderInline(line)}</p>);
    i++;
  }

  return <div className="space-y-1 whitespace-pre-wrap">{blocks}</div>;
}

export default function AiChatPage(): ReactNode {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMobileConv, setShowMobileConv] = useState(false);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<{ messageId: string; rating: number } | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null);
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [buyAmount, setBuyAmount] = useState(5);
  const [buyError, setBuyError] = useState("");
  const [buySuccess, setBuySuccess] = useState(false);
  const [buying, setBuying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const studentFirstName = extractFirstName(userProfile?.fullName ?? userProfile?.englishName);
  const gradeName = userProfile?.roleProfile?.grade?.name ?? userProfile?.roleProfile?.stage?.name;
  const termName = userProfile?.roleProfile?.currentTerm?.name;
  const greetingTitle = studentFirstName ? `أهلاً يا ${studentFirstName}! 👋` : "اسأل البنا AI";

  useEffect(() => {
    async function fetchInitial(): Promise<void> {
      const [convRes, creditsRes] = await Promise.allSettled([
        api.get<Conversation[]>("/ai/conversations"),
        api.get<CreditsInfo>("/ai-settings/credits/check"),
      ]);
      if (convRes.status === "fulfilled" && convRes.value.data) {
        setConversations(convRes.value.data);
      } else if (convRes.status === "rejected") {
        console.warn("[AI] Failed to fetch conversations:", convRes.reason);
      }
      if (creditsRes.status === "fulfilled" && creditsRes.value.data) {
        setCredits(creditsRes.value.data);
      } else if (creditsRes.status === "rejected") {
        console.warn("[AI] Failed to fetch credits:", creditsRes.reason);
      }
      setLoading(false);
    }
    void fetchInitial();

    async function fetchProfile(): Promise<void> {
      try {
        const res = await api.get<UserProfile>("/profile");
        if (res.data) setUserProfile(res.data);
      } catch {
        // Silently handle
      }
    }
    void fetchProfile();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const refreshConversations = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get<Conversation[]>("/ai/conversations");
      if (res.data) setConversations(res.data);
    } catch {
      // Silently handle
    }
  }, []);

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

  const toggleFavorite = async (id: string): Promise<void> => {
    try {
      const res = await api.patch<{ id: string; isFavorite: boolean }>(`/ai/conversations/${id}/favorite`);
      if (res.data) {
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, isFavorite: res.data?.isFavorite ?? c.isFavorite } : c)));
      }
    } catch {
      // Silently handle
    }
  };

  const copyMessage = async (id: string, content: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => { setCopiedId(null); }, 1500);
    } catch {
      // Silently handle
    }
  };

  const submitFeedback = async (messageId: string, rating: number): Promise<void> => {
    if (!isServerMessageId(messageId)) return;
    try {
      await api.post(`/ai/messages/${messageId}/feedback`, { rating });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: { rating } } : m)));
      setFeedbackTarget(null);
      setFeedbackComment("");
    } catch {
      // Silently handle
    }
  };

  const submitFeedbackWithComment = async (): Promise<void> => {
    if (!feedbackTarget) return;
    if (!isServerMessageId(feedbackTarget.messageId)) return;
    try {
      await api.post(`/ai/messages/${feedbackTarget.messageId}/feedback`, {
        rating: feedbackTarget.rating,
        comment: feedbackComment.trim() || undefined,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === feedbackTarget.messageId ? { ...m, feedback: { rating: feedbackTarget.rating } } : m)),
      );
      setFeedbackTarget(null);
      setFeedbackComment("");
    } catch {
      // Silently handle
    }
  };

  const regenerateLast = async (): Promise<void> => {
    if (!activeId || sending) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant || !isServerMessageId(lastAssistant.id)) return;

    setSending(true);
    setMessages((prev) => prev.map((m) => (m.id === lastAssistant.id ? { ...m, content: "", isStreaming: true } : m)));

    try {
      const res = await api.post<ChatResponse>("/ai/regenerate", { conversationId: activeId, messageId: lastAssistant.id });
      const data = res.data;
      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === lastAssistant.id ? { ...m, content: data.reply, isStreaming: false, isError: false } : m)),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === lastAssistant.id
            ? { ...m, content: "عذراً، حدث خطأ أثناء إعادة المحاولة.", isStreaming: false, isError: true }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const streamSend = async (userMsg: string): Promise<void> => {
    if (!activeId) return;
    setSending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ conversationId: activeId, message: userMsg }),
      });

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => "");
        let message = "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.";
        try {
          const parsed = JSON.parse(body) as { message?: string };
          if (parsed.message) message = parsed.message;
        } catch {
          // Keep default
        }
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: message, isError: true, createdAt: new Date().toISOString() },
        ]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantId: string | null = null;
      let full = "";
      let suggestions: string[] = [];
      let sources: { title: string; type: string; score: number }[] = [];
      let creditsExhausted = false;
      let walletBalance: number | undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: "streaming-" + Date.now().toString(),
          role: "assistant",
          content: "",
          isStreaming: true,
          createdAt: new Date().toISOString(),
        },
      ]);

      const appendDelta = (delta: string): void => {
        full += delta;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last.role === "assistant" && last.isStreaming) {
            return [...prev.slice(0, -1), { ...last, content: full }];
          }
          return prev;
        });
      };

      let streamEnded = false;
      while (!streamEnded) {
        const { done, value } = await reader.read();
        if (done) {
          streamEnded = true;
          continue;
        }
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const dataLine = event.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            if (parsed.messageId && !assistantId) assistantId = parsed.messageId as string;
            if (Array.isArray(parsed.suggestions)) suggestions = parsed.suggestions as string[];
            if (Array.isArray(parsed.sourcesUsed)) sources = parsed.sourcesUsed as { title: string; type: string; score: number }[];
            if (typeof parsed.creditsExhausted === "boolean") creditsExhausted = parsed.creditsExhausted;
            if (typeof parsed.walletBalance === "number") walletBalance = parsed.walletBalance;
            if (typeof parsed.text === "string") appendDelta(parsed.text);
            if (parsed.full) full = parsed.full as string;
          } catch {
            // Ignore malformed payload
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant" && m.isStreaming
            ? {
                ...m,
                id: assistantId ?? m.id,
                content: full,
                isStreaming: false,
                isError: false,
                sources: sources.length > 0 ? sources : undefined,
                creditsExhausted,
                walletBalance,
              }
            : m,
        ),
      );

      if (suggestions.length > 0) {
        setSuggestions(suggestions);
      }

      void refreshConversations();
      void fetchCredits();
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.", isError: true, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  };

  const fetchCredits = async (): Promise<void> => {
    try {
      const res = await api.get<CreditsInfo>("/ai-settings/credits/check");
      if (res.data) setCredits(res.data);
    } catch {
      // Silently handle
    }
  };

  const buyCredits = async (): Promise<void> => {
    if (buying || buyAmount <= 0) return;
    setBuying(true);
    setBuyError("");
    setBuySuccess(false);
    try {
      const res = await api.post<{ creditsAdded: number; coinsSpent: number; walletBalance: number; credits: CreditsInfo }>(
        "/ai-settings/credits/buy",
        { amount: buyAmount },
      );
      if (res.data) {
        setBuySuccess(true);
        setTimeout(() => {
          setBuyCreditsOpen(false);
          setBuySuccess(false);
        }, 1400);
        void fetchCredits();
      }    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "فشل شراء الكريدت. حاول مرة أخرى.");
    } finally {
      setBuying(false);
    }
  };

  const handleSend = async (e?: SyntheticEvent): Promise<void> => {
    e?.preventDefault();
    if (!input.trim() || !activeId || sending) return;

    const userMsg = input.trim();
    setInput("");
    setSuggestions([]);

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userMsg, createdAt: new Date().toISOString() }]);

    if (navigator.onLine) {
      await streamSend(userMsg);
    } else {
      try {
        const res = await api.post<ChatResponse>("/ai/chat", { conversationId: activeId, message: userMsg });
        const data = res.data;
        if (data) {
          setMessages((prev) => [...prev, { id: data.messageId, role: "assistant", content: data.reply, createdAt: new Date().toISOString(), sources: data.sourcesUsed, creditsExhausted: data.creditsExhausted, walletBalance: data.walletBalance }]);
          if (data.credits) setCredits(data.credits);
          if (data.suggestions.length > 0) setSuggestions(data.suggestions);
        }
      } catch {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.", isError: true, createdAt: new Date().toISOString() }]);
      }
    }
  };

  const runSuggestions = (suggestion: string): void => {
    if (sending) return;
    setInput(suggestion);
    setSuggestions([]);
    const syntheticEvent = new Event("submit") as unknown as SyntheticEvent;
    setTimeout(() => { void handleSend(syntheticEvent); }, 50);
  };

  if (loading) return <AiSkeleton />;

  return (
    <div className="fixed inset-0 z-40 flex flex-col gap-4 overflow-hidden bg-white p-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] dark:bg-neutral-950 md:static md:z-auto md:flex md:gap-4 md:overflow-visible md:bg-transparent md:p-0 md:pt-0 md:pb-0 md:dark:bg-transparent">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={(): void => { router.push("/dashboard"); }}
            className="flex w-fit items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة للرئيسية
          </button>
          <button
            onClick={(): void => { setShowMobileConv(true); }}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:text-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 md:hidden"
            aria-label="المحادثات"
          >
            <MessageSquare className="h-4 w-4" />
            المحادثات
          </button>
        </div>
        {credits && (
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {credits.plan === "unlimited" ? "غير محدود" : credits.remaining}
            </span>
            {credits.total && credits.plan !== "unlimited" && (
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: credits.total > 0 ? `${((credits.remaining / credits.total) * 100).toString()}%` : "0%" }} />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 gap-6 md:min-h-[calc(100vh-180px)] md:flex-none">

        {/* Desktop Sidebar */}
        <div className="hidden w-64 shrink-0 flex-col gap-3 md:flex">
          <Button variant="primary" size="sm" fullWidth onClick={(): void => { void newConversation(); }}>
            <Plus className="mr-2 h-4 w-4" />
            محادثة جديدة
          </Button>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={(): void => { void loadConversation(conv.id); }}
                onKeyDown={(e): void => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void loadConversation(conv.id); } }}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                  activeId === conv.id
                    ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="line-clamp-1 flex-1">{conv.title}</span>
                <button
                  onClick={(e): void => { e.stopPropagation(); void toggleFavorite(conv.id); }}
                  className={`shrink-0 rounded p-0.5 ${conv.isFavorite ? "text-amber-500" : "text-neutral-400 hover:text-amber-500"}`}
                  aria-label="مفضلة"
                >
                  <Star className={`h-3 w-3 ${conv.isFavorite ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={(e): void => { e.stopPropagation(); void deleteConversation(conv.id); }}
                  className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-danger-500"
                  aria-label="حذف"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile conversation drawer */}
        {showMobileConv && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={(): void => { setShowMobileConv(false); }} />
            <div className="absolute inset-y-0 end-0 z-10 flex w-72 flex-col gap-3 bg-white p-4 shadow-2xl dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">المحادثات</h2>
                <button onClick={(): void => { setShowMobileConv(false); }} className="rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>
              <Button variant="primary" size="sm" fullWidth onClick={(): void => { setShowMobileConv(false); void newConversation(); }}>
                <Plus className="mr-2 h-4 w-4" />
                محادثة جديدة
              </Button>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    role="button"
                    tabIndex={0}
                    onClick={(): void => { setShowMobileConv(false); void loadConversation(conv.id); }}
                    onKeyDown={(e): void => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowMobileConv(false); void loadConversation(conv.id); } }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                      activeId === conv.id
                        ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
                        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-1 flex-1">{conv.title}</span>
                    <button
                      onClick={(e): void => { e.stopPropagation(); void toggleFavorite(conv.id); }}
                      className={`shrink-0 rounded p-0.5 ${conv.isFavorite ? "text-amber-500" : "text-neutral-400 hover:text-amber-500"}`}
                      aria-label="مفضلة"
                    >
                      <Star className={`h-3 w-3 ${conv.isFavorite ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={(e): void => { e.stopPropagation(); void deleteConversation(conv.id); }}
                      className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-danger-500"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex min-h-0 flex-1 flex-col">
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                title={greetingTitle}
                description={
                  studentFirstName
                    ? `أهلاً بيك يا ${studentFirstName}! اسألني عن أي حاجة في الإنجليزية وأنا جاهز أساعدك في تعلمها.`
                    : "ابدأ محادثة جديدة للحصول على مساعدة في تعلم الإنجليزية"
                }
                icon={<Sparkles className="h-16 w-16" />}
                actionLabel="ابدأ محادثة جديدة"
                onAction={(): void => { void newConversation(); }}
              />
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
                <div className="flex items-center gap-2 rounded-xl bg-primary-500/5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <BadgeInfo className="h-4 w-4 shrink-0 text-primary-500" />
                  <span>
                    {gradeName ? `${gradeName}${termName ? ` - ${termName}` : ""}` : (studentFirstName ? `أهلاً يا ${studentFirstName}! جاهز أساعدك في تعلم الإنجليزية` : "مرحباً بك في مساعد البنا AI")}
                  </span>
                </div>
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-neutral-500">ابدأ المحادثة بكتابة رسالة أدناه</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id}>
                    <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`rounded-2xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "max-w-[80%] bg-primary-500 text-white"
                          : msg.isError
                            ? "flex-1 bg-danger-500/10 text-danger-600 dark:text-danger-400"
                            : "flex-1 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      }`}>
                        {msg.isStreaming && msg.content === "" ? (
                          <div className="flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "0ms" }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "150ms" }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "300ms" }} />
                          </div>
                        ) : msg.creditsExhausted ? (
                          <div className="flex-1 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 text-center">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">
                              <Coins className="h-7 w-7 text-amber-500" />
                            </div>
                            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                              انتهت كريدتك المجانية
                            </h3>
                            <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
                              عشان تكمّل المحادثة، اشتري كريدت إضافية بعملاتك — كل كريدت بـ 1 كوين.
                            </p>
                            <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                              <Coins className="h-3.5 w-3.5" />
                              رصيدك الحالي: {typeof msg.walletBalance === "number" ? msg.walletBalance : 0} كوين
                            </div>
                            <button
                              onClick={(): void => {
                                setBuyAmount(5);
                                setBuyError("");
                                setBuySuccess(false);
                                setBuyCreditsOpen(true);
                              }}
                              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                            >
                              <Coins className="h-4 w-4" />
                              اشتري كريدت
                            </button>
                          </div>
                        ) : (
                          <MarkdownContent content={msg.content} />
                        )}
                      </div>
                    </div>

                    {msg.role === "assistant" && !msg.isStreaming && msg.content !== "" && isServerMessageId(msg.id) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={(): void => { void copyMessage(msg.id, msg.content); }}
                          className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 hover:text-primary-500 dark:bg-neutral-800 dark:text-neutral-400"
                          title="نسخ"
                        >
                          {copiedId === msg.id ? <Check className="h-3 w-3 text-success-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={(): void => { void submitFeedback(msg.id, 1); }}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            msg.feedback?.rating === 1
                              ? "bg-success-500/10 text-success-600 dark:text-success-400"
                              : "bg-neutral-100 text-neutral-500 hover:text-success-500 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                          title="إعجاب"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(): void => { setFeedbackTarget({ messageId: msg.id, rating: -1 }); }}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            msg.feedback?.rating === -1
                              ? "bg-danger-500/10 text-danger-600 dark:text-danger-400"
                              : "bg-neutral-100 text-neutral-500 hover:text-danger-500 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                          title="لم يعجبني"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {msg.role === "assistant" && !msg.isStreaming && msg.id !== pendingAssistantId && isServerMessageId(msg.id) && msg.content !== "" && (
                      <div className="mt-1">
                        <button
                          onClick={(): void => { setPendingAssistantId(msg.id); void regenerateLast(); }}
                          disabled={sending}
                          className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 hover:text-primary-500 dark:bg-neutral-800 dark:text-neutral-400"
                          title="إعادة توليد الإجابة"
                        >
                          <RefreshCw className="h-3 w-3" />
                          إعادة
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {sending && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-3">
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

              {suggestions.length > 0 && !sending && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={(): void => { runSuggestions(suggestion); }}
                      className="rounded-full border border-primary-500/30 bg-primary-500/5 px-3 py-1.5 text-xs text-primary-600 transition-colors hover:bg-primary-500/10 dark:text-primary-400"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={(e): void => { void handleSend(e); }} className="flex gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <input
                  type="text"
                  value={input}
                  onChange={(e): void => { setInput(e.target.value); }}
                  placeholder="اسأل عن القواعد أو المفردات أو احصل على مساعدة في الواجبات..."
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

      <Dialog open={feedbackTarget !== null} onClose={(): void => { setFeedbackTarget(null); setFeedbackComment(""); }} title="ملاحظات حول الإجابة">
        <DialogContent className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            شكراً لتقييمك! يمكنك إضافة ملاحظة لمساعدتنا في تحسين الإجابات.
          </p>
          <Textarea
            label="ملاحظتك (اختياري)"
            value={feedbackComment}
            onChange={(e): void => { setFeedbackComment(e.target.value); }}
            placeholder="ما الذي لم يعجبك في الإجابة؟"
            className="min-h-[100px]"
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={(): void => { setFeedbackTarget(null); setFeedbackComment(""); }}>إلغاء</Button>
          <Button onClick={(): void => { void submitFeedbackWithComment(); }}>إرسال</Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={buyCreditsOpen}
        onClose={(): void => {
          setBuyCreditsOpen(false);
          setBuyError("");
          setBuySuccess(false);
        }}
        title="اشتري كريدت إضافية"
      >
        <DialogContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-3">
            <Coins className="h-6 w-6 shrink-0 text-amber-500" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              كل كريدت بيعادل <span className="font-bold text-neutral-900 dark:text-neutral-100">1 كوين</span> من محفظتك.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">عدد الكريدت</label>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20, 50].map((amount) => (
                <button
                  key={amount}
                  onClick={(): void => { setBuyAmount(amount); setBuyError(""); setBuySuccess(false); }}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-center transition-all ${
                    buyAmount === amount
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-600 dark:hover:border-neutral-500"
                  }`}
                >
                  <span className="block text-sm font-bold">{amount}</span>
                  <span className="block text-[10px] text-neutral-400">= {amount} كوين</span>
                </button>
              ))}
            </div>
          </div>

          {buyError && <p className="text-sm text-danger-500">{buyError}</p>}
          {buySuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-success-500/10 p-3 text-sm text-success-600 dark:text-success-400">
              <Check className="h-5 w-5" />
              تم شراء {buyAmount} كريدت بنجاح! تقدر تكمل المحادثة الآن.
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">التكلفة من المحفظة</span>
            <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
              <Coins className="h-4 w-4" />
              {buyAmount} كوين
            </span>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={(): void => {
              setBuyCreditsOpen(false);
              setBuyError("");
              setBuySuccess(false);
            }}
          >
            إلغاء
          </Button>
          <Button variant="primary" loading={buying} onClick={(): void => { void buyCredits(); }}>
            <Coins className="mr-1 h-4 w-4" />
            {buySuccess ? "تم!" : "اشترِ الآن"}
          </Button>
        </DialogFooter>
      </Dialog>
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
