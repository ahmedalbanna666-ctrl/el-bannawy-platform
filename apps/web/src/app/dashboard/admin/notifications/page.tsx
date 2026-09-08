"use client";

import { useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { normalizeEgyptMobile } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bell, BellRing, Smartphone, CheckCircle2, XCircle, Save,
  Send, RefreshCw, Settings, MessageSquare, RotateCcw,
  Wifi, WifiOff,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface NotificationConfig {
  id: string;
  key: string;
  label: string;
  description: string | null;
  channel: string;
  isEnabled: boolean;
}

interface WhatsAppConfigData {
  provider: string;
  phoneNumber: string | null;
  isEnabled: boolean;
  apiUrl: string | null;
  hasAccountSid: boolean;
  hasAuthToken: boolean;
  hasApiKey: boolean;
}

interface WhatsAppMessage {
  id: string;
  to: string;
  senderPhone: string | null;
  message: string;
  status: string;
  error: string | null;
  createdAt: string;
}

interface WaGrade {
  readonly id: string;
  readonly name: string;
}

interface WaStage {
  readonly id: string;
  readonly name: string;
  readonly grades: WaGrade[];
}

interface WaBulkStudent {
  readonly id: string;
  readonly fullName: string;
  readonly mobileNumber: string | null;
  readonly parentMobile: string | null;
}

interface WaSender {
  readonly id: string;
  readonly gradeId: string;
  readonly gradeName: string | null;
  readonly label: string;
  readonly phoneNumber: string;
  readonly isEnabled: boolean;
  readonly apiUrl: string | null;
  readonly hasApiKey: boolean;
}

const QUICK_JOBS = [
  {
    key: "lesson",
    label: "تذكير بحصة منشورة",
    title: "حصة جديدة منشورة",
    message: "تم نشر حصة جديدة: [اسم الحصة] — شاهدها الآن من صفحة الدروس",
    audience: "grade",
    recipient: "student",
    mode: "auto",
  },
  {
    key: "live",
    label: "تذكير بحصة أونلاين",
    title: "حصة مباشرة",
    message: "تذكير: حصة مباشرة [المادة / الموعد] — ادخل من صفحة البث المباشر في موعدك",
    audience: "grade",
    recipient: "student",
    mode: "auto",
  },
  {
    key: "report",
    label: "تقرير ولي الأمر",
    title: "تقرير مستوى الطالب",
    message: "تقرير مستوى الطالب [اسم الطالب] أصبح متاحًا — للاستفسار تواصل معنا",
    audience: "grade",
    recipient: "parent",
    mode: "manual",
  },
] as const;

// ── Page ──────────────────────────────────────────────────────────────

export default function AdminNotificationsPage(): ReactNode {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">إعدادات الإشعارات</h1>
        <p className="mt-1 text-sm text-neutral-500">التحكم الكامل في إشعارات المنصة ونظام واتس آب</p>
      </div>

      {/* ── القسم الأول: إشعارات المنصة ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
              <Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">إشعارات المنصة</h2>
              <p className="text-xs text-neutral-500">تفعيل وتعطيل أنواع الإشعارات المرسلة للمستخدمين</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PlatformNotificationsSection />
        </CardContent>
      </Card>

      {/* ── قسم إشعارات المتصفح (FCM) ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
              <BellRing className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">إشعارات المتصفح (FCM)</h2>
              <p className="text-xs text-neutral-500">إرسال تجريبي للتحقق من وصول الإشعارات الفورية لكل أجهزة المنصة</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PushNotificationsSection />
        </CardContent>
      </Card>

      {/* ── القسم الثاني: التحكم في واتس آب ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">التحكم في نظام واتس آب</h2>
              <p className="text-xs text-neutral-500">إعدادات الإرسال اليدوي والتلقائي للرسائل النصية</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <WhatsAppSection />
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// القسم الأول: إشعارات المنصة
// ═══════════════════════════════════════════════════════════════════════

function PlatformNotificationsSection(): ReactNode {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchConfigs = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<NotificationConfig[]>("/notifications/admin/config");
      if (res.data) setConfigs(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchConfigs(); }, [fetchConfigs]);

  const toggleConfig = async (key: string, isEnabled: boolean): Promise<void> => {
    setSaving(key);
    try {
      await api.patch(`/notifications/admin/config/${key}`, { isEnabled });
      void fetchConfigs();
    } catch { /* silent */ }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex flex-col gap-2">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>;
  if (error) return <ErrorState title="فشل تحميل الإعدادات" description={error} onRetry={(): void => { void fetchConfigs(); }} />;

  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {configs.map((cfg) => (
        <div key={cfg.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{cfg.label}</span>
              <Badge variant={cfg.isEnabled ? "primary" : "secondary"} className="text-[10px]">
                {cfg.isEnabled ? "مفعل" : "معطل"}
              </Badge>
            </div>
            {cfg.description && (
              <p className="mt-0.5 text-xs text-neutral-500">{cfg.description}</p>
            )}
            <p className="mt-0.5 text-[10px] text-neutral-400 font-mono">{cfg.channel}</p>
          </div>
          <button
            type="button"
            disabled={saving === cfg.key}
            onClick={(): void => { void toggleConfig(cfg.key, !cfg.isEnabled); }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              cfg.isEnabled ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"
            } ${saving === cfg.key ? "opacity-50" : ""}`}
            aria-label={cfg.isEnabled ? "تعطيل" : "تفعيل"}
          >
            <span className={`absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform ${
              cfg.isEnabled ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// قسم إشعارات المتصفح (FCM)
// ═══════════════════════════════════════════════════════════════════════

function PushNotificationsSection(): ReactNode {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const sendTest = async (): Promise<void> => {
    setSending(true);
    setResult(null);
    try {
      const res = await api.post<{ success: boolean; error?: string }>("/notifications/admin/push/test");
      setResult(res.data?.success ? "تم إرسال الإشعار التجريبي بنجاح" : `فشل: ${res.data?.error ?? "خطأ"}`);
    } catch (err) {
      setResult(`خطأ: ${err instanceof Error ? err.message : "فشل"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-neutral-500">
        يرسل إشعار FCM تجريبي إلى المتصفح المسجل لحسابك الحالي. تأكد أولاً من تفعيل إشعارات المتصفح من صفحة
        تفضيلات الإشعارات لاستقباله.
      </p>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="primary" onClick={(): void => { void sendTest(); }} disabled={sending}>
          {sending ? "جارٍ الإرسال..." : "إرسال إشعار تجريبي"}
        </Button>
        {result && (
          <p className={`text-sm ${result.includes("بنجاح") ? "text-emerald-600" : "text-red-500"}`}>
            {result}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── أرقام الواتساب المخصصة لكل صف ───────────────────────────────────────

function SendersCard(): ReactNode {
  const [senders, setSenders] = useState<WaSender[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { phone?: string; label?: string; enabled?: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testingGrade, setTestingGrade] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: stages } = useQuery<WaStage[]>({
    queryKey: ["wa-bulk-stages"],
    queryFn: async () => {
      const res = await api.get<WaStage[]>("/admin/stages");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
  const grades = useMemo(
    () => (stages ?? []).flatMap((s) => s.grades.map((g) => ({ ...g, stageName: s.name }))),
    [stages],
  );

  const fetchSenders = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get<WaSender[]>("/notifications/admin/whatsapp/senders");
      setSenders(res.data ?? []);
    } catch {
      setSenders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSenders();
  }, [fetchSenders]);

  const rowFor = (gradeId: string): { phone: string; label: string; enabled: boolean } => {
    const existing = senders.find((s) => s.gradeId === gradeId);
    const o = overrides[gradeId] ?? {};
    return {
      phone: o.phone ?? existing?.phoneNumber ?? "",
      label: o.label ?? existing?.label ?? "",
      enabled: o.enabled ?? existing?.isEnabled ?? true,
    };
  };

  const setDraft = (gradeId: string, patch: { phone?: string; label?: string; enabled?: boolean }): void => {
    setOverrides((prev) => ({ ...prev, [gradeId]: { ...prev[gradeId], ...patch } }));
  };

  const saveAll = async (): Promise<void> => {
    setSaving(true);
    setFeedback(null);
    try {
      const rows = grades.map((g) => {
        const r = rowFor(g.id);
        return { gradeId: g.id, phoneNumber: r.phone.trim(), label: r.label.trim(), isEnabled: r.enabled };
      });
      const res = await api.put<WaSender[]>("/notifications/admin/whatsapp/senders", { senders: rows });
      setSenders(res.data ?? []);
      setOverrides({});
      setFeedback("تم حفظ الأرقام بنجاح");
    } catch (err) {
      setFeedback(`خطأ: ${err instanceof Error ? err.message : "فشل الحفظ"}`);
    } finally {
      setSaving(false);
    }
  };

  const testSender = async (gradeId: string): Promise<void> => {
    if (!testTo.trim()) {
      setFeedback("أدخل رقم الاختبار أولًا");
      return;
    }
    setTestingGrade(gradeId);
    setFeedback(null);
    try {
      const res = await api.post<{ success: boolean; error?: string; senderPhone?: string | null }>(
        "/notifications/admin/whatsapp/test",
        { to: testTo.trim(), message: "رسالة اختبار رقم الإرسال", gradeId },
      );
      const d = res.data;
      setFeedback(d?.success ? `تم الإرسال عبر ${d.senderPhone ?? "الرقم"}` : `فشل: ${d?.error ?? "خطأ"}`);
    } catch (err) {
      setFeedback(`خطأ: ${err instanceof Error ? err.message : "فشل"}`);
    } finally {
      setTestingGrade(null);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-neutral-500" />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">أرقام الواتساب للصفوف</h3>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        خصص رقمًا مختلفًا لكل صف لتوزيع الإرسال وتقليل خطر الحظر. الصف بدون رقم يستخدم الرقم الافتراضي من إعدادات الاتصال.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex gap-3">
          <Input
            placeholder="رقم الاختبار (مثال: 201001234567)"
            value={testTo}
            onChange={(e): void => { setTestTo(e.target.value); }}
            className="flex-1"
          />
        </div>

        {loading ? (
          <p className="text-xs text-neutral-500">جاري التحميل...</p>
        ) : grades.length === 0 ? (
          <p className="text-xs text-neutral-500">لا توجد صفوف دراسية.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {grades.map((g) => {
              const r = rowFor(g.id);
              const saved = senders.some((s) => s.gradeId === g.id);
              return (
                <div key={g.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 dark:bg-neutral-900">
                  <div className="min-w-32 flex-1">
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-[10px] text-neutral-400">{g.stageName}{saved ? " · رقم مخصص" : ""}</p>
                  </div>
                  <Input
                    placeholder="+201..."
                    value={r.phone}
                    onChange={(e): void => { setDraft(g.id, { phone: e.target.value }); }}
                    className="w-40 dir-ltr"
                  />
                  <Input
                    placeholder="اسم مميز (اختياري)"
                    value={r.label}
                    onChange={(e): void => { setDraft(g.id, { label: e.target.value }); }}
                    className="w-36"
                  />
                  <label className="flex items-center gap-1 text-xs text-neutral-500">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e): void => { setDraft(g.id, { enabled: e.target.checked }); }}
                      className="rounded border-neutral-300"
                    />
                    مفعل
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(): void => { void testSender(g.id); }}
                    disabled={testingGrade === g.id || !testTo.trim()}
                  >
                    {testingGrade === g.id ? "..." : "اختبار"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button size="sm" variant="primary" onClick={(): void => { void saveAll(); }} disabled={saving}>
            <Save className="ml-1 h-4 w-4" />
            حفظ الأرقام
          </Button>
          {feedback && (
            <p className={`text-sm ${feedback.includes("تم") ? "text-emerald-600" : "text-red-500"}`}>{feedback}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── الإرسال الجماعي لصف كامل (تلقائي Twilio / يدوي مجاني) ───────────────

function BulkWhatsAppSection({ whatsappEnabled }: { whatsappEnabled: boolean }): ReactNode {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [title, setTitle] = useState("إعلان هام");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all" | "grade">("grade");
  const [recipient, setRecipient] = useState<"student" | "parent">("student");
  const [gradeId, setGradeId] = useState("");
  const [timing, setTiming] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: stages } = useQuery<WaStage[]>({
    queryKey: ["wa-bulk-stages"],
    queryFn: async () => {
      const res = await api.get<WaStage[]>("/admin/stages");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  const grades = useMemo(
    () => (stages ?? []).flatMap((s) => s.grades.map((g) => ({ ...g, stageName: s.name }))),
    [stages],
  );

  const needList = mode === "manual" || audience === "grade";
  const { data: listedStudents, isLoading: studentsLoading } = useQuery<WaBulkStudent[]>({
    queryKey: ["wa-bulk-students", audience, gradeId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "500" });
      if (audience === "grade" && gradeId) params.set("gradeId", gradeId);
      const res = await api.get<{ students: WaBulkStudent[] }>(`/admin/students?${params.toString()}`);
      return res.data?.students ?? [];
    },
    enabled: needList && (audience === "all" || gradeId.length > 0),
    staleTime: 30_000,
  });

  const effectiveRecipient = mode === "manual" ? recipient : "student";
  const numbers = useMemo(
    () =>
      (listedStudents ?? [])
        .map((s) => ({
          id: s.id,
          name: s.fullName,
          number: normalizeEgyptMobile((effectiveRecipient === "parent" ? s.parentMobile : s.mobileNumber) ?? ""),
        }))
        .filter((s) => s.number.length > 0),
    [listedStudents, effectiveRecipient],
  );
  const missingCount = (listedStudents ?? []).length - numbers.length;

  const waLink = (number: string): string => {
    const digits = number.replace(/^\+/, "");
    const text = message.trim();
    return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
  };

  const copyNumbers = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(numbers.map((n) => n.number).join("\n"));
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      setCopied(false);
    }
  };

  const sendBulk = async (): Promise<void> => {
    if (!message.trim()) {
      setResult("اكتب نص الرسالة أولًا");
      return;
    }
    if (audience === "grade" && !gradeId) {
      setResult("اختر الصف الدراسي أولًا");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const payload = {
        type: "teacher_announcement",
        title: title.trim() || "إعلان هام",
        message: message.trim(),
        channel: "WHATSAPP",
        targetType: audience === "grade" ? "grade" : "all_students",
        ...(audience === "grade" ? { targetId: gradeId } : {}),
      };
      if (timing === "scheduled") {
        if (!scheduledAt) {
          setResult("حدد تاريخ ووقت الإرسال");
          setSending(false);
          return;
        }
        const res = await api.post<{ scheduled: boolean; reason?: string }>("/notifications/schedule", {
          ...payload,
          scheduledAt: new Date(scheduledAt).toISOString(),
        });
        setResult(res.data?.scheduled ? "تمت جدولة الإرسال بنجاح" : `تعذرت الجدولة: ${res.data?.reason ?? "لا يوجد مستلمون"}`);
      } else {
        const res = await api.post<{ sent: number; whatsappSent: number; pushSent: number; skipped?: boolean; reason?: string }>(
          "/notifications/send",
          payload,
        );
        const d = res.data;
        if (!d) setResult("تعذر قراءة النتيجة");
        else if (d.skipped) setResult(`لا يوجد مستلمون (${d.reason ?? ""})`);
        else setResult(`تم الإرسال: واتساب ${String(d.whatsappSent)} — داخل المنصة ${String(d.sent)}`);
      }
    } catch (err) {
      setResult(`خطأ: ${err instanceof Error ? err.message : "فشل الإرسال"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-neutral-500" />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">إرسال جماعي لصف كامل</h3>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_JOBS.map((job) => (
          <Button
            key={job.key}
            size="sm"
            variant="outline"
            onClick={(): void => {
              setTitle(job.title);
              setMessage(job.message);
              setAudience(job.audience);
              setRecipient(job.recipient);
              setMode(job.mode);
              setResult(null);
            }}
          >
            {job.label}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant={mode === "auto" ? "primary" : "outline"} onClick={(): void => { setMode("auto"); setResult(null); }}>
          تلقائي (Twilio)
        </Button>
        <Button size="sm" variant={mode === "manual" ? "primary" : "outline"} onClick={(): void => { setMode("manual"); setResult(null); }}>
          يدوي مجاني (رقمي الخاص)
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <Input
          placeholder="العنوان (يظهر داخل المنصة)"
          value={title}
          onChange={(e): void => { setTitle(e.target.value); }}
        />
        <textarea
          className="w-full rounded-lg border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          rows={3}
          placeholder="نص الرسالة التي ستصل للطلاب..."
          value={message}
          onChange={(e): void => { setMessage(e.target.value); }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={audience === "all" ? "primary" : "outline"} onClick={(): void => { setAudience("all"); }}>
            كل الطلاب
          </Button>
          <Button size="sm" variant={audience === "grade" ? "primary" : "outline"} onClick={(): void => { setAudience("grade"); }}>
            صف محدد
          </Button>
          {audience === "grade" && (
            <select
              className="rounded-lg border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              value={gradeId}
              onChange={(e): void => { setGradeId(e.target.value); }}
            >
              <option value="">اختر الصف...</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.stageName} — {g.name}</option>
              ))}
            </select>
          )}
        </div>

        {mode === "auto" ? (
          <div className="flex flex-col gap-3">
            {!whatsappEnabled && (
              <p className="rounded-lg bg-amber-100 p-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                الواتساب غير مفعل — ستصل الرسالة داخل المنصة فقط. فعّله من إعدادات الاتصال بالأعلى للإرسال عبر واتساب.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={timing === "now" ? "primary" : "outline"} onClick={(): void => { setTiming("now"); }}>
                إرسال فوري
              </Button>
              <Button size="sm" variant={timing === "scheduled" ? "primary" : "outline"} onClick={(): void => { setTiming("scheduled"); }}>
                جدولة لوقت لاحق
              </Button>
              {timing === "scheduled" && (
                <input
                  type="datetime-local"
                  className="rounded-lg border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={scheduledAt}
                  onChange={(e): void => { setScheduledAt(e.target.value); }}
                />
              )}
            </div>
            {audience === "grade" && gradeId && (
              <p className="text-xs text-neutral-500">
                {studentsLoading ? "جاري عدّ الطلاب..." : `سيتم الإرسال إلى ${String(numbers.length)} رقم${missingCount > 0 ? ` (${String(missingCount)} بدون رقم مسجل)` : ""}`}
              </p>
            )}
            <div className="flex items-center gap-3">
              <Button size="sm" variant="primary" onClick={(): void => { void sendBulk(); }} disabled={sending}>
                {sending ? "جارٍ الإرسال..." : timing === "scheduled" ? "تأكيد الجدولة" : "إرسال للصف كامل"}
              </Button>
              {result && (
                <p className={`text-sm ${result.includes("تم") ? "text-emerald-600" : "text-red-500"}`}>{result}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-neutral-500">
              انسخ الأرقام وأضفها لقائمة Broadcast في واتساب أعمال من هاتفك برقمك الخاص (مجانًا)، أو راسل كل مستلم بزر المراسلة.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">إرسال إلى:</span>
              <Button size="sm" variant={recipient === "student" ? "primary" : "outline"} onClick={(): void => { setRecipient("student"); }}>
                الطالب
              </Button>
              <Button size="sm" variant={recipient === "parent" ? "primary" : "outline"} onClick={(): void => { setRecipient("parent"); }}>
                ولي الأمر
              </Button>
            </div>
            {audience === "grade" && !gradeId ? (
              <p className="text-xs text-neutral-500">اختر الصف لعرض الأرقام.</p>
            ) : studentsLoading ? (
              <p className="text-xs text-neutral-500">جاري تحميل الأرقام...</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={(): void => { void copyNumbers(); }} disabled={numbers.length === 0}>
                    {copied ? "تم النسخ ✓" : `نسخ الأرقام (${String(numbers.length)})`}
                  </Button>
                  {missingCount > 0 && (
                    <span className="text-xs text-amber-600">{missingCount} طالب بدون رقم مسجل</span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg bg-white dark:bg-neutral-900">
                  {numbers.map((s) => (
                    <div key={s.id} className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 last:border-0 dark:border-neutral-800">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-neutral-500 dir-ltr">{s.number}</p>
                      </div>
                      <a
                        href={waLink(s.number)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        مراسلة
                      </a>
                    </div>
                  ))}
                  {numbers.length === 0 && (
                    <p className="p-3 text-xs text-neutral-500">لا توجد أرقام مسجلة لهذا الاختيار.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// القسم الثاني: التحكم في نظام واتس آب
// ═══════════════════════════════════════════════════════════════════════

function CredentialBadge({ configured }: { configured: boolean }): ReactNode {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${configured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"}`}>
      {configured ? "مُدخل" : "غير مُدخل"}
    </span>
  );
}

function WhatsAppSection(): ReactNode {
  const [config, setConfig] = useState<WhatsAppConfigData | null>(null);
  const [logs, setLogs] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual send form
  const [manualPhone, setManualPhone] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  // Auto-send settings
  const [autoReminders, setAutoReminders] = useState({
    liveSession: true,
    recordedLesson: true,
    reportReady: false,
  });

  // Edit config
  const [editing, setEditing] = useState(false);
  const [editProvider, setEditProvider] = useState("twilio");
  const [editPhone, setEditPhone] = useState("");
  const [editApiUrl, setEditApiUrl] = useState("");
  const [editAccountSid, setEditAccountSid] = useState("");
  const [editAuthToken, setEditAuthToken] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editEnabled, setEditEnabled] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, logsRes] = await Promise.all([
        api.get<WhatsAppConfigData>("/notifications/admin/whatsapp"),
        api.get<WhatsAppMessage[]>("/notifications/admin/whatsapp/logs"),
      ]);
      if (configRes.data) {
        setConfig(configRes.data);
        setEditProvider(configRes.data.provider);
        setEditPhone(configRes.data.phoneNumber ?? "");
        setEditApiUrl(configRes.data.apiUrl ?? "");
        setEditEnabled(configRes.data.isEnabled);
      }
      if (logsRes.data) setLogs(logsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const saveConfig = async (): Promise<void> => {
    setSavingConfig(true);
    try {
      await api.patch("/notifications/admin/whatsapp", {
        provider: editProvider,
        phoneNumber: editPhone || null,
        apiUrl: editApiUrl || null,
        isEnabled: editEnabled,
        ...(editAccountSid.trim() ? { accountSid: editAccountSid.trim() } : {}),
        ...(editAuthToken.trim() ? { authToken: editAuthToken.trim() } : {}),
        ...(editApiKey.trim() ? { apiKey: editApiKey.trim() } : {}),
      });
      setEditAccountSid("");
      setEditAuthToken("");
      setEditApiKey("");
      setEditing(false);
      void fetchData();
    } catch { /* silent */ }
    finally { setSavingConfig(false); }
  };

  const sendManual = async (): Promise<void> => {
    if (!manualPhone) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await api.post<{ success: boolean; error?: string }>("/notifications/admin/whatsapp/test", {
        to: manualPhone,
        message: manualMessage || "رسالة من منصة البناوي",
      });
      setSendResult(res.data?.success ? "تم الإرسال بنجاح" : `فشل: ${res.data?.error ?? "خطأ"}`);
      if (res.data?.success) void fetchData();
    } catch (err) {
      setSendResult(`خطأ: ${err instanceof Error ? err.message : "فشل"}`);
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (status: string): ReactNode => {
    switch (status) {
      case "SENT": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "DELIVERED": return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "FAILED": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <RefreshCw className="h-4 w-4 text-amber-500" />;
    }
  };

  if (loading) return <div className="flex flex-col gap-4"><Skeleton className="h-48 rounded-lg" /><Skeleton className="h-64 rounded-lg" /></div>;
  if (error) return <ErrorState title="فشل تحميل الإعدادات" description={error} onRetry={(): void => { void fetchData(); }} />;

  return (
    <div className="flex flex-col gap-6">
      {/* ── إعدادات الاتصال ── */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">إعدادات الاتصال</h3>
          </div>
          <Button size="xs" variant="ghost" onClick={(): void => { setEditing(!editing); }}>
            {editing ? "إلغاء" : "تعديل"}
          </Button>
        </div>

        {editing ? (
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">المزود</label>
              <select
                className="w-full rounded-lg border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                value={editProvider}
                onChange={(e): void => { setEditProvider(e.target.value); }}
              >
                <option value="twilio">Twilio</option>
                <option value="custom">مزود مخصص</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">رقم الهاتف</label>
                <Input value={editPhone} onChange={(e): void => { setEditPhone(e.target.value); }} placeholder="whatsapp:+201000000000" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">رابط API</label>
                <Input value={editApiUrl} onChange={(e): void => { setEditApiUrl(e.target.value); }} placeholder="https://api.example.com/send" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
                  Account SID (Twilio)
                  <CredentialBadge configured={config?.hasAccountSid ?? false} />
                </label>
                <Input type="password" value={editAccountSid} onChange={(e): void => { setEditAccountSid(e.target.value); }} placeholder={config?.hasAccountSid ? "مُدخل — اتركه فارغًا للإبقاء" : "ACxxxxxxxxxxxxxxxx"} autoComplete="off" />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
                  Auth Token (Twilio)
                  <CredentialBadge configured={config?.hasAuthToken ?? false} />
                </label>
                <Input type="password" value={editAuthToken} onChange={(e): void => { setEditAuthToken(e.target.value); }} placeholder={config?.hasAuthToken ? "مُدخل — اتركه فارغًا للإبقاء" : "أدخل الـ Auth Token"} autoComplete="off" />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
                  API Key (مزود مخصص)
                  <CredentialBadge configured={config?.hasApiKey ?? false} />
                </label>
                <Input type="password" value={editApiKey} onChange={(e): void => { setEditApiKey(e.target.value); }} placeholder={config?.hasApiKey ? "مُدخل — اتركه فارغًا للإبقاء" : "مفتاح المزود المخصص"} autoComplete="off" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e): void => { setEditEnabled(e.target.checked); }}
                  className="rounded border-neutral-300"
                />
                تفعيل واتس آب
              </label>
              <Button size="sm" variant="primary" onClick={(): void => { void saveConfig(); }} disabled={savingConfig}>
                <Save className="ml-1 h-4 w-4" />
                حفظ الإعدادات
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-3 dark:bg-neutral-900">
              <p className="text-[10px] text-neutral-400">الحالة</p>
              <div className="mt-1 flex items-center gap-1.5">
                {config?.isEnabled
                  ? <Wifi className="h-4 w-4 text-emerald-500" />
                  : <WifiOff className="h-4 w-4 text-red-400" />}
                <span className="text-sm font-medium">{config?.isEnabled ? "متصل" : "متوقف"}</span>
              </div>
            </div>
            <div className="rounded-lg bg-white p-3 dark:bg-neutral-900">
              <p className="text-[10px] text-neutral-400">المزود</p>
              <p className="mt-1 text-sm font-medium">{config?.provider === "twilio" ? "Twilio" : config?.provider ?? "-"}</p>
            </div>
            <div className="rounded-lg bg-white p-3 dark:bg-neutral-900">
              <p className="text-[10px] text-neutral-400">رقم الهاتف</p>
              <p className="mt-1 text-sm font-medium dir-ltr">{config?.phoneNumber ?? "-"}</p>
            </div>
            <div className="rounded-lg bg-white p-3 dark:bg-neutral-900">
              <p className="text-[10px] text-neutral-400">الرسائل المرسلة</p>
              <p className="mt-1 text-sm font-medium">{logs.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── الإرسال اليدوي ── */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">إرسال يدوي</h3>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-3">
            <Input
              placeholder="رقم الهاتف (مثال: 201001234567)"
              value={manualPhone}
              onChange={(e): void => { setManualPhone(e.target.value); }}
              className="flex-1"
            />
            <Button size="sm" variant="primary" onClick={(): void => { void sendManual(); }} disabled={sending || !manualPhone}>
              {sending ? "..." : "إرسال"}
            </Button>
          </div>
          <textarea
            className="w-full rounded-lg border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            rows={2}
            placeholder="نص الرسالة (اختياري)"
            value={manualMessage}
            onChange={(e): void => { setManualMessage(e.target.value); }}
          />
          {sendResult && (
            <p className={`text-sm ${sendResult.includes("بن") ? "text-emerald-600" : "text-red-500"}`}>
              {sendResult}
            </p>
          )}
        </div>
      </div>

      <BulkWhatsAppSection whatsappEnabled={config?.isEnabled ?? false} />

      <SendersCard />

      {/* ── الإرسال التلقائي ── */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">الإرسال التلقائي</h3>
        </div>
        <p className="mt-1 text-xs text-neutral-500">تحديد متى يتم إرسال رسائل واتس آب تلقائياً</p>
        <div className="mt-3 flex flex-col gap-2">
          {[
            { key: "liveSession", label: "تذكير بالحصص المباشرة", desc: "قبل بدء الحصة المباشرة ب 30 دقيقة" },
            { key: "recordedLesson", label: "إشعار بحصص مسجلة جديدة", desc: "عند إضافة حصة مسجلة جديدة" },
            { key: "reportReady", label: "التقارير الشهرية", desc: "عند تجهيز تقرير أداء الطالب" },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-neutral-900">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.label}</p>
                <p className="text-xs text-neutral-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={autoReminders[item.key as keyof typeof autoReminders]}
                onChange={(e): void => { setAutoReminders((prev) => ({ ...prev, [item.key]: e.target.checked })); }}
                className="h-5 w-5 rounded border-neutral-300 text-emerald-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* ── سجل الرسائل ── */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">سجل الرسائل</h3>
          <span className="text-[10px] text-neutral-400">آخر 20 رسالة</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {logs.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-400">لا توجد رسائل مرسلة بعد</p>
          ) : (
            logs.slice(0, 20).map((msg) => (
              <div key={msg.id} className="flex items-start gap-3 rounded-lg bg-white p-3 dark:bg-neutral-900">
                <div className="mt-0.5 shrink-0">{statusIcon(msg.status)}</div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      <span className="dir-ltr">{msg.to}</span>
                      {msg.senderPhone ? ` · من ${msg.senderPhone}` : ""}
                    </p>
                  <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{msg.message}</p>
                  <p className="mt-1 text-[10px] text-neutral-400">
                    {msg.status === "FAILED" ? `فشل: ${msg.error ?? "غير معروف"}` : msg.status}
                    {" · "}
                    {new Date(msg.createdAt).toLocaleString("ar-EG")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
