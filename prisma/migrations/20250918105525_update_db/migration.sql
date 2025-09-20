/*
  Warnings:

  - You are about to drop the column `generated_urls` on the `ai_photos` table. All the data in the column will be lost.
  - Added the required column `generated_url` to the `ai_photos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `events` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `user_id` on the `events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `profiles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."events" DROP CONSTRAINT "events_user_id_fkey";

-- DropIndex
DROP INDEX "public"."profiles_user_id_key";

-- AlterTable
ALTER TABLE "public"."ai_photos" DROP COLUMN "generated_urls",
ADD COLUMN     "generated_url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."profiles" DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
