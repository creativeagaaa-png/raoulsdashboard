-- Migration: Authentifizierung & Row Level Security
-- Datum: 2026-03-27
-- Im Supabase SQL Editor ausführen
-- WICHTIG: Reihenfolge beachten!

-- ══════════════════════════════════════════════════════════
-- SCHRITT 1: user_id Spalte zu allen Tabellen hinzufügen
-- ══════════════════════════════════════════════════════════

ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE training_plan ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 2: Unique Constraints aktualisieren
-- (alte entfernen, neue mit user_id erstellen)
-- ══════════════════════════════════════════════════════════

-- weight_entries: date muss pro User eindeutig sein
ALTER TABLE weight_entries DROP CONSTRAINT IF EXISTS weight_entries_date_key;
ALTER TABLE weight_entries ADD CONSTRAINT weight_entries_user_date_unique UNIQUE (user_id, date);

-- settings: ein Eintrag pro User (id bleibt als PK)
ALTER TABLE settings ADD CONSTRAINT settings_user_unique UNIQUE (user_id);

-- daily_checkins: date muss pro User eindeutig sein
ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_date_key;
ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_user_date_unique UNIQUE (user_id, date);

-- ══════════════════════════════════════════════════════════
-- SCHRITT 3: RLS aktivieren (falls noch nicht)
-- ══════════════════════════════════════════════════════════

ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 4: Alte unsichere Policies entfernen
-- ══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Allow all for anon" ON daily_checkins;
DROP POLICY IF EXISTS "Allow all for anon" ON weight_entries;
DROP POLICY IF EXISTS "Allow all for anon" ON settings;
DROP POLICY IF EXISTS "Allow all for anon" ON training_plan;
DROP POLICY IF EXISTS "Allow all for anon" ON workout_logs;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 5: Sichere RLS Policies erstellen
-- Jeder User sieht/bearbeitet nur seine eigenen Daten
-- ══════════════════════════════════════════════════════════

-- weight_entries
CREATE POLICY "Users can view own weight entries" ON weight_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight entries" ON weight_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weight entries" ON weight_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight entries" ON weight_entries FOR DELETE USING (auth.uid() = user_id);

-- settings
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON settings FOR DELETE USING (auth.uid() = user_id);

-- training_plan
CREATE POLICY "Users can view own training plan" ON training_plan FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own training plan" ON training_plan FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own training plan" ON training_plan FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own training plan" ON training_plan FOR DELETE USING (auth.uid() = user_id);

-- workout_logs
CREATE POLICY "Users can view own workout logs" ON workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout logs" ON workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout logs" ON workout_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout logs" ON workout_logs FOR DELETE USING (auth.uid() = user_id);

-- daily_checkins
CREATE POLICY "Users can view own checkins" ON daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON daily_checkins FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins" ON daily_checkins FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- SCHRITT 6: Bestehende Daten einem User zuweisen
-- WICHTIG: Erst ausführen NACHDEM du dich registriert hast!
-- Ersetze 'DEINE_USER_ID' mit deiner echten User-ID aus
-- Supabase Dashboard → Authentication → Users
-- ══════════════════════════════════════════════════════════

-- UPDATE weight_entries SET user_id = 'DEINE_USER_ID' WHERE user_id IS NULL;
-- UPDATE settings SET user_id = 'DEINE_USER_ID' WHERE user_id IS NULL;
-- UPDATE training_plan SET user_id = 'DEINE_USER_ID' WHERE user_id IS NULL;
-- UPDATE workout_logs SET user_id = 'DEINE_USER_ID' WHERE user_id IS NULL;
-- UPDATE daily_checkins SET user_id = 'DEINE_USER_ID' WHERE user_id IS NULL;
