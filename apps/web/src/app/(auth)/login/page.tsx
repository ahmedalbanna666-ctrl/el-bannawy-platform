"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, DeviceConfirmationError } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { School, Mail, Lock, LogIn, Eye, EyeOff, AlertTriangle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function LoginPage(): ReactNode {
  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, confirmLogin, firebaseLogin } = useAuth();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() => searchParams.get("error") ?? null);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmToken, setConfirmToken] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const identifier = mobile.trim();
      const isEmail = identifier.includes("@");

      if (isEmail) {
        await firebaseLogin(identifier, password, rememberMe);
      } else {
        await login(identifier, password, rememberMe);
      }
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof DeviceConfirmationError) {
        setConfirmToken(err.confirmToken);
        setShowConfirmDialog(true);
      } else {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLogin = async (): Promise<void> => {
    if (!confirmToken) return;
    setConfirming(true);
    try {
      await confirmLogin(confirmToken);
      setShowConfirmDialog(false);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
      setShowConfirmDialog(false);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelLogin = async (): Promise<void> => {
    if (confirmToken) {
      try {
        const { api } = await import("@/lib/api-client");
        await api.post("/auth/cancel-login", { confirmToken });
      } catch {
        // ignore
      }
    }
    setShowConfirmDialog(false);
    setConfirmToken(null);
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500">
            <School className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Welcome Back
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sign in to your account to continue
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e): void => { void handleSubmit(e); }} className="flex flex-col gap-5">
          <Input
            label="Email or Mobile Number"
            type="text"
            placeholder="Enter your email or mobile number"
            value={mobile}
            onChange={(e): void => { setMobile(e.target.value); }}
            leftIcon={<Mail className="h-5 w-5" />}
            required
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e): void => { setPassword(e.target.value); }}
            leftIcon={<Lock className="h-5 w-5" />}
            rightIcon={
              <button
                type="button"
                onClick={(): void => { setShowPassword((prev) => !prev); }}
                className="flex items-center justify-center focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
            required
          />

          <div className="flex items-center justify-between">
            <Checkbox
              id="remember-me"
              label="Remember Me"
              checked={rememberMe}
              onChange={(e): void => { setRememberMe(e.target.checked); }}
            />
            <Link
              href="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-500">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={loading}>
            <LogIn className="h-5 w-5" />
            Sign In
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-neutral-400 dark:bg-neutral-900">OR</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={(): void => {
              window.location.href = `${API_URL}/auth/google`;
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Create one
            </Link>
          </p>
        </form>

        <Dialog open={showConfirmDialog} onClose={() => { void handleCancelLogin(); }} title="">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm New Device
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              You already have an active session on another device. Logging in here will log you out of the other device.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { void handleCancelLogin(); }} disabled={confirming}>
                Cancel
              </Button>
              <Button onClick={() => { void handleConfirmLogin(); }} loading={confirming}>
                Yes, Log Me In
              </Button>
            </div>
          </div>
        </Dialog>
      </CardContent>
    </Card>
  );
}
