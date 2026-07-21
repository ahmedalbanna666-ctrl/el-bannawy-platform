"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  Sparkles,
  Gamepad2,
  Mic,
  Lock,
  ArrowLeft,
} from "lucide-react";

interface GameCardData {
  title: string;
  description: string;
  icon: ReactNode;
  href: string | null;
  soon: boolean;
  accent: string;
}

export default function GamesHubPage(): ReactNode {
  const games: GameCardData[] = [
    {
      title: "تحدي الاستماع والنطق",
      description:
        "اسمع الكلمة الإنجليزية واختر معناها الصحيح من بين الخيارات. طوّر نطقك وحصيلتك.",
      icon: <Volume2 className="h-7 w-7" />,
      href: "/dashboard/games/listening-challenge",
      soon: false,
      accent: "bg-primary-500/10 text-primary-500",
    },
    {
      title: "تحدي النطق",
      description:
        "انطق الكلمة الظاهرة أمامك وليكشف النظام دقة نطقك ويمنحك مكافات.",
      icon: <Mic className="h-7 w-7" />,
      href: "/dashboard/games/pronunciation-challenge",
      soon: false,
      accent: "bg-primary-500/10 text-primary-500",
    },
    {
      title: "لعبة الذاكرة",
      description: "قوّي ذاكرتك بالكلمات والصور وتحدّى سرعتك.",
      icon: <Sparkles className="h-7 w-7" />,
      href: null,
      soon: true,
      accent: "bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <Gamepad2 className="h-7 w-7 text-primary-500" />
          الألعاب التعليمية
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          العب وأنت تتعلم. كل الألعاب تعتمد على كلمات من منهجك الدراسي.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card key={game.title} variant="outline" padding="none" className="overflow-hidden">
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${game.accent}`}
              >
                {game.icon}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {game.title}
                </h2>
                <p className="text-sm text-neutral-500">{game.description}</p>
              </div>

              {game.soon ? (
                <Button variant="ghost" disabled className="w-full">
                  <Lock className="h-4 w-4" />
                  قريباً
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
        ))}
      </div>
    </div>
  );
}
