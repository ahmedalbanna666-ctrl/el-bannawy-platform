-- CreateEnum
CREATE TYPE "live_pricing_plan_type" AS ENUM ('PRIVATE', 'GROUP', 'ONE_TIME', 'FREE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "live_subscription_type" ADD VALUE 'CUSTOM_PRIVATE';
ALTER TYPE "live_subscription_type" ADD VALUE 'CUSTOM_GROUP';
ALTER TYPE "live_subscription_type" ADD VALUE 'CUSTOM_ONE_TIME';

-- AlterTable
ALTER TABLE "live_subscriptions" ADD COLUMN     "planCode" TEXT;

-- CreateTable
CREATE TABLE "live_pricing_plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "live_pricing_plan_type" NOT NULL,
    "price" INTEGER NOT NULL,
    "sessionCount" INTEGER NOT NULL DEFAULT 1,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_pricing_plans_code_key" ON "live_pricing_plans"("code");

-- CreateIndex
CREATE INDEX "live_pricing_plans_type_isActive_idx" ON "live_pricing_plans"("type", "isActive");

-- CreateIndex
CREATE INDEX "live_subscriptions_planCode_idx" ON "live_subscriptions"("planCode");

-- Seed the six legacy live plans (the pre-dynamic catalog). Prices match the
-- previous LiveProductPricingService defaults; the service will apply any
-- admin-customized prices stored in system_settings.live_product_prices on
-- first boot.
INSERT INTO "live_pricing_plans" ("id", "code", "name", "short", "description", "type", "price", "sessionCount", "benefits", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'PRIVATE_PLAN_A', 'خطة A فردية', 'حصتان شهرياً', 'جلسة خاصة ثابتة أسبوعياً مع معلمك الخاص.', 'PRIVATE', 500, 4, ARRAY['حصة خاصة أسبوعية ثابتة','متابعة مستمرة مع نفس المعلم','تقرير تقدم شهري']::TEXT[], true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PRIVATE_PLAN_B', 'خطة B فردية', '4 حصص شهرياً', 'جلسات خاصة مرتين أسبوعياً لمتابعة أسرع.', 'PRIVATE', 800, 8, ARRAY['حصتان خاصتان أسبوعياً','متابعة مستمرة مع نفس المعلم','تقرير تقدم شهري']::TEXT[], true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'GROUP_PLAN_A', 'خطة A مجموعة', 'حصتان شهرياً', 'حصص مجموعة ثابتة أسبوعياً مع زملائك.', 'GROUP', 300, 4, ARRAY['حصة مجموعة أسبوعية ثابتة','تفاعل مع زملائك','متابعة دورية للمستوى']::TEXT[], true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'GROUP_PLAN_B', 'خطة B مجموعة', '4 حصص شهرياً', 'حصص مجموعة مرتين أسبوعياً لتعميق الاستيعاب.', 'GROUP', 400, 8, ARRAY['حصص مجموعة مرتين أسبوعياً','تفاعل مع زملائك','متابعة دورية للمستوى']::TEXT[], true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ONE_TIME', 'حصة منفردة', 'حصة واحدة', 'حجز حصة خاصة حسب المواعيد المتاحة.', 'ONE_TIME', 200, 1, ARRAY['حصة خاصة واحدة','اختيار الموعد المناسب']::TEXT[], true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'FREE', 'فعالية مجانية', 'مجانية', 'انضم لجلسات مباشرة مجانية دورية.', 'FREE', 0, 0, ARRAY['جلسات مباشرة مجانية','لا يتطلب اشتراكاً']::TEXT[], true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
