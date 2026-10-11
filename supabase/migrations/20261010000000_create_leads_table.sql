-- ==============================================================================
-- PRCBO AI LeadGen: Supabase PostgreSQL Migration
-- Migration: 20261010000000_create_leads_table.sql
-- Description: Creates the persistent 'leads' table with strict constraints,
--              duplicate prevention indexes, automated updated_at trigger,
--              and Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. Enable pgcrypto / uuid-ossp for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Commercial',
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    location TEXT NOT NULL DEFAULT 'India',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    recommended_service TEXT DEFAULT 'Web Development',
    ai_score INTEGER,
    status TEXT NOT NULL DEFAULT 'New',
    source TEXT NOT NULL DEFAULT 'Manual Entry',
    source_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Constraints
    CONSTRAINT chk_business_name_not_empty CHECK (trim(business_name) <> ''),
    CONSTRAINT chk_ai_score_range CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100)),
    CONSTRAINT chk_status_valid CHECK (
        status IN (
            'New',
            'Contacted',
            'Follow-up',
            'Interested',
            'Meeting Scheduled',
            'Converted',
            'Rejected',
            'Hot Lead',
            'Archived'
        )
    )
);

-- Comment on table and columns for documentation
COMMENT ON TABLE public.leads IS 'PRCBO AI LeadGen enterprise prospects and discovered business leads.';
COMMENT ON COLUMN public.leads.id IS 'Unique UUID identifier for the lead record.';
COMMENT ON COLUMN public.leads.business_name IS 'Official commercial trade name or enterprise title.';
COMMENT ON COLUMN public.leads.category IS 'Commercial industry or Overpass OSM business taxonomy.';
COMMENT ON COLUMN public.leads.contact_person IS 'Identified owner, decision-maker, or outreach contact.';
COMMENT ON COLUMN public.leads.email IS 'Contact email address for outreach campaigns.';
COMMENT ON COLUMN public.leads.phone IS 'Contact phone or WhatsApp mobile number.';
COMMENT ON COLUMN public.leads.website IS 'Company website or digital portal URL.';
COMMENT ON COLUMN public.leads.location IS 'Geographical territory or formatted city/state address.';
COMMENT ON COLUMN public.leads.latitude IS 'Spatial GPS latitude coordinates.';
COMMENT ON COLUMN public.leads.longitude IS 'Spatial GPS longitude coordinates.';
COMMENT ON COLUMN public.leads.recommended_service IS 'Primary PRCBO digital transformation offering recommendation.';
COMMENT ON COLUMN public.leads.ai_score IS 'PRCBO AI qualification score between 0 and 100.';
COMMENT ON COLUMN public.leads.status IS 'Current CRM lifecycle progression status.';
COMMENT ON COLUMN public.leads.source IS 'Acquisition channel (e.g. OpenStreetMap Live, Google Maps, Manual Entry).';
COMMENT ON COLUMN public.leads.source_id IS 'Unique external source identifier (e.g. osm-node-123456) for deduplication.';
COMMENT ON COLUMN public.leads.description IS 'Lead opportunity overview, business problem statement, or OSM POI snippet.';
COMMENT ON COLUMN public.leads.metadata IS 'Flexible JSON store for AI analysis criteria, outreach drafts, and OSM attributes.';

-- 3. Duplicate Prevention & Performance Indexes
-- Prevent duplicate entries for the same source entity (e.g. same OSM POI ID or external CRM ID)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_id_unique 
    ON public.leads (source_id) 
    WHERE source_id IS NOT NULL;

-- Prevent duplicate entries for identical business name within the same location (case & whitespace insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_business_location_unique 
    ON public.leads (lower(trim(business_name)), coalesce(lower(trim(location)), ''));

-- Performance indexes for analytics, filtering, and ordering
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_category ON public.leads (category);
CREATE INDEX IF NOT EXISTS idx_leads_recommended_service ON public.leads (recommended_service);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON public.leads (ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lat_lng ON public.leads (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.set_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON public.leads;
CREATE TRIGGER trigger_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_leads_updated_at();

-- 5. Row Level Security (RLS) Configuration
-- IMPORTANT: Public unrestricted access to enterprise contact records (email, phone)
-- is strictly disallowed. Authenticated users must possess an authorized operator role.
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Helper function to verify whether the authenticated user is an approved PRCBO operator.
-- Security Controls:
-- 1. Evaluates strictly trusted 'app_metadata' claims (tamper-proof, set only by admin).
-- 2. Never trusts 'user_metadata' which can be modified by client users.
-- 3. Fails closed (returns false) if claims are missing, null, malformed, or untrusted.
-- 4. Uses fixed safe search_path and fully qualified object references.
CREATE OR REPLACE FUNCTION public.is_authorized_operator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_jwt jsonb;
    v_app_meta jsonb;
    v_is_op text;
    v_role text;
BEGIN
    -- 1. Require active authenticated session
    IF auth.role() <> 'authenticated' THEN
        RETURN false;
    END IF;

    -- 2. Extract JWT claims safely
    v_jwt := auth.jwt();
    IF v_jwt IS NULL OR jsonb_typeof(v_jwt) <> 'object' THEN
        RETURN false;
    END IF;

    -- 3. Extract app_metadata (strictly trusted; client users cannot modify this)
    v_app_meta := v_jwt -> 'app_metadata';
    IF v_app_meta IS NULL OR jsonb_typeof(v_app_meta) <> 'object' THEN
        RETURN false;
    END IF;

    -- 4. Check boolean claim 'is_operator' (case-insensitive string/boolean comparison)
    v_is_op := lower(trim(coalesce(v_app_meta ->> 'is_operator', '')));
    IF v_is_op IN ('true', 't', '1') THEN
        RETURN true;
    END IF;

    -- 5. Check role claim in app_metadata
    v_role := lower(trim(coalesce(v_app_meta ->> 'role', '')));
    IF v_role IN ('operator', 'admin', 'prcbo_operator') THEN
        RETURN true;
    END IF;

    -- Default: fail closed
    RETURN false;
EXCEPTION
    WHEN OTHERS THEN
        -- Fail closed on any JSON parsing or unexpected type coercion exceptions
        RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_authorized_operator() IS 'Verifies operator authorization strictly via trusted app_metadata claims. Fails closed.';

-- Policy 1: Authorized operators can query leads
DROP POLICY IF EXISTS "Allow authenticated users to select leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authorized operators to select leads" ON public.leads;
CREATE POLICY "Allow authorized operators to select leads"
    ON public.leads
    FOR SELECT
    TO authenticated
    USING (public.is_authorized_operator());

-- Policy 2: Authorized operators can insert new leads
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authorized operators to insert leads" ON public.leads;
CREATE POLICY "Allow authorized operators to insert leads"
    ON public.leads
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_authorized_operator());

-- Policy 3: Authorized operators can update existing leads
DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authorized operators to update leads" ON public.leads;
CREATE POLICY "Allow authorized operators to update leads"
    ON public.leads
    FOR UPDATE
    TO authenticated
    USING (public.is_authorized_operator())
    WITH CHECK (public.is_authorized_operator());

-- Policy 4: Authorized operators can delete leads
DROP POLICY IF EXISTS "Allow authenticated users to delete leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authorized operators to delete leads" ON public.leads;
CREATE POLICY "Allow authorized operators to delete leads"
    ON public.leads
    FOR DELETE
    TO authenticated
    USING (public.is_authorized_operator());

-- ==============================================================================
-- INSTRUCTIONS FOR SECURE OPERATOR PROVISIONING (ADMIN-ONLY):
--
-- Notice: Operators CANNOT self-register or grant themselves privileges.
-- The service-role key MUST NEVER be placed in the frontend code or committed to Git.
--
-- How to create and authorize the first operator securely:
--
-- 1. INVITE OR CREATE USER VIA SUPABASE DASHBOARD:
--    - Go to: Authentication -> Users -> Click "Invite user" or "Add user".
--    - Enter corporate email (e.g., admin@prcbo.in) and set a secure initial password.
--    - At this point, the user is authenticated but CANNOT read or write leads.
--
-- 2. ASSIGN TRUSTED OPERATOR CLAIM VIA SQL EDITOR (Admin-Only):
--    Run the following query in the Supabase Dashboard SQL Editor:
--
--      UPDATE auth.users
--      SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "operator", "is_operator": true}'::jsonb
--      WHERE email = 'admin@prcbo.in';
--
--    This injects the claim into `app_metadata`, which is automatically signed
--    into the user's JWT upon sign-in.
--
-- 3. DISABLE PUBLIC SELF-REGISTRATION:
--    In Supabase Dashboard -> Authentication -> Providers -> Email:
--    Toggle OFF "Enable email signups".
-- ==============================================================================
