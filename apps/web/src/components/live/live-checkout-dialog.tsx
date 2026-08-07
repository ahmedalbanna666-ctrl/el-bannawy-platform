"use client";

import { useState, type ReactNode } from "react";
import { Check, Loader2, Smartphone, ShieldCheck, Wallet, ImageUp, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useLiveCheckout,
  useSubmitPaymentProof,
  type CheckoutPayload,
  type SubmitProofPayload,
} from "@/lib/live-shop-api";
import { useTransferNumbers } from "@/lib/coins/manual-payment-api";
import { cn } from "@/lib/utils";

export interface LiveCheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (mode: "online" | "manual") => void;
  productLabel: string;
  amount: number;
  currency?: string;
  buildPayload: () => CheckoutPayload;
}

type Step = "method" | "online" | "manual";

const METHODS = [
  { id: "paymob", label: "Paymob", desc: "دفع إلكتروني فوري عبر البطاقات", icon: <Wallet className="h-5 w-5" /> },
  { id: "fawry", label: "Fawry", desc: "دفع عبر ماكينات فوري", icon: <Smartphone className="h-5 w-5" /> },
  { id: "instapay", label: "Instapay", desc: "تحويل عبر انستا باي ومراجعة يدوية", icon: <ShieldCheck className="h-5 w-5" /> },
] as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("فشل قراءة الصورة"));
      }
    };
    reader.onerror = (): void => {
      reject(new Error("فشل قراءة الصورة"));
    };
    reader.readAsDataURL(file);
  });
}

export function LiveCheckoutDialog({
  open,
  onClose,
  onSuccess,
  productLabel,
  amount,
  currency = "EGP",
  buildPayload,
}: LiveCheckoutDialogProps): ReactNode {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<string>("paymob");
  const [checkout, setCheckout] = useState<{ checkoutId: string; paymentUrl: string } | null>(null);
  const [gatewayRef, setGatewayRef] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const { mutateAsync: checkoutMutation, isPending: isCheckingOut } = useLiveCheckout();
  const { mutateAsync: submitProof, isPending: isSubmittingProof } = useSubmitPaymentProof();
  const { data: transferNumbers } = useTransferNumbers();

  const instapayNumbers = (transferNumbers ?? []).filter(
    (n) => n.gateway === "INSTAPAY" && n.active,
  );

  const reset = (): void => {
    setStep("method");
    setMethod("paymob");
    setCheckout(null);
    setGatewayRef("");
    setSenderNumber("");
    setTransactionRef("");
    setScreenshot(null);
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const handlePayOnline = async (): Promise<void> => {
    try {
      const payload = buildPayload();
      const result = await checkoutMutation({ ...payload, paymentMethod: method });
      setCheckout({ checkoutId: result.checkoutId, paymentUrl: result.paymentUrl });
      setStep("online");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إنشاء عملية الدفع");
    }
  };

  const handleSubmitProof = async (): Promise<void> => {
    if (!gatewayRef.trim() || !senderNumber.trim() || !transactionRef.trim()) {
      toast.error("أكمل بيانات التحويل أولاً");
      return;
    }
    try {
      const payload = buildPayload();
      const result = await checkoutMutation({ ...payload, paymentMethod: "instapay" });
      const proofPayload: SubmitProofPayload = {
        paymentId: result.checkoutId,
        gatewayRef: gatewayRef.trim(),
        senderNumber: senderNumber.trim(),
        transactionRef: transactionRef.trim(),
        ...(screenshot ? { screenshot } : {}),
      };
      await submitProof(proofPayload);
      toast.success("تم إرسال إثبات الدفع — سيتم تفعيل الاشتراك بعد مراجعة الإدارة");
      handleClose();
      onSuccess?.("manual");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إرسال إثبات الدفع");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setScreenshot(base64);
    } catch {
      toast.error("تعذر قراءة الصورة");
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="إتمام الدفع">
      <DialogContent>
        <div className="flex items-center justify-between rounded-2xl bg-primary-500/10 px-4 py-3">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{productLabel}</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {amount} {currency}
            </p>
          </div>
          <span className="text-xs font-medium text-primary-600 dark:text-primary-300">
            {step === "method" ? "اختر طريقة الدفع" : step === "online" ? "أكمل الدفع" : "إثبات التحويل"}
          </span>
        </div>

        {step === "method" && (
          <div className="flex flex-col gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMethod(m.id); }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-start transition-all",
                  method === m.id
                    ? "border-primary-400/60 bg-primary-500/10 ring-1 ring-primary-400/40"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20",
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  method === m.id ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-500 dark:bg-white/5",
                )}>
                  {m.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{m.label}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{m.desc}</p>
                </div>
                {method === m.id && <Check className="h-5 w-5 text-primary-500" />}
              </button>
            ))}
          </div>
        )}

        {step === "online" && checkout && (
          <div className="flex flex-col gap-3">
            <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-white/[0.04] dark:text-neutral-300">
              تم إنشاء عملية الدفع رقم <span className="font-mono" dir="ltr">{checkout.checkoutId}</span>. أكمل الدفع عبر البوابة ثم تابع من
              صفحة المدفوعات لمعرفة حالة العملية.
            </p>
            <a
              href={checkout.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-500/25"
            >
              <Wallet className="h-4 w-4" />
              المتابعة للدفع
            </a>
            <p className="text-center text-xs text-neutral-400">
              ستتم مراجعة العملية تلقائياً وتفعيل الاشتراك فور نجاح الدفع.
            </p>
          </div>
        )}

        {step === "manual" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <Ban className="h-4 w-4" />
              بعد إتمام التحويل عبر انستا باي، أدخل بيانات العملية وسيتم تفعيل اشتراكك خلال ساعات بعد المراجعة.
            </div>

            {instapayNumbers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  تحويل إلى
                </label>
                {instapayNumbers.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100" dir="ltr">
                        {n.number}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {n.label}
                        {n.accountName ? ` · ${n.accountName}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => { void navigator.clipboard.writeText(n.number); }}
                      className="shrink-0 rounded-lg bg-primary-500/10 px-2.5 py-1 text-[11px] font-semibold text-primary-600 hover:bg-primary-500/20 dark:text-primary-300"
                    >
                      نسخ
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                رقم العملية من انستا باي
              </label>
              <input
                dir="ltr"
                value={gatewayRef}
                onChange={(e) => { setGatewayRef(e.target.value); }}
                placeholder="رقم العملية"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                رقم المرسل (رقمك في انستا باي)
              </label>
              <input
                dir="ltr"
                value={senderNumber}
                onChange={(e) => { setSenderNumber(e.target.value); }}
                placeholder="01xxxxxxxxx"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                رقم المرسل إليه / رقم التحويل
              </label>
              <input
                dir="ltr"
                value={transactionRef}
                onChange={(e) => { setTransactionRef(e.target.value); }}
                placeholder="رقم التحويل"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                لقطة شاشة (اختياري)
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-4 text-sm text-neutral-500 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-400">
                <ImageUp className="h-5 w-5" />
                {screenshot ? "تم اختيار الصورة" : "إرفاق لقطة شاشة للتحويل"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { void handleFileChange(e); }} />
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex w-full gap-2">
            {step === "method" && (
              <>
                <Button variant="outline" size="sm" fullWidth onClick={handleClose}>
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  loading={isCheckingOut}
                  disabled={amount <= 0}
                  onClick={() => {
                    if (method === "instapay") {
                      setStep("manual");
                    } else {
                      void handlePayOnline();
                    }
                  }}
                >
                  {method === "instapay" ? "إدخال إثبات التحويل" : "الدفع الآن"}
                </Button>
              </>
            )}

            {step === "online" && (
              <Button variant="outline" size="sm" fullWidth onClick={handleClose}>
                تم الدفع
              </Button>
            )}

            {step === "manual" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => { setStep("method"); }}
                  disabled={isSubmittingProof}
                >
                  رجوع
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  loading={isSubmittingProof}
                  onClick={() => { void handleSubmitProof(); }}
                >
                  {isSubmittingProof ? (
                    <span className="flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> جاري الإرسال...</span>
                  ) : (
                    "إرسال إثبات الدفع"
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
