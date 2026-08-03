"use client";

/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@el-bannawy/shared";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, type SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Sparkles,
  Brain,
  Coins,
  BarChart3,
  ClipboardList,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Package,
  FileCode2,
  ShieldAlert,
  HeartPulse,
} from "lucide-react";

type TabId =
  | "teaching-style"
  | "models"
  | "providers"
  | "credits"
  | "packages"
  | "prompts"
  | "usage-logs"
  | "moderation"
  | "analytics"
  | "health";

interface TeachingStyle {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModelConfig {
  id: string;
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string | null;
  temperature: number;
  maxTokens: number;
  timeout: number;
  isActive: boolean;
  isEnabled: boolean;
  priority: number;
  supportsStreaming: boolean;
  healthStatus: string | null;
  lastHealthCheckAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProviderHealth {
  configId: string;
  provider: string;
  modelName: string;
  ok: boolean;
  message: string;
  latencyMs: number;
}

interface CreditPlan {
  id: string;
  name: string;
  freeCredits: number;
  creditsPerQuestion: number;
  creditsPerSession: number;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  resetPeriod: string | null;
  isUnlimited: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  planType: string;
  price: number;
  currency: string;
  creditsPerQuestion: number;
  creditsPerSession: number;
  freeCredits: number;
  resetPeriod: string;
  isUnlimited: boolean;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  isActive: boolean;
  priority: number;
  creditPlanId: string | null;
  creditPlan?: { id: string; name: string } | null;
}

interface PromptTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  variables?: Record<string, string> | null;
  isSystem: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  versions?: { id: string; version: number; systemPrompt: string; createdAt: string }[];
}

interface UsageLog {
  id: string;
  userId: string;
  user?: { id: string; fullName: string } | null;
  question: string;
  response: string | null;
  creditsConsumed: number;
  responseTime: number | null;
  modelUsed: string | null;
  provider: string | null;
  success: boolean | null;
  errorCode: string | null;
  feedbackRating: number | null;
  streamed: boolean | null;
  createdAt: string;
}

interface ModerationLog {
  id: string;
  userId: string | null;
  action: string;
  reason: string | null;
  inputSnippet: string | null;
  provider: string | null;
  createdAt: string;
}

interface PaginatedResponse<T> {
  logs: T[];
  total: number;
  page: number;
  limit: number;
}

interface HealthOverview {
  providers: {
    id: string;
    provider: string;
    modelName: string;
    isActive: boolean;
    isEnabled: boolean;
    priority: number;
    healthStatus: string | null;
    lastHealthCheckAt: string | null;
    lastError: string | null;
  }[];
  knowledgeBase: {
    totalSources: number;
    indexedSources: number;
    totalChunks: number;
    coverage: number;
  };
  activePrompt: { key: string; name: string; version: number } | null;
  status: string;
}

interface UsageStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  errors: number;
  totalCredits: number;
  avgResponseTime: number;
  topUsers: { userId: string; _count: { id: number } }[];
}

interface AnalyticsData {
  range: string;
  requests: number;
  errors: number;
  uniqueUsers: number;
  creditsUsed: number;
  avgLatency: number;
  errorRate: number;
  models: { model: string; count: number }[];
  topQuestions: { question: string; count: number }[];
  topSources: { title: string; count: number }[];
  dailySeries: { date: string; count: number }[];
}

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "teaching-style", label: "Teaching Style", icon: <Sparkles className="h-4 w-4" /> },
  { id: "models", label: "Models", icon: <Brain className="h-4 w-4" /> },
  { id: "providers", label: "Providers", icon: <HeartPulse className="h-4 w-4" /> },
  { id: "credits", label: "Credits", icon: <Coins className="h-4 w-4" /> },
  { id: "packages", label: "Packages", icon: <Package className="h-4 w-4" /> },
  { id: "prompts", label: "Prompts", icon: <FileCode2 className="h-4 w-4" /> },
  { id: "usage-logs", label: "Usage Logs", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "moderation", label: "Moderation", icon: <ShieldAlert className="h-4 w-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "health", label: "Health", icon: <HeartPulse className="h-4 w-4" /> },
];

const PROVIDER_OPTIONS: SelectOption[] = [
  { value: "OPENAI", label: "OpenAI" },
  { value: "GEMINI", label: "Gemini" },
  { value: "CLAUDE", label: "Claude" },
];

const RESET_PERIOD_OPTIONS: SelectOption[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const PLAN_TYPE_OPTIONS: SelectOption[] = [
  { value: "FREE", label: "Free" },
  { value: "PREMIUM", label: "Premium" },
  { value: "VIP", label: "VIP" },
];

function formatTime(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

// ---------- Queries ----------

function useTeachingStyles(): UseQueryResult<TeachingStyle[]> {
  return useQuery<TeachingStyle[]>({
    queryKey: ["ai-settings", "teaching-styles"],
    queryFn: async () => {
      const res = await api.get<TeachingStyle[]>("/ai-settings/teaching-styles");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

function useModelConfigs(): UseQueryResult<ModelConfig[]> {
  return useQuery<ModelConfig[]>({
    queryKey: ["ai-settings", "model-configs"],
    queryFn: async () => {
      const res = await api.get<ModelConfig[]>("/ai-settings/model-configs");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

function useCreditPlans(): UseQueryResult<CreditPlan[]> {
  return useQuery<CreditPlan[]>({
    queryKey: ["ai-settings", "credit-plans"],
    queryFn: async () => {
      const res = await api.get<CreditPlan[]>("/ai-settings/credit-plans");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

function usePackages(): UseQueryResult<Package[]> {
  return useQuery<Package[]>({
    queryKey: ["ai-settings", "packages"],
    queryFn: async () => {
      const res = await api.get<Package[]>("/ai-settings/packages?includeInactive=true");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

function usePromptTemplates(): UseQueryResult<PromptTemplate[]> {
  return useQuery<PromptTemplate[]>({
    queryKey: ["ai-settings", "prompt-templates"],
    queryFn: async () => {
      const res = await api.get<PromptTemplate[]>("/ai-settings/prompt-templates");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

function useUsageLogs(page: number, limit: number, userId: string): UseQueryResult<PaginatedResponse<UsageLog>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (userId) params.set("userId", userId);
  return useQuery<PaginatedResponse<UsageLog>>({
    queryKey: ["ai-settings", "usage-logs", page, limit, userId],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<UsageLog>>(`/ai-settings/usage-logs?${params.toString()}`);
      return res.data ?? { logs: [], total: 0, page, limit };
    },
    staleTime: 30_000,
  });
}

function useModerationLogs(page: number, limit: number): UseQueryResult<PaginatedResponse<ModerationLog>> {
  return useQuery<PaginatedResponse<ModerationLog>>({
    queryKey: ["ai-settings", "moderation-logs", page, limit],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ModerationLog>>(
        `/ai-settings/moderation-logs?page=${String(page)}&limit=${String(limit)}`,
      );
      return res.data ?? { logs: [], total: 0, page, limit };
    },
    staleTime: 30_000,
  });
}

function useUsageStats(): UseQueryResult<UsageStats> {
  return useQuery<UsageStats>({
    queryKey: ["ai-settings", "usage-stats"],
    queryFn: async () => {
      const res = await api.get<UsageStats>("/ai-settings/usage-stats");
      return res.data ?? { today: 0, thisWeek: 0, thisMonth: 0, total: 0, errors: 0, totalCredits: 0, avgResponseTime: 0, topUsers: [] };
    },
    staleTime: 30_000,
  });
}

function useAnalytics(range: string): UseQueryResult<AnalyticsData> {
  return useQuery<AnalyticsData>({
    queryKey: ["ai-settings", "analytics", range],
    queryFn: async () => {
      const res = await api.get<AnalyticsData>(`/ai-settings/analytics?range=${range}`);
      return res.data ?? ({} as AnalyticsData);
    },
    staleTime: 30_000,
  });
}

function useHealth(): UseQueryResult<HealthOverview> {
  return useQuery<HealthOverview>({
    queryKey: ["ai-settings", "health"],
    queryFn: async () => {
      const res = await api.get<HealthOverview>("/ai-settings/health");
      return res.data ?? ({} as HealthOverview);
    },
    staleTime: 30_000,
  });
}

// ---------- Teaching style tab ----------

function TeachingStyleTab(): ReactNode {
  const queryClient = useQueryClient();
  const { data: styles, isLoading, isError, error } = useTeachingStyles();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("INTERMEDIATE");
  const [arabicUsage, setArabicUsage] = useState("BALANCED");
  const [englishUsage, setEnglishUsage] = useState("BALANCED");
  const [emojiPolicy, setEmojiPolicy] = useState("MODERATE");

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["ai-settings", "teaching-styles"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post<TeachingStyle>("/ai-settings/teaching-styles", payload);
      return res.data;
    },
    onSuccess: () => {
      setCreateOpen(false);
      resetForm();
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await api.patch<TeachingStyle>(`/ai-settings/teaching-styles/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setEditId(null);
      resetForm();
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai-settings/teaching-styles/${id}`);
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<TeachingStyle>(`/ai-settings/teaching-styles/${id}`, { isActive: true });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const resetForm = () => {
    setName("");
    setContent("");
    setDifficultyLevel("INTERMEDIATE");
    setArabicUsage("BALANCED");
    setEnglishUsage("BALANCED");
    setEmojiPolicy("MODERATE");
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (style: TeachingStyle) => {
    setName(style.name);
    setContent(style.content);
    setEditId(style.id);
  };

  const buildPayload = (): Record<string, unknown> => ({
    name: name.trim(),
    content: content.trim(),
    difficultyLevel,
    arabicUsage,
    englishUsage,
    emojiPolicy,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load teaching styles"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Style
        </Button>
      </div>

      {!styles || styles.length === 0 ? (
        <EmptyState
          title="No teaching styles"
          description="Create your first teaching style to define how AI interacts with students."
          icon={<Sparkles className="h-12 w-12" />}
          actionLabel="Create Style"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-4">
          {styles.map((style) => (
            <Card key={style.id} variant="outline" padding="lg">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {style.name}
                    </h3>
                    {style.isActive && <Badge variant="success">Active</Badge>}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {style.content}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!style.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setActiveMutation.mutate(style.id); }}
                    >
                      <Check className="h-4 w-4" />
                      Set Active
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { openEdit(style); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { deleteMutation.mutate(style.id); }}
                    className="text-danger-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); }} title="Create Teaching Style">
        <DialogContent className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Formal English Tutor"
            value={name}
            onChange={(e) => { setName(e.target.value); }}
          />
          <Textarea
            label="Instructions"
            placeholder="Define how the AI should teach and interact with students..."
            value={content}
            onChange={(e) => { setContent(e.target.value); }}
            className="min-h-[120px]"
          />
          <Select
            label="Difficulty Level"
            options={[
              { value: "BEGINNER", label: "Beginner" },
              { value: "INTERMEDIATE", label: "Intermediate" },
              { value: "ADVANCED", label: "Advanced" },
            ]}
            value={difficultyLevel}
            onChange={(e) => { setDifficultyLevel(e.target.value); }}
          />
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Arabic"
              options={[
                { value: "MINIMAL", label: "Minimal" },
                { value: "BALANCED", label: "Balanced" },
                { value: "EXPLANATORY", label: "Explanatory" },
              ]}
              value={arabicUsage}
              onChange={(e) => { setArabicUsage(e.target.value); }}
            />
            <Select
              label="English"
              options={[
                { value: "MINIMAL", label: "Minimal" },
                { value: "BALANCED", label: "Balanced" },
                { value: "EXPLANATORY", label: "Explanatory" },
              ]}
              value={englishUsage}
              onChange={(e) => { setEnglishUsage(e.target.value); }}
            />
            <Select
              label="Emoji Policy"
              options={[
                { value: "NONE", label: "None" },
                { value: "MODERATE", label: "Moderate" },
                { value: "FRIENDLY", label: "Friendly" },
              ]}
              value={emojiPolicy}
              onChange={(e) => { setEmojiPolicy(e.target.value); }}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); }}>Cancel</Button>
          <Button
            onClick={() => { if (name.trim() && content.trim()) createMutation.mutate(buildPayload()); }}
            disabled={!name.trim() || !content.trim() || createMutation.isPending}
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editId !== null} onClose={() => { setEditId(null); }} title="Edit Teaching Style">
        <DialogContent className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); }} />
          <Textarea
            label="Instructions"
            value={content}
            onChange={(e) => { setContent(e.target.value); }}
            className="min-h-[120px]"
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditId(null); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (name.trim() && content.trim() && editId) {
                updateMutation.mutate({ id: editId, payload: { name: name.trim(), content: content.trim() } });
              }
            }}
            disabled={!name.trim() || !content.trim() || updateMutation.isPending}
            loading={updateMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ---------- Models tab ----------

function ModelsTab(): ReactNode {
  const queryClient = useQueryClient();
  const { data: configs, isLoading, isError, error } = useModelConfigs();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [provider, setProvider] = useState("OPENAI");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("2048");
  const [timeoutSec, setTimeoutSec] = useState("30");
  const [priority, setPriority] = useState("0");
  const [supportsStreaming, setSupportsStreaming] = useState(true);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ai-settings", "model-configs"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post<ModelConfig>("/ai-settings/model-configs", payload);
      return res.data;
    },
    onSuccess: () => {
      setCreateOpen(false);
      resetForm();
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await api.patch<ModelConfig>(`/ai-settings/model-configs/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setEditId(null);
      resetForm();
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai-settings/model-configs/${id}`);
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ModelConfig>(`/ai-settings/model-configs/${id}`, { isActive: true });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const setEnabledMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await api.patch<ModelConfig>(`/ai-settings/model-configs/${id}`, { isEnabled });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const resetForm = () => {
    setProvider("OPENAI");
    setModelName("");
    setApiKey("");
    setBaseUrl("");
    setTemperature("0.7");
    setMaxTokens("2048");
    setTimeoutSec("30");
    setPriority("0");
    setSupportsStreaming(true);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (cfg: ModelConfig) => {
    setProvider(cfg.provider);
    setModelName(cfg.modelName);
    setApiKey("");
    setBaseUrl(cfg.baseUrl ?? "");
    setTemperature(String(cfg.temperature));
    setMaxTokens(String(cfg.maxTokens));
    setTimeoutSec(String(cfg.timeout));
    setPriority(String(cfg.priority));
    setSupportsStreaming(cfg.supportsStreaming);
    setEditId(cfg.id);
  };

  const buildPayload = (): Record<string, unknown> => ({
    provider,
    modelName: modelName.trim(),
    apiKey: apiKey.trim(),
    baseUrl: baseUrl.trim() || undefined,
    temperature: Number(temperature),
    maxTokens: Number(maxTokens),
    timeout: Number(timeoutSec),
    priority: Number(priority),
    supportsStreaming,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load model configs"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Model
        </Button>
      </div>

      {!configs || configs.length === 0 ? (
        <EmptyState
          title="No model configurations"
          description="Add an AI model to enable AI-powered features."
          icon={<Brain className="h-12 w-12" />}
          actionLabel="Add Model"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-4">
          {configs.map((cfg) => (
            <Card key={cfg.id} variant="outline" padding="lg">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {cfg.modelName}
                    </h3>
                    {cfg.isActive && <Badge variant="success">Active</Badge>}
                    <Badge variant="info">{cfg.provider}</Badge>
                    {!cfg.isEnabled && <Badge variant="danger">Disabled</Badge>}
                    <Badge variant={cfg.healthStatus === "HEALTHY" ? "success" : cfg.healthStatus === "UNHEALTHY" ? "danger" : "secondary"}>
                      {cfg.healthStatus ?? "UNKNOWN"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                    <span>Temperature: {cfg.temperature}</span>
                    <span>Max Tokens: {cfg.maxTokens}</span>
                    <span>Timeout: {formatTime(cfg.timeout * 1000)}</span>
                    <span>Priority: {cfg.priority}</span>
                    <span>Streaming: {cfg.supportsStreaming ? "Yes" : "No"}</span>
                    {cfg.baseUrl && <span>Base URL: {truncate(cfg.baseUrl, 40)}</span>}
                  </div>
                  {cfg.lastError && (
                    <p className="text-xs text-danger-500">{truncate(cfg.lastError, 100)}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {cfg.isEnabled && (
                    <Button size="sm" variant="outline" onClick={() => { setEnabledMutation.mutate({ id: cfg.id, isEnabled: false }); }}>
                      Disable
                    </Button>
                  )}
                  {!cfg.isActive && cfg.isEnabled && (
                    <Button size="sm" variant="outline" onClick={() => { setActiveMutation.mutate(cfg.id); }}>
                      <Check className="h-4 w-4" />
                      Activate
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { openEdit(cfg); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { deleteMutation.mutate(cfg.id); }}
                    className="text-danger-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); }} title="Add Model Configuration">
        <DialogContent className="space-y-4">
          <Select
            label="Provider"
            options={PROVIDER_OPTIONS}
            value={provider}
            onChange={(e) => { setProvider(e.target.value); }}
          />
          <Input
            label="Model Name"
            placeholder="e.g. gpt-4o"
            value={modelName}
            onChange={(e) => { setModelName(e.target.value); }}
          />
          <Input
            label="API Key"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); }}
          />
          <Input
            label="Base URL (optional)"
            placeholder="https://api.openai.com"
            value={baseUrl}
            onChange={(e) => { setBaseUrl(e.target.value); }}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Priority"
              type="number"
              value={priority}
              onChange={(e) => { setPriority(e.target.value); }}
            />
            <Input
              label="Max Tokens"
              type="number"
              value={maxTokens}
              onChange={(e) => { setMaxTokens(e.target.value); }}
            />
            <Input
              label="Timeout (sec)"
              type="number"
              value={timeoutSec}
              onChange={(e) => { setTimeoutSec(e.target.value); }}
            />
          </div>
          <Switch
            label="Supports streaming"
            checked={supportsStreaming}
            onChange={(e) => { setSupportsStreaming(e.target.checked); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); }}>Cancel</Button>
          <Button
            onClick={() => { if (modelName.trim() && apiKey.trim()) createMutation.mutate(buildPayload()); }}
            disabled={!modelName.trim() || !apiKey.trim() || createMutation.isPending}
            loading={createMutation.isPending}
          >
            Add
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editId !== null} onClose={() => { setEditId(null); }} title="Edit Model Configuration">
        <DialogContent className="space-y-4">
          <Select
            label="Provider"
            options={PROVIDER_OPTIONS}
            value={provider}
            onChange={(e) => { setProvider(e.target.value); }}
          />
          <Input
            label="Model Name"
            value={modelName}
            onChange={(e) => { setModelName(e.target.value); }}
          />
          <Input
            label="API Key"
            type="password"
            placeholder="Leave empty to keep current"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); }}
          />
          <Input
            label="Base URL"
            value={baseUrl}
            onChange={(e) => { setBaseUrl(e.target.value); }}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Priority"
              type="number"
              value={priority}
              onChange={(e) => { setPriority(e.target.value); }}
            />
            <Input
              label="Max Tokens"
              type="number"
              value={maxTokens}
              onChange={(e) => { setMaxTokens(e.target.value); }}
            />
            <Input
              label="Timeout (sec)"
              type="number"
              value={timeoutSec}
              onChange={(e) => { setTimeoutSec(e.target.value); }}
            />
          </div>
          <Switch
            label="Supports streaming"
            checked={supportsStreaming}
            onChange={(e) => { setSupportsStreaming(e.target.checked); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditId(null); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (modelName.trim() && editId) {
                const payload: Record<string, unknown> = {
                  provider,
                  modelName: modelName.trim(),
                  temperature: Number(temperature),
                  maxTokens: Number(maxTokens),
                  timeout: Number(timeoutSec),
                  priority: Number(priority),
                  supportsStreaming,
                };
                if (baseUrl.trim()) payload.baseUrl = baseUrl.trim();
                if (apiKey.trim()) payload.apiKey = apiKey.trim();
                updateMutation.mutate({ id: editId, payload });
              }
            }}
            disabled={!modelName.trim() || updateMutation.isPending}
            loading={updateMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ---------- Providers health tab ----------

function ProvidersTab(): ReactNode {
  const queryClient = useQueryClient();
  const { data: configs, isLoading, isError, error } = useModelConfigs();

  const [health, setHealth] = useState<Record<string, ProviderHealth | null>>({});
  const [probing, setProbing] = useState<string | null>(null);
  const [allProbing, setAllProbing] = useState(false);

  const probeAll = async () => {
    setAllProbing(true);
    try {
      const res = await api.post<ProviderHealth[]>("/ai-settings/providers/health");
      const list = res.data ?? [];
      const map: Record<string, ProviderHealth> = {};
      for (const item of list) map[item.configId] = item;
      setHealth(map);
    } finally {
      setAllProbing(false);
      void queryClient.invalidateQueries({ queryKey: ["ai-settings", "model-configs"] });
    }
  };

  const probeOne = async (id: string) => {
    setProbing(id);
    try {
      const res = await api.post<ProviderHealth>(`/ai-settings/providers/${id}/health`);
      if (res.data) {
        const data = res.data;
        setHealth((prev) => ({ ...prev, [id]: data }));
      }
    } finally {
      setProbing(null);
      void queryClient.invalidateQueries({ queryKey: ["ai-settings", "model-configs"] });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load providers"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" onClick={() => { void probeAll(); }} loading={allProbing}>
          <HeartPulse className="h-4 w-4" />
          Check All Providers
        </Button>
      </div>

      {!configs || configs.length === 0 ? (
        <EmptyState
          title="No providers configured"
          description="Add model configurations in the Models tab first."
          icon={<HeartPulse className="h-12 w-12" />}
        />
      ) : (
        <div className="space-y-4">
          {configs.map((cfg) => {
            const h: ProviderHealth | null = health[cfg.id] ?? null;
            return (
              <Card key={cfg.id} variant="outline" padding="lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {cfg.modelName}
                      </h3>
                      <Badge variant="info">{cfg.provider}</Badge>
                      {cfg.isActive && <Badge variant="success">Active</Badge>}
                      {!cfg.isEnabled && <Badge variant="danger">Disabled</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          cfg.healthStatus === "HEALTHY"
                            ? "bg-success-500"
                            : cfg.healthStatus === "UNHEALTHY"
                              ? "bg-danger-500"
                              : "bg-neutral-400"
                        }`}
                      />
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {cfg.healthStatus ?? "Not checked"}
                      </span>
                      {cfg.lastHealthCheckAt && (
                        <span className="text-neutral-400">
                          · {new Date(cfg.lastHealthCheckAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {h && (
                      <div className="flex flex-wrap gap-3 text-sm">
                        <Badge variant={h.ok ? "success" : "danger"}>
                          {h.ok ? "Reachable" : "Failed"}
                        </Badge>
                        <span className="text-neutral-500">{formatTime(h.latencyMs)} latency</span>
                        {!h.ok && <span className="text-danger-500">{truncate(h.message, 80)}</span>}
                      </div>
                    )}
                    {cfg.lastError && (
                      <p className="text-xs text-danger-500">{truncate(cfg.lastError, 100)}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { void probeOne(cfg.id); }}
                    loading={probing === cfg.id}
                    disabled={!cfg.isEnabled}
                  >
                    <HeartPulse className="h-4 w-4" />
                    Probe
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Credits tab ----------

function CreditsTab(): ReactNode {
  const queryClient = useQueryClient();
  const { data: plans, isLoading: plansLoading, isError: plansError, error: plansErr } = useCreditPlans();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [freeCredits, setFreeCredits] = useState("100");
  const [resetPeriod, setResetPeriod] = useState("DAILY");
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [creditsPerQuestion, setCreditsPerQuestion] = useState("1");
  const [dailyLimit, setDailyLimit] = useState("");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ai-settings", "credit-plans"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post<CreditPlan>("/ai-settings/credit-plans", payload);
      return res.data;
    },
    onSuccess: () => {
      setCreateOpen(false);
      resetForm();
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await api.patch<CreditPlan>(`/ai-settings/credit-plans/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setEditId(null);
      resetForm();
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai-settings/credit-plans/${id}`);
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const resetForm = () => {
    setPlanName("");
    setFreeCredits("100");
    setResetPeriod("DAILY");
    setIsUnlimited(false);
    setCreditsPerQuestion("1");
    setDailyLimit("");
    setWeeklyLimit("");
    setMonthlyLimit("");
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (plan: CreditPlan) => {
    setPlanName(plan.name);
    setFreeCredits(String(plan.freeCredits));
    setResetPeriod(plan.resetPeriod ?? "DAILY");
    setIsUnlimited(plan.isUnlimited);
    setCreditsPerQuestion(String(plan.creditsPerQuestion));
    setDailyLimit(plan.dailyLimit !== null ? String(plan.dailyLimit) : "");
    setWeeklyLimit(plan.weeklyLimit !== null ? String(plan.weeklyLimit) : "");
    setMonthlyLimit(plan.monthlyLimit !== null ? String(plan.monthlyLimit) : "");
    setEditId(plan.id);
  };

  const buildPayload = (): Record<string, unknown> => ({
    name: planName.trim(),
    freeCredits: isUnlimited ? 0 : Number(freeCredits),
    creditsPerQuestion: Number(creditsPerQuestion),
    resetPeriod,
    isUnlimited,
    dailyLimit: dailyLimit ? Number(dailyLimit) : null,
    weeklyLimit: weeklyLimit ? Number(weeklyLimit) : null,
    monthlyLimit: monthlyLimit ? Number(monthlyLimit) : null,
  });

  if (plansLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (plansError) {
    return (
      <ErrorState
        title="Failed to load credit plans"
        description={plansErr instanceof Error ? plansErr.message : "An error occurred"}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Credit Plans
          </h3>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>

        {!plans || plans.length === 0 ? (
          <EmptyState
            title="No credit plans"
            description="Create credit plans to manage student AI usage."
            icon={<Coins className="h-12 w-12" />}
            actionLabel="Add Plan"
            onAction={openCreate}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} variant="outline" padding="lg">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {plan.name}
                    </h4>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { openEdit(plan); }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { deleteMutation.mutate(plan.id); }}
                        className="text-danger-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plan.isUnlimited ? (
                      <Badge variant="info">Unlimited</Badge>
                    ) : (
                      <Badge variant="primary">{plan.freeCredits} credits</Badge>
                    )}
                    {plan.resetPeriod && (
                      <Badge variant="secondary">Resets: {plan.resetPeriod}</Badge>
                    )}
                    <Badge variant="secondary">{plan.creditsPerQuestion} per question</Badge>
                  </div>
                  {(plan.dailyLimit ?? plan.weeklyLimit ?? plan.monthlyLimit) && (
                    <p className="text-xs text-neutral-500">
                      Daily: {plan.dailyLimit ?? "∞"} · Weekly: {plan.weeklyLimit ?? "∞"} · Monthly: {plan.monthlyLimit ?? "∞"}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); }} title="Create Credit Plan">
        <DialogContent className="space-y-4">
          <Input
            label="Plan Name"
            placeholder="e.g. Basic Plan"
            value={planName}
            onChange={(e) => { setPlanName(e.target.value); }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Free Credits"
              type="number"
              value={freeCredits}
              onChange={(e) => { setFreeCredits(e.target.value); }}
              disabled={isUnlimited}
            />
            <Input
              label="Credits / Question"
              type="number"
              value={creditsPerQuestion}
              onChange={(e) => { setCreditsPerQuestion(e.target.value); }}
            />
          </div>
          <Select
            label="Reset Period"
            options={RESET_PERIOD_OPTIONS}
            value={resetPeriod}
            onChange={(e) => { setResetPeriod(e.target.value); }}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Daily Limit" type="number" value={dailyLimit} onChange={(e) => { setDailyLimit(e.target.value); }} />
            <Input label="Weekly Limit" type="number" value={weeklyLimit} onChange={(e) => { setWeeklyLimit(e.target.value); }} />
            <Input label="Monthly Limit" type="number" value={monthlyLimit} onChange={(e) => { setMonthlyLimit(e.target.value); }} />
          </div>
          <Switch
            label="Unlimited credits"
            checked={isUnlimited}
            onChange={(e) => { setIsUnlimited(e.target.checked); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); }}>Cancel</Button>
          <Button
            onClick={() => { if (planName.trim()) createMutation.mutate(buildPayload()); }}
            disabled={!planName.trim() || createMutation.isPending}
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editId !== null} onClose={() => { setEditId(null); }} title="Edit Credit Plan">
        <DialogContent className="space-y-4">
          <Input label="Plan Name" value={planName} onChange={(e) => { setPlanName(e.target.value); }} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Free Credits"
              type="number"
              value={freeCredits}
              onChange={(e) => { setFreeCredits(e.target.value); }}
              disabled={isUnlimited}
            />
            <Input
              label="Credits / Question"
              type="number"
              value={creditsPerQuestion}
              onChange={(e) => { setCreditsPerQuestion(e.target.value); }}
            />
          </div>
          <Select
            label="Reset Period"
            options={RESET_PERIOD_OPTIONS}
            value={resetPeriod}
            onChange={(e) => { setResetPeriod(e.target.value); }}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Daily Limit" type="number" value={dailyLimit} onChange={(e) => { setDailyLimit(e.target.value); }} />
            <Input label="Weekly Limit" type="number" value={weeklyLimit} onChange={(e) => { setWeeklyLimit(e.target.value); }} />
            <Input label="Monthly Limit" type="number" value={monthlyLimit} onChange={(e) => { setMonthlyLimit(e.target.value); }} />
          </div>
          <Switch
            label="Unlimited credits"
            checked={isUnlimited}
            onChange={(e) => { setIsUnlimited(e.target.checked); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditId(null); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (planName.trim() && editId) updateMutation.mutate({ id: editId, payload: buildPayload() });
            }}
            disabled={!planName.trim() || updateMutation.isPending}
            loading={updateMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ---------- Packages tab ----------

function PackagesTab(): ReactNode {
  const queryClient = useQueryClient();
  const { data: packages, isLoading, isError, error } = usePackages();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [planType, setPlanType] = useState("FREE");
  const [price, setPrice] = useState("0");
  const [freeCredits, setFreeCredits] = useState("20");
  const [creditsPerQuestion, setCreditsPerQuestion] = useState("1");
  const [creditsPerSession, setCreditsPerSession] = useState("10");
  const [resetPeriod, setResetPeriod] = useState("DAILY");
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [priority, setPriority] = useState("0");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ai-settings", "packages"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post<Package>("/ai-settings/packages", payload);
      return res.data;
    },
    onSuccess: () => {
      setCreateOpen(false);
      resetForm();
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await api.patch<Package>(`/ai-settings/packages/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setEditId(null);
      resetForm();
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai-settings/packages/${id}`);
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.patch<Package>(`/ai-settings/packages/${id}`, { isActive });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setPlanType("FREE");
    setPrice("0");
    setFreeCredits("20");
    setCreditsPerQuestion("1");
    setCreditsPerSession("10");
    setResetPeriod("DAILY");
    setIsUnlimited(false);
    setPriority("0");
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setName(pkg.name);
    setDescription(pkg.description ?? "");
    setPlanType(pkg.planType);
    setPrice(String(pkg.price));
    setFreeCredits(String(pkg.freeCredits));
    setCreditsPerQuestion(String(pkg.creditsPerQuestion));
    setCreditsPerSession(String(pkg.creditsPerSession));
    setResetPeriod(pkg.resetPeriod);
    setIsUnlimited(pkg.isUnlimited);
    setPriority(String(pkg.priority));
    setEditId(pkg.id);
  };

  const buildPayload = (): Record<string, unknown> => ({
    name: name.trim(),
    description: description.trim() || undefined,
    planType,
    price: Number(price),
    creditsPerQuestion: Number(creditsPerQuestion),
    creditsPerSession: Number(creditsPerSession),
    freeCredits: Number(freeCredits),
    resetPeriod,
    isUnlimited,
    priority: Number(priority),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load packages"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Package
        </Button>
      </div>

      {!packages || packages.length === 0 ? (
        <EmptyState
          title="No packages"
          description="Create AI packages to define credit allotments and limits."
          icon={<Package className="h-12 w-12" />}
          actionLabel="Add Package"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} variant="outline" padding="lg">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{pkg.name}</h4>
                    <p className="text-xs text-neutral-500">{pkg.planType} · {pkg.price} {pkg.currency}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { openEdit(pkg); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { toggleMutation.mutate({ id: pkg.id, isActive: !pkg.isActive }); }}
                      className={pkg.isActive ? "text-danger-500" : "text-success-500"}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { deleteMutation.mutate(pkg.id); }}
                      className="text-danger-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {pkg.description && (
                  <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{pkg.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {pkg.isUnlimited ? (
                    <Badge variant="info">Unlimited</Badge>
                  ) : (
                    <Badge variant="primary">{pkg.freeCredits} credits</Badge>
                  )}
                  <Badge variant="secondary">{pkg.creditsPerQuestion}/q</Badge>
                  <Badge variant="secondary">{pkg.creditsPerSession}/session</Badge>
                  {!pkg.isActive && <Badge variant="danger">Inactive</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); }} title="Add Package">
        <DialogContent className="space-y-4">
          <Input label="Name" placeholder="e.g. Premium Monthly" value={name} onChange={(e) => { setName(e.target.value); }} />
          <Textarea label="Description" value={description} onChange={(e) => { setDescription(e.target.value); }} className="min-h-[60px]" />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Plan Type"
              options={PLAN_TYPE_OPTIONS}
              value={planType}
              onChange={(e) => { setPlanType(e.target.value); }}
            />
            <Input label="Price" type="number" value={price} onChange={(e) => { setPrice(e.target.value); }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Free Credits" type="number" value={freeCredits} onChange={(e) => { setFreeCredits(e.target.value); }} />
            <Input label="Priority" type="number" value={priority} onChange={(e) => { setPriority(e.target.value); }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Credits / Question" type="number" value={creditsPerQuestion} onChange={(e) => { setCreditsPerQuestion(e.target.value); }} />
            <Input label="Credits / Session" type="number" value={creditsPerSession} onChange={(e) => { setCreditsPerSession(e.target.value); }} />
          </div>
          <Select
            label="Reset Period"
            options={RESET_PERIOD_OPTIONS}
            value={resetPeriod}
            onChange={(e) => { setResetPeriod(e.target.value); }}
          />
          <Switch
            label="Unlimited credits"
            checked={isUnlimited}
            onChange={(e) => { setIsUnlimited(e.target.checked); }}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); }}>Cancel</Button>
          <Button
            onClick={() => { if (name.trim()) createMutation.mutate(buildPayload()); }}
            disabled={!name.trim() || createMutation.isPending}
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editId !== null} onClose={() => { setEditId(null); }} title="Edit Package">
        <DialogContent className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); }} />
          <Textarea label="Description" value={description} onChange={(e) => { setDescription(e.target.value); }} className="min-h-[60px]" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Plan Type" options={PLAN_TYPE_OPTIONS} value={planType} onChange={(e) => { setPlanType(e.target.value); }} />
            <Input label="Price" type="number" value={price} onChange={(e) => { setPrice(e.target.value); }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Free Credits" type="number" value={freeCredits} onChange={(e) => { setFreeCredits(e.target.value); }} />
            <Input label="Priority" type="number" value={priority} onChange={(e) => { setPriority(e.target.value); }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Credits / Question" type="number" value={creditsPerQuestion} onChange={(e) => { setCreditsPerQuestion(e.target.value); }} />
            <Input label="Credits / Session" type="number" value={creditsPerSession} onChange={(e) => { setCreditsPerSession(e.target.value); }} />
          </div>
          <Select label="Reset Period" options={RESET_PERIOD_OPTIONS} value={resetPeriod} onChange={(e) => { setResetPeriod(e.target.value); }} />
          <Switch label="Unlimited credits" checked={isUnlimited} onChange={(e) => { setIsUnlimited(e.target.checked); }} />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditId(null); }}>Cancel</Button>
          <Button
            onClick={() => { if (name.trim() && editId) updateMutation.mutate({ id: editId, payload: buildPayload() }); }}
            disabled={!name.trim() || updateMutation.isPending}
            loading={updateMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ---------- Prompts tab ----------

function PromptsTab(): ReactNode {
  const queryClient = useQueryClient();
  const { data: templates, isLoading, isError, error } = usePromptTemplates();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [variablesText, setVariablesText] = useState("");
  const [isSystem, setIsSystem] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ai-settings", "prompt-templates"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post<PromptTemplate>("/ai-settings/prompt-templates", payload);
      return res.data;
    },
    onSuccess: () => {
      setCreateOpen(false);
      resetForm();
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await api.patch<PromptTemplate>(`/ai-settings/prompt-templates/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setEditId(null);
      resetForm();
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai-settings/prompt-templates/${id}`);
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<PromptTemplate>(`/ai-settings/prompt-templates/${id}`, { isActive: true });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async ({ id, version }: { id: string; version: number }) => {
      const res = await api.post<PromptTemplate>(`/ai-settings/prompt-templates/${id}/rollback?version=${String(version)}`);
      return res.data;
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const parseVariables = (): Record<string, string> | undefined => {
    const trimmed = variablesText.trim();
    if (!trimmed) return undefined;
    const out: Record<string, string> = {};
    for (const line of trimmed.split("\n")) {
      const idx = line.indexOf("=");
      if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return out;
  };

  const resetForm = () => {
    setKey("");
    setName("");
    setDescription("");
    setSystemPrompt("");
    setVariablesText("");
    setIsSystem(false);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (t: PromptTemplate) => {
    setKey(t.key);
    setName(t.name);
    setDescription(t.description ?? "");
    setSystemPrompt(t.systemPrompt);
    setVariablesText(t.variables ? Object.entries(t.variables).map(([k, v]) => `${k}=${v}`).join("\n") : "");
    setIsSystem(t.isSystem);
    setEditId(t.id);
  };

  const buildPayload = (): Record<string, unknown> => ({
    key: key.trim(),
    name: name.trim(),
    description: description.trim() || undefined,
    systemPrompt,
    variables: parseVariables(),
    isSystem,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load prompt templates"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {!templates || templates.length === 0 ? (
        <EmptyState
          title="No prompt templates"
          description="Create prompt templates to version and manage AI system prompts."
          icon={<FileCode2 className="h-12 w-12" />}
          actionLabel="New Template"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <Card key={t.id} variant="outline" padding="lg">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t.name}</h3>
                    <Badge variant="secondary">{t.key}</Badge>
                    {t.isActive && <Badge variant="success">Active</Badge>}
                    {t.isSystem && <Badge variant="info">System</Badge>}
                    <Badge variant="secondary">v{t.version}</Badge>
                  </div>
                  <p className="line-clamp-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {t.systemPrompt}
                  </p>
                  {t.versions && t.versions.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-neutral-500">Versions:</span>
                      {t.versions.map((v) => (
                        <button
                          key={v.id}
                          className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          onClick={() => { rollbackMutation.mutate({ id: t.id, version: v.version }); }}
                          title="Click to rollback to this version"
                        >
                          v{v.version}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setViewId(t.id); }}>
                    View
                  </Button>
                  {!t.isActive && (
                    <Button size="sm" variant="outline" onClick={() => { setActiveMutation.mutate(t.id); }}>
                      <Check className="h-4 w-4" />
                      Activate
                    </Button>
                  )}
                  {!t.isSystem && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { openEdit(t); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { deleteMutation.mutate(t.id); }}
                        className="text-danger-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); }} title="New Prompt Template">
        <DialogContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Key" placeholder="e.g. chat.tutor" value={key} onChange={(e) => { setKey(e.target.value); }} />
            <Input label="Name" placeholder="e.g. Tutor Chat" value={name} onChange={(e) => { setName(e.target.value); }} />
          </div>
          <Input label="Description" value={description} onChange={(e) => { setDescription(e.target.value); }} />
          <Textarea
            label="System Prompt"
            placeholder="You are... (use {{variable}} placeholders)"
            value={systemPrompt}
            onChange={(e) => { setSystemPrompt(e.target.value); }}
            className="min-h-[140px] font-mono"
          />
          <Textarea
            label="Variables (key=value per line)"
            placeholder="studentName=Ahmed&#10;grade=6"
            value={variablesText}
            onChange={(e) => { setVariablesText(e.target.value); }}
            className="min-h-[60px] font-mono"
          />
          <Switch label="System template (cannot be deleted)" checked={isSystem} onChange={(e) => { setIsSystem(e.target.checked); }} />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); }}>Cancel</Button>
          <Button
            onClick={() => { if (key.trim() && name.trim() && systemPrompt.trim()) createMutation.mutate(buildPayload()); }}
            disabled={!key.trim() || !name.trim() || !systemPrompt.trim() || createMutation.isPending}
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editId !== null} onClose={() => { setEditId(null); }} title="Edit Prompt Template">
        <DialogContent className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); }} />
          <Input label="Description" value={description} onChange={(e) => { setDescription(e.target.value); }} />
          <Textarea
            label="System Prompt"
            value={systemPrompt}
            onChange={(e) => { setSystemPrompt(e.target.value); }}
            className="min-h-[140px] font-mono"
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditId(null); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (name.trim() && editId) updateMutation.mutate({ id: editId, payload: { name: name.trim(), systemPrompt } });
            }}
            disabled={!name.trim() || updateMutation.isPending}
            loading={updateMutation.isPending}
          >
            Save (bumps version)
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={viewId !== null} onClose={() => { setViewId(null); }} title="Prompt Template">
        <DialogContent className="space-y-4">
          {(() => {
            const t = templates?.find((x) => x.id === viewId);
            if (!t) return null;
            return (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t.key}</Badge>
                  <Badge variant="info">v{t.version}</Badge>
                  {t.isActive && <Badge variant="success">Active</Badge>}
                </div>
                <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-100 p-4 font-mono text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                  {t.systemPrompt}
                </pre>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Usage logs tab ----------

function UsageLogsTab(): ReactNode {
  const [page, setPage] = useState(1);
  const [searchUser, setSearchUser] = useState("");
  const [userId, setUserId] = useState("");
  const limit = 20;

  const { data, isLoading, isError, error, isFetching } = useUsageLogs(page, limit, userId);

  const handleSearch = () => {
    setUserId(searchUser.trim());
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Filter by User ID"
            placeholder="Enter user ID..."
            value={searchUser}
            onChange={(e) => { setSearchUser(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            rightIcon={
              <button onClick={handleSearch} className="text-neutral-400 hover:text-primary-500">
                <Search className="h-4 w-4" />
              </button>
            }
          />
        </div>
        {userId && (
          <Button size="sm" variant="ghost" onClick={() => { setSearchUser(""); setUserId(""); setPage(1); }}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load usage logs"
          description={error instanceof Error ? error.message : "An error occurred"}
        />
      ) : !data || data.logs.length === 0 ? (
        <EmptyState
          title="No usage logs"
          description={userId ? "No logs found for this user." : "Usage logs will appear once students interact with AI."}
          icon={<ClipboardList className="h-12 w-12" />}
        />
      ) : (
        <>
          <div className="overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.user?.fullName ?? log.userId}</TableCell>
                    <TableCell className="max-w-[200px]" title={log.question}>
                      <span className="line-clamp-2">{truncate(log.question, 80)}</span>
                    </TableCell>
                    <TableCell>{log.creditsConsumed}</TableCell>
                    <TableCell>{formatTime(log.responseTime)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.modelUsed ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.success === false ? "danger" : "success"}>
                        {log.success === false ? "Failed" : "OK"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Page {page} of {totalPages} ({data.total} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || isFetching}
                onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages || isFetching}
                onClick={() => { setPage((p) => p + 1); }}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Moderation tab ----------

function ModerationTab(): ReactNode {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading, isError, error } = useModerationLogs(page, limit);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load moderation logs"
          description={error instanceof Error ? error.message : "An error occurred"}
        />
      ) : !data || data.logs.length === 0 ? (
        <EmptyState
          title="No moderation events"
          description="Moderation events will appear here when content is flagged."
          icon={<ShieldAlert className="h-12 w-12" />}
        />
      ) : (
        <>
          <div className="overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={log.action.includes("BLOCK") ? "danger" : "warning"}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.userId ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px]">{truncate(log.reason ?? "—", 80)}</TableCell>
                    <TableCell className="max-w-[200px]">{truncate(log.inputSnippet ?? "—", 80)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => { setPage((p) => Math.max(1, p - 1)); }}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => { setPage((p) => p + 1); }}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Analytics tab ----------

function AnalyticsTab(): ReactNode {
  const [range, setRange] = useState("month");
  const { data: stats, isLoading: statsLoading } = useUsageStats();
  const { data: analytics, isLoading: analyticsLoading, isError, error } = useAnalytics(range);

  if (statsLoading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load analytics"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  const statCards = stats
    ? [
        { label: "Today", value: stats.today },
        { label: "This Week", value: stats.thisWeek },
        { label: "This Month", value: stats.thisMonth },
        { label: "Total", value: stats.total },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} variant="outline" padding="lg">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {card.value.toLocaleString()}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Card variant="outline" padding="lg" className="flex-1">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Avg Response Time</p>
          <p className="mt-2 text-3xl font-bold text-primary-500">
            {formatTime(stats?.avgResponseTime ?? null)}
          </p>
        </Card>
        <Card variant="outline" padding="lg" className="flex-1">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Error Rate</p>
          <p className="mt-2 text-3xl font-bold text-danger-500">
            {analytics ? `${analytics.errorRate.toFixed(1)}%` : "—"}
          </p>
        </Card>
        <Card variant="outline" padding="lg" className="flex-1">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Credits Used</p>
          <p className="mt-2 text-3xl font-bold text-amber-500">
            {(analytics?.creditsUsed ?? 0).toLocaleString()}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-500">Range:</span>
        {(["day", "week", "month", "year"] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "primary" : "outline"}
            onClick={() => { setRange(r); }}
          >
            {r}
          </Button>
        ))}
      </div>

      {analytics && (
        <Card variant="outline" padding="lg">
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Requests Over Time
            </h3>
          </CardHeader>
          <CardContent>
            {analytics.dailySeries.length === 0 ? (
              <p className="text-sm text-neutral-400">No data available yet.</p>
            ) : (
              <div className="flex h-40 items-end gap-1">
                {analytics.dailySeries.map((d) => {
                  const max = Math.max(1, ...analytics.dailySeries.map((x) => x.count));
                  const height = Math.max(4, (d.count / max) * 100);
                  return (
                    <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end" title={`${d.date}: ${String(d.count)}`}>
                      <div
                        className="w-full rounded-t bg-primary-500/80 transition-colors group-hover:bg-primary-500"
                        style={{ height: `${String(height)}%` }}
                      />
                      <span className="mt-1 hidden text-[10px] text-neutral-400 lg:block">{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="outline" padding="lg">
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Top Questions</h3>
          </CardHeader>
          <CardContent>
            {!analytics || analytics.topQuestions.length === 0 ? (
              <p className="text-sm text-neutral-400">No data available yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.topQuestions.map((q) => (
                  <div key={q.question} className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-sm text-neutral-700 dark:text-neutral-300">{truncate(q.question, 60)}</span>
                    <Badge variant="secondary">{q.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="outline" padding="lg">
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Top Sources</h3>
          </CardHeader>
          <CardContent>
            {!analytics || analytics.topSources.length === 0 ? (
              <p className="text-sm text-neutral-400">No data available yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.topSources.map((s) => (
                  <div key={s.title} className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-sm text-neutral-700 dark:text-neutral-300">{truncate(s.title, 60)}</span>
                    <Badge variant="secondary">{s.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card variant="outline" padding="lg">
        <CardHeader>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Model Usage</h3>
        </CardHeader>
        <CardContent>
          {!analytics || analytics.models.length === 0 ? (
            <p className="text-sm text-neutral-400">No data available yet.</p>
          ) : (
            <div className="overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.models.map((m) => (
                    <TableRow key={m.model}>
                      <TableCell className="font-mono text-sm">{m.model}</TableCell>
                      <TableCell>{m.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Health tab ----------

function HealthTab(): ReactNode {
  const { data: health, isLoading, isError, error, refetch, isFetching } = useHealth();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !health) {
    return (
      <ErrorState
        title="Failed to load health overview"
        description={error instanceof Error ? error.message : "An error occurred"}
        retryLabel="Retry"
        onRetry={() => { void refetch(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={health.status === "OPERATIONAL" ? "success" : "danger"}>
            {health.status}
          </Badge>
          <span className="text-sm text-neutral-500">AI Platform Status</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => { void refetch(); }} loading={isFetching}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card variant="outline" padding="lg">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Active Provider</p>
          <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {health.providers.find((p) => p.isActive && p.isEnabled)?.modelName ?? "None"}
          </p>
        </Card>
        <Card variant="outline" padding="lg">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Knowledge Sources</p>
          <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {health.knowledgeBase.indexedSources} / {health.knowledgeBase.totalSources} indexed
          </p>
          <p className="mt-1 text-xs text-neutral-400">{health.knowledgeBase.totalChunks} chunks · {health.knowledgeBase.coverage}% coverage</p>
        </Card>
        <Card variant="outline" padding="lg">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Active Prompt</p>
          <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {health.activePrompt ? `${health.activePrompt.name} (v${String(health.activePrompt.version)})` : "None"}
          </p>
        </Card>
      </div>

      <Card variant="outline" padding="lg">
        <CardHeader>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Providers</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Last Check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.modelName}</TableCell>
                    <TableCell>{p.provider}</TableCell>
                    <TableCell>
                      <Badge
                        variant={p.healthStatus === "HEALTHY" ? "success" : p.healthStatus === "UNHEALTHY" ? "danger" : "secondary"}
                      >
                        {p.healthStatus ?? "UNKNOWN"}
                      </Badge>
                      {!p.isEnabled && <Badge variant="danger" className="ms-2">Disabled</Badge>}
                    </TableCell>
                    <TableCell>{p.priority}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {p.lastHealthCheckAt ? new Date(p.lastHealthCheckAt).toLocaleString() : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Page ----------

export default function AiSettingsPage(): ReactNode {
  const [activeTab, setActiveTab] = useState<TabId>("teaching-style");
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

  const renderTab = (): ReactNode => {
    switch (activeTab) {
      case "teaching-style":
        return <TeachingStyleTab />;
      case "models":
        return <ModelsTab />;
      case "providers":
        return <ProvidersTab />;
      case "credits":
        return <CreditsTab />;
      case "packages":
        return <PackagesTab />;
      case "prompts":
        return <PromptsTab />;
      case "usage-logs":
        return <UsageLogsTab />;
      case "moderation":
        return <ModerationTab />;
      case "analytics":
        return <AnalyticsTab />;
      case "health":
        return <HealthTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          AI Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Manage AI configurations, providers, teaching styles, credit plans, packages, prompts, and monitoring.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-primary-600 shadow-sm dark:bg-neutral-700 dark:text-primary-400"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div>{renderTab()}</div>
    </div>
  );
}
