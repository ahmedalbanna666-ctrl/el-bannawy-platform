import Link from "next/link";

const FEATURES = [
  "دروس تفاعلية",
  "اختبارات",
  "واجبات",
  "متابعة التقدم",
  "التعلم من الأخطاء",
  "حصص مباشرة",
  "أدوات ذكاء اصطناعي",
];

export default function HomePage(): React.ReactNode {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#0a0e1a] px-6 py-10 text-center text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-teal-400/10 blur-[100px]"
      />

      <header className="relative z-10 mb-8">
        <p className="mb-2 text-xs tracking-[0.4em] text-primary-300/80">EL-BANNAWY</p>
        <h1 className="text-4xl font-bold sm:text-5xl">منصة البناوي</h1>
      </header>

      <section className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <h2 className="mb-4 text-xl font-semibold text-white/90 sm:text-2xl">
          تعلّم الإنجليزية بطريقة تفاعلية
        </h2>

        <p className="mb-6 text-sm leading-relaxed text-white/70 sm:text-base">
          منصة البناوي (El-Bannawy) منصة تعليمية للغة الإنجليزية تقدّم للطلاب تجربة
          تعلم تفاعلية تشمل الدروس والأنشطة والاختبارات والواجبات، مع متابعة للتقدم
          وحصص مباشرة وأدوات ذكاء اصطناعي لدعم رحلة التعلم.
        </p>

        <ul className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-sm"
            >
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-primary-500/20 transition-colors hover:bg-primary-400 sm:w-auto"
          >
            دخول إلى المنصة
          </Link>
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 sm:w-auto"
          >
            إنشاء حساب
          </Link>
        </div>

        <p className="mt-10 text-xs text-white/40">أسسها أحمد البنا — معلم اللغة الإنجليزية</p>
      </section>
    </main>
  );
}
