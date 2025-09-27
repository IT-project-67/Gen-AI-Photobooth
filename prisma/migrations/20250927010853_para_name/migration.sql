/*
  Warnings:

  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ai_photos" DROP CONSTRAINT "ai_photos_session_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_event_id_fkey";

-- DropTable
DROP TABLE "public"."sessions";

-- CreateTable
CREATE TABLE "public"."photo_sessions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."photo_sessions" ADD CONSTRAINT "photo_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_photos" ADD CONSTRAINT "ai_photos_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."photo_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
