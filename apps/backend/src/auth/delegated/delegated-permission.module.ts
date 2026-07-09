import { Module } from "@nestjs/common";
import { DelegatedPermissionService } from "./delegated-permission.service";

@Module({
  providers: [DelegatedPermissionService],
  exports: [DelegatedPermissionService],
})
export class DelegatedPermissionModule {}
