"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useGameSettings } from "@/lib/games/settings";
import {
  Volume2,
  Mic,
  Brain,
  Sparkles,
  Save,
  Award,
  Coins,
} from "lucide-react";

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  helperText?: string;
  onChange: (value: number) => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  helperText,
  onChange,
}: NumberFieldProps): ReactNode {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e): void => {
          const parsed = Number(e.target.value);
          if (Number.isNaN(parsed)) return;
          onChange(Math.max(min, Math.min(max, parsed)));
        }}
        className="h-12 rounded-xl border-2 border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-100"
      />
      {helperText && <span className="text-xs text-neutral-400">{helperText}</span>}
    </label>
  );
}

export default function TeacherGamesPage(): ReactNode {
  const { settings, updateListening, updatePronunciation, updateMemory } =
    useGameSettings();
  const lc = settings.listeningChallenge;
  const pc = settings.pronunciationChallenge;
  const mg = settings.memoryGame;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-500">
            <Sparkles className="h-6 w-6" />
          </span>
          إدارة الألعاب
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          اضبط إعدادات الألعاب التعليمية الثلاث التي يراها الطلاب.
        </p>
      </div>

      {/* Listening challenge */}
      <Card variant="outline" padding="none">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
              <Volume2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-100">
                تحدي الاستماع
              </h2>
              <p className="text-sm text-neutral-500">
                يستمع الطالب للكلمة ويختار معناها الصحيح.
              </p>
            </div>
          </div>

          <Switch
            label="تفعيل اللعبة للطلاب"
            checked={lc.enabled}
            onChange={(e): void => {
              updateListening({ enabled: e.target.checked });
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="عدد مرات إعادة التشغيل المسموحة لكل كلمة"
              value={lc.replayLimit}
              min={0}
              max={10}
              helperText="كلما زاد العدد سهُل التحدي. ضعه صفراً لمنع الإعادة."
              onChange={(replayLimit): void => {
                updateListening({ replayLimit });
              }}
            />
            <NumberField
              label="عدد الأسئلة في الجولة الواحدة"
              value={lc.questionsPerRound}
              min={1}
              max={30}
              onChange={(questionsPerRound): void => {
                updateListening({ questionsPerRound });
              }}
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-success-500/10 p-3 text-sm text-success-600 dark:text-success-400">
            <Save className="h-4 w-4" />
            يتم حفظ الإعدادات تلقائياً.
          </div>
        </CardContent>
      </Card>

      {/* Pronunciation challenge */}
      <Card variant="outline" padding="none">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-warning-500/10 text-warning-500">
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

          <Switch
            label="تفعيل اللعبة للطلاب"
            checked={pc.enabled}
            onChange={(e): void => {
              updatePronunciation({ enabled: e.target.checked });
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="نسبة النجاح المطلوبة (٪)"
              value={pc.threshold}
              min={50}
              max={100}
              helperText="عند بلوغ هذه النسبة يُكشف المعنى ويُمنح الطالب المكافأة."
              onChange={(threshold): void => {
                updatePronunciation({ threshold });
              }}
            />
            <NumberField
              label="عدد الكلمات في الجولة الواحدة"
              value={pc.questionsPerRound}
              min={1}
              max={30}
              onChange={(questionsPerRound): void => {
                updatePronunciation({ questionsPerRound });
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="مكافأة XP لكل كلمة"
              value={pc.xpReward}
              min={0}
              max={100}
              onChange={(xpReward): void => {
                updatePronunciation({ xpReward });
              }}
            />
            <NumberField
              label="مكافأة العملات لكل كلمة"
              value={pc.coinReward}
              min={0}
              max={100}
              onChange={(coinReward): void => {
                updatePronunciation({ coinReward });
              }}
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
            <Award className="h-4 w-4" />
            تُمنح المكافآت عند تجاوز نسبة النجاح المطلوبة.
            <Coins className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Memory game */}
      <Card variant="outline" padding="none">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-100">
                لعبة الذاكرة
              </h2>
              <p className="text-sm text-neutral-500">
                يقلّب الطالب البطاقات ويطابق كل كلمة إنجليزية مع معناها.
              </p>
            </div>
          </div>

          <Switch
            label="تفعيل اللعبة للطلاب"
            checked={mg.enabled}
            onChange={(e): void => {
              updateMemory({ enabled: e.target.checked });
            }}
          />

          <NumberField
            label="عدد الأزواج في الجولة الواحدة"
            value={mg.wordsPerRound}
            min={3}
            max={16}
            helperText="عدد كلمات التحدي في كل جولة (زوج واحد = كلمة + ترجمتها)."
            onChange={(wordsPerRound): void => {
              updateMemory({ wordsPerRound });
            }}
          />

          <div className="flex items-center gap-2 rounded-xl bg-success-500/10 p-3 text-sm text-success-600 dark:text-success-400">
            <Save className="h-4 w-4" />
            يتم حفظ الإعدادات تلقائياً.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
