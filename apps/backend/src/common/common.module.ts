import { Global, Module } from "@nestjs/common";
import { AuditService } from "./services/audit.service";
import { AcademicContextService } from "./services/academic-context.service";

@Global()
@Module({
  providers: [AuditService, AcademicContextService],
  exports: [AuditService, AcademicContextService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommonModule {}
