-- Phase 1: Add paper fields and author_role to paper_authors
-- Run in Supabase SQL Editor

ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS journal     TEXT,
  ADD COLUMN IF NOT EXISTS volume      TEXT,
  ADD COLUMN IF NOT EXISTS issue       TEXT,
  ADD COLUMN IF NOT EXISTS pages       TEXT,
  ADD COLUMN IF NOT EXISTS abstract    TEXT,
  ADD COLUMN IF NOT EXISTS keywords    TEXT,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

ALTER TABLE paper_authors
  ADD COLUMN IF NOT EXISTS author_role TEXT;

-- Index for enrichment lookup
CREATE INDEX IF NOT EXISTS idx_papers_enriched ON papers(enriched_at);
