import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: any) {
    return this.prisma.user.create({ data });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async createSession(userId: string, token: string, expiresAt: Date) {
    return this.prisma.session.create({
      data: { userId, token, expiresAt },
    });
  }

  async findSession(token: string) {
    return this.prisma.session.findUnique({ where: { token } });
  }

  async deleteSession(token: string) {
    return this.prisma.session.delete({ where: { token } });
  }

  async deleteUserSessions(userId: string) {
    return this.prisma.session.deleteMany({ where: { userId } });
  }

  async createLoginHistory(userId: string, success: boolean, ipAddress?: string, failureReason?: string) {
    return this.prisma.loginHistory.create({
      data: { userId, success, ipAddress, failureReason },
    });
  }

  async createPasswordReset(userId: string, verificationCode: string, expiresAt: Date) {
    return this.prisma.passwordReset.create({
      data: { userId, verificationCode, expiresAt },
    });
  }

  async findPasswordResetByCode(code: string) {
    return this.prisma.passwordReset.findFirst({ where: { verificationCode: code } });
  }

  async deletePasswordReset(id: string) {
    return this.prisma.passwordReset.delete({ where: { id } });
  }

  async findOrCreateOAuthUser(email: string, fullName: string, googleId: string) {
    return this.prisma.user.upsert({
      where: { email },
      update: { googleId, fullName },
      create: { email, fullName, googleId, passwordHash: "", role: "STUDENT" },
    });
  }

  async findRecentLoginHistory(userId: string, since: Date, success: boolean) {
    return this.prisma.loginHistory.count({
      where: { userId, success, createdAt: { gte: since } },
    });
  }

  async findUserByEmailOrPhone(identifier: string, normalizedMobile: string | null) {
    const mobile = normalizedMobile ?? identifier;
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: identifier },
          { mobileNumber: mobile },
        ],
      },
    });
  }

  async deleteExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  async revokeExpiredRefreshTokens() {
    const result = await this.prisma.refreshToken.updateMany({
      where: { expiresAt: { lt: new Date() }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async deleteOldLoginHistory(before: Date) {
    const result = await this.prisma.loginHistory.deleteMany({
      where: { createdAt: { lt: before } },
    });
    return result.count;
  }
}
