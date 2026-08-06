"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { School, Mail, Send, ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPasswordPage(): ReactNode {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await api.post<{ message: string }>("/auth/forgot-password", { identifier });
      setMessage(response.message ?? "Verification code sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
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
            Forgot Password
          </h1>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Enter your registered email or mobile number to receive a verification code
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e): void => { void handleSubmit(e); }} className="flex flex-col gap-5">
          <Input
            label="Email or Mobile Number"
            type="text"
            placeholder="Enter your email or mobile number"
            value={identifier}
            onChange={(e): void => { setIdentifier(e.target.value); }}
            leftIcon={<Mail className="h-5 w-5" />}
            required
          />

          {error && (
            <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-500">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-xl bg-success-500/10 px-4 py-3 text-sm text-success-600 dark:text-success-400">
              {message}
            </p>
          )}

          {message && (
            <Button
              type="button"
              fullWidth
              onClick={(): void => {
                router.push(`/reset-password?identifier=${encodeURIComponent(identifier)}`);
              }}
            >
              <KeyRound className="h-5 w-5" />
              Continue to enter the code
            </Button>
          )}

          <Button type="submit" fullWidth loading={loading}>
            <Send className="h-5 w-5" />
            Send Verification Code
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
