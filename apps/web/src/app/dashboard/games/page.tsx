"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGameSettings } from "@/lib/games/settings";
import {
  Volume2,
  Sparkles,
  Gamepad2,
  Mic,
  Lock,
  ArrowLeft,
  Brain,
  Zap,
  Trophy,
} from "lucide-react";

interface GameCardData {
  key: "listening" | "pronunciation" | "memory";
  title: string;
  description: string;
  icon: ReactNode;
  href: string | null;
  soon: boolean;
  accent: string;
  iconBg: string;
  tag: string;
  tagVariant: "primary" | "warning" | "info";
  stat: string;
}

const GAMES: GameCardData[] = [
  {
    key: "listening",
    title: "تحدي الاستماع",
    description:
      "اسمع الكلمة الإنجليزية واختر معناها الصحيح من بين الخيارات. طوّر مهارة الفهم السمعي لديك.",
    icon: <Volume2 className="h-8 w-8" />,
    href: "/dashboard/games/listening-challenge",
    soon: false,
    accent: "from-primary-500 to-secondary-600",
    iconBg: "bg-primary-500/15 text-primary-500",
    tag: "فهم سمعي",
    tagVariant: "primary",
    stat: "10 أسئلة",
  },
  {
    key: "pronunciation",
    title: "تحدي النطق",
    description:
      "انطق الكلمة الظاهرة أمامك وليكشف النظام دقة نطقك ويحفّزك بمكافآت XP وعملات.",
    icon: <Mic className="h-8 w-8" />,
    href: "/dashboard/games/pronunciation-challenge",
    soon: false,
    accent: "from-warning-500 to-rose-500",
    iconBg: "bg-warning-500/15 text-warning-500",
    tag: "نطق وتحدث",
    tagVariant: "warning",
    stat: "+XP وعملات",
  },
  {
    key: "memory",
    title: "لعبة الذاكرة",
    description: "قلّب البطاقات وطابق كل كلمة إنجليزية مع معناها. قوّي ذاكرتك ووسّع مفرداتك.",
    icon: <Brain className="h-8 w-8" />,
    href: "/dashboard/games/memory",
    soon: false,
    accent: "from-purple-500 to-primary-600",
    iconBg: "bg-purple-500/15 text-purple-500",
    tag: "ذاكرة بصرية",
    tagVariant: "info",
    stat: "12 زوج",
  },
];

export default function GamesHubPage(): ReactNode {
  const { settings } = useGameSettings();

  const disabledGames = GAMES.filter((g) => {
    if (g.key === "listening") return !settings.listeningChallenge.enabled;
    if (g.key === "pronunciation") return !settings.pronunciationChallenge.enabled;
    return !settings.memoryGame.enabled;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <Card variant="gradient" padding="lg" className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner">
            <Gamepad2 className="h-11 w-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant="primary" className="w-fit bg-white/20 text-white hover:bg-white/20">
              <Zap className="h-3.5 w-3.5" />
              العب وتعلم
            </Badge>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              الألعاب التعليمية
            </h1>
            <p className="text-sm text-white/85">
              كل الألعاب تعتمد على كلمات من منهجك الدراسي. اختر لعبة وابدأ التحدي الآن.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card variant="outline" padding="sm" className="items-center text-center">
          <CardContent className="flex flex-col items-center gap-1">
            <Trophy className="h-5 w-5 text-amber-500" />
            <p className="text-lg font-black text-neutral-900 dark:text-neutral-100">3</p>
            <p className="text-[11px] text-neutral-500">ألعاب متاحة</p>
          </CardContent>
        </Card>
        <Card variant="outline" padding="sm" className="items-center text-center">
          <CardContent className="flex flex-col items-center gap-1">
            <Volume2 className="h-5 w-5 text-primary-500" />
            <p className="text-lg font-black text-neutral-900 dark:text-neutral-100">عربي</p>
            <p className="text-[11px] text-neutral-500">تعليم إنجليزي</p>
          </CardContent>
        </Card>
        <Card variant="outline" padding="sm" className="items-center text-center">
          <CardContent className="flex flex-col items-center gap-1">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <p className="text-lg font-black text-neutral-900 dark:text-neutral-100">∞</p>
            <p className="text-[11px] text-neutral-500">إعادة لعب</p>
          </CardContent>
        </Card>
      </div>

      {/* Game cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => {
          const disabled = disabledGames.some((g) => g.key === game.key);
          return (
            <Card
              key={game.title}
              variant="outline"
              padding="none"
              className={`group flex h-full flex-col overflow-hidden transition-all duration-200 ${
                disabled ? "opacity-70" : "hover:-translate-y-0.5"
              }`}
            >
              <div className={`h-1.5 w-full bg-gradient-to-r ${game.accent}`} />
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${game.iconBg}`}>
                    {game.icon}
                  </div>
                  <Badge variant={game.tagVariant}>{game.tag}</Badge>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {game.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-neutral-500">{game.description}</p>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
                  <span>{game.stat}</span>
                  <span className="flex items-center gap-1 text-success-600 dark:text-success-400">
                    <Trophy className="h-3.5 w-3.5" />
                    ممتع وتعليمي
                  </span>
                </div>

                {game.soon ? (
                  <Button variant="ghost" disabled fullWidth>
                    <Lock className="h-4 w-4" />
                    قريباً
                  </Button>
                ) : disabled ? (
                  <Button variant="ghost" disabled fullWidth>
                    <Lock className="h-4 w-4" />
                    غير مفعّلة حالياً
                  </Button>
                ) : (
                  <Link href={game.href ?? "#"} className="w-full">
                    <Button variant="primary" fullWidth>
                      ابدأ اللعب
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
