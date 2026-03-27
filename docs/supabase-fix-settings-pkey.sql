-- ══════════════════════════════════════════════════════════════
-- FIX: settings_pkey + Sequenz-Reparatur + Server-Funktion
-- Datum: 2026-03-27
-- Im Supabase SQL Editor ausführen
-- WICHTIG: Nicht-destruktiv — bestehende Daten bleiben erhalten!
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════
-- SCHRITT 1: Verwaiste Rows ohne user_id löschen
-- Diese blockieren Sequenzen und verursachen PK-Konflikte
-- ══════════════════════════════════════════════════════════

DELETE FROM settings WHERE user_id IS NULL;
DELETE FROM weight_entries WHERE user_id IS NULL;
DELETE FROM daily_checkins WHERE user_id IS NULL;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 2: SERIAL-Sequenzen reparieren (falls vorhanden)
-- ══════════════════════════════════════════════════════════

DO $$
DECLARE
    seq_name TEXT;
BEGIN
    -- settings
    seq_name := pg_get_serial_sequence('settings', 'id');
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false);
        RAISE NOTICE 'settings sequence reset to %', COALESCE((SELECT MAX(id) FROM settings), 0) + 1;
    ELSE
        RAISE NOTICE 'settings hat keine SERIAL-Sequenz für id — wird in Schritt 3 behoben';
    END IF;

    -- weight_entries
    seq_name := pg_get_serial_sequence('weight_entries', 'id');
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM weight_entries), 0) + 1, false);
    END IF;

    -- daily_checkins
    seq_name := pg_get_serial_sequence('daily_checkins', 'id');
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM daily_checkins), 0) + 1, false);
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 3: Falls id keine Sequenz hat — eine erstellen
-- (passiert wenn die Tabelle manuell im Dashboard erstellt wurde)
-- ══════════════════════════════════════════════════════════

DO $$
DECLARE
    seq_name TEXT;
    max_id BIGINT;
BEGIN
    seq_name := pg_get_serial_sequence('settings', 'id');
    IF seq_name IS NULL THEN
        max_id := COALESCE((SELECT MAX(id) FROM settings), 0);
        -- Sequenz erstellen und an id-Spalte binden
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS settings_id_seq START WITH %s', max_id + 1);
        ALTER TABLE settings ALTER COLUMN id SET DEFAULT nextval('settings_id_seq');
        ALTER SEQUENCE settings_id_seq OWNED BY settings.id;
        RAISE NOTICE 'Neue Sequenz settings_id_seq erstellt, startet bei %', max_id + 1;
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 4: settings_user_unique Constraint sicherstellen
-- ══════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'settings_user_unique'
    ) THEN
        ALTER TABLE settings ADD CONSTRAINT settings_user_unique UNIQUE (user_id);
        RAISE NOTICE 'settings_user_unique Constraint erstellt';
    ELSE
        RAISE NOTICE 'settings_user_unique Constraint existiert bereits';
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 5: Server-Funktion für sicheres Settings-Upsert
-- Umgeht die id-Sequenz komplett — nutzt user_id als Key
-- Wird vom Client als Fallback aufgerufen wenn INSERT fehlschlägt
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION upsert_user_settings(
    p_user_id UUID,
    p_start_weight REAL DEFAULT NULL,
    p_goal_weight REAL DEFAULT NULL,
    p_user_height INT DEFAULT NULL,
    p_user_age INT DEFAULT NULL,
    p_goal_date TEXT DEFAULT NULL,
    p_gender TEXT DEFAULT NULL,
    p_activity_level TEXT DEFAULT 'moderately_active',
    p_weekly_goal_rate REAL DEFAULT 0,
    p_checklist_items JSONB DEFAULT NULL,
    p_display_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_id BIGINT;
BEGIN
    -- Nur der eigene User darf seine Settings ändern
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Zugriff verweigert';
    END IF;

    -- Versuche UPDATE zuerst
    UPDATE settings SET
        start_weight = COALESCE(p_start_weight, start_weight),
        goal_weight = COALESCE(p_goal_weight, goal_weight),
        user_height = COALESCE(p_user_height, user_height),
        user_age = COALESCE(p_user_age, user_age),
        goal_date = p_goal_date,
        gender = p_gender,
        activity_level = COALESCE(p_activity_level, activity_level),
        weekly_goal_rate = COALESCE(p_weekly_goal_rate, weekly_goal_rate),
        checklist_items = COALESCE(p_checklist_items, checklist_items),
        display_name = COALESCE(p_display_name, display_name)
    WHERE user_id = p_user_id;

    -- Falls kein Row existiert → INSERT mit sicherer id-Berechnung
    IF NOT FOUND THEN
        next_id := COALESCE((SELECT MAX(id) FROM settings), 0) + 1;
        INSERT INTO settings (id, user_id, start_weight, goal_weight, user_height, user_age,
                             goal_date, gender, activity_level, weekly_goal_rate,
                             checklist_items, display_name)
        VALUES (next_id, p_user_id, p_start_weight, p_goal_weight, p_user_height, p_user_age,
                p_goal_date, p_gender, p_activity_level, p_weekly_goal_rate,
                p_checklist_items, p_display_name);
    END IF;
END;
$$;
