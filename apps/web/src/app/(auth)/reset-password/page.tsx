"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { School, Phone, Lock, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage(): ReactNode {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
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
        mobile,
        verificationCode,
        newPassword,
      });
      router.push("/login?reset=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
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
            Reset Password
          </h1>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Enter your mobile number, the verification code, and your new password
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e): void => { void handleSubmit(e); }} className="flex flex-col gap-5">
          <Input
            label="Mobile Number"
            type="tel"
            placeholder="+201234567890"
            value={mobile}
            onChange={(e): void => { setMobile(e.target.value); }}
            leftIcon={<Phone className="h-5 w-5" />}
            required
          />

          <Input
            label="Verification Code"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e): void => { setVerificationCode(e.target.value); }}
            leftIcon={<KeyRound className="h-5 w-5" />}
            required
          />

          <Input
            label="New Password"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e): void => { setNewPassword(e.target.value); }}
            leftIcon={<Lock className="h-5 w-5" />}
            rightIcon={
              <button
                type="button"
                onClick={(): void => { setShowPassword(!showPassword); }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            Reset Password
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
