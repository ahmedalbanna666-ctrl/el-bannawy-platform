import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { BootstrapService } from "../common/services/bootstrap.service";
import { DelegatedPermissionModule } from "./delegated/delegated-permission.module";

const googleOAuthConfigured = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

const oauthProviders = googleOAuthConfigured ? [GoogleStrategy] : [];

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") as string,
        signOptions: { expiresIn: configService.get<string>("JWT_ACCESS_EXPIRES_IN", "15m") as unknown as `${number}${"s" | "m" | "h" | "d" | "y"}` },
      }),
    }),
    DelegatedPermissionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, BootstrapService, ...oauthProviders],
  exports: [AuthService, DelegatedPermissionModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
