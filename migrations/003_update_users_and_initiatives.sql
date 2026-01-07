-- Migration 003: Align production schema with latest backend/store.js
-- This migration is safe to run multiple times (uses IF NOT EXISTS).

-- Users: new fields for password reset, type, and team members
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teamMemberIds" TEXT;

-- Initiatives: ensure all team fields and metadata exist
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "ticket" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "businessImpact" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "businessOwnerId" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "businessUserIds" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "itPicId" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "itPicIds" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "itPmId" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "itManagerIds" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "milestone" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "startDate" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "endDate" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "remark" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "documentationLink" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;


