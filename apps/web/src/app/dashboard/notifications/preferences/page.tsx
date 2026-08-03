"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Bell, Save, ArrowRight } from "lucide-react";
import Link from "next/link";

interface NotificationPreferences {
  id: string;
  userId: string;
  lessonReminders: boolean;
  homeworkReminders: boolean;
  liveSessionReminders: boolean;
  achievementNotifications: boolean;
  motivationalMessages: boolean;
  studyTips: boolean;
  teacherAnnouncements: boolean;
}

interface PreferenceItem {
  key: keyof Omit<NotificationPreferences, "id" | "userId">;
  label: string;
  description: string;
}

const PREFERENCES: PreferenceItem[] = [
  { key: "lessonReminders", label: "تذكير بالحصص المسجلة", description: "إشعار عند إضافة حصص مسجلة جديدة" },
  { key: "homeworkReminders", label: "تذكير بالواجبات", description: "تذكير بموعد تسليم الواجبات" },
  { key: "liveSessionReminders", label: "تذكير بالحصص المباشرة", description: "تذكير قبل بدء الحصة المباشرة" },
  { key: "achievementNotifications", label: "الإنجازات", description: "إشعار عند تحقيق إنجاز جديد" },
  { key: "motivationalMessages", label: "رسائل تحفيزية", description: "رسائل تشجيعية لتحفيزك على التعلم" },
  { key: "studyTips", label: "نصائح دراسية", description: "نصائح واقتراحات لتحسين مستواك" },
  { key: "teacherAnnouncements", label: "إعلانات المعلم", description: "إعلانات عامة من المعلمين" },
];

export default function NotificationPreferencesPage(): ReactNode {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading, isError, error } = useQuery<NotificationPreferences>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await api.get<NotificationPreferences>("/notifications/preferences");
      return res.data ?? {
        id: "",
        userId: "",
        lessonReminders: true,
        homeworkReminders: true,
        liveSessionReminders: true,
        achievementNotifications: true,
        motivationalMessages: true,
        studyTips: true,
        teacherAnnouncements: true,
      };
    },
    staleTime: 30_000,
  });

  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<NotificationPreferences>) => {
      const res = await api.patch<NotificationPreferences>("/notifications/preferences", payload);
      return res.data;
    },
    onSuccess: () => {
      setHasChanges(false);
      void queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  const displayPrefs = localPrefs ?? prefs;

  const handleToggle = useCallback((key: keyof NotificationPreferences) => {
    setLocalPrefs((prev) => {
      const base = prev ?? prefs;
      if (!base) return null;
      return { ...base, [key]: !base[key] };
    });
    setHasChanges(true);
  }, [prefs]);

  const handleSave = useCallback(() => {
    if (!localPrefs) return;
    const payload: Record<string, boolean> = {};
    for (const pref of PREFERENCES) {
      payload[pref.key] = localPrefs[pref.key];
    }
    updateMutation.mutate(payload);
  }, [localPrefs, updateMutation]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            تفضيلات الإشعارات
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            تحكم في أنواع الإشعارات التي ترغب في استلامها
          </p>
        </div>
        <Link
          href="/dashboard/notifications"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للإشعارات
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="فشل تحميل التفضيلات"
          description={error instanceof Error ? error.message : "حدث خطأ أثناء تحميل التفضيلات"}
        />
      ) : !displayPrefs ? null : (
        <>
          <Card variant="outline" padding="lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-primary-500" />
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    أنواع الإشعارات
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    فعّل أو عطّل الإشعارات حسب رغبتك
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {PREFERENCES.map((pref) => {
                  const value = displayPrefs[pref.key];
                  const localValue = localPrefs?.[pref.key];
                  const changed = hasChanges && localValue !== undefined && localValue !== prefs?.[pref.key];
                  return (
                    <div
                      key={pref.key}
                      className={`flex items-center justify-between gap-4 py-4 ${
                        changed ? "rounded-lg bg-primary-50/50 px-3 -mx-3 dark:bg-primary-950/20" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {pref.label}
                          </h3>
                          {changed && (
                            <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                              غير محفوظ
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {pref.description}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onChange={() => { handleToggle(pref.key); }}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {hasChanges && (
            <div className="sticky bottom-4 flex justify-center">
              <Button
                size="lg"
                onClick={handleSave}
                loading={updateMutation.isPending}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4" />
                حفظ التغييرات
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
