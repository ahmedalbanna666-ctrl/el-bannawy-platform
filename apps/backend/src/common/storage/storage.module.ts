import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FILE_STORAGE, type FileStorage } from "./file-storage";
import { LocalFileStorage } from "./local-file.storage";
import { R2FileStorage } from "./r2-file-storage";

function isR2Configured(config: ConfigService): boolean {
  return Boolean(
    config.get<string>("R2_ACCOUNT_ID") &&
      config.get<string>("R2_ACCESS_KEY_ID") &&
      config.get<string>("R2_SECRET_ACCESS_KEY") &&
      config.get<string>("R2_BUCKET"),
  );
}

@Module({
  providers: [
    {
      provide: FILE_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): FileStorage => {
        if (isR2Configured(config)) {
          return new R2FileStorage({
            accountId: config.get<string>("R2_ACCOUNT_ID") ?? "",
            accessKeyId: config.get<string>("R2_ACCESS_KEY_ID") ?? "",
            secretAccessKey: config.get<string>("R2_SECRET_ACCESS_KEY") ?? "",
            bucket: config.get<string>("R2_BUCKET") ?? "",
          });
        }
        return new LocalFileStorage();
      },
    },
  ],
  exports: [FILE_STORAGE],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StorageModule {}
