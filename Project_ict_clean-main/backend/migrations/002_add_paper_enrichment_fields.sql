-- Phase 2: Add enrichment tracking fields to papers table
-- Run in Supabase SQL Editor after 001

ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS journal TEXT,
  ADD COLUMN IF NOT EXISTS publication_date DATE,
  ADD COLUMN IF NOT EXISTS volume TEXT,
  ADD COLUMN IF NOT EXISTS issue TEXT,
  ADD COLUMN IF NOT EXISTS abstract TEXT,
  ADD COLUMN IF NOT EXISTS keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_source TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS metadata_enriched_at TIMESTAMPTZ;

-- Index for enrichment queries
CREATE INDEX IF NOT EXISTS idx_papers_metadata_enriched ON papers(metadata_enriched_at);
CREATE INDEX IF NOT EXISTS idx_papers_doi ON papers(doi);

-- Update paper_authors author_role to support new combined role
-- The role values will be: 'First author', 'Co author', 'Corresponding author', 'First & Corresponding author'
-- No schema change needed, just application-level validation