export type CardBorderGroupKey = "staff" | "student" | "auth";

export interface CardBorderPageOption {
  key: string;
  label: string;
  groups: readonly CardBorderGroupKey[];
  match: (pathname: string) => boolean;
}

export const CARD_BORDER_PAGE_OPTIONS: CardBorderPageOption[] = [
  { key: "dashboard", label: "الرئيسية / لوحة التحكم", groups: ["staff", "student"], match: (p) => p === "/dashboard" },
  { key: "units", label: "الوحدات", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/units") },
  { key: "stories", label: "قصص المنهج", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/stories") },
  { key: "final-reviews", label: "المراجعات النهائية", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/final-reviews") },
  { key: "lesson-detail", label: "تفاصيل الدرس", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/lessons/detail") },
  { key: "lessons", label: "الدروس", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/lessons") },
  { key: "quiz", label: "الاختبارات", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/quiz") },
  { key: "homework", label: "الواجبات", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/homework") },
  { key: "reports", label: "التقارير", groups: ["staff"], match: (p) => p.startsWith("/dashboard/reports") },
  { key: "live", label: "الحصص المباشرة", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/live") },
  { key: "ai", label: "اسأل البنا AI", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/ai") },
  { key: "games", label: "الألعاب", groups: ["student"], match: (p) => p.startsWith("/dashboard/games") },
  { key: "competitions", label: "المسابقات", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/competitions") },
  { key: "achievements", label: "الإنجازات", groups: ["student"], match: (p) => p.startsWith("/dashboard/achievements") },
  { key: "mistakes", label: "تعلم من أخطائك", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/mistakes") },
  { key: "history", label: "السجل الدراسي", groups: ["student"], match: (p) => p.startsWith("/dashboard/history") },
  { key: "leaderboard", label: "العباقرة", groups: ["student"], match: (p) => p.startsWith("/dashboard/leaderboard") },
  { key: "saved-pdfs", label: "الملفات المحفوظة", groups: ["student"], match: (p) => p.startsWith("/dashboard/saved-pdfs") },
  { key: "notifications", label: "الإشعارات", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/notifications") },
  { key: "payments", label: "الدفع", groups: ["student"], match: (p) => p.startsWith("/dashboard/payments") },
  { key: "shop", label: "المتجر", groups: ["student"], match: (p) => p.startsWith("/dashboard/shop") },
  { key: "users", label: "المستخدمون", groups: ["staff"], match: (p) => p.startsWith("/dashboard/users") },
  { key: "students", label: "الطلاب", groups: ["staff"], match: (p) => p.startsWith("/dashboard/students") },
  { key: "teachers", label: "المعلمون", groups: ["staff"], match: (p) => p.startsWith("/dashboard/teachers") },
  { key: "teacher", label: "أدوات المعلم", groups: ["staff"], match: (p) => p.startsWith("/dashboard/teacher") },
  { key: "support", label: "الدعم الفني", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/support") },
  { key: "profile", label: "الحساب", groups: ["staff", "student"], match: (p) => p.startsWith("/dashboard/profile") },
  { key: "admin", label: "لوحة الإدارة", groups: ["staff"], match: (p) => p.startsWith("/dashboard/admin") },
  { key: "login", label: "تسجيل الدخول", groups: ["auth"], match: (p) => p === "/login" || p.startsWith("/login/") },
  { key: "register", label: "إنشاء حساب", groups: ["auth"], match: (p) => p.startsWith("/register") },
];

export function getCardBorderPagesForGroup(group: CardBorderGroupKey): readonly CardBorderPageOption[] {
  return CARD_BORDER_PAGE_OPTIONS.filter((option) => option.groups.includes(group));
}

export function getCardBorderPageKey(pathname: string): string | null {
  for (const option of CARD_BORDER_PAGE_OPTIONS) {
    if (option.match(pathname)) return option.key;
  }
  return null;
}
