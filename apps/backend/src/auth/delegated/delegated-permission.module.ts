import { Module } from "@nestjs/common";
import { DelegatedPermissionService } from "./delegated-permission.service";
import { PermissionBootstrapService } from "./permission-bootstrap.service";

@Module({
  providers: [DelegatedPermissionService, PermissionBootstrapService],
  exports: [DelegatedPermissionService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DelegatedPermissionModule {}
