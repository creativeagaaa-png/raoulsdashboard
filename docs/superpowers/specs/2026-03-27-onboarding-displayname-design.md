# Onboarding, Display-Name & Auto-Settings — Design Spec

## Ziel

Drei zusammenhängende Verbesserungen für neue und bestehende User:
1. **Display-Name** — Dynamischer Benutzername statt hardcoded "Raoul"
2. **Onboarding-Modal** — Neuer User füllt Profil beim ersten Login aus
3. **Auto-Settings-Row** — Settings werden beim Onboarding erstellt, nicht manuell

## Scope

- Keine neuen Dependencies
- Kein mehrstufiger Wizard — ein einzelner Onboarding-Screen
- Kein Backend-Enforcement für Name-Immutability, nur UI-seitig

---

## 1. Display-Name

### Datenbank

Neue Spalte in der `settings`-Tabelle:

```sql
ALTER TABLE settings ADD COLUMN display_name TEXT;
```

Keine RLS-Änderung nötig — die bestehenden Policies greifen bereits auf Row-Ebene.

### Logik nach Auth-Typ

**Gmail-User (OAuth):**
- Beim Onboarding wird `user_metadata.full_name` (oder `user_metadata.name`) aus dem Supabase Auth User-Objekt ausgelesen
- Nur der Vorname (erster Teil vor dem Leerzeichen) wird als `display_name` vorausgefüllt
- Das Feld ist im Onboarding-Modal **readonly** (vorausgefüllt, ausgegraut)
- Im Profil-Modal danach ebenfalls readonly

**E-Mail-User (Passwort-Registrierung):**
- Muss den Namen im Onboarding-Modal manuell eingeben
- Nach dem Speichern ist das Feld im Profil-Modal **readonly** (ausgegraut)

### Immutability

- `display_name` kann nur einmal gesetzt werden (beim Onboarding)
- Enforcement rein UI-seitig: Input-Feld bekommt `disabled`/`readonly` wenn `displayName` bereits gesetzt ist
- Kein DB-Trigger oder Backend-Check nötig

### Anzeige

- `index.html` Header: `Hallo, Raoul` → `Hallo, <span x-text="displayName || 'dort'">`
- Avatar-URL: Dynamisch mit `displayName` statt hardcoded "Raoul+Agachi"
- Neues Alpine-Property: `displayName` (String, aus Settings geladen)

---

## 2. Onboarding-Modal

### Trigger

`loadAppData()` prüft nach dem Laden der Settings:

1. `getSettings()` gibt `null` zurück → **Komplett neuer User** → Onboarding mit allen Feldern
2. Settings existieren aber `display_name` ist `null`/leer → **Bestehender User ohne Name** → Onboarding nur mit Name-Feld (andere Felder vorausgefüllt aus DB)

Neues Alpine-Property: `onboardingOpen` (Boolean)

### UI

Ein einzelner Modal-Screen im gleichen Design wie alle anderen Modals:

- `bg-surface border border-[var(--glass-border)] rounded-3xl`
- `z-[60]`, Backdrop mit `bg-[var(--backdrop)] backdrop-blur-xl`
- Kein Schließen-Button, kein Abbrechen — User muss Profil ausfüllen

**Felder:**
- Anzeigename (Text, min. 2 Zeichen, vorausgefüllt + readonly bei Gmail-Usern)
- Geschlecht (Männlich/Weiblich Toggle-Buttons)
- Größe (Number, cm) + Alter (Number)
- Startgewicht (Number, kg) + Zielgewicht (Number, kg)
- "Los geht's" Button (weiß, wie andere primäre Buttons)

**Bestehende User (nur Name fehlt):**
- Nur das Name-Feld wird angezeigt
- Überschrift: "Willkommen zurück! Wie sollen wir dich nennen?"
- Andere Profil-Daten sind bereits in der DB und werden nicht nochmal abgefragt

**Komplett neue User:**
- Alle Felder werden angezeigt
- Überschrift: "Willkommen bei TrAction!"
- Untertitel: "Richte dein Profil ein, um loszulegen."

### Validierung

Gleiche Regeln wie im bestehenden Profil-Modal (`applyProfile()`):
- `display_name`: Mindestens 2 Zeichen
- `startWeight` > 0
- `goalWeight` > 0
- `userHeight` > 0
- Bei Fehler: Toast-Nachricht "Bitte alle Pflichtfelder korrekt ausfüllen"

### Template

Neue Datei: `templates/modals/onboarding.html`

---

## 3. Auto-Settings-Row

### Kein separater DB-Insert bei Registrierung

Die Settings-Row wird **beim Onboarding-Submit** erstellt, nicht beim Register-Event. Das ist einfacher und vermeidet Race Conditions (E-Mail-Bestätigung, OAuth-Redirects).

### Flow

1. User registriert sich (E-Mail oder Google)
2. User loggt ein / wird redirected
3. `loadAppData()` → `getSettings()` gibt `null` oder `display_name === null` zurück
4. `onboardingOpen = true` — Onboarding-Modal erscheint
5. User füllt Felder aus, klickt "Los geht's"
6. `saveSettings()` erstellt/updated die Settings-Row mit allen Feldern inkl. `display_name`
7. `onboardingOpen = false`, Dashboard lädt normal

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `js/store/supabase.js` | `saveSettings()` und `getSettings()` um `display_name` erweitern |
| `js/main.js` | `displayName` Property, Onboarding-Logik in `loadAppData()`, `completeOnboarding()` Methode |
| `js/store/settings.js` | `profileForm` um `displayName` erweitern, readonly-Logik |
| `templates/modals/onboarding.html` | Neues Template für Onboarding-Modal |
| `templates/modals/profile.html` | Display-Name Feld hinzufügen (readonly wenn gesetzt) |
| `index.html` | Hardcoded "Raoul" → dynamisch, Avatar-URL dynamisch, Onboarding-Template include |
| `docs/supabase-onboarding-migration.sql` | SQL für `display_name` Spalte |
