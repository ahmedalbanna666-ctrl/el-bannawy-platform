import { Module } from "@nestjs/common";
import { GradeSupportContactController } from "./grade-support-contact.controller";
import { GradeSupportContactService } from "./grade-support-contact.service";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  imports: [],
  controllers: [GradeSupportContactController, SupportController],
  providers: [GradeSupportContactService, SupportService, RolesGuard],
  exports: [GradeSupportContactService, SupportService],
})
export class SupportModule {}
