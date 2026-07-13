import { Module } from "@nestjs/common";
import { CurriculumController } from "./curriculum.controller";
import { CurriculumService } from "./curriculum.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { PermissionGuard } from "../common/guards/permission.guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [CurriculumController],
  providers: [CurriculumService, RolesGuard, PermissionGuard],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CurriculumModule {}
