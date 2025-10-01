-- CreateEnum
CREATE TYPE "public"."Style" AS ENUM ('Anime', 'Watercolor', 'Oil', 'Disney');

-- CreateTable
CREATE TABLE "public"."profiles" (
    "display_name" TEXT,
    "organization" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "logoUrl" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "end_date" TIMESTAMP(3) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."photo_sessions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_photos" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "style" "public"."Style" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "generated_url" TEXT NOT NULL,

    CONSTRAINT "ai_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shared_photos" (
    "id" TEXT NOT NULL,
    "ai_photo_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "selected_url" TEXT NOT NULL,
    "qr_code_url" TEXT NOT NULL,
    "qr_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_photos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_sessions" ADD CONSTRAINT "photo_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_photos" ADD CONSTRAINT "ai_photos_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."photo_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shared_photos" ADD CONSTRAINT "shared_photos_ai_photo_id_fkey" FOREIGN KEY ("ai_photo_id") REFERENCES "public"."ai_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shared_photos" ADD CONSTRAINT "shared_photos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
