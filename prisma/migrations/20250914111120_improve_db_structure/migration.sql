/*
  Warnings:

  - You are about to drop the column `end_date` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `profile_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `shared_at` on the `shared_photos` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."events" DROP CONSTRAINT "events_profile_id_fkey";

-- AlterTable
ALTER TABLE "public"."events" DROP COLUMN "end_date",
DROP COLUMN "profile_id",
DROP COLUMN "start_date",
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."profiles" DROP COLUMN "phone",
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."sessions" ADD COLUMN     "status" TEXT DEFAULT 'active';

-- AlterTable
ALTER TABLE "public"."shared_photos" DROP COLUMN "shared_at";

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
