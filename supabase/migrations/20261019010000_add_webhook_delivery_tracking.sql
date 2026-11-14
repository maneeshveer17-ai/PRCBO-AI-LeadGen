-- ==============================================================================
-- PRCBO AI LeadGen: Supabase PostgreSQL Migration
-- Migration: 20261019010000_add_webhook_delivery_tracking.sql
-- Description: Extends 'outreach_logs' table for real Resend webhook delivery
--              tracking, adding delivered_at, bounced_at, and updating status
--              check constraints to include 'Bounced' and 'Complained'.
-- ==============================================================================

-- 1. Add delivered_at and bounced_at timestamp columns if not already present
ALTER TABLE public.outreach_logs
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;

-- Comments on new columns
COMMENT ON COLUMN public.outreach_logs.delivered_at IS 'Timestamp when the recipient mail server confirmed successful delivery via webhook.';
COMMENT ON COLUMN public.outreach_logs.bounced_at IS 'Timestamp when the email bounced as reported by the provider webhook.';

-- 2. Update status constraint to include 'Bounced' and 'Complained' statuses
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

-- 3. Ensure performance indexes exist for status and provider_message_id
CREATE INDEX IF NOT EXISTS idx_outreach_logs_status 
    ON public.outreach_logs (status);

CREATE INDEX IF NOT EXISTS idx_outreach_logs_provider_message_id 
    ON public.outreach_logs (provider_message_id) 
    WHERE provider_message_id IS NOT NULL;
