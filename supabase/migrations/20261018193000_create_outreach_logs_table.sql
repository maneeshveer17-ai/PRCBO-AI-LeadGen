-- ==============================================================================
-- PRCBO AI LeadGen: Supabase PostgreSQL Migration
-- Migration: 20261018193000_create_outreach_logs_table.sql
-- Description: Creates the persistent 'outreach_logs' table for recording
--              outreach activities, linked to leads and operators, with
--              strictly idempotent, rerunnable Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. Ensure pgcrypto extension is active for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create outreach_logs table
CREATE TABLE IF NOT EXISTS public.outreach_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    template TEXT,
    message_content TEXT,
    status TEXT NOT NULL DEFAULT 'Logged',
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    operator_name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Constraints
    CONSTRAINT chk_outreach_channel_valid CHECK (
        channel IN ('Email', 'WhatsApp', 'Initial Message', 'LinkedIn', 'Phone', 'SMS')
    ),
    CONSTRAINT chk_outreach_status_valid CHECK (
        status IN ('Logged', 'Drafted', 'Pending', 'Delivered', 'Opened', 'Replied', 'Completed', 'Failed')
    )
);

-- Ensure all base columns exist if the table was created in an earlier partial state
ALTER TABLE public.outreach_logs
    ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS channel TEXT,
    ADD COLUMN IF NOT EXISTS template TEXT,
    ADD COLUMN IF NOT EXISTS message_content TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Logged',
    ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    ADD COLUMN IF NOT EXISTS operator_name TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Comments on table and columns for documentation
COMMENT ON TABLE public.outreach_logs IS 'PRCBO AI LeadGen omnichannel outreach dispatch and draft activity log.';
COMMENT ON COLUMN public.outreach_logs.id IS 'Unique identifier for the outreach record.';
COMMENT ON COLUMN public.outreach_logs.lead_id IS 'Foreign key reference to target lead in public.leads.';
COMMENT ON COLUMN public.outreach_logs.channel IS 'Communication channel (e.g. Email, WhatsApp, Initial Message).';
COMMENT ON COLUMN public.outreach_logs.template IS 'Template or pitch categorization applied for outreach.';
COMMENT ON COLUMN public.outreach_logs.message_content IS 'Snapshot of the drafted or logged outreach message.';
COMMENT ON COLUMN public.outreach_logs.status IS 'Status of outreach entry (defaults to Logged; indicates draft recorded, not delivery).';
COMMENT ON COLUMN public.outreach_logs.operator_id IS 'Auth user UUID of the operator who initiated the action.';
COMMENT ON COLUMN public.outreach_logs.operator_name IS 'Display name of the assigned operator.';
COMMENT ON COLUMN public.outreach_logs.metadata IS 'Flexible JSON store for openStatus, replyStatus, and channel metadata.';

-- 3. Performance Indexes on Base Columns
CREATE INDEX IF NOT EXISTS idx_outreach_logs_lead_id ON public.outreach_logs (lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_created_at ON public.outreach_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_channel ON public.outreach_logs (channel);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_status ON public.outreach_logs (status);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_operator_id ON public.outreach_logs (operator_id) WHERE operator_id IS NOT NULL;

-- 4. Row Level Security (RLS) Configuration
-- IMPORTANT: Inherits the same trusted is_authorized_operator() security definer policy
-- to prevent unauthorized access or modification to confidential outreach logs.
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authorized operators can query outreach logs (idempotent drop/create)
DROP POLICY IF EXISTS "Allow authenticated users to select outreach_logs" ON public.outreach_logs;
DROP POLICY IF EXISTS "Allow authorized operators to select outreach_logs" ON public.outreach_logs;
CREATE POLICY "Allow authorized operators to select outreach_logs"
    ON public.outreach_logs
    FOR SELECT
    TO authenticated
    USING (public.is_authorized_operator());

-- Policy 2: Authorized operators can insert outreach logs (idempotent drop/create)
DROP POLICY IF EXISTS "Allow authenticated users to insert outreach_logs" ON public.outreach_logs;
DROP POLICY IF EXISTS "Allow authorized operators to insert outreach_logs" ON public.outreach_logs;
CREATE POLICY "Allow authorized operators to insert outreach_logs"
    ON public.outreach_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_authorized_operator());

-- Policy 3: Authorized operators can update outreach logs (idempotent drop/create)
DROP POLICY IF EXISTS "Allow authenticated users to update outreach_logs" ON public.outreach_logs;
DROP POLICY IF EXISTS "Allow authorized operators to update outreach_logs" ON public.outreach_logs;
CREATE POLICY "Allow authorized operators to update outreach_logs"
    ON public.outreach_logs
    FOR UPDATE
    TO authenticated
    USING (public.is_authorized_operator())
    WITH CHECK (public.is_authorized_operator());

-- Policy 4: Authorized operators can delete outreach logs (idempotent drop/create)
DROP POLICY IF EXISTS "Allow authenticated users to delete outreach_logs" ON public.outreach_logs;
DROP POLICY IF EXISTS "Allow authorized operators to delete outreach_logs" ON public.outreach_logs;
CREATE POLICY "Allow authorized operators to delete outreach_logs"
    ON public.outreach_logs
    FOR DELETE
    TO authenticated
    USING (public.is_authorized_operator());
