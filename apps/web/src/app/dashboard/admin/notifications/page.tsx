"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api-client";
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
  message: string;
  status: string;
  error: string | null;
  createdAt: string;
}

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
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{msg.to}</p>
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
