import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "el-bannawy-jwt-secret",
    });
  }

  async validate(payload: JwtPayload): Promise<{ userId: string; role: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (user?.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid or inactive user");
    }

    return { userId: payload.sub, role: payload.role };
  }
}
