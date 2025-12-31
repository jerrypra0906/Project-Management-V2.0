-- Add Notifications Table Migration
-- This migration ensures the notifications table exists with all required columns

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "initiativeId" TEXT,
  "commentId" TEXT,
  "read" BOOLEAN DEFAULT FALSE,
  "createdAt" TEXT NOT NULL
);

-- Ensure all columns exist (idempotent)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "initiativeId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "commentId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read" BOOLEAN DEFAULT FALSE;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

