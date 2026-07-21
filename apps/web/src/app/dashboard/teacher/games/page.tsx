"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useGameSettings } from "@/lib/games/settings";
import { Volume2, Mic, Sparkles, Save, Award, Coins } from "lucide-react";

export default function TeacherGamesPage(): ReactNode {
  const { settings, updateListening, updatePronunciation } = useGameSettings();
  const lc = settings.listeningChallenge;
  const pc = settings.pronunciationChallenge;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <Sparkles className="h-7 w-7 text-primary-500" />
          إدارة الألعاب
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          اضبط إعدادات الألعاب التعليمية التي يراها الطلاب.
        </p>
      </div>

      <Card variant="outline" padding="none">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
              <Volume2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-100">
                تحدي الاستماع والنطق
              </h2>
              <p className="text-sm text-neutral-500">
                يستمع الطالب للكلمة ويختار معناها.
              </p>
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-700/50">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              تفعيل اللعبة للطلاب
            </span>
            <input
              type="checkbox"
              checked={lc.enabled}
              onChange={(e): void => {
                updateListening({ enabled: e.target.checked });
              }}
              className="h-5 w-5 accent-primary-500"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              عدد مرات إعادة التشغيل المسموحة لكل كلمة
            </span>
            <input
              type="number"
              min={0}
              max={10}
              value={lc.replayLimit}
              onChange={(e): void => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                updateListening({ replayLimit: Math.max(0, Math.min(10, value)) });
              }}
              className="h-12 rounded-xl border-2 border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-100"
            />
            <span className="text-xs text-neutral-400">
              كلما زاد العدد سهُل التحدي. ضعه صفراً لمنع الإعادة.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              عدد الأسئلة في الجولة الواحدة
            </span>
            <input
              type="number"
              min={1}
              max={30}
              value={lc.questionsPerRound}
              onChange={(e): void => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                updateListening({
                  questionsPerRound: Math.max(1, Math.min(30, value)),
                });
              }}
              className="h-12 rounded-xl border-2 border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-100"
            />
          </label>

          <div className="flex items-center gap-2 rounded-xl bg-success-500/10 p-3 text-sm text-success-600 dark:text-success-400">
            <Save className="h-4 w-4" />
            يتم حفظ الإعدادات تلقائياً.
          </div>
        </CardContent>
      </Card>

      <Card variant="outline" padding="none">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-100">
                تحدي النطق
              </h2>
              <p className="text-sm text-neutral-500">
                ينطق الطالب الكلمة ويكشف النظام دقة النطق.
              </p>
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-700/50">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              تفعيل اللعبة للطلاب
            </span>
            <input
              type="checkbox"
              checked={pc.enabled}
              onChange={(e): void => {
                updatePronunciation({ enabled: e.target.checked });
              }}
              className="h-5 w-5 accent-primary-500"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              نسبة النجاح المطلوبة (٪)
            </span>
            <input
              type="number"
              min={50}
              max={100}
              value={pc.threshold}
              onChange={(e): void => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                updatePronunciation({
                  threshold: Math.max(50, Math.min(100, value)),
                });
              }}
              className="h-12 rounded-xl border-2 border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-100"
            />
            <span className="text-xs text-neutral-400">
              عند بلوغ هذه النسبة يُكشف المعنى ويُمنح الطالب المكافأة.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                <Award className="h-4 w-4 text-amber-500" />
                مكافأة XP لكل كلمة
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={pc.xpReward}
                onChange={(e): void => {
                  const value = Number(e.target.value);
                  if (Number.isNaN(value)) return;
                  updatePronunciation({
                    xpReward: Math.max(0, Math.min(100, value)),
                  });
                }}
                className="h-12 rounded-xl border-2 border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-100"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                <Coins className="h-4 w-4 text-amber-500" />
                مكافأة العملات لكل كلمة
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={pc.coinReward}
                onChange={(e): void => {
                  const value = Number(e.target.value);
                  if (Number.isNaN(value)) return;
                  updatePronunciation({
                    coinReward: Math.max(0, Math.min(100, value)),
                  });
                }}
                className="h-12 rounded-xl border-2 border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-100"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              عدد الكلمات في الجولة الواحدة
            </span>
            <input
              type="number"
              min={1}
              max={30}
              value={pc.questionsPerRound}
              onChange={(e): void => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                updatePronunciation({
                  questionsPerRound: Math.max(1, Math.min(30, value)),
                });
              }}
              className="h-12 rounded-xl border-2 border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-100"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
