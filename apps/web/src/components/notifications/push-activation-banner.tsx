"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, ExternalLink, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { PushEnvironment, PushPermission } from "@/lib/firebase-messaging";

const REGISTERED_KEY = "elbannawy:fcm-registered";
const DISMISSED_AT_KEY = "elbannawy:fcm-banner-dismissed-at";
const DISMISS_DAYS = 7;

const BENEFITS = [
  "تذكير بالحصص والواجبات قبل موعدها",
  "نتائج الاختبارات والشهادات فور صدورها",
  "تنبيه الحصص المباشرة قبل بدايتها",
];

function isDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISSED_AT_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function PopupShell({
  title,
  subtitle,
  icon,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
  onClose: () => void;
}): ReactNode {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-[elbannawy-pop-in_.25s_ease-out] dark:bg-neutral-900">
        <div className="bg-gradient-to-l from-sky-500 to-cyan-400 px-6 pb-8 pt-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-lg">
            {icon}
          </div>
          <p className="mt-3 text-lg font-bold text-white">{title}</p>
          <p className="mt-1 text-xs text-sky-50">{subtitle}</p>
        </div>

        <div className="px-6 py-5">{children}</div>

        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق التنبيه"
          className="absolute top-4 end-4 rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Activation popup on the student main page. The primary button triggers the
 * browser's native permission prompt directly through
 * `Notification.requestPermission()` (inside `enableWebPush`), so granting
 * happens through the popup itself. Mobile contexts that can never subscribe
 * (iOS outside the installed PWA, in-app browsers) get tailored guidance
 * instead of a broken enable button.
 */
export function PushActivationBanner(): ReactNode {
  const router = useRouter();
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [environment, setEnvironment] = useState<PushEnvironment | null>(null);
  const [registered, setRegistered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [modalClosed, setModalClosed] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshState = useCallback(async (): Promise<void> => {
    try {
      const { getPushPermission, getPushEnvironment } = await import("@/lib/firebase-messaging");
      setPermission(getPushPermission());
      setEnvironment(getPushEnvironment());
    } catch {
      setPermission("unsupported");
      setEnvironment("unsupported");
    }
  }, []);

  useEffect(() => {
    let stored = "";
    try {
      stored = window.localStorage.getItem(REGISTERED_KEY) ?? "";
    } catch {
      stored = "";
    }
    if (stored === "1") {
      setRegistered(true);
      return;
    }
    if (isDismissedRecently()) setDismissed(true);
    void refreshState();
  }, [refreshState]);

  // If the student unblocks notifications in browser settings and comes back,
  // pick up the new state without a full reload.
  useEffect(() => {
    const onVisible = (): void => {
      if (!document.hidden) void refreshState();
    };
    document.addEventListener("visibilitychange", onVisible);
    return (): void => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshState]);

  const handleEnable = async (): Promise<void> => {
    setEnabling(true);
    setMessage(null);
    try {
      const { enableWebPush } = await import("@/lib/firebase-messaging");
      const result = await enableWebPush();
      if (!result.ok || !result.token) {
        setMessage(result.error ?? "تعذر تفعيل الإشعارات");
        void refreshState();
        return;
      }
      await api.post("/notifications/device-token", { token: result.token, platform: "WEB" });
      try {
        window.localStorage.setItem(REGISTERED_KEY, "1");
      } catch {
        /* ignore */
      }
      setRegistered(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "تعذر تفعيل إشعارات المتصفح");
    } finally {
      setEnabling(false);
    }
  };

  const handleDismiss = (): void => {
    try {
      window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      setCopied(false);
    }
  };

  if (registered || permission === null || environment === null) return null;
  if (environment === "unsupported") return null;

  // iPhone/iPad outside the installed app: Apple only allows web push from
  // home-screen apps (iOS 16.4+), so guide to install instead of failing.
  if (environment === "ios-install-required") {
    if (modalClosed) return null;
    return (
      <PopupShell
        title="فعّل الإشعارات على الآيفون"
        subtitle="الآيفون يستقبل الإشعارات فقط من التطبيق المثبت"
        icon={<Smartphone className="h-8 w-8 text-white" />}
        onClose={(): void => { setModalClosed(true); }}
      >
        <div className="space-y-2.5">
          <Step number="1" text="دوس زر المشاركة في سفاري تحت" />
          <Step number="2" text="اختار إضافة إلى الشاشة الرئيسية" />
          <Step number="3" text="افتح المنصة من الأيقونة الجديدة واضغط تفعيل الإشعارات" />
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" className="flex-1" onClick={(): void => { setModalClosed(true); }}>
            فهمت
          </Button>
        </div>
      </PopupShell>
    );
  }

  // Facebook/WhatsApp/TikTok… webviews cannot subscribe to push at all.
  if (environment === "in-app-browser") {
    if (modalClosed) return null;
    return (
      <PopupShell
        title="افتح المنصة من المتصفح"
        subtitle="المتصفحات الداخلية لا تدعم الإشعارات"
        icon={<ExternalLink className="h-8 w-8 text-white" />}
        onClose={(): void => { setModalClosed(true); }}
      >
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          أنت فاتح المنصة من داخل تطبيق (فيسبوك / واتساب / تيك توك). انسخ رابط المنصة والصقه في متصفح كروم أو سفاري وسجّل الدخول وفعّل الإشعارات من هناك.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" className="flex-1" onClick={(): void => { void copyLink(); }}>
            {copied ? "تم نسخ الرابط ✓" : "نسخ رابط المنصة"}
          </Button>
          <Button size="sm" variant="ghost" onClick={(): void => { setModalClosed(true); }}>
            إغلاق
          </Button>
        </div>
      </PopupShell>
    );
  }

  // Blocked at browser level: no site can re-prompt, so guide to unblock and
  // finish activation from our in-site settings.
  if (permission === "denied") {
    if (modalClosed) return null;
    return (
      <PopupShell
        title="فعّل إشعارات المتصفح"
        subtitle="الإشعارات محظورة من المتصفح — رجّعها بخطوتين"
        icon={<BellRing className="h-8 w-8 text-white" />}
        onClose={(): void => { setModalClosed(true); }}
      >
        <div className="space-y-2.5">
          <Step number="1" text="دوس على علامة القفل جنب عنوان الموقع فوق" />
          <Step number="2" text="اختار إعدادات الموقع ثم الإشعارات ثم سماح" />
          <Step number="3" text="ارجع هنا وأتمم التفعيل من إعدادات الموقع" />
        </div>
        {message && <p className="mt-3 text-center text-xs text-red-500">{message}</p>}
        <div className="mt-5 flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={(): void => {
              router.push("/dashboard/notifications/preferences");
            }}
          >
            فتح إعدادات الإشعارات
          </Button>
          <Button size="sm" variant="ghost" onClick={(): void => { setModalClosed(true); }}>
            إغلاق
          </Button>
        </div>
      </PopupShell>
    );
  }

  // Default / granted-but-unregistered: the activate button summons the
  // browser's own native permission prompt through the popup itself.
  if (dismissed) return null;
  return (
    <PopupShell
      title="فعّل إشعارات المتصفح"
      subtitle="خطوة واحدة وتوصلك كل التنبيهات المهمة"
      icon={<BellRing className="h-8 w-8 text-white" />}
      onClose={handleDismiss}
    >
      <div className="space-y-2.5">
        {BENEFITS.map((benefit) => (
          <div key={benefit} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            </span>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{benefit}</p>
          </div>
        ))}
      </div>
      {message && <p className="mt-3 text-center text-xs text-red-500">{message}</p>}
      <div className="mt-5 flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={(): void => { void handleEnable(); }}
          disabled={enabling}
        >
          {enabling ? "جارٍ التفعيل..." : "تفعيل الإشعارات"}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          لاحقًا
        </Button>
      </div>
    </PopupShell>
  );
}

function Step({ number, text }: { number: string; text: string }): ReactNode {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-xs font-bold text-sky-600 dark:text-sky-400">
        {number}
      </span>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">{text}</p>
    </div>
  );
}
