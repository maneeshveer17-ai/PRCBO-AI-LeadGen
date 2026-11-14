-- ==============================================================================
-- PRCBO AI LeadGen: Supabase PostgreSQL Migration
-- Migration: 20261019000000_add_email_delivery_to_outreach_logs.sql
-- Description: Extends 'outreach_logs' table with email delivery provider fields,
--              idempotency tracking, and expanded status constraints.
-- ==============================================================================

-- 1. Add delivery provider and idempotency tracking columns if not already present
ALTER TABLE public.outreach_logs
    ADD COLUMN IF NOT EXISTS recipient_email TEXT,
    ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_name TEXT DEFAULT 'resend',
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Comments on new columns
COMMENT ON COLUMN public.outreach_logs.recipient_email IS 'Target recipient email address for outbound email dispatch.';
COMMENT ON COLUMN public.outreach_logs.provider_message_id IS 'Unique message identifier returned by the email provider (e.g. Resend ID).';
COMMENT ON COLUMN public.outreach_logs.provider_name IS 'Name of the dispatch service provider (e.g. resend).';
COMMENT ON COLUMN public.outreach_logs.idempotency_key IS 'Unique idempotency key to prevent accidental duplicate dispatches.';
COMMENT ON COLUMN public.outreach_logs.sent_at IS 'Timestamp when the provider accepted the email for dispatch.';
COMMENT ON COLUMN public.outreach_logs.error_message IS 'Diagnostic error message if provider dispatch encountered an issue.';

-- 2. Update status constraint to include 'Sent' and 'Dispatched' statuses
-- Note: 'Sent' indicates provider acceptance; 'Delivered' requires webhook confirmation.
ALTER TABLE public.outreach_logs
    DROP CONSTRAINT IF EXISTS chk_outreach_status_valid;

ALTER TABLE public.outreach_logs
    ADD CONSTRAINT chk_outreach_status_valid CHECK (
        status IN (
            'Logged',
            'Drafted',
            'Pending',
            'Sent',
            'Dispatched',
            'Delivered',
            'Bounced',
            'Complained',
            'Opened',
            'Replied',
            'Completed',
            'Failed'
        )
    );

-- 3. Idempotency unique index to prevent duplicate dispatches
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_logs_idempotency_key 
    ON public.outreach_logs (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- 4. Index for querying logs by provider message ID (e.g. for incoming delivery webhooks)
CREATE INDEX IF NOT EXISTS idx_outreach_logs_provider_message_id 
    ON public.outreach_logs (provider_message_id) 
    WHERE provider_message_id IS NOT NULL;
