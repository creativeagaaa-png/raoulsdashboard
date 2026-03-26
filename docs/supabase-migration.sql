-- Migration: Neue Features (Kalorien, Gewohnheiten)
-- Datum: 2026-03-26
-- Im Supabase SQL Editor ausführen

-- Neue Spalten zur settings Tabelle
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderately_active';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS weekly_goal_rate REAL DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[{"key":"training","label":"Training absolviert"},{"key":"steps","label":"Schritte-Ziel erreicht"},{"key":"calories","label":"Kalorien im Ziel"},{"key":"water","label":"Genug getrunken"},{"key":"sleep","label":"7+ Stunden Schlaf"}]';

-- Neue Tabelle für tägliche Check-Ins
CREATE TABLE IF NOT EXISTS daily_checkins (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]'
);

-- RLS (Row Level Security) für daily_checkins
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Policy (anpassen je nach bestehender RLS-Konfiguration)
-- Wenn die App ohne Auth arbeitet (anon key):
CREATE POLICY "Allow all for anon" ON daily_checkins FOR ALL USING (true) WITH CHECK (true);
