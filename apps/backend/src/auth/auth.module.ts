import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { JwtStrategy } from "./jwt.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { FirebaseAuthService } from "./firebase-auth.service";
import { BootstrapService } from "../common/services/bootstrap.service";
import { DelegatedPermissionModule } from "./delegated/delegated-permission.module";
import { ReferralModule } from "../referral/referral.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET")!,
        signOptions: { expiresIn: configService.get<string>("JWT_ACCESS_EXPIRES_IN", "15m") as unknown as `${number}${"s" | "m" | "h" | "d" | "y"}` },
      }),
    }),
    DelegatedPermissionModule,
    ReferralModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, BootstrapService, GoogleStrategy, FirebaseAuthService],
  exports: [AuthService, AuthRepository, DelegatedPermissionModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
