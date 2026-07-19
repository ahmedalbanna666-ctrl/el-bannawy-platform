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
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary-400" />
          <h2 className="text-base font-extrabold text-neutral-100">المعلومات الإدارية</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
            <Shield className="h-5 w-5 text-primary-400" />
            <div>
              <p className="text-xs text-neutral-500">نوع الإدارة</p>
              <p className="text-sm font-medium text-neutral-200">
                {profile.administrationType === "Platform Admin"
                  ? "مدير المنصة"
                  : "مدير بصلاحيات مخصصة"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
            <Globe className="h-5 w-5 text-primary-400" />
            <div>
              <p className="text-xs text-neutral-500">نطاق الوصول</p>
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
