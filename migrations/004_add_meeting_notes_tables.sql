-- Migration 004: Add meeting notes feature tables
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "meetingNotes" (
  "id" TEXT PRIMARY KEY,
  "initiativeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "meetingType" TEXT NOT NULL,
  "meetingDate" TEXT NOT NULL,
  "location" TEXT,
  "meetingLink" TEXT,
  "facilitatorId" TEXT NOT NULL,
  "noteTakerId" TEXT NOT NULL,
  "agenda" TEXT,
  "discussion" TEXT,
  "decisions" TEXT,
  "risks" TEXT,
  "nextMeetingAt" TEXT,
  "status" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "initiativeId" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "meetingType" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "meetingDate" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "meetingLink" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "facilitatorId" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "noteTakerId" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "agenda" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "discussion" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "decisions" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "risks" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "nextMeetingAt" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE "meetingNotes" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

CREATE TABLE IF NOT EXISTS "meetingNoteParticipants" (
  "id" TEXT PRIMARY KEY,
  "meetingNoteId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "name" TEXT,
  "role" TEXT NOT NULL
);

ALTER TABLE "meetingNoteParticipants" ADD COLUMN IF NOT EXISTS "meetingNoteId" TEXT;
ALTER TABLE "meetingNoteParticipants" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "meetingNoteParticipants" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "meetingNoteParticipants" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "meetingNoteParticipants" ADD COLUMN IF NOT EXISTS "role" TEXT;

CREATE TABLE IF NOT EXISTS "meetingNoteActionItems" (
  "id" TEXT PRIMARY KEY,
  "meetingNoteId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "ownerId" TEXT,
  "ownerName" TEXT,
  "dueDate" TEXT,
  "priority" TEXT,
  "status" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE "meetingNoteActionItems" ADD COLUMN IF NOT EXISTS "meetingNoteId" TEXT;
ALTER TABLE "meetingNoteActionItems" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "meetingNoteActionItems" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "meetingNoteActionItems" ADD COLUMN IF NOT EXISTS "ownerName" TEXT;
ALTER TABLE "meetingNoteActionItems" ADD COLUMN IF NOT EXISTS "dueDate" TEXT;
ALTER TABLE "meetingNoteActionItems" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "meetingNoteActionItems" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "meetingNoteActionItems" ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS "meetingNoteEmailLog" (
  "id" TEXT PRIMARY KEY,
  "meetingNoteId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "toEmails" TEXT NOT NULL,
  "ccEmails" TEXT,
  "bodySnapshot" TEXT NOT NULL,
  "sentBy" TEXT NOT NULL,
  "sentAt" TEXT NOT NULL,
  "deliveryStatus" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "errorMessage" TEXT
);

ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "meetingNoteId" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "toEmails" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "ccEmails" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "bodySnapshot" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "sentBy" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "sentAt" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT;
ALTER TABLE "meetingNoteEmailLog" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

CREATE TABLE IF NOT EXISTS "meetingNoteHistory" (
  "id" TEXT PRIMARY KEY,
  "meetingNoteId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "field" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "changedBy" TEXT NOT NULL,
  "changedAt" TEXT NOT NULL
);

ALTER TABLE "meetingNoteHistory" ADD COLUMN IF NOT EXISTS "meetingNoteId" TEXT;
ALTER TABLE "meetingNoteHistory" ADD COLUMN IF NOT EXISTS "version" INTEGER;
ALTER TABLE "meetingNoteHistory" ADD COLUMN IF NOT EXISTS "field" TEXT;
ALTER TABLE "meetingNoteHistory" ADD COLUMN IF NOT EXISTS "oldValue" TEXT;
ALTER TABLE "meetingNoteHistory" ADD COLUMN IF NOT EXISTS "newValue" TEXT;
ALTER TABLE "meetingNoteHistory" ADD COLUMN IF NOT EXISTS "changedBy" TEXT;
ALTER TABLE "meetingNoteHistory" ADD COLUMN IF NOT EXISTS "changedAt" TEXT;
