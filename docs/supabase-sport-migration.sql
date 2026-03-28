-- ═══════════════════════════════════════════════════════════
-- Sport-Daten Migration (fuer Kalorienberechnung)
-- Fuehre dieses SQL im Supabase SQL-Editor aus
-- ═══════════════════════════════════════════════════════════

-- Neue Spalten fuer Sport-Name und Sport-Tage
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sport_name TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sport_days JSONB DEFAULT '[]'::jsonb;
