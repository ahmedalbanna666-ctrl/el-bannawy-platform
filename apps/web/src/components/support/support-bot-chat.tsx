"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bot, Send, User, Copy, Check, Sparkles, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

export interface SupportBotMessage {
  readonly id: number;
  readonly role: "student" | "bot";
  readonly text: string;
  readonly time: string;
}

interface SupportBotChatProps {
  readonly limit?: number;
}

interface BotReply {
  readonly reply?: string;
  readonly remaining?: number;
}

const DEFAULT_LIMIT = 5;
const LIMIT_MESSAGE = "وصلت للحد الأقصى من الرسائل. حاول لاحقاً أو أرسل شكوى وسيرد عليك فريقنا.";
const ERROR_MESSAGE = "تعذر الاتصال بالمساعد الآن. حاول مرة أخرى أو أرسل شكوى.";

const QUICK_PROMPTS = [
  "ما هي مفردات الوحدة الحالية؟",
  "كيف أحل واجب الدرس؟",
  "ما هو تقدمي في المنهج؟",
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message, onCopy }: { message: SupportBotMessage; onCopy: (text: string) => void }): ReactNode {
  const [copied, setCopied] = useState(false);
  const isStudent = message.role === "student";

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(message.text);
    onCopy(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isStudent ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isStudent ? "bg-primary-500 text-white" : "bg-gradient-to-br from-violet-500 to-indigo-500 text-white"
        }`}
      >
        {isStudent ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex max-w-[75%] flex-col gap-1 ${isStudent ? "items-end" : "items-start"}`}>
        <div
          className={`group relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            isStudent
              ? "rounded-br-sm bg-primary-500 text-white"
              : "rounded-bl-sm border border-neutral-200 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {!isStudent && (
            <button
              type="button"
              onClick={handleCopy}
              className="absolute -bottom-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
              aria-label="نسخ"
            >
              {copied ? <Check className="h-3 w-3 text-success-500" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
        <span className="px-1 text-xs text-neutral-400">{message.time}</span>
      </div>
    </div>
  );
}

export function SupportBotChat({ limit = DEFAULT_LIMIT }: SupportBotChatProps): ReactNode {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<readonly SupportBotMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState(limit);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const safeRemaining = Math.min(limit, Math.max(0, remaining));
  const used = limit - safeRemaining;
  const limitReached = safeRemaining <= 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const pushMessage = (role: SupportBotMessage["role"], text: string): void => {
    idRef.current += 1;
    setMessages((prev) => [...prev, { id: idRef.current, role, text, time: formatTime(new Date()) }]);
  };

  const send = async (textOverride?: string): Promise<void> => {
    const text = (textOverride ?? input).trim();
    if (!text || sending || limitReached) return;
    pushMessage("student", text);
    setInput("");
    setSending(true);
    try {
      const res = await api.post<BotReply>("/support-bot/chat", { message: text });
      const data = res.data ?? {};
      pushMessage("bot", data.reply?.trim() ? data.reply : "تم استلام رسالتك.");
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch (err) {
      pushMessage("bot", err instanceof Error && err.message ? err.message : ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900 md:h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-primary-500/5 px-4 py-3 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success-500 dark:border-neutral-900" />
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-neutral-100">
              المساعد الذكي
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            </h3>
            <p className="flex items-center gap-1 text-xs text-success-600 dark:text-success-400">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              متصل الآن
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={limitReached ? "danger" : "primary"} data-testid="bot-counter" className="gap-1">
            <Clock className="h-3 w-3" />
            {used}/{limit}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        data-testid="bot-messages"
        className="flex flex-1 flex-col gap-4 overflow-y-auto bg-neutral-50/50 p-4 dark:bg-neutral-900/50"
      >
        {messages.length === 0 && !sending && (
          <div className="m-auto flex max-w-sm flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg">
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">مرحباً {user?.fullName?.split(" ")[0] ?? "بك"}! 👋</h4>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                أنا مساعدك الذكي، أسألني عن دروسك، واجباتك، أو أي استفسار وسأجيبك فوراً
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={(): void => { void send(prompt); }}
                  disabled={limitReached}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-right text-sm text-neutral-700 transition-colors hover:border-primary-500/40 hover:bg-primary-500/5 hover:text-primary-600 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onCopy={() => {}} />
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500 [animation-delay:300ms]" />
              </span>
              <span className="text-xs text-neutral-500">يكتب الآن...</span>
            </div>
          </div>
        )}
      </div>

      {/* Limit warning */}
      {limitReached && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-warning-500/10 px-4 py-3 text-sm text-warning-700 dark:text-warning-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {LIMIT_MESSAGE}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              data-testid="chat-input"
              value={input}
              disabled={sending || limitReached}
              onChange={(e): void => { setInput(e.target.value); }}
              onKeyDown={(e): void => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={limitReached ? "انتهى الحد المسموح" : "اكتب سؤالك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"}
              rows={1}
              className="max-h-24 min-h-[44px] w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              style={{ height: "auto" }}
              onInput={(e): void => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 96)}px`;
              }}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            data-testid="chat-send"
            disabled={!input.trim() || sending || limitReached}
            onClick={(): void => { void send(); }}
            aria-label="إرسال"
            className="h-11 w-11 shrink-0 rounded-xl p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-neutral-400">
          المساعد يجيب حسب محتوى دروسك فقط • <span className="text-neutral-500">{remaining} رسائل متبقية</span>
        </p>
      </div>
    </div>
  );
}
