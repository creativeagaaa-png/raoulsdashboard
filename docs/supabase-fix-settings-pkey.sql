-- Migration: Fix settings_pkey Sequence & Cleanup
-- Datum: 2026-03-27
-- Im Supabase SQL Editor ausführen
-- WICHTIG: Nicht-destruktiv — bestehende Daten bleiben erhalten!

-- ══════════════════════════════════════════════════════════
-- SCHRITT 1: SERIAL-Sequenz reparieren
-- Wenn Rows manuell eingefügt wurden, kann die Sequenz
-- hinter dem maximalen id-Wert zurückliegen. Das verursacht
-- "duplicate key value violates unique constraint 'settings_pkey'"
-- ══════════════════════════════════════════════════════════

SELECT setval(
    pg_get_serial_sequence('settings', 'id'),
    COALESCE((SELECT MAX(id) FROM settings), 0) + 1,
    false
);

-- ══════════════════════════════════════════════════════════
-- SCHRITT 2: settings_user_unique Constraint sicherstellen
-- Falls die Auth-Migration nicht vollständig angewendet wurde
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
-- SCHRITT 3: Verwaiste Rows ohne user_id bereinigen
-- Diese Rows gehören keinem User und blockieren ggf. die Sequenz
-- Sicherheitshalber erst anzeigen, dann löschen
-- ══════════════════════════════════════════════════════════

-- Vorschau: Welche Rows haben kein user_id?
-- SELECT * FROM settings WHERE user_id IS NULL;

-- Wenn du sicher bist, dass diese Rows nicht mehr gebraucht werden:
-- DELETE FROM settings WHERE user_id IS NULL;

-- ══════════════════════════════════════════════════════════
-- SCHRITT 4: Gleiche Sequenz-Fixes für andere Tabellen
-- ══════════════════════════════════════════════════════════

SELECT setval(
    pg_get_serial_sequence('weight_entries', 'id'),
    COALESCE((SELECT MAX(id) FROM weight_entries), 0) + 1,
    false
);

SELECT setval(
    pg_get_serial_sequence('daily_checkins', 'id'),
    COALESCE((SELECT MAX(id) FROM daily_checkins), 0) + 1,
    false
);
