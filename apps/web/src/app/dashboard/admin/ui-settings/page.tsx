"use client";

import { type ReactNode, useState } from "react";
import { useUiSettings } from "@/lib/use-ui-settings";
import { uploadUiImage, type UiConfig, type CardBorderGroupSettings, type CardBorderSide, type UiImageKind } from "@/lib/ui-settings-api";
import { getCardBorderPagesForGroup, type CardBorderGroupKey } from "@/lib/card-border-pages";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";
import { Save, RotateCcw, Eye, Palette, Type, Monitor, Image, Layout, Upload, Trash2, MonitorPlay } from "lucide-react";

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <input type="color" value={value} onChange={(e) => { onChange(e.target.value); }} className="h-9 w-9 cursor-pointer rounded-lg border border-neutral-300 bg-transparent p-0.5 dark:border-neutral-600" />
      <Input value={value} onChange={(e) => { onChange(e.target.value); }} className="font-mono text-xs" />
      <span className="min-w-24 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: ReactNode }): ReactNode {
  return (
    <Card variant="outline" padding="md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/10">
            <Icon className="h-5 w-5 text-primary-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function BackgroundImageEditor({
  label,
  hint,
  kind,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  kind: UiImageKind;
  value: string;
  onChange: (url: string) => void;
}): ReactNode {
  const [uploading, setUploading] = useState(false);
  const inputId = `bg-upload-${kind}`;

  const handleFile = async (file: File): Promise<void> => {
    setUploading(true);
    try {
      const url = await uploadUiImage(file, kind);
      onChange(url);
      toast(`تم رفع صورة ${label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{label}</span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</span>

      {value ? (
        <div className="relative h-36 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
          <img src={value} alt={label} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-400 dark:border-neutral-600">
          لا توجد صورة مرفوعة
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e): void => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          loading={uploading}
          onClick={(): void => { document.getElementById(inputId)?.click(); }}
        >
          <Upload className="ml-1 h-4 w-4" />
          رفع صورة
        </Button>
        {value && (
          <Button variant="outline" size="sm" className="border-danger-500/30 text-danger-500 hover:bg-danger-500/10" onClick={(): void => { onChange(""); }}>
            <Trash2 className="ml-1 h-4 w-4" />
            إزالة
          </Button>
        )}
      </div>
    </div>
  );
}

const BORDER_SIDES: { value: CardBorderSide; label: string }[] = [
  { value: "left", label: "يسار" },
  { value: "top", label: "أعلى" },
  { value: "right", label: "يمين" },
  { value: "bottom", label: "أسفل" },
];

function BorderGroupEditor({ title, groupKey, group, onChange }: { title: string; groupKey: CardBorderGroupKey; group: CardBorderGroupSettings; onChange: (path: string[], value: unknown) => void }): ReactNode {
  const pageOptions = getCardBorderPagesForGroup(groupKey);

  function togglePage(key: string): void {
    const next = group.pages.includes(key) ? group.pages.filter((p) => p !== key) : [...group.pages, key];
    onChange(["pages"], next);
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{group.enabled ? "مفعّل" : "معطّل"}</span>
          <input type="checkbox" checked={group.enabled} onChange={(e): void => { onChange(["enabled"], e.target.checked); }} className="h-4 w-4 rounded border-neutral-300" />
        </div>
      </div>
      {group.enabled && (
        <div className="mt-3 flex flex-col gap-3">
          <ColorInput label="لون البوردر (نهاري)" value={group.color} onChange={(v): void => { onChange(["color"], v); }} />
          <ColorInput label="لون البوردر (ليلي)" value={group.colorDark} onChange={(v): void => { onChange(["colorDark"], v); }} />
          <div className="flex items-center gap-3">
            <span className="min-w-24 text-sm font-medium text-neutral-700 dark:text-neutral-300">العرض (px)</span>
            <Input type="number" min={0} max={12} value={group.width} onChange={(e): void => { onChange(["width"], Number(e.target.value)); }} className="w-24" />
          </div>
          <div className="flex items-center gap-3">
            <span className="min-w-24 text-sm font-medium text-neutral-700 dark:text-neutral-300">الجهة</span>
            <select value={group.side} onChange={(e): void => { onChange(["side"], e.target.value); }} className="w-32 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-600">
              {BORDER_SIDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">الصفحات المفعّلة:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {pageOptions.map((p) => (
                <label key={p.key} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                  <input type="checkbox" checked={group.pages.includes(p.key)} onChange={(): void => { togglePage(p.key); }} className="h-3.5 w-3.5 rounded border-neutral-300" />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UiSettingsPage(): ReactNode {
  const { config, isLoading, isError, update, reset } = useUiSettings();
  const [local, setLocal] = useState<UiConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const dirty = local !== null;

  const cfg = local ?? config;

  function set(path: string[], value: unknown): void {
    if (!config) return;
    setLocal((prev: UiConfig | null) => {
      const base = prev ?? JSON.parse(JSON.stringify(config)) as UiConfig;
      const copy = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
      let obj: Record<string, unknown> = copy;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]] as Record<string, unknown>;
      }
      obj[path[path.length - 1]] = value;
      return copy as unknown as UiConfig;
    });
  }

  async function handleSave(): Promise<void> {
    if (!local) return;
    setSaving(true);
    try {
      await update(local);
      setLocal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(): Promise<void> {
    setResetting(true);
    try {
      await reset();
      setLocal(null);
    } finally {
      setResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (isError || !cfg) {
    return <ErrorState title="فشل تحميل إعدادات الواجهة" description="حدث خطأ أثناء تحميل الإعدادات" />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">إعدادات الواجهة</h1>
          <p className="text-sm text-neutral-500">التحكم في مظهر المنصة (الخطوط، الألوان، الخلفيات، البوردر)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setPreviewMode(!previewMode); }}>
            <Eye className="h-4 w-4 ml-1" />
            {previewMode ? "إيقاف المعاينة" : "معاينة حية"}
          </Button>
          <Button variant="outline" className="border-danger-500/30 text-danger-500 hover:bg-danger-500/10" onClick={(): void => { void handleReset(); }} disabled={resetting}>
            <RotateCcw className="h-4 w-4 ml-1" />
            {resetting ? "... جار" : "إعادة تعيين"}
          </Button>
          <Button onClick={(): void => { void handleSave(); }} disabled={!dirty || saving}>
            <Save className="h-4 w-4 ml-1" />
            {saving ? "... جار" : "حفظ"}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="rounded-xl border border-primary-500/30 bg-primary-500/5 px-4 py-3 text-sm font-medium text-primary-600 dark:text-primary-400">
          توجد تغييرات غير محفوظة. اضغط "حفظ" لتطبيق التغييرات.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="الخطوط" icon={Type}>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">الخط العربي</span>
          <Input value={cfg.fonts.arabic} onChange={(e) => { set(["fonts", "arabic"], e.target.value); }} dir="ltr" className="font-arabic" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">الخط الإنجليزي</span>
          <Input value={cfg.fonts.english} onChange={(e) => { set(["fonts", "english"], e.target.value); }} dir="ltr" className="font-sans" />
        </SectionCard>

        <SectionCard title="الألوان" icon={Palette}>
          <ColorInput label="اللون الأساسي" value={cfg.colors.primary} onChange={(v) => { set(["colors", "primary"], v); }} />
          <ColorInput label="خلفية الكروت (نهاري)" value={cfg.colors.cardBg} onChange={(v) => { set(["colors", "cardBg"], v); }} />
          <ColorInput label="خلفية الكروت (ليلي)" value={cfg.colors.cardBgDark} onChange={(v) => { set(["colors", "cardBgDark"], v); }} />
        </SectionCard>

        <SectionCard title="الخلفيات" icon={Monitor}>
          <ColorInput label="خلفية الوضع النهاري" value={cfg.backgrounds.light} onChange={(v) => { set(["backgrounds", "light"], v); }} />
          <ColorInput label="خلفية الوضع الليلي" value={cfg.backgrounds.dark} onChange={(v) => { set(["backgrounds", "dark"], v); }} />
        </SectionCard>

        <SectionCard title="صور الخلفيات" icon={Image}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            ارفع صورة للخلفية (تظهر في الوضع الليلي مع توهج النجوم) وصورة لخلفية السايد بار.
          </p>
          <BackgroundImageEditor
            label="خلفية الصفحة"
            hint="تظهر خلف المحتوى في الوضع الليلي"
            kind="background"
            value={cfg.backgrounds.image}
            onChange={(url): void => { set(["backgrounds", "image"], url); }}
          />
          <BackgroundImageEditor
            label="خلفية السايد بار"
            hint="تظهر خلف القائمة الجانبية في الوضع الليلي"
            kind="sidebar"
            value={cfg.sidebar.backgroundImage}
            onChange={(url): void => { set(["sidebar", "backgroundImage"], url); }}
          />
        </SectionCard>

        <SectionCard title="شاشة البداية (Splash Screen)" icon={Image}>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.splashScreen.enabled} onChange={(e) => { set(["splashScreen", "enabled"], e.target.checked); }} className="h-4 w-4 rounded border-neutral-300" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">تفعيل شاشة البداية</span>
          </div>
          <ColorInput label="لون الخلفية" value={cfg.splashScreen.backgroundColor} onChange={(v) => { set(["splashScreen", "backgroundColor"], v); }} />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">رابط الشعار (اختياري)</span>
          <Input value={cfg.splashScreen.logoUrl} onChange={(e) => { set(["splashScreen", "logoUrl"], e.target.value); }} placeholder="https://..." dir="ltr" />
        </SectionCard>

        <SectionCard title="صور مصغرات الفيديو (YouTube)" icon={MonitorPlay}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            تحكم في ظهور صورة الفيديو المصغرة التي تُجلب من يوتيوب داخل مشغّل الفيديو.
          </p>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.videoThumbnails.enabled} onChange={(e) => { set(["videoThumbnails", "enabled"], e.target.checked); }} className="h-4 w-4 rounded border-neutral-300" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">عرض صور مصغرات الفيديو في المنصة</span>
          </div>
        </SectionCard>

        <SectionCard title="بوردر الكروت" icon={Layout}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            تحكم منفصل لكل مجموعة: المشرفون والمعلمون، الطلاب، وصفحات تسجيل الدخول.
          </p>
          <BorderGroupEditor title="المشرفون والمعلمون" groupKey="staff" group={cfg.cardBorder.groups.staff} onChange={(path, value) => { set(["cardBorder", "groups", "staff", ...path], value); }} />
          <BorderGroupEditor title="الطلاب" groupKey="student" group={cfg.cardBorder.groups.student} onChange={(path, value) => { set(["cardBorder", "groups", "student", ...path], value); }} />
          <BorderGroupEditor title="صفحات تسجيل الدخول" groupKey="auth" group={cfg.cardBorder.groups.auth} onChange={(path, value) => { set(["cardBorder", "groups", "auth", ...path], value); }} />
        </SectionCard>

        <SectionCard title="بوردر السايد بار" icon={Layout}>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.sidebarBorder.enabled} onChange={(e) => { set(["sidebarBorder", "enabled"], e.target.checked); }} className="h-4 w-4 rounded border-neutral-300" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">إظهار بوردر السايد بار</span>
          </div>
          <ColorInput label="لون البوردر" value={cfg.sidebarBorder.color} onChange={(v) => { set(["sidebarBorder", "color"], v); }} />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">العرض (px)</span>
          <Input type="number" min={0} max={12} value={cfg.sidebarBorder.width} onChange={(e) => { set(["sidebarBorder", "width"], Number(e.target.value)); }} className="w-24" />
        </SectionCard>
      </div>
    </div>
  );
}
