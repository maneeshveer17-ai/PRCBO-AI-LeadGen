-- ==============================================================================
-- PRCBO AI LeadGen: Supabase PostgreSQL Migration
-- Migration: 20261019020000_add_whatsapp_delivery_tracking.sql
-- Description: Extends 'outreach_logs' table for Meta WhatsApp Cloud API
--              messaging, adding recipient_phone, read_at, and updating status
--              check constraints to include 'Read' (WhatsApp blue tick status).
-- ==============================================================================

-- 1. Add WhatsApp recipient phone and read_at timestamp columns if not already present
ALTER TABLE public.outreach_logs
    ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Comments on new columns
COMMENT ON COLUMN public.outreach_logs.recipient_phone IS 'Recipient mobile phone number (E.164 normalized) for WhatsApp outreach.';
COMMENT ON COLUMN public.outreach_logs.read_at IS 'Timestamp when the recipient opened/read the WhatsApp message (blue tick verification).';

-- 2. Update status constraint to include 'Read' status alongside existing delivery statuses
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
            'Read',
            'Bounced',
            'Complained',
            'Opened',
            'Replied',
            'Completed',
            'Failed'
        )
    );

-- 3. Ensure index exists for recipient_phone query lookups
CREATE INDEX IF NOT EXISTS idx_outreach_logs_recipient_phone 
    ON public.outreach_logs (recipient_phone) 
    WHERE recipient_phone IS NOT NULL;
