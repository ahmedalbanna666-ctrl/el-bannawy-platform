import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { DelegatedPermissionModule } from "../auth/delegated/delegated-permission.module";
import { AdminRepository } from "./admin.repository";

@Module({
  imports: [DelegatedPermissionModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard, AdminRepository],
  exports: [AdminService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AdminModule {}
