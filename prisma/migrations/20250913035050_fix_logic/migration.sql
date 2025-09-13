/*
  Warnings:

  - The primary key for the `profiles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `profiles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."events" DROP CONSTRAINT "events_profile_id_fkey";

-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."profiles" DROP CONSTRAINT "profiles_pkey",
DROP COLUMN "id",
DROP COLUMN "logoUrl";

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
