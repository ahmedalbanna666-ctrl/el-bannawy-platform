"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { getDashboardModules } from "@/lib/nav-registry";
import { HeadphonesIcon, BookOpen, Puzzle, MessageSquare, ScrollText, LibraryBig } from "lucide-react";

function formatTodayArabic(): string {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function StaffDashboard(): ReactNode {
  const router = useRouter();
  const { can } = usePermissions();
  const user = useAuthStore((s) => s.user);

  const modules = useMemo(() => getDashboardModules(can, user?.role), [can, user?.role]);

  const supportQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await api.get<{ data: readonly unknown[]; meta: { total: number } }>("/support/tickets?page=1&limit=5");
      return res.data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          مرحبًا، {user?.fullName ?? "الموظف"}
        </h1>
        <p className="text-sm text-neutral-400">{formatTodayArabic()}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {modules.map((mod) => (
          <Card
            key={mod.id}
            variant="default"
            padding="md"
            interactive
            onClick={() => { router.push(mod.route); }}
          >
            <CardContent className="flex flex-col items-center gap-2 p-0">
              <div className="rounded-xl bg-primary-500/10 p-3">
                <mod.icon className="h-6 w-6 text-primary-400" />
              </div>
              <span className="text-center text-sm font-semibold text-white">{mod.title}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="default" padding="lg">
          <CardContent className="p-0">
            <h2 className="mb-3 text-lg font-bold text-white">آخر التذاكر</h2>
            {supportQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-800" />
                ))}
              </div>
            ) : (supportQuery.data?.data as readonly { id: string; subject: string; status: string }[] | undefined)?.length ? (
              <div className="space-y-2">
                {(supportQuery.data?.data as readonly { id: string; subject: string; status: string }[]).slice(0, 5).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-xl bg-neutral-800/50 px-4 py-3"
                  >
                    <span className="text-sm text-white">{ticket.subject}</span>
                    <span className="rounded-lg bg-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
                      {ticket.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">لا توجد تذاكر مفتوحة</p>
            )}
          </CardContent>
        </Card>

        <Card variant="default" padding="lg">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">إجراءات سريعة</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { icon: HeadphonesIcon, label: "الدعم", href: "/dashboard/support" },
                { icon: BookOpen, label: "الدروس", href: "/dashboard/units" },
                { icon: ScrollText, label: "القصص", href: "/dashboard/stories" },
                { icon: LibraryBig, label: "المراجعات", href: "/dashboard/final-reviews" },
                { icon: Puzzle, label: "المحتوى", href: "/dashboard/units" },
                { icon: MessageSquare, label: "الإشعارات", href: "/dashboard/notifications" },
              ].map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => { router.push(item.href); }}
                  className="flex flex-col items-center gap-2 rounded-xl bg-neutral-800/50 px-4 py-4 transition-all hover:bg-neutral-800"
                >
                  <item.icon className="h-5 w-5 text-primary-400" />
                  <span className="text-xs font-medium text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
