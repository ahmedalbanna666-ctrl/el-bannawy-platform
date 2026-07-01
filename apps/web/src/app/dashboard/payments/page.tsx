"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt } from "lucide-react";

interface Payment {
  id: string;
  productType: string;
  productId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  discount: number;
  createdAt: string;
  completedAt: string | null;
  invoice: { id: string; number: string } | null;
}

export default function PaymentsPage(): ReactNode {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments(): Promise<void> {
      try {
        const res = await api.get<Payment[]>("/payments/history");
        if (res.data) setPayments(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تحميل المدفوعات");
      } finally {
        setLoading(false);
      }
    }
    void fetchPayments();
  }, []);

  if (loading) return <PaymentsSkeleton />;
  if (error) return <ErrorState title="فشل تحميل المدفوعات" description={error} />;
  if (payments.length === 0) {
    return <EmptyState title="لا توجد مدفوعات" description="لا يوجد سجل مدفوعات بعد" icon={<CreditCard className="h-16 w-16" />} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">سجل المدفوعات</h1>
        <p className="mt-1 text-sm text-neutral-500">سجل معاملاتك وفواتيرك</p>
      </div>

      <div className="flex flex-col gap-3">
        {payments.map((payment) => (
          <Card key={payment.id} variant="outline" padding="sm">
            <CardContent>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${payment.status === "SUCCESSFUL" ? "bg-success-500/10" : payment.status === "REFUNDED" ? "bg-warning-500/10" : "bg-danger-500/10"}`}>
                    <CreditCard className={`h-5 w-5 ${payment.status === "SUCCESSFUL" ? "text-success-500" : payment.status === "REFUNDED" ? "text-warning-500" : "text-danger-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 capitalize">{payment.productType}</p>
                    <p className="text-xs text-neutral-500">
                      {payment.paymentMethod} • {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {payment.invoice && (
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <Receipt className="h-3 w-3" />
                      {payment.invoice.number}
                    </span>
                  )}
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {payment.amount} {payment.currency}
                  </span>
                  {payment.discount > 0 && (
                    <span className="text-xs text-success-600">-{payment.discount} {payment.currency}</span>
                  )}
                  <Badge variant={payment.status === "SUCCESSFUL" ? "success" : payment.status === "REFUNDED" ? "warning" : "danger"}>
                    {payment.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PaymentsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}
