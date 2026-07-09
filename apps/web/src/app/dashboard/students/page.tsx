"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAcademicContext } from "@/lib/academic-context-store";
import { EDUCATIONAL_STAGES, ACADEMIC_TERMS } from "@/lib/education-options";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Search,
  ChevronLeft,
  User,
  Phone,
  KeyRound,
  Smartphone,
  Coins,
  Zap,
  AlertTriangle,
  Trash2,
  Eye,
  Clock,
  CalendarDays,
  CreditCard,
} from "lucide-react";

interface GradeItem {
  id: string;
  name: string;
  displayOrder: number;
}

interface StageItem {
  id: string;
  name: string;
  displayOrder: number;
  grades: GradeItem[];
}

interface TermItem {
  id: string;
  name: string;
  displayOrder: number;
}

interface AcademicYearItem {
  id: string;
  name: string;
  isActive: boolean;
  terms: TermItem[];
}

interface Student {
  id: string;
  fullName: string;
  englishName: string | null;
  email: string | null;
  mobileNumber: string | null;
  parentMobile: string | null;
  role: string;
  status: string;
  educationalSystem: string | null;
  gradeId: string | null;
  academicYearId: string | null;
  termId: string | null;
  governorate: string | null;
  school: string | null;
  createdAt: string;
  updatedAt: string;
  coins: number;
  assignedGrade: { id: string; name: string; stage: { name: string } } | null;
  academicYear: { id: string; name: string } | null;
  term: { id: string; name: string } | null;
}

interface StudentDetail extends Student {
  deletedAt: string | null;
}

interface ListResponse {
  students: Student[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "ACTIVE", label: "نشط" },
  { value: "PENDING_VERIFICATION", label: "قيد التحقق" },
  { value: "SUSPENDED", label: "موقوف" },
  { value: "BANNED", label: "محظور" },
  { value: "DELETED", label: "محذوف" },
];

function useStudents(params: Record<string, string>): UseQueryResult<ListResponse> {
  const searchParams = new URLSearchParams(params);
  return useQuery<ListResponse>({
    queryKey: ["students", params],
    queryFn: async () => {
      const res = await api.get<ListResponse>(`/admin/students?${searchParams.toString()}`);
      return res.data ?? { students: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    },
    staleTime: 15_000,
  });
}

function useStudentDetail(id: string | null): UseQueryResult<StudentDetail> {
  return useQuery<StudentDetail>({
    queryKey: ["student", id],
    queryFn: async () => {
      const res = await api.get<StudentDetail>(`/admin/students/${id ?? ""}`);
      if (!res.data) throw new Error("Student not found");
      return res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

function useStages(): UseQueryResult<StageItem[]> {
  return useQuery<StageItem[]>({
    queryKey: ["stages"],
    queryFn: async () => {
      const res = await api.get<StageItem[]>("/admin/stages");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

function useAcademicYears(): UseQueryResult<AcademicYearItem[]> {
  return useQuery<AcademicYearItem[]>({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const res = await api.get<AcademicYearItem[]>("/admin/academic-years");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

export default function StudentsPage(): ReactNode {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "progress" | "attendance" | "login-history" | "subscription">("profile");

  const { data: stages } = useStages();
  const { data: academicYears } = useAcademicYears();

  const academicContext = useAcademicContext();

  const academicFilterIds = useMemo(() => {
    if (!stages || !academicYears) return { stageId: undefined as string | undefined, gradeId: undefined as string | undefined, academicYearId: undefined as string | undefined, termId: undefined as string | undefined };

    const stageLabel = EDUCATIONAL_STAGES.find((s) => s.id === academicContext.stage)?.label;
    const stage = stageLabel ? stages.find((s) => s.name === stageLabel) : undefined;

    const allGrades = stages.flatMap((s) => s.grades);
    const grade = academicContext.grade ? allGrades.find((g) => g.name === academicContext.grade) : undefined;

    const year = academicContext.academicYear ? academicYears.find((y) => y.name === academicContext.academicYear) : undefined;

    const termLabel = ACADEMIC_TERMS.find((t) => t.id === academicContext.term)?.label;
    const allTerms = academicYears.flatMap((y) => y.terms);
    const term = termLabel ? allTerms.find((t) => t.name === termLabel) : undefined;

    return {
      stageId: stage?.id,
      gradeId: grade?.id,
      academicYearId: year?.id,
      termId: term?.id,
    };
  }, [stages, academicYears, academicContext]);

  const filters: Record<string, string> = {};
  if (search) filters.search = search;
  if (statusFilter) filters.status = statusFilter;
  if (academicFilterIds.stageId) filters.stageId = academicFilterIds.stageId;
  if (academicFilterIds.gradeId) filters.gradeId = academicFilterIds.gradeId;
  if (academicFilterIds.academicYearId) filters.academicYearId = academicFilterIds.academicYearId;
  if (academicFilterIds.termId) filters.termId = academicFilterIds.termId;
  filters.page = String(Math.max(1, page));
  filters.limit = "20";

  const { data: listData, isLoading, isError, error } = useStudents(filters);
  const { data: detail, isLoading: detailLoading } = useStudentDetail(selectedStudentId);

  const refreshList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  const refreshDetail = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["student", selectedStudentId] });
  };

  const [dialog, setDialog] = useState<{
    type: "edit" | "phone" | "password" | "coins-add" | "coins-remove" | "xp" | "status" | "delete" | null;
    data?: Record<string, string>;
  }>({ type: null });

  const students: Student[] = listData?.students ?? [];
  const meta = listData?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  const confirmAction = useMutation({
    mutationFn: async (payload: { method: string; endpoint: string; body?: unknown }) => {
      switch (payload.method) {
        case "patch": return api.patch(payload.endpoint, payload.body);
        case "post": return api.post(payload.endpoint, payload.body);
        default: return api.patch(payload.endpoint, payload.body);
      }
    },
    onSuccess: async () => {
      setDialog({ type: null });
      await refreshDetail();
      await refreshList();
    },
  });

  const handleSearch = (): void => {
    setPage(1);
  };

  const resetFilters = (): void => {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  const statusBadge = (status: string): ReactNode => {
    const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "secondary" }> = {
      ACTIVE: { label: "نشط", variant: "success" },
      PENDING_VERIFICATION: { label: "قيد التحقق", variant: "warning" },
      SUSPENDED: { label: "موقوف", variant: "danger" },
      BANNED: { label: "محظور", variant: "danger" },
      DELETED: { label: "محذوف", variant: "secondary" },
    };
    const s = map[status] ?? { label: status, variant: "secondary" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (selectedStudentId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setSelectedStudentId(null); }}>
            <ChevronLeft className="h-4 w-4 ml-1" />
            العودة
          </Button>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {detailLoading ? "..." : detail?.fullName ?? "الطالب"}
          </h1>
          {detail && statusBadge(detail.status)}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
          {([
            { key: "profile", label: "الملف الشخصي", icon: User },
            { key: "progress", label: "التقدم", icon: Eye },
            { key: "attendance", label: "الحضور", icon: CalendarDays },
            { key: "login-history", label: "سجل الدخول", icon: Clock },
            { key: "subscription", label: "الاشتراك", icon: CreditCard },
          ] as const).map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "primary" : "outline"}
              size="sm"
              onClick={() => { setActiveTab(tab.key); }}
            >
              <tab.icon className="h-4 w-4 ml-1" />
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === "profile" && (
          <StudentProfileTab
            detail={detail}
            detailLoading={detailLoading}
            setDialog={setDialog}
            confirmAction={confirmAction}
          />
        )}

        {activeTab === "progress" && <StudentProgressTab studentId={selectedStudentId} />}
        {activeTab === "attendance" && <StudentAttendanceTab studentId={selectedStudentId} />}
        {activeTab === "login-history" && <StudentLoginHistoryTab studentId={selectedStudentId} />}
        {activeTab === "subscription" && <StudentSubscriptionTab studentId={selectedStudentId} />}

        <ActionDialogs
          dialog={dialog}
          setDialog={setDialog}
          studentId={selectedStudentId}
          confirmAction={confirmAction}
          studentName={detail?.fullName ?? ""}
          currentStatus={detail?.status}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">الطلاب</h1>
        <p className="mt-1 text-sm text-neutral-500">عرض وإدارة الطلاب المسجلين</p>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">بحث</label>
              <div className="flex gap-2">
                <Input
                  placeholder="اسم الطالب أو رقم الهاتف..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                />
                <Button size="sm" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-44">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الحالة</label>
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-end">
              <Button size="sm" variant="outline" onClick={resetFilters}>
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <StudentsListSkeleton />
      ) : isError ? (
        <ErrorState title="فشل التحميل" description={error instanceof Error ? error.message : "حدث خطأ"} />
      ) : students.length === 0 ? (
        <EmptyState title="لا يوجد طلاب" description="لم يتم العثور على طلاب" icon={<GraduationCap className="h-16 w-16" />} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">إجمالي {meta.total} طالب</span>
          </div>

          <div className="flex flex-col gap-3">
            {students.map((s) => (
              <Card key={s.id} variant="outline" padding="sm">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10">
                        <GraduationCap className="h-5 w-5 text-primary-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{s.fullName}</span>
                          {statusBadge(s.status)}
                        </div>
                        <p className="text-xs text-neutral-500">
                          {s.mobileNumber ?? "—"} · {s.assignedGrade?.name ?? ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-amber-500">{s.coins} عملة</span>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedStudentId(s.id); }}>
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
              >
                السابق
              </Button>
              <span className="text-sm text-neutral-500">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= meta.totalPages}
                onClick={() => { setPage((p) => p + 1); }}
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StudentProfileTab({
  detail,
  detailLoading,
  setDialog,
  confirmAction,
}: {
  detail: StudentDetail | undefined;
  detailLoading: boolean;
  setDialog: (d: { type: "edit" | "phone" | "password" | "coins-add" | "coins-remove" | "xp" | "status" | "delete"; data?: Record<string, string> }) => void;
  confirmAction: { mutate: (p: { method: string; endpoint: string; body?: unknown }) => void; isPending?: boolean };
}): ReactNode {
  if (detailLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!detail) return <ErrorState title="خطأ" description="لم يتم العثور على بيانات الطالب" />;

  const infoRows: { label: string; value: string | null }[] = [
    { label: "الاسم بالعربية", value: detail.fullName },
    { label: "الاسم بالإنجليزية", value: detail.englishName },
    { label: "البريد الإلكتروني", value: detail.email },
    { label: "رقم الهاتف", value: detail.mobileNumber },
    { label: "هاتف ولي الأمر", value: detail.parentMobile },
    { label: "المرحلة", value: detail.assignedGrade?.stage?.name ?? null },
    { label: "الصف", value: detail.assignedGrade?.name ?? null },
    { label: "النظام التعليمي", value: detail.educationalSystem },
    { label: "المحافظة", value: detail.governorate },
    { label: "المدرسة", value: detail.school },
    { label: "السنة الدراسية", value: detail.academicYear?.name ?? null },
    { label: "الترم", value: detail.term?.name ?? null },
    { label: "رصيد العملات", value: String(detail.coins) },
    { label: "تاريخ التسجيل", value: new Date(detail.createdAt).toLocaleDateString("ar-EG") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">بيانات الطالب</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {infoRows.map((row) => (
              <div key={row.label} className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3">
                <span className="text-xs text-neutral-500">{row.label}</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {row.value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">إجراءات</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { setDialog({ type: "edit" }); }}>
              <User className="h-4 w-4 ml-1" />
              تعديل البيانات
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDialog({ type: "phone" }); }}>
              <Phone className="h-4 w-4 ml-1" />
              تغيير رقم الهاتف
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDialog({ type: "password" }); }}>
              <KeyRound className="h-4 w-4 ml-1" />
              إعادة تعيين كلمة المرور
            </Button>
            <Button size="sm" variant="outline" onClick={() => { confirmAction.mutate({ method: "post", endpoint: `/admin/students/${detail.id}/reset-device` }); }}>
              <Smartphone className="h-4 w-4 ml-1" />
              إعادة تعيين الجهاز
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDialog({ type: "coins-add" }); }}>
              <Coins className="h-4 w-4 ml-1" />
              إضافة عملات
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDialog({ type: "coins-remove" }); }}>
              <Coins className="h-4 w-4 ml-1" />
              خصم عملات
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDialog({ type: "xp" }); }}>
              <Zap className="h-4 w-4 ml-1" />
              تعديل نقاط XP
            </Button>
            {detail.status !== "DELETED" && (
              <>
                <Button size="sm" variant="outline" className="text-amber-500" onClick={() => { setDialog({ type: "status" }); }}>
                  <AlertTriangle className="h-4 w-4 ml-1" />
                  {detail.status === "SUSPENSED" || detail.status === "BANNED" ? "إعادة تنشيط" : detail.status === "ACTIVE" ? "تعليق" : "تغيير الحالة"}
                </Button>
                <Button size="sm" variant="outline" className="text-red-500" onClick={() => { setDialog({ type: "delete" }); }}>
                  <Trash2 className="h-4 w-4 ml-1" />
                  حذف الحساب
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentProgressTab({ studentId }: { studentId: string }): ReactNode {
  const { data, isLoading } = useQuery({
    queryKey: ["student-progress", studentId],
    queryFn: async () => {
      const res = await api.get(`/admin/students/${studentId}/progress`);
      return res.data as {
        lessonProgress: { lessonId: string; completed: boolean; progress: number }[];
        quizAttempts: { quizId: string; score: number | null; passed: boolean | null }[];
        homeworkAttempts: { homeworkId: string; score: number | null; submitted: boolean }[];
      };
    },
    enabled: !!studentId,
  });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!data) return <ErrorState title="خطأ" description="لا توجد بيانات" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader><h3 className="font-semibold">الدروس</h3></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-primary-500">
            {data.lessonProgress.filter((l) => l.completed).length} / {data.lessonProgress.length}
          </p>
          <p className="text-sm text-neutral-500">دروس مكتملة</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h3 className="font-semibold">الاختبارات</h3></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-500">
            {data.quizAttempts.filter((q) => q.passed).length} / {data.quizAttempts.length}
          </p>
          <p className="text-sm text-neutral-500">اختبارات ناجحة</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h3 className="font-semibold">الواجبات</h3></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-amber-500">
            {data.homeworkAttempts.filter((h) => h.submitted).length} / {data.homeworkAttempts.length}
          </p>
          <p className="text-sm text-neutral-500">واجبات مسلمة</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentAttendanceTab({ studentId }: { studentId: string }): ReactNode {
  const { data, isLoading } = useQuery({
    queryKey: ["student-attendance", studentId],
    queryFn: async () => {
      const res = await api.get<{ id: string; date: string; present: boolean }[]>(`/admin/students/${studentId}/attendance`);
      return res.data ?? [];
    },
    enabled: !!studentId,
  });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  const present = data?.filter((a) => a.present).length ?? 0;
  const total = data?.length ?? 0;

  return (
    <Card>
      <CardHeader><h3 className="font-semibold">سجل الحضور</h3></CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-primary-500">{present} / {total}</p>
        <p className="text-sm text-neutral-500">أيام حضور</p>
        <div className="mt-4 max-h-64 overflow-y-auto space-y-1">
          {data?.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-sm">
              <span>{new Date(r.date).toLocaleDateString("ar-EG")}</span>
              <Badge variant={r.present ? "success" : "danger"}>{r.present ? "حاضر" : "غائب"}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StudentLoginHistoryTab({ studentId }: { studentId: string }): ReactNode {
  const { data, isLoading } = useQuery({
    queryKey: ["student-login-history", studentId],
    queryFn: async () => {
      const res = await api.get<{ id: string; createdAt: string; success: boolean; ipAddress: string | null; failureReason: string | null }[]>(`/admin/students/${studentId}/login-history`);
      return res.data ?? [];
    },
    enabled: !!studentId,
  });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Card>
      <CardHeader><h3 className="font-semibold">سجل الدخول</h3></CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-neutral-500">لا توجد سجلات</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {data.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-sm">
                <span>{new Date(r.createdAt).toLocaleString("ar-EG")}</span>
                <Badge variant={r.success ? "success" : "danger"}>{r.success ? "ناجح" : `فاشل${r.failureReason ? ` (${r.failureReason})` : ""}`}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudentSubscriptionTab({ studentId }: { studentId: string }): ReactNode {
  const { data, isLoading } = useQuery({
    queryKey: ["student-subscription", studentId],
    queryFn: async () => {
      const res = await api.get<{ payments: { id: string; productType: string; amount: number; status: string; createdAt: string }[] }>(`/admin/students/${studentId}/subscription`);
      return res.data ?? { payments: [] };
    },
    enabled: !!studentId,
  });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Card>
      <CardHeader><h3 className="font-semibold">سجل الاشتراكات والمدفوعات</h3></CardHeader>
      <CardContent>
        {!data || data.payments.length === 0 ? (
          <p className="text-sm text-neutral-500">لا توجد مدفوعات</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {data.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-sm">
                <div>
                  <span className="font-medium">{p.productType}</span>
                  <span className="mr-2 text-neutral-500">{new Date(p.createdAt).toLocaleDateString("ar-EG")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{p.amount} ج.م</span>
                  <Badge variant={p.status === "COMPLETED" ? "success" : "warning"}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionDialogs({
  dialog,
  setDialog,
  studentId,
  confirmAction,
  studentName,
  currentStatus,
}: {
  dialog: { type: string | null; data?: Record<string, string> };
  setDialog: (d: { type: "edit" | "phone" | "password" | "coins-add" | "coins-remove" | "xp" | "status" | "delete" | null; data?: Record<string, string> }) => void;
  studentId: string;
  confirmAction: { mutate: (p: { method: string; endpoint: string; body?: unknown }) => void; isPending?: boolean };
  studentName: string;
  currentStatus: string | undefined;
}): ReactNode {
  const [fieldValue, setFieldValue] = useState("");
  const [fieldValue2, setFieldValue2] = useState("");

  const close = (): void => {
    setDialog({ type: null });
    setFieldValue("");
    setFieldValue2("");
  };

  if (!dialog.type) return null;

  const dialogConfig = ((): { title: string; fields: { label: string; placeholder: string; type?: string; key: string }[]; action: () => void } => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const makeAction = (fn: () => void) => fn;

    switch (dialog.type) {
      case "edit":
        return {
          title: "تعديل بيانات الطالب",
          fields: [
            { label: "الاسم الكامل", placeholder: "اسم الطالب", key: "fullName" },
            { label: "الاسم بالإنجليزية", placeholder: "English Name", key: "englishName" },
            { label: "المحافظة", placeholder: "المحافظة", key: "governorate" },
            { label: "المدرسة", placeholder: "المدرسة", key: "school" },
          ],
          action: makeAction((): void => {
            confirmAction.mutate({ method: "patch", endpoint: `/admin/students/${studentId}`, body: { fullName: fieldValue || undefined } });
          }),
        };
      case "phone":
        return {
          title: "تغيير رقم الهاتف",
          fields: [{ label: "رقم الهاتف الجديد", placeholder: "رقم الهاتف", key: "newMobileNumber" }],
          action: makeAction((): void => { confirmAction.mutate({ method: "patch", endpoint: `/admin/students/${studentId}/phone`, body: { newMobileNumber: fieldValue } }); }),
        };
      case "password":
        return {
          title: "إعادة تعيين كلمة المرور",
          fields: [{ label: "كلمة المرور الجديدة", placeholder: "كلمة المرور", type: "password", key: "newPassword" }],
          action: makeAction((): void => { confirmAction.mutate({ method: "post", endpoint: `/admin/students/${studentId}/reset-password`, body: { newPassword: fieldValue } }); }),
        };
      case "coins-add":
        return {
          title: "إضافة عملات",
          fields: [{ label: "العدد", placeholder: "عدد العملات", type: "number", key: "amount" }],
          action: makeAction((): void => { confirmAction.mutate({ method: "post", endpoint: `/admin/students/${studentId}/coins/add`, body: { amount: Number(fieldValue), reason: fieldValue2 || undefined } }); }),
        };
      case "coins-remove":
        return {
          title: "خصم عملات",
          fields: [{ label: "العدد", placeholder: "عدد العملات", type: "number", key: "amount" }],
          action: makeAction((): void => { confirmAction.mutate({ method: "post", endpoint: `/admin/students/${studentId}/coins/remove`, body: { amount: Number(fieldValue), reason: fieldValue2 || undefined } }); }),
        };
      case "xp":
        return {
          title: "تعديل نقاط XP",
          fields: [{ label: "العدد", placeholder: "قيمة XP (موجب أو سالب)", type: "number", key: "amount" }],
          action: makeAction((): void => { confirmAction.mutate({ method: "post", endpoint: `/admin/students/${studentId}/xp/adjust`, body: { amount: Number(fieldValue), reason: fieldValue2 || undefined } }); }),
        };
      case "status":
        return {
          title: `تغيير حالة الطالب`,
          fields: [
            { label: "الحالة", placeholder: "اختر الحالة", key: "status" },
          ],
          action: makeAction((): void => {
            let status = "ACTIVE";
            if (currentStatus === "ACTIVE") status = "SUSPENDED";
            else if (currentStatus === "SUSPENDED" || currentStatus === "BANNED") status = "ACTIVE";
            confirmAction.mutate({ method: "patch", endpoint: `/admin/students/${studentId}/status`, body: { status, reason: fieldValue || undefined } });
          }),
        };
      case "delete":
        return {
          title: "حذف الحساب",
          fields: [{ label: "السبب", placeholder: "سبب الحذف (اختياري)", key: "reason" }],
          action: makeAction((): void => { confirmAction.mutate({ method: "patch", endpoint: `/admin/students/${studentId}/status`, body: { status: "DELETED", reason: fieldValue || undefined } }); }),
        };
      default:
        return {
          title: "",
          fields: [],
          action: makeAction((): void => { void 0; }),
        };
    }
  })();

  return (
    <Dialog open={!!dialog.type} onClose={close} title={dialogConfig.title}>
      <DialogContent className="space-y-3">
        {dialogConfig.fields.map((f, i) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{f.label}</label>
            {i === 0 ? (
              <Input
                placeholder={f.placeholder}
                type={f.type ?? "text"}
                value={fieldValue}
                onChange={(e) => { setFieldValue(e.target.value); }}
              />
            ) : (
              <Input
                placeholder={f.placeholder}
                type={f.type ?? "text"}
                value={fieldValue2}
                onChange={(e) => { setFieldValue2(e.target.value); }}
              />
            )}
          </div>
        ))}
        {dialog.type === "delete" && (
          <p className="text-sm text-red-500">سيتم حذف حساب {studentName} نهائياً. لا يمكن التراجع عن هذا الإجراء.</p>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={close}>إلغاء</Button>
        <Button
          onClick={dialogConfig.action}
          disabled={
            dialog.type === "status" ? false
            : dialog.type === "edit" ? false
            : dialog.type === "delete" ? false
            : !fieldValue
          }
          variant={dialog.type === "delete" ? "danger" : "primary"}
        >
          تأكيد
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function StudentsListSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}
