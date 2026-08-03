"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Globe } from "lucide-react";
import type { AdminProfileResponse } from "../types";

interface Props {
  profile: AdminProfileResponse["roleProfile"];
}

export function AdminProfileSection({ profile }: Props): ReactNode {
  return (
    <Card variant="glass" padding="lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
            <Shield className="h-5 w-5 text-primary-500 dark:text-primary-400" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">المعلومات الإدارية</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:text-primary-400">
              <Shield className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">نوع الإدارة</p>
              <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {profile.administrationType === "Platform Admin"
                  ? "مدير المنصة"
                  : "مدير بصلاحيات مخصصة"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:text-primary-400">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">نطاق الوصول</p>
              <div className="mt-1">
                <Badge variant={profile.accessScope === "FULL" ? "success" : "warning"}>
                  {profile.accessScope === "FULL" ? "وصول كامل" : "وصول مخصص"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
