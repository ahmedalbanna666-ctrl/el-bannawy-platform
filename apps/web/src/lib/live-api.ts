import { api, type ApiResponse } from "@/lib/api-client";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import type {
  ICreateLiveSessionDto,
  ICreateTeacherAvailabilityDto,
  IBookSessionDto,
  IBookBySlotDto,
} from "@el-bannawy/shared";

interface TeacherInfo {
  id: string;
  fullName: string;
  email: string;
}

export interface LiveSessionItem {
  id: string;
  title: string;
  description: string | null;
  teacherId: string;
  gradeId: string | null;
  lessonId: string | null;
  courseId: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maxStudents: number;
  availableSeats: number | null;
  status: string;
  type: string;
  meetingProvider: string | null;
  meetingUrl: string | null;
  meetingPassword: string | null;
  zoomMeetingId: string | null;
  zoomPassword: string | null;
  zoomJoinUrl: string | null;
  waitingRoom: boolean;
  autoRecord: boolean;
  notes: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  teacher: TeacherInfo;
  grade?: { id: string; name: string } | null;
  lesson?: { id: string; title: string; unitId: string } | null;
  _count: { bookings: number };
}

export interface LessonLiveSessionView {
  session: LiveSessionItem;
  isBooked: boolean;
  hasActiveSubscription: boolean;
  canJoin: boolean;
  myAttendance: LiveAttendanceItem | null;
}

export interface ZoomJoinConfig {
  sessionId: string;
  sessionTitle: string;
  meetingNumber: string;
  password: string | null;
  sdkKey: string;
  signature: string;
  userName: string;
  userEmail: string;
  role: 0 | 1;
  provider: string;
  zoomJoinUrl: string | null;
  meetingUrl?: string;
  leaveUrl: string | null;
  startedAt: string;
  attendance?: LiveAttendanceItem;
}

export interface LiveBookingItem {
  id: string;
  sessionId: string;
  studentId: string;
  subscriptionId: string | null;
  status: string;
  rescheduleRequestedAt: string | null;
  rescheduleReason: string | null;
  rescheduleStatus: string | null;
  rescheduleResolvedAt: string | null;
  bookedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  session: LiveSessionItem;
  student?: { id: string; fullName: string; email: string; avatarUrl: string | null };
}

export interface LiveSubscriptionItem {
  id: string;
  userId: string;
  teacherId: string | null;
  type: string;
  status: string;
  sessionsTotal: number;
  sessionsUsed: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string | null;
  autoRenew: boolean;
  price: number;
  cancelledAt: string | null;
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

export function useLiveSessions(limit = 100): UseQueryResult<LiveSessionItem[]> {
  return useQuery({
    queryKey: [...LIVE_KEYS.sessions, "all", limit] as const,
    queryFn: async () => {
      const collected: LiveSessionItem[] = [];
      const pageSize = Math.min(100, Math.max(1, limit));
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages && collected.length < 1000) {
        const res = await api.get<{ data: LiveSessionItem[]; meta: { totalPages: number } }>(
          `/live/sessions?page=${String(page)}&limit=${String(pageSize)}`,
        );
        const items = res.data?.data ?? [];
        collected.push(...items);
        totalPages = res.data?.meta.totalPages ?? 1;
        page += 1;
      }
      return collected;
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

export function useAvailabilities(teacherId?: string): UseQueryResult<TeacherAvailabilityItem[]> {
  return useQuery({
    queryKey: ["live", "availability", teacherId] as const,
    queryFn: async () => {
      const query = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : "";
      const res = await api.get<TeacherAvailabilityItem[]>(`/live/availability${query}`);
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

export function useCreateSession(): UseMutationResult<ApiResponse<{ id: string }>, Error, ICreateLiveSessionDto> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateLiveSessionDto) =>
      api.post<{ id: string }>("/live/sessions", dto),
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

export function useCreateAvailability(): UseMutationResult<unknown, Error, ICreateTeacherAvailabilityDto> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateTeacherAvailabilityDto) =>
      api.post("/live/availability", dto),
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

export function useCreateSubscription(): UseMutationResult<
  ApiResponse<LiveSubscriptionItem>,
  Error,
  { teacherId: string; type: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { teacherId: string; type: string }) =>
      api.post<LiveSubscriptionItem>("/live/subscriptions", {
        teacherId: dto.teacherId,
        type: dto.type,
      }),
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
  device: string | null;
  ip: string | null;
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

// ── Zoom Integration ────────────────────────────────────────────────

export interface ICreateZoomMeetingDto {
  topic?: string;
  durationMinutes?: number;
  startTime?: string;
  timezone?: string;
  password?: string;
  waitingRoom?: boolean;
  autoRecord?: boolean;
  muteUponEntry?: boolean;
  joinBeforeHost?: boolean;
  hostVideo?: boolean;
  participantVideo?: boolean;
}

export function useCreateZoomMeeting(): UseMutationResult<unknown, Error, { sessionId: string; dto: ICreateZoomMeetingDto }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, dto }) =>
      api.post(`/live/sessions/${sessionId}/zoom-meeting`, dto),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.session(variables.sessionId) });
      void qc.invalidateQueries({ queryKey: ["live", "control-panel", variables.sessionId] });
    },
  });
}

export function useUpdateZoomMeeting(): UseMutationResult<unknown, Error, { sessionId: string; dto: ICreateZoomMeetingDto }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, dto }) =>
      api.patch(`/live/sessions/${sessionId}/zoom-meeting`, dto),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.session(variables.sessionId) });
      void qc.invalidateQueries({ queryKey: ["live", "control-panel", variables.sessionId] });
    },
  });
}

export function useDeleteZoomMeeting(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.delete(`/live/sessions/${sessionId}/zoom-meeting`),
    onSuccess: (_data, sessionId) => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.session(sessionId) });
      void qc.invalidateQueries({ queryKey: ["live", "control-panel", sessionId] });
    },
  });
}

export function useJoinSession(): UseMutationResult<ZoomJoinConfig, Error, { sessionId: string; device?: string }> {
  return useMutation({
    mutationFn: async ({ sessionId, device }) => {
      const res = await api.post<ZoomJoinConfig>(`/live/sessions/${sessionId}/join`, { device });
      if (!res.data) throw new Error("Join failed");
      return res.data;
    },
    retry: 1,
  });
}

export function useLeaveSession(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/live/sessions/${sessionId}/leave`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.all });
    },
  });
}

export function useLessonLiveSessions(lessonId: string | undefined): UseQueryResult<LessonLiveSessionView[]> {
  return useQuery({
    queryKey: ["live", "lesson-sessions", lessonId],
    queryFn: async () => {
      const res = await api.get<LessonLiveSessionView[]>(`/live/sessions/by-lesson/${String(lessonId)}`);
      return res.data ?? [];
    },
    enabled: !!lessonId,
    staleTime: 30_000,
  });
}

export function useSessionAttendance(sessionId: string | undefined, enabled: boolean): UseQueryResult<LiveAttendanceItem[]> {
  return useQuery({
    queryKey: ["live", "attendance", sessionId],
    queryFn: async () => {
      const res = await api.get<LiveAttendanceItem[]>(`/live/sessions/${String(sessionId)}/attendance`);
      return res.data ?? [];
    },
    enabled: !!sessionId && enabled,
    staleTime: 15_000,
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

// ── Booking management ────────────────────────────────────────────────

export function useCancelBooking(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => api.delete(`/live/bookings/${bookingId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.all });
    },
  });
}

export function useRequestReschedule(): UseMutationResult<unknown, Error, { bookingId: string; reason: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, reason }) =>
      api.post(`/live/bookings/${bookingId}/reschedule-request`, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.myBookings });
    },
  });
}

export function useDecideReschedule(): UseMutationResult<unknown, Error, { bookingId: string; decision: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, decision }) =>
      api.patch(`/live/bookings/${bookingId}/reschedule-decision`, { decision }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.all });
    },
  });
}

export function useUpdateSubscription(): UseMutationResult<unknown, Error, { id: string; dto: { type?: string; status?: string; isActive?: boolean } }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }) => api.patch(`/live/subscriptions/${id}`, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.subscriptions });
    },
  });
}

// ── Waiting list ──────────────────────────────────────────────────────

export interface LiveWaitingListEntry {
  id: string;
  sessionId: string;
  studentId: string;
  status: string;
  position: number;
  joinedAt: string;
  session: LiveSessionItem;
}

export function useMyWaitlist(): UseQueryResult<LiveWaitingListEntry[]> {
  return useQuery({
    queryKey: ["live", "my-waitlist"] as const,
    queryFn: async () => {
      const res = await api.get<LiveWaitingListEntry[]>("/live/my-waitlist");
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useJoinWaitlist(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.post(`/live/sessions/${sessionId}/waitlist`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["live", "my-waitlist"] });
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.sessions });
    },
  });
}

export function useLeaveWaitlist(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.delete(`/live/sessions/${sessionId}/waitlist`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["live", "my-waitlist"] });
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.sessions });
    },
  });
}

export function useSessionWaitlist(
  sessionId: string | undefined,
  enabled: boolean,
): UseQueryResult<{ id: string; position: number; joinedAt: string; student: { id: string; fullName: string; email: string; avatarUrl: string | null } }[]> {
  return useQuery({
    queryKey: ["live", "waitlist", sessionId],
    queryFn: async () => {
      const res = await api.get<{ id: string; position: number; joinedAt: string; student: { id: string; fullName: string; email: string; avatarUrl: string | null } }[]>(
        `/live/sessions/${String(sessionId)}/waitlist`,
      );
      return res.data ?? [];
    },
    enabled: !!sessionId && enabled,
    staleTime: 15_000,
  });
}

// ── Recurring booking ─────────────────────────────────────────────────

export interface RecurringBookResult {
  sessionId: string;
  date: string;
  result: "BOOKED" | "SKIPPED";
  reason?: string;
}

export function useRecurringBook(): UseMutationResult<
  unknown,
  Error,
  { slotId: string; dateFrom: string; dateTo: string; subscriptionId?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, ...dto }) =>
      api.post<{ bookings: RecurringBookResult[] }>(
        `/live/availability/calendar/${slotId}/recurring-book`,
        dto,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.all });
    },
  });
}

// ── Date blocks ───────────────────────────────────────────────────────

export interface DateBlockItem {
  id: string;
  teacherId: string;
  date: string;
  reason: string | null;
}

export function useDateBlocks(teacherId?: string): UseQueryResult<DateBlockItem[]> {
  return useQuery({
    queryKey: ["live", "date-blocks", teacherId],
    queryFn: async () => {
      const params = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : "";
      const res = await api.get<DateBlockItem[]>(`/live/date-blocks${params}`);
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useUnblockDate(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/live/date-blocks/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["live", "date-blocks"] });
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.all });
    },
  });
}

// ── Availability management ───────────────────────────────────────────

export function useUpdateAvailability(): UseMutationResult<unknown, Error, { id: string; dto: Partial<ICreateTeacherAvailabilityDto> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }) => api.patch(`/live/availability/${id}`, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.availability });
    },
  });
}

// ── Session management ────────────────────────────────────────────────

export function useUpdateSession(): UseMutationResult<unknown, Error, { id: string; dto: Partial<ICreateLiveSessionDto> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }) => api.patch(`/live/sessions/${id}`, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.all });
    },
  });
}

export function useDeleteSession(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.delete(`/live/sessions/${sessionId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_KEYS.all });
    },
  });
}

export function useOverrideSettings(): UseMutationResult<unknown, Error, { sessionId: string; settings: Record<string, unknown> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, settings }) =>
      api.patch(`/live/sessions/${sessionId}/settings`, settings),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["live", "control-panel", variables.sessionId] });
    },
  });
}

export function useRecordAttendance(): UseMutationResult<unknown, Error, { sessionId: string; studentId: string; status: string; notes?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, studentId, status, notes }) =>
      api.post(`/live/sessions/${sessionId}/attendance`, { sessionId, studentId, status, notes }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["live", "control-panel", variables.sessionId] });
      void qc.invalidateQueries({ queryKey: ["live", "attendance", variables.sessionId] });
    },
  });
}

// ── Analytics & dashboards ────────────────────────────────────────────

export interface LiveAnalyticsOverview {
  totalSessions: number;
  publishedSessions: number;
  liveNowSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  upcomingSessions: number;
  totalBookings: number;
  totalStudents: number;
  attendanceRate: number;
  capacityUtilization: number;
  activeSubscriptions: number;
  waitlistEntries: number;
}

export interface TeacherLiveKpis {
  teacherId: string;
  totalSessions: number;
  upcomingSessions: number;
  liveNow: number;
  todaySessions: number;
  totalBookings: number;
  uniqueStudents: number;
  waitlistEntries: number;
  pendingRescheduleRequests: number;
}

export function useLiveAnalyticsOverview(dateFrom: string, dateTo: string): UseQueryResult<LiveAnalyticsOverview> {
  return useQuery({
    queryKey: ["live", "analytics", "overview", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const res = await api.get<LiveAnalyticsOverview>(`/live/analytics/overview?${params.toString()}`);
      if (!res.data) throw new Error("Analytics unavailable");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useTeacherLiveKpis(teacherId?: string): UseQueryResult<TeacherLiveKpis> {
  return useQuery({
    queryKey: ["live", "teacher-kpis", teacherId],
    queryFn: async () => {
      const params = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : "";
      const res = await api.get<TeacherLiveKpis>(`/live/teacher/kpis${params}`);
      if (!res.data) throw new Error("KPIs unavailable");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export interface LiveAdminStatus {
  meetingProvider: {
    id: string;
    configured: boolean;
    restConfigured: boolean;
    sdkKeyConfigured: boolean;
  };
  policies: {
    sessionConsumptionTiming: string;
    cancellationRefundPolicy: {
      cutoffHours: number;
      beforeCutoff: string;
      afterCutoff: string;
      afterStart: string;
    };
    attendancePolicy: { minCompletedMinutes: number };
  };
  notifications: {
    analytics: { totalSent: number; totalRead: number; readRate: number; deliveryRate: number; failedCount: number };
    configsCount: number;
    templatesCount: number;
  };
}

export function useLiveAdminStatus(): UseQueryResult<LiveAdminStatus> {
  return useQuery({
    queryKey: ["live", "admin-status"] as const,
    queryFn: async () => {
      const res = await api.get<LiveAdminStatus>("/live/admin/status");
      if (!res.data) throw new Error("Status unavailable");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export interface SecretaryLiveDashboard {
  todayLiveClasses: number;
  upcomingLiveClasses: number;
  activeSubscriptions: number;
  totalStudents: number;
  waitlistEntries: number;
  recentSessions: {
    id: string;
    title: string;
    status: string;
    startTime: string;
    teacher: { id: string; fullName: string; avatarUrl: string | null };
    _count: { bookings: number };
  }[];
}

export function useSecretaryLiveDashboard(): UseQueryResult<SecretaryLiveDashboard> {
  return useQuery({
    queryKey: ["live", "secretary-dashboard"] as const,
    queryFn: async () => {
      const res = await api.get<SecretaryLiveDashboard>("/live/secretary/dashboard");
      if (!res.data) throw new Error("Dashboard unavailable");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export interface ServerHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  database: string;
  memory: {
    used: string;
    total: string;
    percent: number;
  };
  responseTime: number;
}

export function useServerHealth(enabled = true): UseQueryResult<ServerHealth> {
  return useQuery({
    queryKey: ["system", "health"] as const,
    queryFn: async () => {
      const res = await api.get<ServerHealth>("/health");
      if (!res.data) throw new Error("Health unavailable");
      return res.data;
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${String(days)} يوم ${String(hours)} ساعة`;
  if (hours > 0) return `${String(hours)} ساعة ${String(minutes)} دقيقة`;
  return `${String(minutes)} دقيقة`;
}
