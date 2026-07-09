"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserCog,
  Search,
  ChevronLeft,
  User,
  BookOpen,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

interface AssignedGrade {
  id: string;
  name: string;
  stage: { id: string; name: string } | null;
  _count?: { users: number; units: number };
}

interface Teacher {
  id: string;
  fullName: string;
  englishName: string | null;
  email: string | null;
  mobileNumber: string | null;
  role: string;
  status: string;
  governorate: string | null;
  school: string | null;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  assignedGrades: AssignedGrade[];
}

interface TeacherDetail extends Teacher {
  deletedAt: string | null;
}

interface ListResponse {
  teachers: Teacher[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface StageItem {
  id: string;
  name: string;
  grades: { id: string; name: string; displayOrder: number; _count?: { users: number } }[];
}

const LIST_STATUS_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "ACTIVE", label: "نشط" },
  { value: "SUSPENDED", label: "موقوف" },
  { value: "BANNED", label: "محظور" },
  { value: "DELETED", label: "محذوف" },
];

function useTeachers(params: Record<string, string>): UseQueryResult<ListResponse> {
  const searchParams = new URLSearchParams(params);
  return useQuery<ListResponse>({
    queryKey: ["teachers", params],
    queryFn: async () => {
      const res = await api.get<ListResponse>(`/admin/teachers?${searchParams.toString()}`);
      return res.data ?? { teachers: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    },
    staleTime: 15_000,
  });
}

function useTeacherDetail(id: string | null): UseQueryResult<TeacherDetail> {
  return useQuery<TeacherDetail>({
    queryKey: ["teacher", id],
    queryFn: async () => {
      const res = await api.get<TeacherDetail>(`/admin/teachers/${id ?? ""}`);
      if (!res.data) throw new Error("Teacher not found");
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
    staleTime: 300_000,
  });
}

export default function TeachersPage(): ReactNode {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "grades">("profile");

  const filters: Record<string, string> = {};
  if (search) filters.search = search;
  if (statusFilter) filters.status = statusFilter;
  filters.page = String(page);
  filters.limit = "20";

  const { data: listData, isLoading, isError, error } = useTeachers(filters);
  const { data: detail, isLoading: detailLoading } = useTeacherDetail(selectedTeacherId);

  const refreshList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["teachers"] });
  };

  const refreshDetail = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["teacher", selectedTeacherId] });
  };

  const [dialog, setDialog] = useState<{
    type: "create" | "edit" | "grades" | "status" | "delete" | null;
    data?: Record<string, string>;
  }>({ type: null });

  const [showSummary, setShowSummary] = useState(false);

  const teachers: Teacher[] = listData?.teachers ?? [];
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

  if (selectedTeacherId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setSelectedTeacherId(null); }}>
            <ChevronLeft className="h-4 w-4 ml-1" />
            العودة
          </Button>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {detailLoading ? "..." : detail?.fullName ?? "المعلم"}
          </h1>
          {detail && statusBadge(detail.status)}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
          {([
            { key: "profile", label: "الملف الشخصي", icon: User },
            { key: "grades", label: "الصفوف الدراسية", icon: BookOpen },
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
          <TeacherProfileTab
            detail={detail}
            detailLoading={detailLoading}
            setDialog={setDialog}
            confirmAction={confirmAction}
          />
        )}

        {activeTab === "grades" && (
          <TeacherGradesTab
            detail={detail}
            detailLoading={detailLoading}
            setDialog={setDialog}
          />
        )}

        <ActionDialogs
          dialog={dialog}
          setDialog={setDialog}
          teacherId={selectedTeacherId}
          confirmAction={confirmAction}
          teacherName={detail?.fullName ?? ""}
          currentStatus={detail?.status}
          teacherDetail={detail}
          onSaved={() => { setShowSummary(true); }}
        />

        {showSummary && detail && (
          <AssignmentSummary
            grades={detail.assignedGrades}
            onClose={() => { setShowSummary(false); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">المعلمون</h1>
          <p className="mt-1 text-sm text-neutral-500">إدارة المعلمين والصلاحيات الدراسية</p>
        </div>
        <Button size="sm" onClick={() => { setDialog({ type: "create" }); }}>
          <Plus className="h-4 w-4 ml-1" />
          إضافة معلم
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">بحث</label>
              <div className="flex gap-2">
                <Input
                  placeholder="اسم المعلم أو رقم الهاتف..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                />
                <Button size="sm" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الحالة</label>
              <Select
                options={LIST_STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <TeachersListSkeleton />
      ) : isError ? (
        <ErrorState title="فشل التحميل" description={error instanceof Error ? error.message : "حدث خطأ"} />
      ) : teachers.length === 0 ? (
        <EmptyState title="لا يوجد معلمون" description="لم يتم العثور على معلمين" icon={<UserCog className="h-16 w-16" />} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">إجمالي {meta.total} معلم</span>
          </div>

          <div className="flex flex-col gap-3">
            {teachers.map((t) => {
              const totalStudents = t.assignedGrades.reduce((sum, g) => sum + (g._count?.users ?? 0), 0);
              const stageNames = [...new Set(t.assignedGrades.map((g) => g.stage?.name).filter(Boolean))];
              const lastLoginStr = t.lastLogin
                ? new Date(t.lastLogin).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })
                : null;

              return (
                <Card key={t.id} variant="outline" padding="sm">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10">
                          <UserCog className="h-5 w-5 text-primary-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{t.fullName}</span>
                            {statusBadge(t.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500 mt-0.5">
                            <span>{t.mobileNumber ?? "—"}</span>
                            <span>{t.assignedGrades.length} صفوف</span>
                            <span>{totalStudents} طالب</span>
                            {stageNames.length > 0 && (
                              <span>{stageNames.join("، ")}</span>
                            )}
                            {lastLoginStr && (
                              <span>آخر دخول: {lastLoginStr}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedTeacherId(t.id); }}>
                          <User className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

      <CreateTeacherDialog
        open={dialog.type === "create"}
        onClose={() => { setDialog({ type: null }); }}
        confirmAction={confirmAction}
      />
    </div>
  );
}

function TeacherProfileTab({
  detail,
  detailLoading,
  setDialog,
  confirmAction: _confirmAction,
}: {
  detail: TeacherDetail | undefined;
  detailLoading: boolean;
  setDialog: (d: { type: "edit" | "grades" | "status" | "delete"; data?: Record<string, string> }) => void;
  confirmAction: { mutate: (p: { method: string; endpoint: string; body?: unknown }) => void; isPending?: boolean };
}): ReactNode {
  if (detailLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!detail) return <ErrorState title="خطأ" description="لم يتم العثور على بيانات المعلم" />;

  const infoRows: { label: string; value: string | null }[] = [
    { label: "الاسم بالعربية", value: detail.fullName },
    { label: "الاسم بالإنجليزية", value: detail.englishName },
    { label: "البريد الإلكتروني", value: detail.email },
    { label: "رقم الهاتف", value: detail.mobileNumber },
    { label: "المحافظة", value: detail.governorate },
    { label: "المدرسة", value: detail.school },
    { label: "تاريخ التسجيل", value: new Date(detail.createdAt).toLocaleDateString("ar-EG") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">بيانات المعلم</h2>
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
            <Button size="sm" variant="outline" onClick={() => { setDialog({ type: "grades" }); }}>
              <BookOpen className="h-4 w-4 ml-1" />
              إدارة الصفوف
            </Button>
            {detail.status !== "DELETED" && (
              <>
                <Button size="sm" variant="outline" className="text-amber-500" onClick={() => { setDialog({ type: "status" }); }}>
                  تغيير الحالة
                </Button>
                <Button size="sm" variant="outline" className="text-red-500" onClick={() => { setDialog({ type: "delete" }); }}>
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

function TeacherGradesTab({
  detail,
  detailLoading,
  setDialog,
}: {
  detail: TeacherDetail | undefined;
  detailLoading: boolean;
  setDialog: (d: { type: "grades"; data?: Record<string, string> }) => void;
}): ReactNode {
  if (detailLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!detail) return <ErrorState title="خطأ" description="لم يتم العثور على بيانات" />;

  const grouped = detail.assignedGrades.reduce<Record<string, AssignedGrade[]>>((acc, g) => {
    const stageName = g.stage?.name ?? "أخرى";
    if (!acc[stageName]) acc[stageName] = [];
    acc[stageName].push(g);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">الصفوف الدراسية المسندة</h2>
          <Button size="sm" variant="outline" onClick={() => { setDialog({ type: "grades" }); }}>
            <Plus className="h-4 w-4 ml-1" />
            تعديل
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {detail.assignedGrades.length === 0 ? (
          <p className="text-sm text-neutral-500">لم يتم إسناد أي صفوف دراسية لهذا المعلم</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([stageName, grades]) => (
              <div key={stageName}>
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">{stageName}</p>
                <div className="flex flex-wrap gap-2">
                  {grades.map((g) => (
                    <Badge key={g.id} variant="info">{g.name}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateTeacherDialog({
  open,
  onClose,
  confirmAction,
}: {
  open: boolean;
  onClose: () => void;
  confirmAction: { mutate: (p: { method: string; endpoint: string; body?: unknown }) => void; isPending?: boolean };
}): ReactNode {
  const [fullName, setFullName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [school, setSchool] = useState("");

  const reset = (): void => {
    setFullName("");
    setEnglishName("");
    setEmail("");
    setMobileNumber("");
    setGovernorate("");
    setSchool("");
  };

  const handleSubmit = (): void => {
    confirmAction.mutate({
      method: "post",
      endpoint: "/admin/teachers",
      body: { fullName, englishName: englishName || undefined, email: email || undefined, mobileNumber: mobileNumber || undefined, governorate: governorate || undefined, school: school || undefined },
    });
    reset();
  };

  return (
    <Dialog open={open} onClose={() => { onClose(); reset(); }} title="إضافة معلم جديد">
      <DialogContent className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الاسم بالعربية *</label>
          <Input placeholder="اسم المعلم" value={fullName} onChange={(e) => { setFullName(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الاسم بالإنجليزية</label>
          <Input placeholder="English Name" value={englishName} onChange={(e) => { setEnglishName(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">البريد الإلكتروني</label>
          <Input placeholder="teacher@example.com" value={email} onChange={(e) => { setEmail(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">رقم الهاتف</label>
          <Input placeholder="رقم الهاتف" value={mobileNumber} onChange={(e) => { setMobileNumber(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المحافظة</label>
          <Input placeholder="المحافظة" value={governorate} onChange={(e) => { setGovernorate(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المدرسة</label>
          <Input placeholder="المدرسة" value={school} onChange={(e) => { setSchool(e.target.value); }} />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => { onClose(); reset(); }}>إلغاء</Button>
        <Button onClick={handleSubmit} disabled={!fullName}>إضافة</Button>
      </DialogFooter>
    </Dialog>
  );
}

function ActionDialogs({
  dialog,
  setDialog,
  teacherId,
  confirmAction,
  teacherName,
  currentStatus,
  teacherDetail,
  onSaved,
}: {
  dialog: { type: string | null; data?: Record<string, string> };
  setDialog: (d: { type: "edit" | "grades" | "status" | "delete" | null; data?: Record<string, string> }) => void;
  teacherId: string;
  confirmAction: { mutate: (p: { method: string; endpoint: string; body?: unknown }) => void; isPending?: boolean };
  teacherName: string;
  currentStatus: string | undefined;
  teacherDetail?: TeacherDetail;
  onSaved: () => void;
}): ReactNode {
  const [editFullName, setEditFullName] = useState("");
  const [editEnglishName, setEditEnglishName] = useState("");
  const [editGovernorate, setEditGovernorate] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    if (dialog.type === "edit" && teacherDetail) {
      setEditFullName(teacherDetail.fullName ?? "");
      setEditEnglishName(teacherDetail.englishName ?? "");
      setEditGovernorate(teacherDetail.governorate ?? "");
      setEditSchool(teacherDetail.school ?? "");
    }
  }, [dialog.type, teacherDetail]);

  const close = (): void => {
    setDialog({ type: null });
    setStatusReason("");
    setDeleteReason("");
  };

  if (!dialog.type || dialog.type === "create") return null;

  const dialogConfig = ((): { title: string; content: ReactNode; action: () => void; disableSave?: boolean } => {
    switch (dialog.type) {
      case "edit":
        return {
          title: "تعديل بيانات المعلم",
          content: (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الاسم الكامل</label>
                <Input placeholder="اسم المعلم" value={editFullName} onChange={(e) => { setEditFullName(e.target.value); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الاسم بالإنجليزية</label>
                <Input placeholder="English Name" value={editEnglishName} onChange={(e) => { setEditEnglishName(e.target.value); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المحافظة</label>
                <Input placeholder="المحافظة" value={editGovernorate} onChange={(e) => { setEditGovernorate(e.target.value); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">المدرسة</label>
                <Input placeholder="المدرسة" value={editSchool} onChange={(e) => { setEditSchool(e.target.value); }} />
              </div>
            </div>
          ),
          action: (): void => {
            confirmAction.mutate({
              method: "patch",
              endpoint: `/admin/teachers/${teacherId}`,
              body: {
                fullName: editFullName || undefined,
                englishName: editEnglishName || undefined,
                governorate: editGovernorate || undefined,
                school: editSchool || undefined,
              },
            });
          },
        };
      case "grades":
        return {
          title: "إدارة الصفوف الدراسية",
          content: <GradeSelector teacherId={teacherId} confirmAction={confirmAction} onSaved={onSaved} />,
          disableSave: true,
          action: (): void => { void 0; },
        };
      case "status":
        return {
          title: "تغيير حالة المعلم",
          content: (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">السبب</label>
              <Input
                placeholder="سبب تغيير الحالة (اختياري)"
                value={statusReason}
                onChange={(e) => { setStatusReason(e.target.value); }}
              />
            </div>
          ),
          action: (): void => {
            let status = "ACTIVE";
            if (currentStatus === "ACTIVE") status = "SUSPENDED";
            else if (currentStatus === "SUSPENDED" || currentStatus === "BANNED") status = "ACTIVE";
            confirmAction.mutate({ method: "patch", endpoint: `/admin/teachers/${teacherId}/status`, body: { status, reason: statusReason || undefined } });
          },
        };
      case "delete":
        return {
          title: "حذف الحساب",
          content: (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">السبب</label>
                <Input
                  placeholder="سبب الحذف (اختياري)"
                  value={deleteReason}
                  onChange={(e) => { setDeleteReason(e.target.value); }}
                />
              </div>
              <p className="text-sm text-red-500 mt-3">سيتم حذف حساب {teacherName} نهائياً. لا يمكن التراجع عن هذا الإجراء.</p>
            </>
          ),
          action: (): void => {
            confirmAction.mutate({ method: "patch", endpoint: `/admin/teachers/${teacherId}/status`, body: { status: "DELETED", reason: deleteReason || undefined } });
          },
        };
      default:
        return {
          title: "",
          content: null,
          action: (): void => { void 0; },
        };
    }
  })();

  return (
    <Dialog open={!!dialog.type} onClose={close} title={dialogConfig.title}>
      <DialogContent className="space-y-3">
        {dialogConfig.content}
      </DialogContent>
      {!dialogConfig.disableSave && (
        <DialogFooter>
          <Button variant="outline" onClick={close}>إلغاء</Button>
          <Button
            onClick={dialogConfig.action}
            disabled={dialog.type === "edit" ? !editFullName : false}
            variant={dialog.type === "delete" ? "danger" : "primary"}
          >
            تأكيد
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  );
}

function GradeSelector({
  teacherId,
  confirmAction,
  onSaved,
}: {
  teacherId: string;
  confirmAction: { mutate: (p: { method: string; endpoint: string; body?: unknown }) => void; isPending?: boolean };
  onSaved: () => void;
}): ReactNode {
  const [selectedGradeIds, setSelectedGradeIds] = useState<Set<string>>(new Set());
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{ grades: Array<{ id: string; name: string; stageName: string; studentCount?: number }> } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: stages, isLoading: stagesLoading } = useStages();

  const { data: teacherDetail } = useQuery<TeacherDetail>({
    queryKey: ["teacher", teacherId],
    queryFn: async () => {
      const res = await api.get<TeacherDetail>(`/admin/teachers/${teacherId}`);
      if (!res.data) throw new Error("Teacher not found");
      return res.data;
    },
    staleTime: 0,
  });

  const currentGradeIds = new Set(teacherDetail?.assignedGrades.map((g) => g.id) ?? []);

  useEffect(() => {
    if (stages && currentGradeIds.size > 0 && selectedGradeIds.size === 0) {
      setSelectedGradeIds(new Set(currentGradeIds));
      setExpandedStages(new Set(stages.map((s) => s.id)));
    }
  }, [stages, currentGradeIds, selectedGradeIds.size]);

  const toggleStage = (stageId: string): void => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const toggleGrade = (gradeId: string): void => {
    setSelectedGradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(gradeId)) {
        next.delete(gradeId);
      } else {
        next.add(gradeId);
      }
      return next;
    });
  };

  const toggleAllInStage = (stage: StageItem, checked: boolean): void => {
    setSelectedGradeIds((prev) => {
      const next = new Set(prev);
      for (const grade of stage.grades) {
        if (checked) {
          next.add(grade.id);
        } else {
          next.delete(grade.id);
        }
      }
      return next;
    });
  };

  const isStageFullySelected = (stage: StageItem): boolean => {
    return stage.grades.every((g) => selectedGradeIds.has(g.id));
  };

  const isStagePartiallySelected = (stage: StageItem): boolean => {
    return stage.grades.some((g) => selectedGradeIds.has(g.id)) && !isStageFullySelected(stage);
  };

  const handleSave = (): void => {
    setSaving(true);
    confirmAction.mutate({
      method: "post",
      endpoint: `/admin/teachers/${teacherId}/grades`,
      body: { gradeIds: [...selectedGradeIds] },
    });
    const gradeMap = new Map<string, string>();
    if (stages) {
      for (const stage of stages) {
        for (const grade of stage.grades) {
          gradeMap.set(grade.id, grade.name);
        }
      }
    }
    setSummary({
      grades: [...selectedGradeIds].map((id) => {
        const grade = teacherDetail?.assignedGrades.find((g) => g.id === id)
          ?? stages?.flatMap((s) => s.grades).find((g) => g.id === id);
        const stageName = grade && "stage" in grade
          ? (grade as AssignedGrade).stage?.name ?? ""
          : stages?.find((s) => s.grades.some((g) => g.id === id))?.name ?? "";
        return { id, name: gradeMap.get(id) ?? id, stageName, studentCount: (grade as AssignedGrade)?._count?.users ?? 0 };
      }),
    });
    onSaved();
    setSaving(false);
  };

  if (stagesLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!stages) return <ErrorState title="خطأ" description="فشل تحميل المراحل الدراسية" />;

  if (summary) {
    return (
      <GradeSummaryCard summary={summary} onBack={() => { setSummary(null); }} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500">
        اختر الصفوف الدراسية المسندة لهذا المعلم. يمكنك تحديد صفوف متعددة عبر أزرار التحديد الجماعي لكل مرحلة.
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          تم اختيار {selectedGradeIds.size} صف
        </span>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          <Check className="h-4 w-4 ml-1" />
          حفظ التغييرات
        </Button>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3">
        {stages.map((stage) => {
          const expanded = expandedStages.has(stage.id);
          const fullySelected = isStageFullySelected(stage);
          const partiallySelected = isStagePartiallySelected(stage);

          return (
            <div key={stage.id} className="rounded-lg border border-neutral-100 dark:border-neutral-800 overflow-hidden">
              <button
                type="button"
                onClick={() => { toggleStage(stage.id); }}
                className="flex w-full items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); }}>
                  <Checkbox
                    checked={fullySelected}
                    indeterminate={partiallySelected}
                    onChange={() => { toggleAllInStage(stage, !fullySelected); }}
                    aria-label={`تحديد الكل - ${stage.name}`}
                  />
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{stage.name}</span>
                  <span className="text-xs text-neutral-400">
                    ({stage.grades.length} صفوف)
                  </span>
                  <span className="text-xs text-neutral-400" dir="ltr">
                    {stage.grades.reduce((sum, g) => sum + (g._count?.users ?? 0), 0)} طالب
                  </span>
                  {fullySelected && (
                    <Check className="h-3 w-3 text-primary-500" />
                  )}
                </div>
                <span className="text-neutral-400">
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {expanded && (
                <div className="flex flex-wrap gap-2 px-3 py-2">
                  {stage.grades.map((grade) => (
                    <label
                      key={grade.id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        selectedGradeIds.has(grade.id)
                          ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                          : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
                      }`}
                    >
                      <Checkbox
                        checked={selectedGradeIds.has(grade.id)}
                        onChange={() => { toggleGrade(grade.id); }}
                      />
                      {grade.name}
                      {grade._count?.users !== undefined && (
                        <span className="text-neutral-400 text-[10px]">({grade._count.users})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (stages) {
              const all = new Set(stages.flatMap((s) => s.grades.map((g) => g.id)));
              setSelectedGradeIds(all);
              setExpandedStages(new Set(stages.map((s) => s.id)));
            }
          }}
        >
          تحديد الكل
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setSelectedGradeIds(new Set()); }}
        >
          إلغاء التحديد الكل
        </Button>
      </div>
    </div>
  );
}

function GradeSummaryCard({
  summary,
  onBack,
}: {
  summary: { grades: Array<{ id: string; name: string; stageName: string; studentCount?: number }> };
  onBack: () => void;
}): ReactNode {
  const totalStudents = summary.grades.reduce((sum, g) => sum + (g.studentCount ?? 0), 0);
  const grouped = summary.grades.reduce<Record<string, { id: string; name: string; studentCount?: number }[]>>((acc, g) => {
    if (!acc[g.stageName]) acc[g.stageName] = [];
    acc[g.stageName].push({ id: g.id, name: g.name, studentCount: g.studentCount });
    return acc;
  }, {});

  return (
    <Card variant="glass" padding="md" className="border-primary-500/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">الصفوف الدراسية المسندة</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-xs text-neutral-500 mb-2">إجمالي الطلاب: {totalStudents} طالب</p>
          {Object.entries(grouped).map(([stageName, grades]) => {
            const stageTotal = grades.reduce((sum, g) => sum + (g.studentCount ?? 0), 0);
            return (
              <div key={stageName}>
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                  {stageName} ({stageTotal} طالب)
                </p>
                <div className="flex flex-col gap-0.5 pr-2">
                  {grades.map((g) => (
                    <div key={g.id} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                      <span className="text-primary-500">•</span>
                      <span>{g.name}</span>
                      {g.studentCount ? <span className="text-neutral-400 text-xs">({g.studentCount})</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="outline" onClick={onBack} className="mt-4">
          تعديل
        </Button>
      </CardContent>
    </Card>
  );
}

function AssignmentSummary({
  grades,
  onClose,
}: {
  grades: AssignedGrade[];
  onClose: () => void;
}): ReactNode {
  const totalStudents = grades.reduce((sum, g) => sum + (g._count?.users ?? 0), 0);
  const grouped = grades.reduce<Record<string, AssignedGrade[]>>((acc, g) => {
    const stageName = g.stage?.name ?? "أخرى";
    if (!acc[stageName]) acc[stageName] = [];
    acc[stageName].push(g);
    return acc;
  }, {});

  return (
    <Card variant="glass" padding="md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">الصفوف المسندة</h3>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-xs text-neutral-500 mb-1">إجمالي الطلاب: {totalStudents} طالب</p>
          {Object.entries(grouped).map(([stageName, gs]) => {
            const stageTotal = gs.reduce((sum, g) => sum + (g._count?.users ?? 0), 0);
            return (
              <div key={stageName}>
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                  {stageName} ({stageTotal} طالب)
                </p>
                <div className="flex flex-col gap-0.5 pr-2">
                  {gs.map((g) => (
                    <div key={g.id} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                      <span className="text-primary-500">•</span>
                      <span>{g.name}</span>
                      {g._count?.users ? <span className="text-neutral-400 text-xs">({g._count.users})</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TeachersListSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}
