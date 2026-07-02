"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users,
  User,
  Clock,
  Calendar,
  Zap,
  Star,
  ShieldCheck,
  RotateCw,
  Headphones,
  Lock,
  Play,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

// ── Types (Backend-Ready — mirrors future API response shapes) ──────

type SubscriptionType = "PRIVATE_MONTHLY" | "GROUP_MONTHLY" | "ONE_TIME_PRIVATE";

interface SubscriptionData {
  type: SubscriptionType;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  teacherName: string;
  groupName?: string;
  nextSession: { date: string; time: string };
  sessionsUsed: number;
  sessionsTotal: number;
}

interface UpcomingSession {
  id: string;
  teacherName: string;
  teacherAvatar: string;
  type: "PRIVATE" | "GROUP";
  date: string;
  time: string;
  relativeStatus: "TODAY" | "TOMORROW" | "IN_2_HOURS" | "NOW" | "COMPLETED";
}

interface AvailableService {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  benefits: string[];
  badge?: string;
  buttonLabel: string;
  href: string;
  featured: boolean;
}

// ── Placeholder Data (replace with React Query when backend is ready) ─

const SUBSCRIPTION_DATA: SubscriptionData[] = [
  {
    type: "PRIVATE_MONTHLY",
    status: "ACTIVE",
    teacherName: "أحمد البنا",
    nextSession: { date: "2026-07-04", time: "19:00" },
    sessionsUsed: 5,
    sessionsTotal: 8,
  },
  {
    type: "GROUP_MONTHLY",
    status: "ACTIVE",
    teacherName: "أحمد البنا",
    groupName: "مجموعة المحادثة A",
    nextSession: { date: "2026-07-05", time: "16:30" },
    sessionsUsed: 3,
    sessionsTotal: 8,
  },
];

const UPCOMING_SESSIONS: UpcomingSession[] = [
  {
    id: "s1",
    teacherName: "أحمد البنا",
    teacherAvatar: "",
    type: "PRIVATE",
    date: "2026-07-04",
    time: "19:00",
    relativeStatus: "TOMORROW",
  },
  {
    id: "s2",
    teacherName: "أحمد البنا",
    teacherAvatar: "",
    type: "GROUP",
    date: "2026-07-05",
    time: "16:30",
    relativeStatus: "IN_2_HOURS",
  },
  {
    id: "s3",
    teacherName: "أحمد البنا",
    teacherAvatar: "",
    type: "PRIVATE",
    date: "2026-07-02",
    time: "10:00",
    relativeStatus: "COMPLETED",
  },
];

const SERVICES: AvailableService[] = [
  {
    id: "private-monthly",
    icon: <User className="h-6 w-6" />,
    title: "اشتراك فردي شهري",
    description: "موعد ثابت أسبوعياً مع المعلم.",
    benefits: ["اهتمام كامل", "خطة مخصصة", "مواعيد ثابتة"],
    badge: "الأكثر طلباً",
    buttonLabel: "اشترك الآن",
    href: "/dashboard/live/book",
    featured: true,
  },
  {
    id: "group-monthly",
    icon: <Users className="h-6 w-6" />,
    title: "اشتراك مجموعة",
    description: "انضم إلى مجموعة ثابتة.",
    benefits: ["سعر أقل", "تفاعل جماعي", "مواعيد ثابتة"],
    buttonLabel: "عرض المجموعات",
    href: "/dashboard/live/book",
    featured: false,
  },
  {
    id: "one-time",
    icon: <Zap className="h-6 w-6" />,
    title: "احجز حصة فردية",
    description: "احجز حصة واحدة حسب المواعيد المتاحة.",
    benefits: ["اختيار اليوم", "اختيار الوقت", "مرونة كاملة"],
    buttonLabel: "احجز الآن",
    href: "/dashboard/live/book",
    featured: false,
  },
];

const RELATIVE_LABELS: Record<string, { label: string; color: "success" | "primary" | "warning" | "secondary" }> = {
  TODAY: { label: "اليوم", color: "primary" },
  TOMORROW: { label: "غداً", color: "primary" },
  IN_2_HOURS: { label: "بعد ساعتين", color: "warning" },
  NOW: { label: "بدأت الآن", color: "success" },
  COMPLETED: { label: "انتهت", color: "secondary" },
};

// ── Sub-components ───────────────────────────────────────────────────

function SubscriptionHero({ subscriptions }: { subscriptions: SubscriptionData[] }): ReactNode {
  const count = subscriptions.length;

  if (count === 0) {
    return (
      <Card variant="gradient" padding="none" className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">لا يوجد اشتراك نشط</h2>
              <p className="mt-1 text-sm text-white/70">
                اشترك الآن للاستفادة من الحصص المباشرة
              </p>
            </div>
            <Button variant="primary" size="md" className="bg-white text-primary-600 hover:bg-white/90">
              اشترك الآن
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
      {subscriptions.map((sub, idx) => {
        const isPrivate = sub.type === "PRIVATE_MONTHLY";
        const isGroup = sub.type === "GROUP_MONTHLY";
        const remaining = sub.sessionsTotal - sub.sessionsUsed;
        const progressPct = Math.round((sub.sessionsUsed / sub.sessionsTotal) * 100);

        return (
          <Card
            key={idx}
            variant="gradient"
            padding="none"
            className="min-w-[300px] flex-1 snap-center overflow-hidden"
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isPrivate && (
                      <>
                        <User className="h-4 w-4 text-white/70" />
                        <h2 className="text-sm font-bold text-white">اشتراك فردي</h2>
                      </>
                    )}
                    {isGroup && (
                      <>
                        <Users className="h-4 w-4 text-white/70" />
                        <h2 className="text-sm font-bold text-white">اشتراك مجموعة</h2>
                      </>
                    )}
                  </div>
                  <Badge className="bg-white/20 text-white text-[10px]">نشط</Badge>
                </div>

                <div>
                  <p className="text-xs text-white/60">المعلم</p>
                  <p className="text-base font-semibold text-white">{sub.teacherName}</p>
                  {sub.groupName && (
                    <p className="text-sm text-white/70 mt-0.5">{sub.groupName}</p>
                  )}
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-white/60">الحصة القادمة</p>
                  <div className="mt-1 flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-white/50" />
                    <span className="text-sm font-medium text-white">{sub.nextSession.date}</span>
                    <span className="text-xs text-white/40">•</span>
                    <Clock className="h-4 w-4 text-white/50" />
                    <span className="text-sm font-medium text-white">{sub.nextSession.time}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">
                      {remaining} / {sub.sessionsTotal} حصص متبقية
                    </span>
                    <span className="text-white/50">{String(progressPct)}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-white/60 transition-all"
                      style={{ width: `${String(progressPct)}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  className="mt-1 bg-white text-primary-600 hover:bg-white/90"
                >
                  <Play className="h-4 w-4" />
                  انضم للحصة
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ServiceCards(): ReactNode {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SERVICES.map((service) => (
        <Card
          key={service.id}
          variant={service.featured ? "elevated" : "outline"}
          padding="none"
          className={`group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
            service.featured ? "ring-1 ring-primary-500/30 shadow-primary-500/5" : ""
          }`}
        >
          {service.badge && (
            <div className="absolute left-4 top-4">
              <Badge variant="primary" className="text-[10px] shadow-sm">
                <Sparkles className="mr-1 h-3 w-3" />
                {service.badge}
              </Badge>
            </div>
          )}

          <CardContent className="p-5">
            <div className="flex flex-col items-center gap-3 pt-4 text-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                  service.featured
                    ? "bg-primary-500/10 text-primary-500 group-hover:bg-primary-500 group-hover:text-white"
                    : "bg-neutral-100 text-neutral-500 group-hover:bg-primary-500/10 group-hover:text-primary-500 dark:bg-neutral-800"
                }`}
              >
                {service.icon}
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {service.title}
                </h3>
                <p className="mt-1 text-xs text-neutral-400">{service.description}</p>
              </div>

              <ul className="flex flex-col gap-1 w-full">
                {service.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-2 text-xs text-neutral-500"
                  >
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-success-500" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <Link href={service.href} className="w-full">
                <Button
                  variant={service.featured ? "primary" : "outline"}
                  size="sm"
                  fullWidth
                  className="mt-1"
                >
                  {service.buttonLabel}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UpcomingSessionsList({ sessions }: { sessions: UpcomingSession[] }): ReactNode {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-16 w-16" />}
        title="لا توجد حصص قادمة"
        description="ستظهر حصصك المحجوزة هنا"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => {
        const rel = RELATIVE_LABELS[session.relativeStatus] ?? {
          label: session.relativeStatus,
          color: "secondary" as const,
        };
        const isCompleted = session.relativeStatus === "COMPLETED";
        const isLive = session.relativeStatus === "NOW";

        return (
          <Card
            key={session.id}
            variant={isLive ? "elevated" : "outline"}
            padding="md"
            className={`transition-all duration-200 ${
              isCompleted ? "opacity-60" : ""
            } ${isLive ? "border-success-500/30 shadow-success-500/5" : ""}`}
          >
            <CardContent>
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
                    session.type === "PRIVATE"
                      ? "bg-primary-500/10 text-primary-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {session.teacherName.charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {session.teacherName}
                    </h3>
                    <Badge
                      variant={session.type === "PRIVATE" ? "primary" : "warning"}
                      className="text-[10px]"
                    >
                      {session.type === "PRIVATE" ? "فردي" : "مجموعة"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {session.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.time}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={rel.color} className="text-[10px]">
                    {rel.label}
                  </Badge>
                  {!isCompleted && (
                    <Button
                      variant={isLive ? "success" : "primary"}
                      size="sm"
                    >
                      <Play className="h-4 w-4" />
                      انضم
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function FeatureCards(): ReactNode {
  const features = [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      label: "جودة عالية",
      color: "bg-success-500/10 text-success-500",
    },
    {
      icon: <RotateCw className="h-5 w-5" />,
      label: "مواعيد مرنة",
      color: "bg-primary-500/10 text-primary-500",
    },
    {
      icon: <Headphones className="h-5 w-5" />,
      label: "دعم مستمر",
      color: "bg-warning-500/10 text-warning-500",
    },
    {
      icon: <Lock className="h-5 w-5" />,
      label: "دفع آمن",
      color: "bg-info-500/10 text-info-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {features.map((f) => (
        <Card key={f.label} variant="default" padding="sm" className="text-center">
          <CardContent>
            <div className="flex flex-col items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                {f.icon}
              </div>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {f.label}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function LiveSessionsPage(): ReactNode {
  const router = useRouter();

  const hasSubscription = SUBSCRIPTION_DATA.length > 0;

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Page Header */}
      <div>
        <button
          onClick={(): void => { router.push("/dashboard"); }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للرئيسية
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          الحصص المباشرة
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          احجز حصتك المباشرة وتعلم مع أفضل المعلمين
        </p>
      </div>

      {/* SECTION 1 — Current Subscription */}
      <section>
        {hasSubscription && (
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              اشتراكك الحالي
            </h2>
          </div>
        )}
        <SubscriptionHero subscriptions={SUBSCRIPTION_DATA} />
      </section>

      {/* SECTION 2 — Available Services */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            الخدمات المتاحة
          </h2>
          <p className="text-sm text-neutral-500">اختر الطريقة المناسبة للتعلم</p>
        </div>
        <ServiceCards />
      </section>

      {/* SECTION 3 — Upcoming Sessions */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-neutral-900 dark:text-neutral-100">
          حصصك القادمة
        </h2>
        <UpcomingSessionsList sessions={UPCOMING_SESSIONS} />
      </section>

      {/* SECTION 4 — Features */}
      <section>
        <FeatureCards />
      </section>
    </div>
  );
}
