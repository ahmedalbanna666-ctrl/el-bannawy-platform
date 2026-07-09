import { Module } from "@nestjs/common";
import { FinalReviewController } from "./final-review.controller";
import { FinalReviewService } from "./final-review.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({ controllers: [FinalReviewController], providers: [FinalReviewService, RolesGuard] })
export class FinalReviewModule {}
