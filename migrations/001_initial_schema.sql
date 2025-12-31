-- Initial Database Schema Migration
-- This migration creates all base tables for the Project Management system

-- Departments table
CREATE TABLE IF NOT EXISTS "departments" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "role" TEXT,
  "departmentId" TEXT,
  "active" BOOLEAN DEFAULT TRUE,
  "passwordHash" TEXT,
  "isAdmin" BOOLEAN DEFAULT FALSE,
  "emailActivated" BOOLEAN DEFAULT FALSE,
  "activationToken" TEXT,
  "activationTokenExpiry" TEXT
);

-- Drop unique constraint on email if exists (for flexibility)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";

-- Initiatives table
CREATE TABLE IF NOT EXISTS "initiatives" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ticket" TEXT,
  "description" TEXT,
  "businessImpact" TEXT,
  "priority" TEXT,
  "businessOwnerId" TEXT,
  "businessUserIds" TEXT,
  "departmentId" TEXT,
  "itPicId" TEXT,
  "itPicIds" TEXT,
  "itPmId" TEXT,
  "itManagerIds" TEXT,
  "status" TEXT,
  "milestone" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  "remark" TEXT,
  "documentationLink" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

-- Change Requests table
CREATE TABLE IF NOT EXISTS "changeRequests" (
  "initiativeId" TEXT PRIMARY KEY,
  "crSubmissionStart" TEXT,
  "crSubmissionEnd" TEXT,
  "developmentStart" TEXT,
  "developmentEnd" TEXT,
  "sitStart" TEXT,
  "sitEnd" TEXT,
  "uatStart" TEXT,
  "uatEnd" TEXT,
  "liveDate" TEXT,
  "crSection1Start" TEXT,
  "crSection1End" TEXT,
  "crSection2Start" TEXT,
  "crSection2End" TEXT,
  "crSection3Start" TEXT,
  "crSection3End" TEXT,
  "liveStart" TEXT,
  "liveEnd" TEXT
);

-- Tags table
CREATE TABLE IF NOT EXISTS "tags" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL
);

-- Initiative Tags junction table
CREATE TABLE IF NOT EXISTS "initiativeTags" (
  "id" TEXT PRIMARY KEY,
  "initiativeId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL
);

-- Status History table
CREATE TABLE IF NOT EXISTS "statusHistory" (
  "id" TEXT PRIMARY KEY,
  "initiativeId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "changedAt" TEXT NOT NULL,
  "changedBy" TEXT
);

-- Milestone History table
CREATE TABLE IF NOT EXISTS "milestoneHistory" (
  "id" TEXT PRIMARY KEY,
  "initiativeId" TEXT NOT NULL,
  "milestone" TEXT NOT NULL,
  "changedAt" TEXT NOT NULL,
  "changedBy" TEXT
);

-- Change History table
CREATE TABLE IF NOT EXISTS "changeHistory" (
  "id" TEXT PRIMARY KEY,
  "initiativeId" TEXT NOT NULL,
  "timestamp" TEXT NOT NULL,
  "changedBy" TEXT
);

-- Change History Items table
CREATE TABLE IF NOT EXISTS "changeHistoryItem" (
  "id" TEXT PRIMARY KEY,
  "changeHistoryId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "changedAt" TEXT NOT NULL
);

-- Comments table
CREATE TABLE IF NOT EXISTS "comments" (
  "id" TEXT PRIMARY KEY,
  "initiativeId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT
);

-- Tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" TEXT PRIMARY KEY,
  "initiativeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  "assigneeId" TEXT,
  "status" TEXT,
  "milestone" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT
);

-- Documents table
CREATE TABLE IF NOT EXISTS "documents" (
  "id" TEXT PRIMARY KEY,
  "initiativeId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "uploadedAt" TEXT NOT NULL
);

-- Notifications table
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

