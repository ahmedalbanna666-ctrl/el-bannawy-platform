"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Shield } from "lucide-react";
import type { StaffProfileResponse } from "../types";

interface Props {
  profile: StaffProfileResponse["roleProfile"];
}

export function StaffProfileSection({ profile }: Props): ReactNode {
  return (
    <Card variant="glass" padding="lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
            <Briefcase className="h-5 w-5 text-primary-500 dark:text-primary-400" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">المعلومات الوظيفية</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:text-primary-400">
              <Briefcase className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">المسمى الوظيفي</p>
              <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {profile.jobTitle ?? <span className="font-normal text-neutral-400 dark:text-neutral-500">غير محدد</span>}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">الصلاحيات الممنوحة</p>
            </div>
            {profile.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.permissions.map((perm) => (
                  <Badge key={perm.key} variant="info">
                    {perm.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                <span className="font-normal text-neutral-400 dark:text-neutral-500">لا توجد صلاحيات ممنوحة</span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
