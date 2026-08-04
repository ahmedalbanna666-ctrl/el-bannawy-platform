import { Module } from "@nestjs/common";
import { CertificatesController } from "./certificates.controller";
import { CertificatesService } from "./certificates.service";
import { StorageModule } from "../common/storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CertificatesModule {}
