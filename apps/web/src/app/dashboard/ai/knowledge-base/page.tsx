"use client";

import { useEffect, useState, useRef, useCallback, type ReactNode, type ChangeEvent } from "react";
import { api } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@el-bannawy/shared";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Link,
  Search,
  Upload,
  Database,
  X,
  Save,
  Edit3,
  Power,
  Eye,
  ListChecks,
} from "lucide-react";

type KnowledgeSourceType = "PDF" | "DOCX" | "TXT" | "MD" | "JSON" | "URL" | "LESSON" | "UNIT" | "STORY" | "REVIEW";

type KnowledgeSourceStatus = "PENDING" | "PROCESSING" | "INDEXED" | "FAILED";

interface KnowledgeStats {
  totalSources: number;
  indexedSources: number;
  pendingSources: number;
  failedSources: number;
  disabledSources: number;
  totalChunks: number;
  totalEmbeddedChunks: number;
  coverage: number;
  sourcesByType: { type: string; count: number }[];
}

interface Grade {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
}

interface KnowledgeSource {
  id: string;
  title: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  isEnabled: boolean;
  gradeId: string | null;
  termId: string | null;
  url: string | null;
  fileUrl: string | null;
  fileName: string | null;
  chunkCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  grade?: { id: string; name: string } | null;
  term?: { id: string; name: string } | null;
}

interface SearchPreviewResult {
  chunkId: string;
  content: string;
  score: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
}

interface CreateSourcePayload {
  title: string;
  type: KnowledgeSourceType;
  gradeId: string;
  termId: string;
  url?: string;
}

interface UpdateSourcePayload {
  title?: string;
  type?: KnowledgeSourceType;
  gradeId?: string;
  termId?: string;
  url?: string;
}

interface ReindexPayload {
  sourceId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "primary" | "secondary" | "success" | "warning" | "danger" | "info" }> = {
  PENDING: { label: "قيد الانتظار", variant: "warning" },
  PROCESSING: { label: "قيد المعالجة", variant: "info" },
  INDEXED: { label: "مفهرس", variant: "success" },
  FAILED: { label: "فشل", variant: "danger" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: ReactNode }> = {
  PDF: { label: "PDF", icon: <FileText className="h-4 w-4" /> },
  DOCX: { label: "DOCX", icon: <FileText className="h-4 w-4" /> },
  TXT: { label: "نص", icon: <FileText className="h-4 w-4" /> },
  MD: { label: "Markdown", icon: <FileText className="h-4 w-4" /> },
  JSON: { label: "JSON", icon: <FileText className="h-4 w-4" /> },
  URL: { label: "رابط", icon: <Link className="h-4 w-4" /> },
  LESSON: { label: "درس", icon: <FileText className="h-4 w-4" /> },
  UNIT: { label: "وحدة", icon: <FileText className="h-4 w-4" /> },
  STORY: { label: "قصة", icon: <FileText className="h-4 w-4" /> },
  REVIEW: { label: "مراجعة", icon: <FileText className="h-4 w-4" /> },
};

const SOURCE_TYPE_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "PDF", label: "PDF" },
  { value: "DOCX", label: "DOCX" },
  { value: "TXT", label: "نص" },
  { value: "MD", label: "Markdown" },
  { value: "JSON", label: "JSON" },
  { value: "URL", label: "رابط" },
  { value: "LESSON", label: "درس" },
  { value: "UNIT", label: "وحدة" },
  { value: "STORY", label: "قصة" },
  { value: "REVIEW", label: "مراجعة" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "PENDING", label: "قيد الانتظار" },
  { value: "PROCESSING", label: "قيد المعالجة" },
  { value: "INDEXED", label: "مفهرس" },
  { value: "FAILED", label: "فشل" },
];

export default function KnowledgeBasePage(): ReactNode {
  const router = useRouter();
  const { can } = usePermissions();

  if (!can(PERMISSIONS.AI_SETTINGS_MANAGE)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ErrorState title="لا تملك صلاحية الوصول" description="هذه الصفحة مخصصة للمدير فقط" />
        <Button variant="outline" onClick={() => { router.push("/dashboard"); }}>العودة للرئيسية</Button>
      </div>
    );
  }

  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexingIds, setReindexingIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    const id = setTimeout((): void => { setDebouncedSearch(searchQuery); }, 400);
    return (): void => { clearTimeout(id); };
  }, [searchQuery]);

  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [previewQuery, setPreviewQuery] = useState("");
  const [previewResults, setPreviewResults] = useState<SearchPreviewResult[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState<CreateSourcePayload>({
    title: "",
    type: "PDF",
    gradeId: "",
    termId: "",
    url: "",
  });
  const [createFile, setCreateFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterGrade) params.set("gradeId", filterGrade);
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("type", filterType);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const qs = params.toString();
      const [sourcesRes, gradesRes, termsRes, statsRes] = await Promise.all([
        api.get<KnowledgeSource[]>(`/ai-knowledge-base/sources${qs ? `?${qs}` : ""}`),
        api.get<Grade[]>("/ai-knowledge-base/grades"),
        api.get<Term[]>("/ai-knowledge-base/terms"),
        api.get<KnowledgeStats>("/ai-knowledge-base/stats"),
      ]);

      if (Array.isArray(sourcesRes.data)) setSources(sourcesRes.data);
      if (gradesRes.data) setGrades(gradesRes.data);
      if (termsRes.data) setTerms(termsRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل قاعدة المعرفة");
    } finally {
      setLoading(false);
    }
  }, [filterGrade, filterStatus, filterType, debouncedSearch]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCreate = async (): Promise<void> => {
    try {
      setSaving(true);

      if (createFile) {
        const formData = new FormData();
        formData.append("file", createFile);
        formData.append("title", createForm.title);
        formData.append("type", createForm.type);
        if (createForm.gradeId) formData.append("gradeId", createForm.gradeId);
        if (createForm.termId) formData.append("termId", createForm.termId);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/ai-knowledge-base/sources`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          },
        );

        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          throw new Error(
            typeof errBody.message === "string" ? errBody.message : "فشل إنشاء المصدر",
          );
        }
      } else {
        await api.post("/ai-knowledge-base/sources", createForm);
      }

      setShowCreateDialog(false);
      resetCreateForm();
      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إنشاء المصدر");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (): Promise<void> => {
    if (!editingSource) return;
    try {
      setSaving(true);
      const payload: UpdateSourcePayload = {};
      if (createForm.title) payload.title = createForm.title;
      payload.type = createForm.type;
      if (createForm.gradeId) payload.gradeId = createForm.gradeId;
      if (createForm.termId) payload.termId = createForm.termId;
      if (createForm.url) payload.url = createForm.url;

      await api.patch(`/ai-knowledge-base/sources/${editingSource.id}`, payload);
      setShowEditDialog(false);
      setEditingSource(null);
      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث المصدر");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await api.delete(`/ai-knowledge-base/sources/${id}`);
      setSources((prev) => prev.filter((s) => s.id !== id));
      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حذف المصدر");
    }
  };

  const handleToggleEnabled = async (source: KnowledgeSource): Promise<void> => {
    try {
      const next = !source.isEnabled;
      await api.patch(`/ai-knowledge-base/sources/${source.id}/enable`, { isEnabled: next });
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, isEnabled: next } : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تغيير حالة المصدر");
    }
  };

  const handleSearchPreview = async (): Promise<void> => {
    const q = previewQuery.trim();
    if (!q) {
      setPreviewResults(null);
      return;
    }
    try {
      setPreviewLoading(true);
      const res = await api.get<SearchPreviewResult[]>(`/ai-knowledge-base/search/preview?q=${encodeURIComponent(q)}`);
      setPreviewResults(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل معاينة البحث");
      setPreviewResults([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleReindex = async (sourceId?: string): Promise<void> => {
    try {
      if (sourceId) {
        setReindexingIds((prev) => new Set(prev).add(sourceId));
      } else {
        setReindexing(true);
      }

      const payload: ReindexPayload = sourceId ? { sourceId } : {};
      await api.post("/ai-knowledge-base/reindex", payload);

      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إعادة الفهرسة");
    } finally {
      if (sourceId) {
        setReindexingIds((prev) => {
          const next = new Set(prev);
          next.delete(sourceId);
          return next;
        });
      } else {
        setReindexing(false);
      }
    }
  };

  const openEditDialog = (source: KnowledgeSource): void => {
    setEditingSource(source);
    setCreateForm({
      title: source.title,
      type: source.type,
      gradeId: source.gradeId ?? "",
      termId: source.termId ?? "",
      url: source.url ?? "",
    });
    setShowEditDialog(true);
  };

  const resetCreateForm = (): void => {
    setCreateForm({ title: "", type: "PDF", gradeId: "", termId: "", url: "" });
    setCreateFile(null);
  };

  const openCreateDialog = (): void => {
    resetCreateForm();
    setShowCreateDialog(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] ?? null;
    setCreateFile(file);
  };

  const indexedCount = sources.filter((s) => s.status === "INDEXED").length;
  const totalChunks = sources.reduce((sum, s) => sum + (s.chunkCount ?? 0), 0);

  if (loading) return <KnowledgeBaseSkeleton />;
  if (error && sources.length === 0)
    return (
      <ErrorState
        title="فشل تحميل قاعدة المعرفة"
        description={error}
        onRetry={(): void => void fetchData()}
      />
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            قاعدة المعرفة
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            إدارة مصادر المعرفة الخاصة بالذكاء الاصطناعي
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(): void => void handleReindex()}
            loading={reindexing}
            disabled={reindexing}
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة فهرسة الكل
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateDialog}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة مصدر
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="outline" padding="md">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                <Database className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">إجمالي المصادر</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats?.totalSources ?? sources.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="outline" padding="md">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/10">
                <FileText className="h-5 w-5 text-success-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">مفهرس</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats?.indexedSources ?? indexedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="outline" padding="md">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-500/10">
                <Database className="h-5 w-5 text-info-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">عدد الشذرات</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats?.totalChunks ?? totalChunks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="outline" padding="md">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/10">
                <Power className="h-5 w-5 text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">معطل · نسبة التغطية</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {stats?.disabledSources ?? 0} · {stats?.coverage ?? 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="outline" padding="md">
        <CardContent>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              معاينة البحث (RAG)
            </h2>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                placeholder="جرب سؤالاً لمعرفة الشذرات التي سيتم استرجاعها..."
                value={previewQuery}
                onChange={(e): void => { setPreviewQuery(e.target.value); }}
                onKeyDown={(e): void => { if (e.key === "Enter") void handleSearchPreview(); }}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Button variant="outline" size="sm" onClick={(): void => void handleSearchPreview()} loading={previewLoading}>
              <ListChecks className="ml-2 h-4 w-4" />
              بحث
            </Button>
          </div>
          {previewResults !== null && (
            <div className="mt-3 space-y-2">
              {previewResults.length === 0 ? (
                <p className="text-sm text-neutral-400">لا توجد نتائج مطابقة.</p>
              ) : (
                previewResults.map((r) => (
                  <div key={r.chunkId} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{r.sourceTitle}</span>
                      <Badge variant="secondary">{Math.round(r.score * 100)}%</Badge>
                    </div>
                    <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{r.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="outline" padding="md">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="بحث عن مصدر..."
                value={searchQuery}
                onChange={(e): void => { setSearchQuery(e.target.value); }}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                options={STATUS_FILTER_OPTIONS}
                value={filterStatus}
                onChange={(e): void => { setFilterStatus(e.target.value); }}
                placeholder="الحالة"
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                options={[
                  { value: "", label: "جميع الصفوف" },
                  ...grades.map((g) => ({ value: g.id, label: g.name })),
                ]}
                value={filterGrade}
                onChange={(e): void => { setFilterGrade(e.target.value); }}
                placeholder="الصف"
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                options={SOURCE_TYPE_OPTIONS}
                value={filterType}
                onChange={(e): void => { setFilterType(e.target.value); }}
                placeholder="النوع"
              />
            </div>
            {(searchQuery || filterGrade || filterStatus || filterType) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(): void => {
                  setSearchQuery("");
                  setFilterGrade("");
                  setFilterStatus("");
                  setFilterType("");
                }}
              >
                <X className="ml-1 h-4 w-4" />
                مسح
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-600 dark:text-danger-400">
          {error}
          <button
            onClick={(): void => { setError(null); }}
            className="mr-2 underline"
          >
            إخفاء
          </button>
        </div>
      )}

      {sources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر معرفة"
          description="أضف مصدراً جديداً لبدء بناء قاعدة المعرفة"
          icon={<Database className="h-16 w-16" />}
          actionLabel="إضافة مصدر"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map((source) => {
            const statusCfg = STATUS_CONFIG[source.status] ?? STATUS_CONFIG.PENDING;
            const typeCfg = TYPE_CONFIG[source.type] ?? TYPE_CONFIG.DOCUMENT;
            const isReindexing = reindexingIds.has(source.id);
            return (
              <Card key={source.id} variant="outline" padding="md">
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
                        {typeCfg.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {source.title}
                          </h3>
                          <Badge variant={statusCfg.variant}>
                            {statusCfg.label}
                          </Badge>
                          {!source.isEnabled && <Badge variant="danger">معطل</Badge>}
                          <Badge variant="secondary">{typeCfg.label}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {source.grade && (
                            <span>{source.grade.name}</span>
                          )}
                          {source.term && (
                            <span>{source.term.name}</span>
                          )}
                          {source.fileName && (
                            <span className="flex items-center gap-1">
                              <Upload className="h-3 w-3" />
                              {source.fileName}
                            </span>
                          )}
                          {source.url && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <Link className="h-3 w-3 shrink-0" />
                              {source.url}
                            </span>
                          )}
                          {source.chunkCount !== null && (
                            <span className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              {source.chunkCount} شذرة
                            </span>
                          )}
                          <span>
                            {new Date(source.createdAt).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                        {source.status === "FAILED" && source.errorMessage && (
                          <p className="mt-1 text-xs text-danger-500">
                            {source.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(): void => void handleToggleEnabled(source)}
                        aria-label={source.isEnabled ? "تعطيل" : "تفعيل"}
                        className={source.isEnabled ? "text-warning-500" : "text-success-500"}
                      >
                        <Power className={`h-4 w-4 ${source.isEnabled ? "" : "opacity-40"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(): void => { openEditDialog(source); }}
                        aria-label="تعديل"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(): void => void handleReindex(source.id)}
                        loading={isReindexing}
                        disabled={isReindexing}
                        aria-label="إعادة فهرسة"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(): void => void handleDelete(source.id)}
                        aria-label="حذف"
                        className="text-danger-500 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={showCreateDialog}
        onClose={(): void => { setShowCreateDialog(false); }}
        title="إضافة مصدر معرفة جديد"
      >
        <DialogContent>
          <div className="flex flex-col gap-4">
            <Input
              label="العنوان"
              placeholder="أدخل عنوان المصدر"
              value={createForm.title}
              onChange={(e): void => { setCreateForm((prev) => ({ ...prev, title: e.target.value })); }}
            />
            <Select
              label="النوع"
              options={SOURCE_TYPE_OPTIONS.filter((o) => o.value !== "")}
              value={createForm.type}
              onChange={(e): void => { setCreateForm((prev) => ({ ...prev, type: e.target.value as KnowledgeSourceType })); }}
            />
            <Select
              label="الصف الدراسي"
              options={grades.map((g) => ({ value: g.id, label: g.name }))}
              value={createForm.gradeId}
              onChange={(e): void => { setCreateForm((prev) => ({ ...prev, gradeId: e.target.value })); }}
              placeholder="اختر الصف"
            />
            <Select
              label="الترم"
              options={terms.map((t) => ({ value: t.id, label: t.name }))}
              value={createForm.termId}
              onChange={(e): void => { setCreateForm((prev) => ({ ...prev, termId: e.target.value })); }}
              placeholder="اختر الترم"
            />
            {createForm.type === "URL" && (
              <Input
                label="الرابط"
                placeholder="https://..."
                value={createForm.url ?? ""}
                onChange={(e): void => { setCreateForm((prev) => ({ ...prev, url: e.target.value })); }}
              />
            )}
            <div>
              <p className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                رفع ملف
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(): void => fileInputRef.current?.click()}
                >
                  <Upload className="ml-2 h-4 w-4" />
                  اختر ملف
                </Button>
                {createFile && (
                  <span className="truncate text-sm text-neutral-600 dark:text-neutral-400">
                    {createFile.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={(): void => { setShowCreateDialog(false); }}
          >
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={(): void => void handleCreate()}
            loading={saving}
            disabled={saving || !createForm.title.trim()}
          >
            <Save className="ml-2 h-4 w-4" />
            حفظ
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onClose={(): void => {
          setShowEditDialog(false);
          setEditingSource(null);
        }}
        title="تعديل مصدر المعرفة"
      >
        <DialogContent>
          <div className="flex flex-col gap-4">
            <Input
              label="العنوان"
              placeholder="أدخل عنوان المصدر"
              value={createForm.title}
              onChange={(e): void => { setCreateForm((prev) => ({ ...prev, title: e.target.value })); }}
            />
            <Select
              label="النوع"
              options={SOURCE_TYPE_OPTIONS.filter((o) => o.value !== "")}
              value={createForm.type}
              onChange={(e): void => { setCreateForm((prev) => ({ ...prev, type: e.target.value as KnowledgeSourceType })); }}
            />
            <Select
              label="الصف الدراسي"
              options={grades.map((g) => ({ value: g.id, label: g.name }))}
              value={createForm.gradeId}
              onChange={(e): void => { setCreateForm((prev) => ({ ...prev, gradeId: e.target.value })); }}
              placeholder="اختر الصف"
            />
            <Select
              label="الترم"
              options={terms.map((t) => ({ value: t.id, label: t.name }))}
              value={createForm.termId}
              onChange={(e): void => { setCreateForm((prev) => ({ ...prev, termId: e.target.value })); }}
              placeholder="اختر الترم"
            />
            {createForm.type === "URL" && (
              <Input
                label="الرابط"
                placeholder="https://..."
                value={createForm.url ?? ""}
                onChange={(e): void => { setCreateForm((prev) => ({ ...prev, url: e.target.value })); }}
              />
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={(): void => {
              setShowEditDialog(false);
              setEditingSource(null);
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={(): void => void handleUpdate()}
            loading={saving}
            disabled={saving || !createForm.title.trim()}
          >
            <Save className="ml-2 h-4 w-4" />
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

const SKELETON_ROWS = 5;

function KnowledgeBaseSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-xl" />
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}
