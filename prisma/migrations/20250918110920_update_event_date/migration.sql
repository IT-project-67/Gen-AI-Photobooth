-- AlterTable
ALTER TABLE "public"."events" ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL;
