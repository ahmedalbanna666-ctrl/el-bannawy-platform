import { Global, Module } from "@nestjs/common";
import { AuditService } from "./services/audit.service";
import { AcademicContextService } from "./services/academic-context.service";
import { AcademicContextController } from "./academic-context.controller";

@Global()
@Module({
  controllers: [AcademicContextController],
  providers: [AuditService, AcademicContextService],
  exports: [AuditService, AcademicContextService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommonModule {}
