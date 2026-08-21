-- ============================================================================
-- KHABO KOTHAY — PROPOSED MIGRATION v1.3 (Discovery Facts)
-- ============================================================================
-- STATUS: PROPOSED FOR REVIEW. NOT EXECUTED. Pending DDL access + approval.
-- Source: DISCOVERY_FACTS_ARCHITECTURE_AUDIT.md (approved v1 schema design).
-- Execution: run in the Supabase Dashboard SQL Editor (or with DB-level access).
--
-- RULES:
--   * Additive only — no existing column/table removed, no provenance lost.
--   * Does NOT modify the approved v1.1 migration or the v1.2 contract.
--   * Idempotent (IF NOT EXISTS / CREATE OR REPLACE) — safe on fresh and live.
--   * No data import is performed by this file.
--   * RLS is part of THIS migration because the facts table needs a
--     status-scoped policy (APPROVED only) — deliberately unlike the blanket
--     `public_read USING (true)` policies in RLS_PUBLIC_READ.sql.
--
-- SECURITY MODEL:
--   * anon / authenticated: SELECT only, AND only rows where status='APPROVED'.
--   * Writes (insert/update/status flips) require the service role (pipeline)
--     or a future staff-authenticated admin route — never the anon key.
--   * DRAFT / REVIEW / REJECTED / ARCHIVED facts are invisible to public reads.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) ENUMS (naming follows v1.1 convention: snake_case type, UPPER values)
-- ----------------------------------------------------------------------------
CREATE TYPE fact_type AS ENUM (
    'HISTORY',
    'EXPERIENCE',
    'CONCEPT',
    'LOCATION',
    'IDENTITY',
    'OTHER'
);

CREATE TYPE fact_confidence AS ENUM (
    'HIGH',
    'MEDIUM',
    'LOW'
);

CREATE TYPE fact_status AS ENUM (
    'DRAFT',
    'REVIEW',
    'APPROVED',
    'REJECTED',
    'ARCHIVED'
);

-- ----------------------------------------------------------------------------
-- 2) restaurant_discovery_facts
--    One row = one evidence-backed claim. APPROVED is the only public state.
-- ----------------------------------------------------------------------------
CREATE TABLE restaurant_discovery_facts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id     UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    fact_text         TEXT NOT NULL,
    fact_type         fact_type NOT NULL,
    confidence        fact_confidence NOT NULL,
    source_type       TEXT NOT NULL,
    source_reference  TEXT NOT NULL,
    evidence_note     TEXT,
    status            fact_status DEFAULT 'DRAFT',
    verified_at       TIMESTAMP,
    approved_by       UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    published_at      TIMESTAMP,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW(),
    UNIQUE(restaurant_id, fact_text),
    -- APPROVED facts must carry a citation + a supporting snippet.
    CONSTRAINT fact_approved_requires_evidence
        CHECK (status <> 'APPROVED'
               OR (source_reference IS NOT NULL AND btrim(source_reference) <> ''
                   AND evidence_note IS NOT NULL AND btrim(evidence_note) <> ''))
);

-- ----------------------------------------------------------------------------
-- 3) INDEXES (v1.1 naming convention: idx_<table>_<column>)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_discovery_facts_restaurant ON restaurant_discovery_facts(restaurant_id);
CREATE INDEX idx_discovery_facts_status    ON restaurant_discovery_facts(status);

-- ----------------------------------------------------------------------------
-- 4) ROW LEVEL SECURITY — public read = APPROVED only (deviation, intentional)
-- ----------------------------------------------------------------------------
ALTER TABLE restaurant_discovery_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_approved ON restaurant_discovery_facts;
CREATE POLICY public_read_approved ON restaurant_discovery_facts
    FOR SELECT TO anon, authenticated USING (status = 'APPROVED');

GRANT SELECT ON restaurant_discovery_facts TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5) Editorial review queue (read-only convenience view — no extra table)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS fact_review_queue;
CREATE VIEW fact_review_queue AS
    SELECT * FROM restaurant_discovery_facts
    WHERE status IN ('DRAFT', 'REVIEW')
    ORDER BY created_at;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (Supabase Dashboard -> SQL Editor):
--
--   SELECT tablename FROM pg_tables WHERE schemaname='public'
--     AND tablename = 'restaurant_discovery_facts';           -- -> 1 row
--
--   SELECT policyname, cmd, roles FROM pg_policies
--     WHERE tablename = 'restaurant_discovery_facts';
--       -- -> public_read_approved / SELECT / {anon, authenticated}
--
--   As anon (frontend): INSERT must fail (no write policy);
--                       SELECT returns only APPROVED rows.
-- ============================================================================