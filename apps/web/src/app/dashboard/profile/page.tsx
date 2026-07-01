"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Layers,
  Lock,
  Crown,
  LogOut,
} from "lucide-react";

export default function ProfilePage(): ReactNode {
  const router = useRouter();
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || "User")}&background=22D3EE&color=fff&bold=true&font-size=0.33&size=128`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Personal Information */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#22D3EE]" />
            <h2 className="text-base font-extrabold text-slate-100">المعلومات الشخصية</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <img
              src={avatarUrl}
              alt=""
              className="h-24 w-24 shrink-0 rounded-full border-2 border-[#22D3EE] shadow-[0_0_20px_rgba(34,211,238,0.25)] object-cover"
            />
            <div className="flex flex-1 flex-col gap-3 text-center sm:text-start">
              <div>
                <p className="text-lg font-extrabold text-slate-50">{user?.fullName ?? "Student"}</p>
                <p className="text-sm text-slate-400 capitalize">{user?.role ?? "Student"}</p>
              </div>
              <div className="flex flex-col gap-2">
                {user?.mobileNumber && (
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone className="h-4 w-4 text-slate-500" />
                    {user.mobileNumber}
                  </span>
                )}
                <span className="flex items-center gap-2 text-sm text-slate-400">
                  <Mail className="h-4 w-4 text-slate-500" />
                  {firstName.toLowerCase()}@student.edu
                </span>
                <span className="flex items-center gap-2 text-sm text-slate-400">
                  <GraduationCap className="h-4 w-4 text-slate-500" />
                  طالب نشط
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Information */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#22D3EE]" />
            <h2 className="text-base font-extrabold text-slate-100">تعديل المعلومات</h2>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="md" fullWidth className="justify-start gap-3">
            <User className="h-4 w-4" />
            تعديل الملف الشخصي
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#22D3EE]" />
            <h2 className="text-base font-extrabold text-slate-100">الأمان</h2>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="md"
            fullWidth
            className="justify-start gap-3"
            onClick={(): void => { router.push("/reset-password"); }}
          >
            <Lock className="h-4 w-4" />
            تغيير كلمة المرور
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-400" />
            <h2 className="text-base font-extrabold text-slate-100">الاشتراك</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span className="text-sm text-slate-400">الخطة الحالية</span>
              <span className="text-sm font-extrabold text-[#22D3EE]">مجاني</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span className="text-sm text-slate-400">الحالة</span>
              <span className="text-sm font-extrabold text-[#10B981]">نشط</span>
            </div>
            <Button variant="primary" size="sm" fullWidth className="mt-1">
              <Crown className="h-4 w-4" />
              تجديد الاشتراك
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card variant="glass" padding="lg">
        <CardContent>
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={(): void => {
              void logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
