"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { School, Lock, KeyRound, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

function ResetPasswordForm(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("identifier") ?? "";
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        identifier: email,
        verificationCode,
        newPassword,
      });
      router.push("/login?reset=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إعادة تعيين كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500">
            <School className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            إعادة تعيين كلمة المرور
          </h1>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            أدخل الكود المرسل إلى بريدك الإلكتروني وكلمة المرور الجديدة
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e): void => { void handleSubmit(e); }} className="flex flex-col gap-5">
          {email && (
            <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300" dir="ltr">{email}</span>
            </div>
          )}

          <Input
            label="كود التأكيد"
            placeholder="أدخل الكود المكون من 6 أرقام"
            value={verificationCode}
            onChange={(e): void => { setVerificationCode(e.target.value); }}
            leftIcon={<KeyRound className="h-5 w-5" />}
            required
          />

          <Input
            label="كلمة المرور الجديدة"
            type={showPassword ? "text" : "password"}
            placeholder="8 أحرف على الأقل"
            value={newPassword}
            onChange={(e): void => { setNewPassword(e.target.value); }}
            leftIcon={<Lock className="h-5 w-5" />}
            rightIcon={
              <button
                type="button"
                onClick={(): void => { setShowPassword(!showPassword); }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
            required
          />

          {error && (
            <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-500">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={loading}>
            <KeyRound className="h-5 w-5" />
            إعادة تعيين كلمة المرور
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            <ArrowRight className="h-4 w-4" />
            العودة لتسجيل الدخول
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage(): ReactNode {
  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center"><Spinner size="lg" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
