import Link from "next/link";
import type { ReactNode } from "react";
import {
  GraduationCap,
  BookOpen,
  FileText,
  Video,
  BarChart3,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  LayoutGrid,
  Smartphone,
  Headphones,
  ShieldCheck,
} from "lucide-react";
import styles from "./home.module.css";

const FEATURES = [
  { icon: BookOpen, title: "دروس تفاعلية", desc: "محتوى يبني المهارة خطوة بخطوة." },
  { icon: FileText, title: "اختبارات وواجبات", desc: "تقييم مستمر مع تغذية راجعة." },
  { icon: Video, title: "حصص مباشرة", desc: "جلسات مباشرة مع المعلمين." },
  { icon: BarChart3, title: "متابعة التقدم", desc: "تقارير واضحة لنموك اللغوي." },
  { icon: AlertCircle, title: "التعلم من الأخطاء", desc: "نصحح أخطاءك ونشرحها لك." },
  { icon: Sparkles, title: "أدوات ذكاء اصطناعي", desc: "مساعدة ذكية في رحلة التعلم." },
];

const VALUE = [
  { icon: LayoutGrid, label: "تجربة تعليمية منظمة" },
  { icon: Smartphone, label: "تعمل على مختلف الأجهزة" },
  { icon: Headphones, label: "دعم مستمر" },
  { icon: ShieldCheck, label: "بيئة تعليمية آمنة" },
];

function CtaButton({ href, children, primary = true }: { href: string; children: ReactNode; primary?: boolean }): ReactNode {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950";
  const cls = primary
    ? `${base} bg-primary-500 px-7 py-3 text-base text-white shadow-md shadow-primary-500/20 hover:bg-primary-600 hover:shadow-primary-500/30`
    : `${base} border-2 border-neutral-300 px-7 py-3 text-base text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-white/5`;
  return (
    <Link href={href} className={cls}>
      {children}
      {primary ? <ArrowLeft className="h-5 w-5" /> : null}
    </Link>
  );
}

function DashboardPreview(): ReactNode {
  return (
    <div className={`${styles.float} relative w-full max-w-md`}>
      <div className="rounded-3xl border border-neutral-200 bg-white/80 p-5 shadow-[0_12px_40px_-12px_rgba(6,182,212,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[var(--ui-card-bg-dark)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),inset_0_0_28px_rgba(6,182,212,0.08),0_0_0_1px_rgba(80,220,255,0.16),0_24px_56px_-18px_rgba(6,182,212,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-neutral-950">
              أ
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">أحمد</p>
              <p className="text-xs text-neutral-500 dark:text-white/50">الصف العاشر</p>
            </div>
          </div>
          <span className="rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs text-primary-600 dark:text-primary-300">
            متصل
          </span>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.03]">
          <div className="relative">
            <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-90">
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="52" stroke="rgba(0,0,0,0.08)" strokeWidth="10" fill="none" className="dark:stroke-white/10" />
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="url(#ringGrad)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="326.7"
                strokeDashoffset="104.5"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-neutral-900 dark:text-white">68%</span>
              <span className="text-[10px] text-neutral-500 dark:text-white/50">التقدم</span>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">24</p>
              <p className="text-[10px] text-neutral-500 dark:text-white/50">درس</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">12</p>
              <p className="text-[10px] text-neutral-500 dark:text-white/50">اختبار</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary-600 dark:text-primary-300">7</p>
              <p className="text-[10px] text-neutral-500 dark:text-white/50">سلسلة</p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-neutral-200 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.03]">
          <p className="mb-1 text-xs text-neutral-500 dark:text-white/50">الدرس الحالي</p>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Unit 5: Past Perfect</p>
              <p className="text-xs text-neutral-500 dark:text-white/50">الوحدة الخامسة</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex h-16 items-end gap-2 rounded-2xl border border-neutral-200 bg-black/[0.02] p-3 dark:border-white/5 dark:bg-white/[0.03]">
          {[40, 65, 50, 80, 60, 90, 72].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-md bg-gradient-to-t from-primary-600/40 to-primary-400/80"
              style={{ height: `${String(h)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage(): ReactNode {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-white text-neutral-900 dark:bg-transparent dark:text-white">
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${styles.gridOverlay}`} />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-[70vh] ${styles.heroGlow}`}
      />

      <div className="container-page relative z-10">
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-neutral-950">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">منصة البناوي</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
          >
            دخول
          </Link>
        </header>

        <section className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:gap-8 lg:py-16">
          <div className={styles.reveal}>
            <p className="mb-3 text-xs font-medium tracking-[0.4em] text-primary-600 dark:text-primary-300/80">EL-BANNAWY</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              منصة <span className="text-primary-600 dark:text-primary-400">البناوي</span>
            </h1>
            <p className="mt-3 text-xl font-semibold text-neutral-800 dark:text-white/90 sm:text-2xl">
              تعلّم الإنجليزية بطريقة تفاعلية
            </p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-white/65">
              منصة تعليمية تساعدك على تطوير مستواك في اللغة الإنجليزية من خلال الدروس التفاعلية،
              الاختبارات والواجبات، الحصص المباشرة، متابعة تقدمك، وأدوات الذكاء الاصطناعي.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <CtaButton href="/login" primary>
                دخول إلى المنصة
              </CtaButton>
              <CtaButton href="/register" primary={false}>
                إنشاء حساب
              </CtaButton>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <DashboardPreview />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 py-8 sm:gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-neutral-200 bg-white/70 p-4 backdrop-blur-sm transition-colors hover:border-primary-500/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-primary-400/30"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{feature.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-white/55">{feature.desc}</p>
            </div>
          ))}
        </section>

        <section className="my-10 rounded-3xl border border-neutral-200 bg-white/70 p-6 backdrop-blur-sm sm:p-8 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-2xl font-bold text-neutral-950">
              أ
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">أسسها أحمد البنا</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-white/65">
                معلم اللغة الإنجليزية وصاحب خبرة في تدريس اللغة الإنجليزية، يجمع في البناوي بين الخبرة
                التعليمية والتقنية الحديثة.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 pb-10 sm:grid-cols-4">
          {VALUE.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-white/60">
              <item.icon className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" />
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <footer className="border-t border-neutral-200 py-8 text-center dark:border-white/10">
          <p className="text-sm font-bold tracking-[0.3em] text-neutral-700 dark:text-white/80">EL-BANNAWY</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-white/60">منصة البناوي</p>
          <p className="mt-3 text-xs text-neutral-500 dark:text-white/45">رحلتك نحو إتقان الإنجليزية تبدأ من هنا.</p>
          <p className="mt-4 text-xs text-neutral-400 dark:text-white/30">© 2026 منصة البناوي. جميع الحقوق محفوظة.</p>
        </footer>
      </div>
    </main>
  );
}
