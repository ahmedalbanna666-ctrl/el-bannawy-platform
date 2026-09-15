"use client";

import { Suspense, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GovernorateSelect } from "@/components/ui/governorate-select";
import { normalizeEgyptMobile, validateEgyptMobile } from "@/lib/phone";
import { suggestEnglishName } from "@/lib/arabic-names";
import {
  EDUCATIONAL_SYSTEMS,
  EDUCATIONAL_STAGES,
  GRADES,
} from "@/lib/education-options";
import {
  School,
  Phone,
  Mail,
  MailCheck,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  Globe,
  Building2,
  GraduationCap,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// ── Types ────────────────────────────────────────────────────────────

interface RegisterPayload {
  fullName: string;
  englishName?: string;
  email: string;
  mobile?: string;
  parentMobile?: string;
  password: string;
  confirmPassword: string;
  governorate?: string;
  school?: string;
  educationalSystem?: string;
  educationalStage?: string;
  grade?: string;
  referralCode?: string;
  firebaseIdToken?: string;
}

type Step = 1 | 2 | 3 | 4;

const TOTAL_STEPS = 4;

// ── Preparing Screen ─────────────────────────────────────────────────

function PreparingScreen({ onDone }: { onDone: () => void }): ReactNode {
  const steps = [
    "✓ إنشاء حسابك",
    "✓ تجهيز المنهج الدراسي",
    "✓ إنشاء ملفك الدراسي",
    "✓ تحميل بيئة التعلم",
  ];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
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
  }, [onDone, steps.length]);

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

// ── Verify Email Screen ──────────────────────────────────────────────

function VerifyEmailScreen({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => void;
}): ReactNode {
  const { verifyEmail, resendVerification, correctPendingEmail } = useAuth();
  const [editableEmail, setEditableEmail] = useState(email);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { setEditableEmail(email); }, [email]);

  const normalizedEditable = editableEmail.trim().toLowerCase();
  const originalNormalized = email.trim().toLowerCase();
  const isEmailChanged = normalizedEditable !== originalNormalized;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editableEmail.trim());

  const handleVerify = useCallback(async (): Promise<void> => {
    if (!/^\d{6}$/.test(code)) { setError("يرجى إدخال كود التأكيد المكون من 6 أرقام"); return; }
    if (!isEmailValid) { setError("يرجى إدخال بريد إلكتروني صحيح"); return; }
    setLoading(true);
    setError(null);
    try {
      await verifyEmail(normalizedEditable, code);
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تأكيد البريد الإلكتروني");
      setLoading(false);
    }
  }, [code, normalizedEditable, isEmailValid, verifyEmail, onVerified]);

  const handleResend = useCallback(async (): Promise<void> => {
    if (!isEmailValid) { setError("يرجى إدخال بريد إلكتروني صحيح أولاً"); return; }
    setResending(true);
    setError(null);
    try {
      if (isEmailChanged) {
        await correctPendingEmail(originalNormalized, normalizedEditable);
      } else {
        await resendVerification(normalizedEditable);
      }
      setSent(true);
      setTimeout(() => { setSent(false); }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إعادة إرسال الكود");
    } finally {
      setResending(false);
    }
  }, [isEmailValid, isEmailChanged, originalNormalized, normalizedEditable, correctPendingEmail, resendVerification]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500">
              <MailCheck className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                تأكيد البريد الإلكتروني
              </h1>
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                {isEmailChanged
                  ? "عدّلت بريدك؟ اضغط إرسال الكود لإرساله إلى البريد الجديد."
                  : "أرسلنا كود تأكيد من 6 أرقام إلى بريدك الإلكتروني. أدخل الكود لتفعيل حسابك."}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            <Input
              label="البريد الإلكتروني (يمكنك تعديله إذا كان خطأ)"
              type="email"
              dir="ltr"
              placeholder="example@gmail.com"
              value={editableEmail}
              onChange={(e): void => { setEditableEmail(e.target.value); setError(null); }}
            />
            <Input
              label="كود التأكيد"
              type="text"
              inputMode="numeric"
              dir="ltr"
              placeholder="123456"
              value={code}
              onChange={(e): void => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
            />

            {error && (
              <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-500">
                {error}
              </p>
            )}

            {sent && (
              <p className="rounded-xl bg-success-500/10 px-4 py-3 text-sm text-success-600 dark:text-success-400">
                تم إرسال الكود بنجاح إلى {editableEmail}
              </p>
            )}

            <Button variant="primary" size="md" fullWidth onClick={() => { void handleVerify(); }} loading={loading} disabled={code.length !== 6 || !isEmailValid}>
              <MailCheck className="h-5 w-5" />
              تأكيد الحساب
            </Button>

            <button
              type="button"
              onClick={() => { void handleResend(); }}
              disabled={resending || !isEmailValid}
              className="text-center text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 disabled:opacity-40"
            >
              {resending ? "جاري الإرسال..." : isEmailChanged ? "تأكيد البريد الجديد وإرسال الكود" : "لم يصلك الكود؟ أعد الإرسال"}
            </button>

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
  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center"><Spinner size="lg" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, oauthRegister } = useAuth();

  // OAuth detection
  const oauthProvider = searchParams.get("oauth");
  const verifiedEmail = searchParams.get("email");
  const isOAuth = oauthProvider === "google" || oauthProvider === "apple";

  // Referral code prefill from ?ref=CODE
  const refParam = searchParams.get("ref");
  const [referralCode, setReferralCode] = useState<string>(refParam?.trim().toUpperCase() ?? "");

  useEffect(() => {
    if (refParam?.trim()) {
      setReferralCode(refParam.trim().toUpperCase());
    }
  }, [refParam]);

  const [step, setStep] = useState<Step>(isOAuth ? 1 : 1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [englishNameTouched, setEnglishNameTouched] = useState(false);
  const [email, setEmail] = useState<string>(() => verifiedEmail ?? "");
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

  // Auto-suggest the English name from the Arabic name until the student
  // edits the English field manually (then their edit is preserved).
  useEffect(() => {
    if (englishNameTouched) return;
    setEnglishName(fullName.trim() ? suggestEnglishName(fullName) : "");
  }, [fullName, englishNameTouched]);

  const validateStep1 = useCallback((): boolean => {
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 3) {
      setError("الاسم العربي يجب أن يتكون من ثلاثة أجزاء (الاسم الأول، اسم الأب، اسم العائلة)");
      return false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("يرجى إدخال بريد إلكتروني صحيح"); return false; }

    if (mobile) {
      const mobileResult = validateEgyptMobile(mobile);
      if (!mobileResult.valid) { setError(mobileResult.message ?? "رقم هاتف غير صحيح"); return false; }
    } else {
      setError("رقم هاتف الطالب إجباري");
      return false;
    }

    if (parentMobile) {
      const parentResult = validateEgyptMobile(parentMobile);
      if (!parentResult.valid) { setError(parentResult.message ?? "رقم ولي الأمر غير صحيح"); return false; }
    } else {
      setError("رقم هاتف ولي الأمر إجباري");
      return false;
    }

    if (normalizeEgyptMobile(mobile) === normalizeEgyptMobile(parentMobile)) {
      setError("رقم ولي الأمر لا يمكن أن يكون نفس رقم الطالب");
      return false;
    }

    if (!isOAuth) {
      if (!password || password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return false; }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
        setError("كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم على الأقل");
        return false;
      }
      if (password !== confirmPassword) { setError("كلمات المرور غير متطابقة"); return false; }
    }

    if (!governorate) { setError("يرجى اختيار المحافظة"); return false; }
    return true;
  }, [fullName, email, mobile, parentMobile, password, confirmPassword, governorate, isOAuth]);

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

  const handleNext = useCallback((): void => {
    setError(null);
    let valid = true;
    if (step === 1) valid = validateStep1();
    else if (step === 2) valid = validateStep2();
    else if (step === 3) valid = validateStep3();
    else valid = validateStep4();

    if (valid && step < 4) {
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
    setLoading(true);
    setError(null);

    try {
      if (isOAuth && verifiedEmail) {
        await oauthRegister({
          email: verifiedEmail,
          fullName,
          englishName: englishName || undefined,
          mobile: normalizeEgyptMobile(mobile),
          parentMobile: normalizeEgyptMobile(parentMobile),
          password: undefined,
          governorate: governorate || undefined,
          school: school || undefined,
          educationalSystem,
          educationalStage,
          grade,
          referralCode: referralCode || undefined,
        });
        setRegistered(true);
      } else {
        let firebaseIdToken: string | undefined;
        try {
          const { createFirebaseUser, isFirebaseAuthConfigured } = await import("@/lib/firebase-auth");
          if (isFirebaseAuthConfigured()) {
            firebaseIdToken = (await createFirebaseUser(email, password)) ?? undefined;
          }
        } catch {
          firebaseIdToken = undefined;
        }

        const payload: RegisterPayload = {
          fullName,
          englishName: englishName || undefined,
          email: email.trim().toLowerCase(),
          mobile: normalizeEgyptMobile(mobile),
          parentMobile: normalizeEgyptMobile(parentMobile),
          password,
          confirmPassword,
          governorate: governorate || undefined,
          school: school || undefined,
          educationalSystem,
          educationalStage,
          grade,
          referralCode: referralCode || undefined,
          firebaseIdToken,
        };

        const result = await register(payload);
        if (result.requiresEmailVerification) {
          setNeedsVerification(true);
        } else {
          setRegistered(true);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      if (msg.startsWith("PENDING_VERIFICATION:")) {
        const pendingEmail = msg.slice("PENDING_VERIFICATION:".length).trim().toLowerCase();
        if (pendingEmail) {
          setEmail(pendingEmail);
        }
        setNeedsVerification(true);
        setError(null);
        setLoading(false);
        return;
      }
      setError(msg);
      setLoading(false);
    }
  }, [fullName, englishName, email, mobile, parentMobile, password, confirmPassword, governorate, school, educationalSystem, educationalStage, grade, referralCode, register, oauthRegister, isOAuth, verifiedEmail]);

  const handlePreparingDone = useCallback((): void => {
    router.push("/dashboard");
  }, [router]);

  if (registered) {
    return <PreparingScreen onDone={handlePreparingDone} />;
  }

  if (needsVerification) {
    return (
      <VerifyEmailScreen
        email={email.trim().toLowerCase()}
        onVerified={() => { setNeedsVerification(false); setRegistered(true); }}
      />
    );
  }

  const stepTitle = [
    "المعلومات الأساسية",
    "النظام التعليمي",
    "المرحلة التعليمية",
    "الصف الدراسي",
  ];

  const renderStep = (): ReactNode => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col gap-4">
            {isOAuth && verifiedEmail && (
              <div className="flex items-center gap-3 rounded-xl border-2 border-success-500/40 bg-success-500/5 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success-500/10">
                  <Check className="h-5 w-5 text-success-500" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-neutral-200 break-all">{verifiedEmail}</span>
                </div>
              </div>
            )}
            <input type="text" name="prevent_autofill_username" autoComplete="username" tabIndex={-1} aria-hidden="true" style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} readOnly />
            <input type="password" name="prevent_autofill_password" autoComplete="new-password" tabIndex={-1} aria-hidden="true" style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} readOnly />
            <Input id="register-fullName" name="fullName" autoComplete="name" label="الاسم بالعربية (ثلاثي)" placeholder="الاسم الأول - اسم الأب - اسم العائلة" value={fullName} onChange={(e): void => { setFullName(e.target.value); }} required />
            <Input id="register-englishName" name="englishName" autoComplete="off" label="الاسم بالإنجليزية" placeholder="Ahmed Hassan Ali" value={englishName} onChange={(e): void => { setEnglishNameTouched(true); setEnglishName(e.target.value); }} leftIcon={<Globe className="h-5 w-5" />} />
            <Input
              id="register-email"
              name="email"
              autoComplete="email"
              label="البريد الإلكتروني"
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e): void => { setEmail(e.target.value); }}
              leftIcon={<Mail className="h-5 w-5" />}
              readOnly={isOAuth}
              required
            />
            <Input
              id="register-mobile"
              name="mobile"
              autoComplete="tel"
              label="رقم هاتف الطالب"
              type="tel"
              placeholder="01234567890"
              value={mobile}
              onChange={(e): void => { setMobile(e.target.value); }}
              onBlur={(): void => { setMobile(mobile ? normalizeEgyptMobile(mobile) : ""); }}
              leftIcon={<Phone className="h-5 w-5" />}
              required
            />
            <Input
              id="register-parentMobile"
              name="parentMobile"
              autoComplete="off"
              label="رقم هاتف ولي الأمر"
              type="tel"
              placeholder="01234567890"
              value={parentMobile}
              onChange={(e): void => { setParentMobile(e.target.value); }}
              onBlur={(): void => { setParentMobile(parentMobile ? normalizeEgyptMobile(parentMobile) : ""); }}
              leftIcon={<Phone className="h-5 w-5" />}
              data-lpignore="true"
              data-form-type="other"
              required
            />
            {!isOAuth && (
              <>
                <Input
                  id="register-password"
                  name="new-password"
                  autoComplete="new-password"
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
                <Input id="register-confirmPassword" name="confirm-password" autoComplete="new-password" label="تأكيد كلمة المرور" type={showPassword ? "text" : "password"} placeholder="أعد كتابة كلمة المرور" value={confirmPassword} onChange={(e): void => { setConfirmPassword(e.target.value); }} leftIcon={<Lock className="h-5 w-5" />} required />
              </>
            )}
            <GovernorateSelect value={governorate} onChange={setGovernorate} required />
            <Input id="register-school" name="organization" autoComplete="organization" label="المدرسة" placeholder="اسم المدرسة" value={school} onChange={(e): void => { setSchool(e.target.value); }} leftIcon={<Building2 className="h-5 w-5" />} />
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-3">
            {EDUCATIONAL_SYSTEMS.map((sys) => {
              const Icon = sys.icon;
              return (
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
                {Icon && <Icon className="h-5 w-5 shrink-0" />}
                <span className="text-sm font-bold">{sys.label}</span>
              </button>
              );
            })}
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col gap-3">
            {EDUCATIONAL_STAGES.map((st) => (
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
              {step < 4 ? (
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
