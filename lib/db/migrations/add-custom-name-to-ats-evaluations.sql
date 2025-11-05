-- Migration: Add custom_name column to ats_evaluations table
-- Date: 2025-10-24
-- Description: Allows users to rename their evaluations

-- Add custom_name column
ALTER TABLE ats_evaluations ADD COLUMN custom_name TEXT;

