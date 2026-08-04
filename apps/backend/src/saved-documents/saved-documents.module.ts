import { Module } from "@nestjs/common";
import { SavedDocumentsController } from "./saved-documents.controller";
import { SavedDocumentsService } from "./saved-documents.service";
import { StorageModule } from "../common/storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [SavedDocumentsController],
  providers: [SavedDocumentsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SavedDocumentsModule {}
