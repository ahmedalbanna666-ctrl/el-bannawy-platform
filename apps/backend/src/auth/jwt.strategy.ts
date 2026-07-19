import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") as string,
    });
  }

  async validate(payload: JwtPayload): Promise<{ userId: string; role: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });

    if (user?.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid or inactive user");
    }

    return { userId: payload.sub, role: payload.role };
  }
}
