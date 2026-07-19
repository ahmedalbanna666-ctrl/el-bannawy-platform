import { Global, Module } from "@nestjs/common";
import { AuditService } from "./services/audit.service";
import { AcademicContextService } from "./services/academic-context.service";
import { AcademicContextController } from "./academic-context.controller";
import { ConfigurationService } from "../config/configuration.service";

@Global()
@Module({
  controllers: [AcademicContextController],
  providers: [AuditService, AcademicContextService, ConfigurationService],
  exports: [AuditService, AcademicContextService, ConfigurationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommonModule {}
