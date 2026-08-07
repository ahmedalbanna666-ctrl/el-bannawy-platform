"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, CircleAlert, Loader2, ScanLine } from "lucide-react";

interface VerifyPayload {
  verified: boolean;
  id: string;
  verificationCode: string;
  studentName: string;
  unitTitle: string;
  unitNumber: number;
  earnedAt: string;
}

type VerifyState =
  | { status: "loading" }
  | { status: "valid"; data: VerifyPayload }
  | { status: "invalid" }
  | { status: "error" };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatUnitHeading(unitNumber: number, rawTitle: string): string {
  const normalized = rawTitle
    .trim()
    .replace(/^unit\s*\d+\s*[-–—:.]?\s*/i, "")
    .trim();
  const displayTitle = normalized.length > 0 ? normalized : `Unit ${String(unitNumber)}`;
  return `Unit ${String(unitNumber)} – ${displayTitle}`;
}

export default function CertificateVerifyPage(): React.ReactNode {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const [state, setState] = useState<VerifyState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `${API_BASE_URL}/certificates/verify/${encodeURIComponent(code)}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as { success?: boolean; data?: VerifyPayload };
        if (cancelled) return;
        if (res.ok && json.success && json.data?.verified) {
          setState({ status: "valid", data: json.data });
        } else {
          setState({ status: "invalid" });
        }
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [code]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fdfaf3] via-[#f7f0e0] to-[#efe6cf] p-6 dark:from-[#0a0f1c] dark:via-[#0c1322] dark:to-[#0d1526]">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-amber-500/40 bg-white/85 p-8 text-center shadow-2xl shadow-amber-900/10 backdrop-blur dark:border-amber-400/25 dark:bg-[#101a2e]/90 dark:shadow-black/40">
          <div className="mb-5 text-amber-600 dark:text-amber-400">
            <ScanLine className="mx-auto h-10 w-10" aria-hidden />
          </div>

          {state.status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-400" aria-hidden />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Verifying certificate…</p>
            </div>
          )}

          {state.status === "valid" && (
            <div>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-200 shadow-inner dark:border-amber-400 dark:from-amber-500/15 dark:to-amber-500/5">
                <BadgeCheck className="h-11 w-11 text-amber-600 dark:text-amber-400" aria-hidden />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
                Certificate Verified
              </p>
              <h1 className="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-neutral-50">
                {state.data.studentName}
              </h1>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                successfully completed the course unit
              </p>
              <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">
                {formatUnitHeading(state.data.unitNumber, state.data.unitTitle)}
              </p>

              <div className="mt-6 flex items-center justify-center gap-6 border-t border-neutral-200 pt-5 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                <div>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200">Issue Date</p>
                  <p>{formatDate(state.data.earnedAt)}</p>
                </div>
                <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" aria-hidden />
                <div>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200">Certificate ID</p>
                  <p className="font-mono tracking-wider">{state.data.verificationCode}</p>
                </div>
              </div>
            </div>
          )}

          {state.status === "invalid" && (
            <div className="py-4">
              <CircleAlert className="mx-auto h-10 w-10 text-red-500" aria-hidden />
              <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">
                Certificate Not Found
              </h1>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                The verification code could not be matched to a valid certificate.
              </p>
            </div>
          )}

          {state.status === "error" && (
            <div className="py-4">
              <CircleAlert className="mx-auto h-10 w-10 text-red-500" aria-hidden />
              <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">
                Verification Unavailable
              </h1>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                We could not reach the verification service. Please try again later.
              </p>
            </div>
          )}

          <div className="mt-7 border-t border-neutral-200 pt-5 dark:border-neutral-700">
            <Link
              href="/"
              className="text-xs font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-amber-400"
            >
              El-Bannawy Platform — AI-Powered English Learning
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
