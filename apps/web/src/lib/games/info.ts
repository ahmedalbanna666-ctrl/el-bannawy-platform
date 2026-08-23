type GameKey = "listening" | "pronunciation" | "memory";

interface GameIntroInfo {
  title: string;
  description: string;
}

export const GAME_INTRO: Record<GameKey, GameIntroInfo> = {
  listening: {
    title: "تحدي الاستماع",
    description:
      "اسمع الكلمة الإنجليزية واختر معناها الصحيح من بين الخيارات. طوّر مهارة الفهم السمعي لديك.",
  },
  pronunciation: {
    title: "تحدي النطق",
    description:
      "انطق الكلمة الظاهرة أمامك وليكشف النظام دقة نطقك ويحفّزك بمكافآت XP وعملات.",
  },
  memory: {
    title: "لعبة الذاكرة",
    description:
      "قلّب البطاقات وطابق كل كلمة إنجليزية مع معناها. قوّي ذاكرتك ووسّع مفرداتك.",
  },
};

export type { GameKey, GameIntroInfo };
