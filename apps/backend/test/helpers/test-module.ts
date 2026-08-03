import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { JwtModule } from "@nestjs/jwt";
import type { ModuleMetadata } from "@nestjs/common";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { CacheService } from "../../src/common/services/cache.service";
import { ConfigurationService, appConfig, authConfig, paymentConfig, aiConfig } from "../../src/config";

export async function createTestingModule(metadata: ModuleMetadata): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      PrismaModule,
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [appConfig, authConfig, paymentConfig, aiConfig],
      }),
      ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
      JwtModule.register({ secret: "test-jwt-secret", signOptions: { expiresIn: "15m" } }),
      ...(metadata.imports ?? []),
    ],
    providers: [
      ConfigurationService,
      CacheService,
      ...(metadata.providers ?? []),
    ],
    controllers: metadata.controllers ?? [],
  }).compile();
}
