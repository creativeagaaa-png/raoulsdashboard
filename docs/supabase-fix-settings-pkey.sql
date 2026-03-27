-- ══════════════════════════════════════════════════════════════
-- FIX: settings_pkey + settings_id_check — ENDGÜLTIGER FIX
-- Datum: 2026-03-27
-- Im Supabase SQL Editor ausführen
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════
-- SCHRITT 1: Problematischen CHECK Constraint entfernen
-- Dieser blockiert INSERTs weil die id-Sequenz kaputt ist
-- ══════════════════════════════════════════════════════════

ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_id_check;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 2: Verwaiste Rows ohne user_id löschen
-- ══════════════════════════════════════════════════════════

DELETE FROM settings WHERE user_id IS NULL;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 3: id-Spalte reparieren — Sequenz synchronisieren
-- ══════════════════════════════════════════════════════════

DO $$
DECLARE
    seq_name TEXT;
    max_id BIGINT;
    col_default TEXT;
BEGIN
    -- Prüfe ob eine Sequenz existiert
    seq_name := pg_get_serial_sequence('settings', 'id');

    IF seq_name IS NOT NULL THEN
        -- Sequenz existiert — synchronisieren
        max_id := COALESCE((SELECT MAX(id) FROM settings), 0);
        PERFORM setval(seq_name, max_id + 1, false);
        RAISE NOTICE 'Sequenz % synchronisiert auf %', seq_name, max_id + 1;
    ELSE
        -- Keine Sequenz — prüfe ob identity column
        SELECT column_default INTO col_default
        FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'id';

        IF col_default IS NULL THEN
            -- Kein DEFAULT — Sequenz erstellen
            max_id := COALESCE((SELECT MAX(id) FROM settings), 0);
            EXECUTE format('CREATE SEQUENCE IF NOT EXISTS settings_id_seq START WITH %s', max_id + 1);
            ALTER TABLE settings ALTER COLUMN id SET DEFAULT nextval('settings_id_seq');
            ALTER SEQUENCE settings_id_seq OWNED BY settings.id;
            RAISE NOTICE 'Neue Sequenz erstellt, startet bei %', max_id + 1;
        ELSE
            RAISE NOTICE 'id hat DEFAULT: % — identity column', col_default;
            -- Identity-Sequenz reparieren
            max_id := COALESCE((SELECT MAX(id) FROM settings), 0);
            -- Für identity columns: Restart sequence
            BEGIN
                EXECUTE format('ALTER TABLE settings ALTER COLUMN id RESTART WITH %s', max_id + 1);
                RAISE NOTICE 'Identity-Sequenz restarted bei %', max_id + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Identity restart fehlgeschlagen: %, versuche setval', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 4: Unique Constraint sicherstellen
-- ══════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'settings_user_unique'
    ) THEN
        ALTER TABLE settings ADD CONSTRAINT settings_user_unique UNIQUE (user_id);
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 5: Server-Funktion — OHNE id-Spalte
-- Lässt die DB die id automatisch generieren
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

    -- Falls kein Row existiert → INSERT OHNE id (DB generiert automatisch)
    IF NOT FOUND THEN
        INSERT INTO settings (user_id, start_weight, goal_weight, user_height, user_age,
                             goal_date, gender, activity_level, weekly_goal_rate,
                             checklist_items, display_name)
        VALUES (p_user_id, p_start_weight, p_goal_weight, p_user_height, p_user_age,
                p_goal_date, p_gender, p_activity_level, p_weekly_goal_rate,
                p_checklist_items, p_display_name);
    END IF;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 6: Gleiche Fixes für andere Tabellen
-- ══════════════════════════════════════════════════════════

DELETE FROM weight_entries WHERE user_id IS NULL;
DELETE FROM daily_checkins WHERE user_id IS NULL;

ALTER TABLE weight_entries DROP CONSTRAINT IF EXISTS weight_entries_id_check;
ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_id_check;

DO $$
DECLARE
    seq_name TEXT;
    max_id BIGINT;
BEGIN
    seq_name := pg_get_serial_sequence('weight_entries', 'id');
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM weight_entries), 0) + 1, false);
    ELSE
        max_id := COALESCE((SELECT MAX(id) FROM weight_entries), 0);
        BEGIN
            EXECUTE format('ALTER TABLE weight_entries ALTER COLUMN id RESTART WITH %s', max_id + 1);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    seq_name := pg_get_serial_sequence('daily_checkins', 'id');
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM daily_checkins), 0) + 1, false);
    ELSE
        max_id := COALESCE((SELECT MAX(id) FROM daily_checkins), 0);
        BEGIN
            EXECUTE format('ALTER TABLE daily_checkins ALTER COLUMN id RESTART WITH %s', max_id + 1);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
END $$;
