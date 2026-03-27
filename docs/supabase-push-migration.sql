-- Migration: Push Notifications
-- Run this in the Supabase SQL Editor

-- 1. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    reminder_time TEXT NOT NULL DEFAULT '20:00',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Index for efficient hourly cron queries
CREATE INDEX IF NOT EXISTS idx_push_subs_reminder
    ON push_subscriptions (reminder_time) WHERE enabled = true;

-- 5. pg_cron job (run every hour on the hour)
-- NOTE: Replace <SUPABASE_URL> and <SERVICE_ROLE_KEY> with your actual values
-- You can find these in Supabase Dashboard → Settings → API
--
-- SELECT cron.schedule('send-reminders', '0 * * * *',
--     $$SELECT net.http_post(
--         url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
--         headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
--     );$$
-- );
