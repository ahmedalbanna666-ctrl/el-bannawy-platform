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
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary-400" />
          <h2 className="text-base font-extrabold text-neutral-100">المعلومات الوظيفية</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
            <Briefcase className="h-5 w-5 text-primary-400" />
            <div>
              <p className="text-xs text-neutral-500">المسمى الوظيفي</p>
              <p className="text-sm font-medium text-neutral-200">
                {profile.jobTitle ?? <span className="text-neutral-600">غير محدد</span>}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-neutral-400" />
              <p className="text-sm font-medium text-neutral-400">الصلاحيات الممنوحة</p>
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
              <p className="text-sm text-neutral-600">لا توجد صلاحيات ممنوحة</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
