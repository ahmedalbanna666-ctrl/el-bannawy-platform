"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/use-permissions";
import {
  usePageStatus,
  useUpdatePageStatus,
  CONTROLLABLE_PAGES,
  DEFAULT_PAGE_TITLE,
  DEFAULT_PAGE_MESSAGE,
  DEFAULT_GLOBAL_TITLE,
  DEFAULT_GLOBAL_MESSAGE,
  type PageStatusEntry,
} from "@/lib/page-status";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { GlobeLock, Wrench, Save, CheckCircle2 } from "lucide-react";

interface EditorState {
  title: string;
  message: string;
  whatsapp: string;
}

function entryToState(entry: PageStatusEntry | undefined): EditorState {
  return {
    title: entry?.title ?? "",
    message: entry?.message ?? "",
    whatsapp: entry?.whatsapp ?? "",
  };
}

function GlobalStatusCard(): ReactNode {
  const { data, isError, isLoading } = usePageStatus();
  const { mutate, isPending } = useUpdatePageStatus();
  const [state, setState] = useState<EditorState>({ title: "", message: "", whatsapp: "" });
  const [touched, setTouched] = useState(false);

  const global = data?.global;

  useEffect(() => {
    if (global) {
      setState(entryToState(global));
      setTouched(false);
    }
  }, [global?.disabled]);

  const handleSave = (): void => {
    mutate({
      scope: "global",
      payload: {
        disabled: global?.disabled ?? false,
        title: state.title.trim() || DEFAULT_GLOBAL_TITLE,
        message: state.message.trim() || DEFAULT_GLOBAL_MESSAGE,
        whatsapp: state.whatsapp.trim(),
      },
    });
    setTouched(false);
  };

  const handleToggle = (checked: boolean): void => {
    mutate({
      scope: "global",
      payload: {
        disabled: !checked,
        title: state.title.trim() || DEFAULT_GLOBAL_TITLE,
        message: state.message.trim() || DEFAULT_GLOBAL_MESSAGE,
        whatsapp: state.whatsapp.trim(),
      },
    });
  };

  if (isError) return <ErrorState title="فشل التحميل" description="تعذر تحميل حالة الصفحات" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GlobeLock className="h-5 w-5 text-warning-500" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            إيقاف المنصة بالكامل للطلاب
          </h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          عند التفعيل تظهر للطالب شاشة صيانة في كل صفحات المنصة مع رسالة وزر التواصل عبر واتساب.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-10 w-40 rounded-xl" />
        ) : (
          <Switch
            checked={!(global?.disabled ?? false)}
            onChange={(e): void => {
              handleToggle(e.target.checked);
            }}
            label={global?.disabled ? "إعادة تفعيل المنصة للطلاب" : "إيقاف المنصة للطلاب"}
            helperText="لا يزال المدير والمعلمون قادرين على الوصول"
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              عنوان الرسالة
            </label>
            <Input
              value={state.title}
              placeholder={DEFAULT_GLOBAL_TITLE}
              onChange={(e): void => { setState((p) => ({ ...p, title: e.target.value })); setTouched(true); }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              رقم الواتساب (بدون +)
            </label>
            <Input
              value={state.whatsapp}
              placeholder="201000000000"
              dir="ltr"
              onChange={(e): void => { setState((p) => ({ ...p, whatsapp: e.target.value })); setTouched(true); }}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            نص الرسالة
          </label>
          <Input
            value={state.message}
            placeholder={DEFAULT_GLOBAL_MESSAGE}
            onChange={(e): void => { setState((p) => ({ ...p, message: e.target.value })); setTouched(true); }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} disabled={!touched || isPending} leftIcon={isPending ? undefined : <Save className="h-4 w-4" />}>
            حفظ الرسالة
          </Button>
          {touched && <span className="text-xs text-neutral-400">تغييرات غير محفوظة</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function PageRow({ page }: { page: { key: string; title: string; description: string } }): ReactNode {
  const { data } = usePageStatus();
  const { mutate, isPending } = useUpdatePageStatus();
  const [state, setState] = useState<EditorState>({ title: "", message: "", whatsapp: "" });
  const [touched, setTouched] = useState(false);

  const entry = data?.pages[page.key];

  useEffect(() => {
    setState(entryToState(entry));
    setTouched(false);
  }, [entry?.disabled, page.key]);

  const handleSave = (): void => {
    mutate({
      scope: "page",
      pageKey: page.key,
      payload: {
        disabled: entry?.disabled ?? false,
        title: state.title.trim() || DEFAULT_PAGE_TITLE,
        message: state.message.trim() || DEFAULT_PAGE_MESSAGE,
      },
    });
    setTouched(false);
  };

  const handleToggle = (checked: boolean): void => {
    mutate({
      scope: "page",
      pageKey: page.key,
      payload: {
        disabled: !checked,
        title: state.title.trim() || DEFAULT_PAGE_TITLE,
        message: state.message.trim() || DEFAULT_PAGE_MESSAGE,
      },
    });
  };

  const isDisabled = entry?.disabled ?? false;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{page.title}</span>
            {isDisabled ? (
              <Badge variant="danger">معطل</Badge>
            ) : (
              <Badge variant="success">متاح</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{page.description}</p>
        </div>

        <div className="shrink-0">
          <Switch
            checked={!isDisabled}
            onChange={(e): void => { handleToggle(e.target.checked); }}
            label={isDisabled ? "إعادة التفعيل" : "تعطيل الصفحة"}
          />
        </div>

        {isDisabled && (
          <div className="grid w-full gap-3 sm:max-w-md">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                عنوان الرسالة
              </label>
              <Input
                value={state.title}
                placeholder={DEFAULT_PAGE_TITLE}
                onChange={(e): void => { setState((p) => ({ ...p, title: e.target.value })); setTouched(true); }}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                نص الرسالة
              </label>
              <Input
                value={state.message}
                placeholder={DEFAULT_PAGE_MESSAGE}
                onChange={(e): void => { setState((p) => ({ ...p, message: e.target.value })); setTouched(true); }}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleSave} disabled={!touched || isPending} leftIcon={isPending ? undefined : <Save className="h-4 w-4" />}>
                حفظ
              </Button>
              {touched && <span className="text-xs text-neutral-400">غير محفوظ</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PageStatusAdminPage(): ReactNode {
  const router = useRouter();
  const { isAdmin } = usePermissions();
  const { isError, isLoading } = usePageStatus();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ErrorState title="لا تملك صلاحية الوصول" description="هذه الصفحة مخصصة للمدير فقط" />
        <Button variant="outline" onClick={(): void => { router.push("/dashboard"); }}>العودة للرئيسية</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <Wrench className="h-6 w-6 text-warning-500" />
          حالة الصفحات والصيانة
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          تحكم في توفر صفحات المنصة للطلاب. عند تعطيل أي صفحة تظهر للطالب شاشة «قيد التطوير» مع رسالة
          وزر التواصل عبر واتساب.
        </p>
      </div>

      {isError ? (
        <ErrorState title="فشل التحميل" description="تعذر تحميل حالة الصفحات" />
      ) : (
        <>
          <GlobalStatusCard />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">الصفحات</h2>
              </div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                فعّل أو عطّل كل صفحة على حدة. المديرون والمعلمون لا يتأثرون بالتعطيل.
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {CONTROLLABLE_PAGES.map((page) => (
                    <PageRow key={page.key} page={page} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
