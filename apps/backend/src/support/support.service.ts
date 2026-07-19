import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async listTickets(userId: string, filters: { status?: string; priority?: string; category?: string; assignedAgentId?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException("User not found");

    const where: Record<string, unknown> = {};
    if (filters.status) where["status"] = filters.status;
    if (filters.priority) where["priority"] = filters.priority;
    if (filters.category) where["category"] = filters.category;

    if (user.role === "STUDENT" || user.role === "TEACHER") {
      where["userId"] = userId;
    } else if (filters.assignedAgentId) {
      where["assignedAgentId"] = filters.assignedAgentId;
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTicket(ticketId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException("User not found");

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, ticketId: true, senderId: true, senderRole: true, body: true, internal: true, createdAt: true },
        },
      },
    });

    if (!ticket) throw new NotFoundException("Ticket not found");
    if (user.role === "STUDENT" || user.role === "TEACHER") {
      if (ticket.userId !== userId) throw new ForbiddenException("Access denied");
    }

    return ticket;
  }

  async createTicket(userId: string, dto: { subject: string; description: string; category?: string; priority?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.supportTicket.create({
      data: {
        userId,
        userRole: user.role,
        subject: dto.subject,
        description: dto.description,
        category: dto.category ?? "GENERAL",
        priority: dto.priority ?? "MEDIUM",
        status: "OPEN",
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async addMessage(ticketId: string, userId: string, dto: { body: string; internal?: boolean }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isOwner = ticket.userId === userId;
    const isAgent = user?.role === "SUPPORT" || user?.role === "ADMINISTRATOR" || user?.role === "STAFF";

    if (!isOwner && !isAgent) throw new ForbiddenException("Access denied");

    return this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: userId,
        senderRole: isAgent ? "AGENT" : "USER",
        body: dto.body,
        internal: dto.internal ?? false,
      },
    });
  }

  async updateTicket(ticketId: string, userId: string, dto: { status?: string; priority?: string; assignedAgentId?: string | null }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) data["status"] = dto.status;
    if (dto.priority !== undefined) data["priority"] = dto.priority;
    if (dto.assignedAgentId !== undefined) data["assignedAgentId"] = dto.assignedAgentId;

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async resolveTicket(ticketId: string, userId: string, dto: { resolution: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAgent = user?.role === "SUPPORT" || user?.role === "ADMINISTRATOR" || user?.role === "STAFF";
    if (!isAgent) throw new ForbiddenException("Only support agents can resolve tickets");

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "RESOLVED", resolution: dto.resolution, resolvedAt: new Date() },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async closeTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "CLOSED" },
    });
  }
}
