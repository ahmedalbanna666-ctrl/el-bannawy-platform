import { api } from "@/lib/api-client";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import type {
  ICreateLiveSessionDto,
  IUpdateLiveSessionDto,
  ICreateTeacherAvailabilityDto,
  IBookSessionDto,
  IBookBySlotDto,
} from "@el-bannawy/shared";

interface TeacherInfo {
  id: string;
  name: string;
  email: string;
}

export interface LiveSessionItem {
  id: string;
  title: string;
  description: string | null;
  teacherId: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  status: string;
  meetingProvider: string | null;
  meetingUrl: string | null;
  meetingPassword: string | null;
  gradeId: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: TeacherInfo;
  _count: { bookings: number };
}

export interface LiveBookingItem {
  id: string;
  sessionId: string;
  studentId: string;
  subscriptionId: string | null;
  status: string;
  bookedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  session: LiveSessionItem;
}

export interface LiveSubscriptionItem {
  id: string;
  userId: string;
  teacherId: string;
  planType: string;
  sessionsTotal: number;
  sessionsUsed: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: TeacherInfo;
}

export interface TeacherAvailabilityItem {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  gradeId: string | null;
  maxStudents: number;
  type: string;
  isRecurring: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface AvailableSlotItem {
  slotId: string;
  teacherId: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  type: string;
  maxStudents: number;
  gradeId: string | null;
  existingSessionId: string | null;
  availableSeats: number;
}

export interface BookBySlotResponse {
  booking: LiveBookingItem;
  session: LiveSessionItem;
}

export const LIVE_KEYS = {
  all: ["live"] as const,
  sessions: ["live", "sessions"] as const,
  session: (id: string) => ["live", "sessions", id] as const,
  myBookings: ["live", "my-bookings"] as const,
  subscriptions: ["live", "subscriptions"] as const,
  availability: ["live", "availability"] as const,
  calendar: (teacherId?: string) =>
    ["live", "availability", "calendar", teacherId] as const,
  dateBlocks: ["live", "date-blocks"] as const,
};

export function useLiveSessions(): UseQueryResult<LiveSessionItem[]> {
  return useQuery({
    queryKey: LIVE_KEYS.sessions,
    queryFn: async () => {
      const res = await api.get<LiveSessionItem[]>("/live/sessions");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useLiveSession(id: string | undefined): UseQueryResult<LiveSessionItem> {
  return useQuery({
    queryKey: LIVE_KEYS.session(id ?? ""),
    queryFn: async () => {
      const res = await api.get<LiveSessionItem>(`/live/sessions/${String(id)}`);
      if (!res.data) throw new Error("Session not found");
      return res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useMyBookings(): UseQueryResult<LiveBookingItem[]> {
  return useQuery({
    queryKey: LIVE_KEYS.myBookings,
    queryFn: async () => {
      const res = await api.get<LiveBookingItem[]>("/live/my-bookings");
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useLiveSubscriptions(): UseQueryResult<LiveSubscriptionItem[]> {
  return useQuery({
    queryKey: LIVE_KEYS.subscriptions,
    queryFn: async () => {
      const res = await api.get<LiveSubscriptionItem[]>("/live/subscriptions");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useAvailabilities(): UseQueryResult<TeacherAvailabilityItem[]> {
  return useQuery({
    queryKey: LIVE_KEYS.availability,
    queryFn: async () => {
      const res = await api.get<TeacherAvailabilityItem[]>("/live/availability");
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useAvailableSlots(teacherId?: string): UseQueryResult<AvailableSlotItem[]> {
  return useQuery({
    queryKey: LIVE_KEYS.calendar(teacherId),
    queryFn: async () => {
      const now = new Date();
      const dateFrom = now.toISOString().split("T")[0];
      const future = new Date(now);
      future.setDate(future.getDate() + 30);
      const dateTo = future.toISOString().split("T")[0];
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (teacherId) params.set("teacherId", teacherId);
      const res = await api.get<AvailableSlotItem[]>(
        `/live/availability/calendar?${params.toString()}`,
      );
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useCreateSession(): UseMutationResult<unknown, Error, ICreateLiveSessionDto> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateLiveSessionDto) =>
      api.post("/live/sessions", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.all }); },
  });
}

export function useUpdateSession(): UseMutationResult<unknown, Error, IUpdateLiveSessionDto & { id: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: IUpdateLiveSessionDto & { id: string }) =>
      api.patch(`/live/sessions/${id}`, dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.all }); },
  });
}

export function useDeleteSession(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/live/sessions/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.all }); },
  });
}

export function useBookSession(): UseMutationResult<unknown, Error, IBookSessionDto> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: IBookSessionDto) =>
      api.post<LiveBookingItem>(`/live/sessions/${dto.sessionId}/book`, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.sessions });
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.myBookings });
    },
  });
}

export function useBookBySlot(): UseMutationResult<unknown, Error, IBookBySlotDto & { slotId: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, ...dto }: IBookBySlotDto & { slotId: string }) =>
      api.post<BookBySlotResponse>(
        `/live/availability/calendar/${slotId}/book`,
        dto,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.all });
    },
  });
}

export function useCancelBooking(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      api.delete(`/live/bookings/${bookingId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.myBookings });
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.sessions });
    },
  });
}

export function useCreateAvailability(): UseMutationResult<unknown, Error, ICreateTeacherAvailabilityDto> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateTeacherAvailabilityDto) =>
      api.post("/live/availability", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.availability }); },
  });
}

export function useUpdateAvailability(): UseMutationResult<unknown, Error, Partial<ICreateTeacherAvailabilityDto> & { id: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...dto
    }: Partial<ICreateTeacherAvailabilityDto> & { id: string }) =>
      api.patch(`/live/availability/${id}`, dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.availability }); },
  });
}

export function useDeleteAvailability(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/live/availability/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.availability }); },
  });
}

export function useBlockDate(): UseMutationResult<unknown, Error, { date: string; reason?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { date: string; reason?: string }) =>
      api.post("/live/date-blocks", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.all }); },
  });
}

export function useUnblockDate(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) =>
      api.delete(`/live/date-blocks/${blockId}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.all }); },
  });
}

export function useCreateSubscription(): UseMutationResult<unknown, Error, { teacherId: string; planType: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { teacherId: string; planType: string }) =>
      api.post("/live/subscriptions", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.subscriptions }); },
  });
}

export function useUpdateSubscription(): UseMutationResult<unknown, Error, { id: string; planType?: string; isActive?: boolean }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...dto
    }: {
      id: string;
      planType?: string;
      isActive?: boolean;
    }) => api.patch(`/live/subscriptions/${id}`, dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.subscriptions }); },
  });
}

export type SessionCardState =
  | "draft"
  | "available"
  | "booked"
  | "join_now"
  | "live"
  | "completed"
  | "cancelled"
  | "full"
  | "loading";

// ── Session Control (Dashcontrol) ──────────────────────────────

export interface LiveAnnouncementItem {
  id: string;
  sessionId: string;
  senderId: string;
  message: string;
  type: string;
  pinned: boolean;
  createdAt: string;
  sender: { id: string; fullName: string; avatarUrl: string | null };
}

export interface ControlPanelData {
  session: LiveSessionItem | null;
  participants: LiveBookingItem[];
  announcements: LiveAnnouncementItem[];
  attendance: LiveAttendanceItem[];
  controlLogs: LiveControlLogItem[];
}

export interface LiveAttendanceItem {
  id: string;
  sessionId: string;
  studentId: string;
  status: string;
  joinedAt: string | null;
  leftAt: string | null;
  durationMinutes: number | null;
  markedBy: string;
  notes: string | null;
  student: { id: string; fullName: string; email: string; avatarUrl: string | null };
}

export interface LiveControlLogItem {
  id: string;
  sessionId: string;
  action: string;
  actorId: string;
  details: string | null;
  createdAt: string;
  actor: { id: string; fullName: string };
}

export function useControlPanel(sessionId: string | undefined): UseQueryResult<ControlPanelData> {
  return useQuery({
    queryKey: ["live", "control-panel", sessionId],
    queryFn: async () => {
      const res = await api.get<ControlPanelData>(`/live/sessions/${String(sessionId)}/control-panel`);
      if (!res.data) throw new Error("Control panel data not found");
      return res.data;
    },
    enabled: !!sessionId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useAnnouncements(sessionId: string | undefined): UseQueryResult<LiveAnnouncementItem[]> {
  return useQuery({
    queryKey: ["live", "announcements", sessionId],
    queryFn: async () => {
      const res = await api.get<LiveAnnouncementItem[]>(`/live/sessions/${String(sessionId)}/announcements`);
      return res.data ?? [];
    },
    enabled: !!sessionId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useStartSession(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.post(`/live/sessions/${sessionId}/start`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.all }); },
  });
}

export function useEndSession(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.post(`/live/sessions/${sessionId}/end`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIVE_KEYS.all }); },
  });
}

export function useSendAnnouncement(): UseMutationResult<unknown, Error, { sessionId: string; message: string; type?: string; pin?: boolean }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, message, type, pin }) =>
      api.post(`/live/sessions/${sessionId}/announcements`, { message, type, pin }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["live", "announcements", variables.sessionId] });
      void qc.invalidateQueries({ queryKey: ["live", "control-panel", variables.sessionId] });
    },
  });
}

export function useRemoveParticipant(): UseMutationResult<unknown, Error, { sessionId: string; studentId: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, studentId }) =>
      api.delete(`/live/sessions/${sessionId}/participants/${studentId}`),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["live", "control-panel", variables.sessionId] });
    },
  });
}

export function useOverrideSettings(): UseMutationResult<unknown, Error, { sessionId: string; settings: Record<string, unknown> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, settings }) =>
      api.patch(`/live/sessions/${sessionId}/settings`, settings),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.session(variables.sessionId) });
      void qc.invalidateQueries({ queryKey: ["live", "control-panel", variables.sessionId] });
    },
  });
}

export function useControlLogs(sessionId: string | undefined): UseQueryResult<LiveControlLogItem[]> {
  return useQuery({
    queryKey: ["live", "control-logs", sessionId],
    queryFn: async () => {
      const res = await api.get<LiveControlLogItem[]>(`/live/sessions/${String(sessionId)}/control-logs`);
      return res.data ?? [];
    },
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function usePublishSession(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/live/sessions/${sessionId}/publish`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.sessions });
    },
  });
}

export function useUnpublishSession(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/live/sessions/${sessionId}/unpublish`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.sessions });
    },
  });
}

export function deriveSessionState(
  session: LiveSessionItem,
  isBooked: boolean,
): SessionCardState {
  if (session.status === "DRAFT") return "draft";
  if (session.status === "CANCELLED") return "cancelled";
  if (session.status === "COMPLETED") return "completed";
  if (session.status === "LIVE" && isBooked) return "join_now";
  if (session.status === "LIVE") return "live";
  if (session.status === "FULL") return "full";
  if (session.maxStudents > 0 && session._count.bookings >= session.maxStudents)
    return "full";
  if (isBooked) return "booked";
  if (
    session.status === "PUBLISHED" ||
    session.status === "SCHEDULED" ||
    session.status === "OPEN"
  )
    return "available";
  return "available";
}
