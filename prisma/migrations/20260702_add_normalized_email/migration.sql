-- Migration: 20260702_add_normalized_email
-- Added normalizedEmail optional field to User for anti-fraud email alias detection

ALTER TABLE "User" ADD COLUMN "normalizedEmail" TEXT;

