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
import { ThemeToggle } from "@/components/theme-toggle";
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

export default function HomePage(): ReactNode {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-white text-neutral-900 dark:bg-gradient-to-b dark:from-[#0b1628] dark:to-[#08111f] dark:text-white">
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
            >
              دخول
            </Link>
          </div>
        </header>

        <section className="mx-auto flex max-w-3xl flex-col items-center py-14 text-center lg:py-20">
          <div className={styles.reveal}>
            <p className="mb-3 text-xs font-medium tracking-[0.4em] text-primary-600 dark:text-primary-300/80">EL-BANNAWY</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              منصة <span className="text-primary-600 dark:text-primary-400">البناوي</span>
            </h1>
            <p className="mt-3 text-xl font-semibold text-neutral-800 dark:text-white/90 sm:text-2xl">
              تعلّم الإنجليزية بطريقة تفاعلية
            </p>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-white/65">
              منصة تعليمية تساعدك على تطوير مستواك في اللغة الإنجليزية من خلال الدروس التفاعلية،
              الاختبارات والواجبات، الحصص المباشرة، متابعة تقدمك، وأدوات الذكاء الاصطناعي.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CtaButton href="/login" primary>
                دخول إلى المنصة
              </CtaButton>
              <CtaButton href="/register" primary={false}>
                إنشاء حساب
              </CtaButton>
            </div>
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
