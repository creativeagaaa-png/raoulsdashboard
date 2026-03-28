-- ═══════════════════════════════════════════════════════════
-- Profilbild / Avatar Migration
-- Fuehre dieses SQL im Supabase SQL-Editor aus
-- ═══════════════════════════════════════════════════════════

-- 1. Neue Spalte fuer Avatar-URL in der Settings-Tabelle
ALTER TABLE settings ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Storage Bucket fuer Avatare erstellen
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies: Jeder User darf nur seinen eigenen Ordner nutzen
-- Upload: User darf in seinen eigenen Ordner hochladen
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: User darf sein eigenes Bild ueberschreiben
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: User darf sein eigenes Bild loeschen
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read: Alle duerfen Avatare lesen (public bucket)
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
