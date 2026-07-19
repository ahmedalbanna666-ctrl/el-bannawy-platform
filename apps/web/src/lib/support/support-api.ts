import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import type { Permission } from "@el-bannawy/shared";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCategory =
  | "GENERAL"
  | "TECHNICAL"
  | "BILLING"
  | "CONTENT"
  | "ACCOUNT"
  | "OTHER";

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: "USER" | "AGENT";
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface TicketItem {
  id: string;
  userId: string;
  userRole: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAgentId: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; email: string | null };
  messages?: TicketMessage[];
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignedAgentId?: string;
}

export const SUPPORT_KEYS = {
  all: ["support"] as const,
  tickets: ["support", "tickets"] as const,
  ticket: (id: string) => ["support", "tickets", id] as const,
};

export function useTickets(filters?: TicketFilters): UseQueryResult<TicketItem[]> {
  return useQuery({
    queryKey: [...SUPPORT_KEYS.tickets, filters ?? {}],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.priority) params.set("priority", filters.priority);
      if (filters?.category) params.set("category", filters.category);
      if (filters?.assignedAgentId) params.set("assignedAgentId", filters.assignedAgentId);
      const qs = params.toString();
      const res = await api.get<TicketItem[]>(`/support/tickets${qs ? `?${qs}` : ""}`);
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useTicket(ticketId: string | null): UseQueryResult<TicketItem> {
  return useQuery({
    queryKey: SUPPORT_KEYS.ticket(ticketId ?? ""),
    enabled: !!ticketId,
    queryFn: async () => {
      const res = await api.get<TicketItem>(`/support/tickets/${ticketId ?? ""}`);
      if (!res.data) throw new Error("Ticket not found");
      return res.data;
    },
    staleTime: 10_000,
  });
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}

export function useCreateTicket(): UseMutationResult<unknown, Error, CreateTicketInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post("/support/tickets", dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets });
    },
  });
}

export interface AddMessageInput {
  ticketId: string;
  body: string;
  internal?: boolean;
}

export function useAddMessage(): UseMutationResult<unknown, Error, AddMessageInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, body, internal }) =>
      api.post(`/support/tickets/${ticketId}/messages`, { body, internal }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.ticket(vars.ticketId) });
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets });
    },
  });
}

export interface UpdateTicketInput {
  ticketId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedAgentId?: string | null;
}

export function useUpdateTicket(): UseMutationResult<unknown, Error, UpdateTicketInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...data }) => api.patch(`/support/tickets/${ticketId}`, data),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.ticket(vars.ticketId) });
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets });
    },
  });
}

export function useResolveTicket(): UseMutationResult<unknown, Error, { ticketId: string; resolution: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, resolution }) =>
      api.post(`/support/tickets/${ticketId}/resolve`, { resolution }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.ticket(vars.ticketId) });
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets });
    },
  });
}

export function useCloseTicket(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticketId) => api.post(`/support/tickets/${ticketId}/close`),
    onSuccess: (_data, ticketId) => {
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.ticket(ticketId) });
      void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets });
    },
  });
}

export const SUPPORT_ANSWER_PERMISSION = "support.answer" as Permission;
