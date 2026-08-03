import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import type { Request } from "express";

interface JwtPayload {
  sub: string;
  role: string;
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const signedCookies = req.signedCookies as Record<string, string> | undefined;
          return signedCookies?.access_token ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET")!,
    });
  }

  async validate(payload: JwtPayload): Promise<{ userId: string; role: string; sessionId: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });

    if (user?.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid or inactive user");
    }

    // Validate session exists and has not been superseded
    if (payload.sessionId) {
      const session = await this.prisma.session.findFirst({
        where: { id: payload.sessionId, expiresAt: { gt: new Date() } },
      });
      if (!session) {
        throw new UnauthorizedException("Session expired or superseded by another login");
      }
    }

    return { userId: payload.sub, role: payload.role, sessionId: payload.sessionId };
  }
}
