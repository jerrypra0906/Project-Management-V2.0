-- Meeting notes: soft delete + two statuses (Draft / Published)
-- Safe to run multiple times.

ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "deletedAt" TEXT;

UPDATE "meetingNotes" SET "status" = 'Published' WHERE "status" IN ('Sent', 'Archived');
