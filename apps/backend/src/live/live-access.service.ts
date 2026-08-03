import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LiveAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveRole(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? "STUDENT";
  }

  assertSessionOwner(
    session: { teacherId: string },
    actorId: string,
    role: string,
  ): void {
    if (role === "TEACHER" && session.teacherId !== actorId) {
      throw new ForbiddenException("Not your session");
    }
  }
}
