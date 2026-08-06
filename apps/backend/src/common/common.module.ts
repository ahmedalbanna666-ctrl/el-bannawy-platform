import { Global, Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AuditService } from "./services/audit.service";
import { AcademicContextService } from "./services/academic-context.service";
import { CacheService } from "./services/cache.service";
import { EncryptionService } from "./services/encryption.service";
import { UnitProgressService } from "./services/unit-progress.service";
import { AcademicContextController } from "./academic-context.controller";
import { ConfigurationService } from "../config/configuration.service";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { TransformInterceptor } from "./interceptors/transform.interceptor";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";

@Global()
@Module({
  controllers: [AcademicContextController],
  providers: [
    AuditService,
    AcademicContextService,
    CacheService,
    EncryptionService,
    UnitProgressService,
    ConfigurationService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [AuditService, AcademicContextService, CacheService, EncryptionService, UnitProgressService, ConfigurationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommonModule {}
