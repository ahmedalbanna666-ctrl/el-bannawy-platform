"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  School,
  Phone,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Building2,
  GraduationCap,
  BookOpen,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface RegisterPayload {
  fullName: string;
  englishName?: string;
  mobile: string;
  parentMobile?: string;
  password: string;
  confirmPassword: string;
  governorate?: string;
  school?: string;
  educationalSystem?: string;
  educationalStage?: string;
  grade?: string;
  academicTerm?: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 5;

const SYSTEMS = [
  { id: "GENERAL", label: "عام", icon: BookOpen },
  { id: "LANGUAGE", label: "لغات", icon: Globe },
  { id: "INTERNATIONAL", label: "دولي", icon: Globe },
];

const STAGES = [
  { id: "PRIMARY", label: "ابتدائي" },
  { id: "PREPARATORY", label: "إعدادي" },
  { id: "SECONDARY", label: "ثانوي" },
];

const GRADES: Record<string, string[]> = {
  PRIMARY: ["الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي", "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي"],
  PREPARATORY: ["الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي"],
  SECONDARY: ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"],
};

const TERMS = [
  { id: "FIRST_TERM", label: "ترم أول" },
  { id: "SECOND_TERM", label: "ترم ثاني" },
];

// ── Preparing Screen ─────────────────────────────────────────────────

function PreparingScreen({ onDone }: { onDone: () => void }): ReactNode {
  const steps = [
    "✓ إنشاء حسابك",
    "✓ تجهيز المنهج الدراسي",
    "✓ إنشاء ملفك الدراسي",
    "✓ تحميل بيئة التعلم",
  ];
  const [visible, setVisible] = useState(0);

  useState(() => {
    const interval = setInterval(() => {
      setVisible((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
              setTimeout(() => { onDone(); }, 600);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return (): void => { clearInterval(interval); };
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-500 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
          <School className="h-10 w-10 text-white animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          تجهيز حسابك
        </h1>
      </div>

      <div className="flex flex-col gap-4 w-72">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
              i <= visible
                ? "bg-primary-500/10 text-primary-600 dark:text-primary-400 opacity-100 translate-x-0"
                : "bg-transparent text-neutral-400 opacity-40 translate-x-2"
            }`}
          >
            <Check className={`h-5 w-5 shrink-0 transition-all ${i <= visible ? "text-primary-500" : "text-neutral-400"}`} />
            <span className="text-sm font-medium">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step Progress Bar ────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }): ReactNode {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            i < current ? "bg-primary-500" : "bg-neutral-200 dark:bg-neutral-700"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function RegisterPage(): ReactNode {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [mobile, setMobile] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [school, setSchool] = useState("");

  // Step 2
  const [educationalSystem, setEducationalSystem] = useState("");

  // Step 3
  const [educationalStage, setEducationalStage] = useState("");

  // Step 4
  const [grade, setGrade] = useState("");

  // Step 5
  const [academicTerm, setAcademicTerm] = useState("");

  const validateStep1 = useCallback((): boolean => {
    if (!fullName || fullName.length < 2) { setError("الاسم العربي مطلوب"); return false; }
    if (!mobile) { setError("رقم الهاتف مطلوب"); return false; }
    if (!password || password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return false; }
    if (password !== confirmPassword) { setError("كلمات المرور غير متطابقة"); return false; }
    return true;
  }, [fullName, mobile, password, confirmPassword]);

  const validateStep2 = useCallback((): boolean => {
    if (!educationalSystem) { setError("يرجى اختيار النظام التعليمي"); return false; }
    return true;
  }, [educationalSystem]);

  const validateStep3 = useCallback((): boolean => {
    if (!educationalStage) { setError("يرجى اختيار المرحلة التعليمية"); return false; }
    return true;
  }, [educationalStage]);

  const validateStep4 = useCallback((): boolean => {
    if (!grade) { setError("يرجى اختيار الصف الدراسي"); return false; }
    return true;
  }, [grade]);

  const validateStep5 = useCallback((): boolean => {
    if (!academicTerm) { setError("يرجى اختيار الفصل الدراسي"); return false; }
    return true;
  }, [academicTerm]);

  const handleNext = useCallback((): void => {
    setError(null);
    let valid = true;
    if (step === 1) valid = validateStep1();
    else if (step === 2) valid = validateStep2();
    else if (step === 3) valid = validateStep3();
    else if (step === 4) valid = validateStep4();

    if (valid && step < 5) {
      setStep((prev) => (prev + 1) as Step);
    }
  }, [step, validateStep1, validateStep2, validateStep3, validateStep4]);

  const handleBack = useCallback((): void => {
    setError(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  }, [step]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!validateStep5()) return;

    setLoading(true);
    setError(null);

    try {
      const payload: RegisterPayload = {
        fullName,
        englishName: englishName || undefined,
        mobile,
        parentMobile: parentMobile || undefined,
        password,
        confirmPassword,
        governorate: governorate || undefined,
        school: school || undefined,
        educationalSystem,
        educationalStage,
        grade,
        academicTerm,
      };

      await register(payload);
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }, [fullName, englishName, mobile, parentMobile, password, confirmPassword, governorate, school, educationalSystem, educationalStage, grade, academicTerm, register, validateStep5]);

  const handlePreparingDone = useCallback((): void => {
    router.push("/dashboard");
  }, [router]);

  if (registered) {
    return <PreparingScreen onDone={handlePreparingDone} />;
  }

  const stepTitle = [
    "المعلومات الأساسية",
    "النظام التعليمي",
    "المرحلة التعليمية",
    "الصف الدراسي",
    "الفصل الدراسي",
  ];

  const renderStep = (): ReactNode => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <Input label="الاسم بالعربية" placeholder="أحمد حسن" value={fullName} onChange={(e): void => { setFullName(e.target.value); }} required />
            <Input label="الاسم بالإنجليزية" placeholder="Ahmed Hassan" value={englishName} onChange={(e): void => { setEnglishName(e.target.value); }} leftIcon={<Globe className="h-5 w-5" />} />
            <Input label="رقم الهاتف" type="tel" placeholder="+201234567890" value={mobile} onChange={(e): void => { setMobile(e.target.value); }} leftIcon={<Phone className="h-5 w-5" />} required />
            <Input label="رقم ولي الأمر" type="tel" placeholder="+201234567890" value={parentMobile} onChange={(e): void => { setParentMobile(e.target.value); }} leftIcon={<Phone className="h-5 w-5" />} />
            <Input
              label="كلمة المرور"
              type={showPassword ? "text" : "password"}
              placeholder="8 أحرف على الأقل"
              value={password}
              onChange={(e): void => { setPassword(e.target.value); }}
              leftIcon={<Lock className="h-5 w-5" />}
              rightIcon={
                <button type="button" onClick={(): void => { setShowPassword(!showPassword); }} className="text-neutral-400 hover:text-neutral-600" aria-label={showPassword ? "إخفاء" : "إظهار"}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
              required
            />
            <Input label="تأكيد كلمة المرور" type={showPassword ? "text" : "password"} placeholder="أعد كتابة كلمة المرور" value={confirmPassword} onChange={(e): void => { setConfirmPassword(e.target.value); }} leftIcon={<Lock className="h-5 w-5" />} required />
            <Input label="المحافظة" placeholder="القاهرة / الجيزة ..." value={governorate} onChange={(e): void => { setGovernorate(e.target.value); }} leftIcon={<MapPin className="h-5 w-5" />} />
            <Input label="المدرسة" placeholder="اسم المدرسة" value={school} onChange={(e): void => { setSchool(e.target.value); }} leftIcon={<Building2 className="h-5 w-5" />} />
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-3">
            {SYSTEMS.map((sys) => (
              <button
                key={sys.id}
                type="button"
                onClick={(): void => { setEducationalSystem(sys.id); }}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  educationalSystem === sys.id
                    ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "border-neutral-200 text-neutral-700 hover:border-primary-500/50 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                <sys.icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-bold">{sys.label}</span>
              </button>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col gap-3">
            {STAGES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={(): void => { setEducationalStage(st.id); setGrade(""); }}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  educationalStage === st.id
                    ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "border-neutral-200 text-neutral-700 hover:border-primary-500/50 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                <GraduationCap className="h-5 w-5 shrink-0" />
                <span className="text-sm font-bold">{st.label}</span>
              </button>
            ))}
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col gap-3">
            {(GRADES[educationalStage] ?? []).map((g) => (
              <button
                key={g}
                type="button"
                onClick={(): void => { setGrade(g); }}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  grade === g
                    ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "border-neutral-200 text-neutral-700 hover:border-primary-500/50 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                <BookOpen className="h-5 w-5 shrink-0" />
                <span className="text-sm font-bold">{g}</span>
              </button>
            ))}
            {educationalStage === "" && (
              <p className="text-center text-sm text-neutral-400 py-4">يرجى اختيار المرحلة التعليمية أولاً</p>
            )}
          </div>
        );

      case 5:
        return (
          <div className="flex flex-col gap-3">
            {TERMS.map((term) => (
              <button
                key={term.id}
                type="button"
                onClick={(): void => { setAcademicTerm(term.id); }}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  academicTerm === term.id
                    ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "border-neutral-200 text-neutral-700 hover:border-primary-500/50 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                <Calendar className="h-5 w-5 shrink-0" />
                <span className="text-sm font-bold">{term.label}</span>
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500">
              <School className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                إنشاء حساب
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {stepTitle[step - 1]}
              </p>
            </div>
            <Badge variant="primary" className="text-[10px]">
              الخطوة {step} من {TOTAL_STEPS}
            </Badge>
          </div>
          <StepProgress current={step} total={TOTAL_STEPS} />
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-5">
            {renderStep()}

            {error && (
              <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-500">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              {step > 1 && (
                <Button variant="outline" size="md" onClick={handleBack} disabled={loading}>
                  <ChevronRight className="h-5 w-5" />
                  السابق
                </Button>
              )}
              {step < 5 ? (
                <Button variant="primary" size="md" onClick={handleNext} fullWidth={step === 1}>
                  التالي
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={(): void => { void handleSubmit(); }}
                  loading={loading}
                >
                  <UserPlus className="h-5 w-5" />
                  إنشاء الحساب
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
