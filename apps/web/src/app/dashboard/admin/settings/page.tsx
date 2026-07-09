"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  Calendar,
  BookOpen,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface SystemSettings {
  termManagementMode: "AUTO" | "MANUAL";
  activeAcademicYearId: string | null;
  activeTermId: string | null;
  autoTermStartDate: string | null;
  autoTermEndDate: string | null;
  maintenanceMode: boolean;
}

interface Term {
  id: string;
  name: string;
  academicYearId: string;
  displayOrder: number;
}

interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
  terms: Term[];
  _count: { users: number; units: number };
}

function useSettings(): UseQueryResult<SystemSettings | null> {
  return useQuery<SystemSettings | null>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await api.get<SystemSettings>("/admin/settings");
      return res.data ?? null;
    },
    staleTime: 30_000,
  });
}

function useAcademicYears(): UseQueryResult<AcademicYear[]> {
  return useQuery<AcademicYear[]>({
    queryKey: ["admin-academic-years"],
    queryFn: async () => {
      const res = await api.get<AcademicYear[]>("/admin/academic-years");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

export default function AdminSettingsPage(): ReactNode {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: settingsLoading, isError: settingsError, error: settingsErr } = useSettings();
  const { data: academicYears, isLoading: yearsLoading } = useAcademicYears();

  const [showCreateYear, setShowCreateYear] = useState(false);
  const [showCreateTerm, setShowCreateTerm] = useState<string | null>(null);
  const [editYearId, setEditYearId] = useState<string | null>(null);
  const [editTermId, setEditTermId] = useState<string | null>(null);

  const [newYearName, setNewYearName] = useState("");
  const [editYearName, setEditYearName] = useState("");
  const [newTermName, setNewTermName] = useState("");
  const [newTermOrder, setNewTermOrder] = useState("0");
  const [editTermName, setEditTermName] = useState("");
  const [editTermOrder, setEditTermOrder] = useState("0");

  const [autoStartDate, setAutoStartDate] = useState("");
  const [autoEndDate, setAutoEndDate] = useState("");

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: Partial<SystemSettings>) => {
      const res = await api.patch<SystemSettings>("/admin/settings", payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const createYearMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<AcademicYear>("/admin/academic-years", { name });
      return res.data;
    },
    onSuccess: () => {
      setShowCreateYear(false);
      setNewYearName("");
      void queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] });
    },
  });

  const updateYearMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) => {
      const res = await api.patch<AcademicYear>(`/admin/academic-years/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      setEditYearId(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] });
    },
  });

  const deleteYearMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/academic-years/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const createTermMutation = useMutation({
    mutationFn: async ({ academicYearId, name, displayOrder }: { academicYearId: string; name: string; displayOrder: number }) => {
      const res = await api.post<Term>(`/admin/academic-years/${academicYearId}/terms`, { name, displayOrder });
      return res.data;
    },
    onSuccess: () => {
      setShowCreateTerm(null);
      setNewTermName("");
      setNewTermOrder("0");
      void queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] });
    },
  });

  const updateTermMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; displayOrder?: number } }) => {
      const res = await api.patch<Term>(`/admin/terms/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      setEditTermId(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] });
    },
  });

  const deleteTermMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/terms/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const handleToggleMode = (): void => {
    const newMode = settings?.termManagementMode === "AUTO" ? "MANUAL" : "AUTO";
    updateSettingsMutation.mutate({ termManagementMode: newMode });
  };

  const handleSetActiveYear = (yearId: string): void => {
    updateSettingsMutation.mutate({ activeAcademicYearId: yearId });
  };

  const handleSetActiveTerm = (termId: string): void => {
    updateSettingsMutation.mutate({ activeTermId: termId });
  };

  const handleSaveAutoDates = (): void => {
    updateSettingsMutation.mutate({
      autoTermStartDate: autoStartDate || null,
      autoTermEndDate: autoEndDate || null,
    });
  };

  if (settingsLoading || yearsLoading) return <AdminSettingsSkeleton />;
  if (settingsError) return <ErrorState title="فشل التحميل" description={settingsErr instanceof Error ? settingsErr.message : "حدث خطأ"} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">إعدادات المنصة</h1>
          <p className="mt-1 text-sm text-neutral-500">إدارة الإعدادات العامة للمنصة والسنوات الدراسية</p>
        </div>
      </div>

      {/* Term Management Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">نظام إدارة الترم</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500">
                {settings?.termManagementMode === "AUTO" ? "تلقائي" : "يدوي"}
              </span>
              <Button
                variant={settings?.termManagementMode === "AUTO" ? "primary" : "secondary"}
                size="sm"
                onClick={handleToggleMode}
              >
                {settings?.termManagementMode === "AUTO" ? "تلقائي" : "يدوي"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            {settings?.termManagementMode === "AUTO"
              ? "يتم تحديد الترم النشط تلقائياً بناءً على التواريخ المحددة."
              : "يتم تحديد الترم النشط يدوياً بواسطة المسؤول."}
          </p>

          {settings?.termManagementMode === "AUTO" && (
            <div className="mt-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">تاريخ البداية</label>
                <Input
                  type="date"
                  value={autoStartDate || (settings.autoTermStartDate?.split("T")[0] ?? "")}
                  onChange={(e): void => { setAutoStartDate(e.target.value); }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">تاريخ النهاية</label>
                <Input
                  type="date"
                  value={autoEndDate || (settings.autoTermEndDate?.split("T")[0] ?? "")}
                  onChange={(e): void => { setAutoEndDate(e.target.value); }}
                />
              </div>
              <Button size="sm" onClick={handleSaveAutoDates}>
                <Calendar className="ml-1 h-4 w-4" />
                حفظ التواريخ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Active Context */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">السياق الأكاديمي النشط</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-4">
              <span className="text-sm text-neutral-500">السنة الدراسية النشطة</span>
              <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {academicYears?.find((y) => y.id === settings?.activeAcademicYearId)?.name ?? "غير محدد"}
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-4">
              <span className="text-sm text-neutral-500">الترم النشط</span>
              <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {(() : string => {
                  const year = academicYears?.find((y) => y.id === settings?.activeAcademicYearId);
                  const term = year?.terms.find((t) => t.id === settings?.activeTermId);
                  return term?.name ?? "غير محدد";
                })()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Years */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">السنوات الدراسية</h2>
            </div>
            <Button size="sm" onClick={() => { setShowCreateYear(true); }}>
              <Plus className="ml-1 h-4 w-4" />
              إضافة سنة
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!academicYears || academicYears.length === 0 ? (
            <EmptyState title="لا توجد سنوات دراسية" description="أضف السنة الدراسية الأولى" icon={<Layers className="h-12 w-12" />} />
          ) : (
            <div className="flex flex-col gap-4">
              {academicYears.map((year) => (
                <div key={year.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">{year.name}</span>
                      {year.isActive && (
                        <span className="rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-xs text-green-700 dark:text-green-300">
                          نشط
                        </span>
                      )}
                      {settings?.activeAcademicYearId === year.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">{year._count.users} طالب</span>
                      {settings?.termManagementMode === "MANUAL" && (
                        <Button
                          size="sm"
                          variant={settings.activeAcademicYearId === year.id ? "primary" : "outline"}
                          onClick={() => { handleSetActiveYear(year.id); }}
                        >
                          تعيين نشط
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setEditYearId(year.id); setEditYearName(year.name); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { deleteYearMutation.mutate(year.id); }} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="mr-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">الترمات</span>
                      <Button size="sm" variant="outline" onClick={() => { setShowCreateTerm(year.id); }}>
                        <Plus className="h-3 w-3 ml-1" />
                        إضافة ترم
                      </Button>
                    </div>
                    {year.terms.length === 0 ? (
                      <p className="text-sm text-neutral-400">لا توجد ترمات</p>
                    ) : (
                      year.terms.map((term) => (
                        <div key={term.id} className="flex items-center justify-between rounded-md bg-neutral-50 dark:bg-neutral-800 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-800 dark:text-neutral-200">{term.name}</span>
                            <span className="text-xs text-neutral-400">ترتيب: {term.displayOrder}</span>
                            {settings?.activeTermId === term.id && (
                              <CheckCircle2 className="h-3 w-3 text-primary-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {settings?.termManagementMode === "MANUAL" && (
                              <Button
                                size="sm"
                                variant={settings.activeTermId === term.id ? "primary" : "ghost"}
                                onClick={() => { handleSetActiveTerm(term.id); }}
                              >
                                تعيين
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { setEditTermId(term.id); setEditTermName(term.name); setEditTermOrder(String(term.displayOrder)); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { deleteTermMutation.mutate(term.id); }} className="text-red-500">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Year Dialog */}
      <Dialog open={showCreateYear} onClose={() => { setShowCreateYear(false); }} title="إضافة سنة دراسية">
        <DialogContent>
          <Input
            placeholder="اسم السنة الدراسية (مثال: 2025-2026)"
            value={newYearName}
            onChange={(e) => { setNewYearName(e.target.value); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowCreateYear(false); }}>إلغاء</Button>
          <Button onClick={() => { if (newYearName.trim()) createYearMutation.mutate(newYearName.trim()); }} disabled={!newYearName.trim()}>إضافة</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Year Dialog */}
      <Dialog open={!!editYearId} onClose={() => { setEditYearId(null); }} title="تعديل السنة الدراسية">
        <DialogContent>
          <Input
            placeholder="اسم السنة الدراسية"
            value={editYearName}
            onChange={(e) => { setEditYearName(e.target.value); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditYearId(null); }}>إلغاء</Button>
          <Button onClick={() => { if (editYearName.trim() && editYearId) updateYearMutation.mutate({ id: editYearId, data: { name: editYearName.trim() } }); }} disabled={!editYearName.trim()}>حفظ</Button>
        </DialogFooter>
      </Dialog>

      {/* Create Term Dialog */}
      <Dialog open={!!showCreateTerm} onClose={() => { setShowCreateTerm(null); }} title="إضافة ترم">
        <DialogContent className="space-y-3">
          <Input
            placeholder="اسم الترم (مثال: الترم الأول)"
            value={newTermName}
            onChange={(e) => { setNewTermName(e.target.value); }}
          />
          <Input
            type="number"
            placeholder="ترتيب العرض"
            value={newTermOrder}
            onChange={(e) => { setNewTermOrder(e.target.value); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowCreateTerm(null); }}>إلغاء</Button>
          <Button onClick={() => { if (newTermName.trim() && showCreateTerm) createTermMutation.mutate({ academicYearId: showCreateTerm, name: newTermName.trim(), displayOrder: Number(newTermOrder) || 0 }); }} disabled={!newTermName.trim()}>إضافة</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Term Dialog */}
      <Dialog open={!!editTermId} onClose={() => { setEditTermId(null); }} title="تعديل الترم">
        <DialogContent className="space-y-3">
          <Input
            placeholder="اسم الترم"
            value={editTermName}
            onChange={(e) => { setEditTermName(e.target.value); }}
          />
          <Input
            type="number"
            placeholder="ترتيب العرض"
            value={editTermOrder}
            onChange={(e) => { setEditTermOrder(e.target.value); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditTermId(null); }}>إلغاء</Button>
          <Button onClick={() => { if (editTermName.trim() && editTermId) updateTermMutation.mutate({ id: editTermId, data: { name: editTermName.trim(), displayOrder: Number(editTermOrder) || 0 } }); }} disabled={!editTermName.trim()}>حفظ</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function AdminSettingsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
    </div>
  );
}
