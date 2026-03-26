# AGAsDashboard — Feature-Erweiterungen & UI-Redesign

**Datum:** 2026-03-26
**Ansatz:** Inkrementelle Feature-Addition (Approach A) — neue Mixins + Supabase-Tabellen, bestehende Architektur beibehalten

---

## 1. Überblick

Drei neue Features und ein komplettes UI-Redesign für die bestehende Fitness-/Gewichts-Tracking-App:

1. **Smart Profile & Kalorienberechnung** — Mifflin-St Jeor BMR, TDEE, dynamisches Kalorienziel
2. **Strukturierter Kalorien-Plan-Tab** — Tägliches Ziel, Aufschlüsselung, Fortschritt, Wochenvergleich
3. **Tägliches Check-In / Gewohnheiten-Tracker** — Checkliste, Streaks, Wochen-/Monatsstatistiken
4. **Apple-inspiriertes UI-Redesign** — Komplettes visuelles Overhaul mit Dark Mode

**Sprache:** Gesamte App-Oberfläche auf Deutsch.

---

## 2. Architektur-Entscheidungen

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Ansatz | Inkrementell (Mixins) | Folgt bestehendem Pattern, geringes Regressionsrisiko |
| Layout | Tab-basiert, 4 Tabs | Apple Health-inspiriert, klare Trennung |
| Profil/Settings Zugang | Avatar-Dropdown im Header | Bereits funktionsfähig, nur visuell verfeinern |
| Daten-Speicherung Habits | Neue Supabase-Tabelle | Konsistent mit restlicher App |
| Akzentfarben | Adaptiv: Grün (Health/Plan), Blau (Training), Amber (Habits) | Kontextuelle visuelle Unterscheidung |
| Geschlecht | Binär (Männlich/Weiblich) | Für Mifflin-St Jeor Formel |
| Kalorien-Neuberechnung | Hybrid: bei jedem Eintrag + 7-Tage-Durchschnitt für Ziel | Echtzeit-Feedback ohne tägliche Schwankungen |
| Sicherheits-Minimum | Hard Floor + Erklärung | 1500 kcal (M) / 1200 kcal (F) mit Warnung |

---

## 3. Datenmodell

### 3.1 Erweiterte `settings`-Tabelle (bestehend, id=1)

Neue Spalten:

| Spalte | Typ | Default | Beschreibung |
|---|---|---|---|
| `gender` | TEXT | `null` | `'male'` oder `'female'` |
| `activity_level` | TEXT | `'moderately_active'` | Aktivitätsniveau |
| `weekly_goal_rate` | REAL | `0` | kg/Woche (negativ = Abnahme, positiv = Zunahme, 0 = halten) |
| `checklist_items` | JSONB | `[...]` (s.u.) | Benutzerdefinierte Checklisten-Einträge |

**Aktivitätsniveaus:**
- `sedentary` — Sitzend (wenig/keine Bewegung) → Faktor 1,2
- `lightly_active` — Leicht aktiv (1-3×/Woche) → Faktor 1,375
- `moderately_active` — Mäßig aktiv (3-5×/Woche) → Faktor 1,55
- `very_active` — Sehr aktiv (6-7×/Woche) → Faktor 1,725
- `extra_active` — Extrem aktiv (2×/Tag, körperliche Arbeit) → Faktor 1,9

**Standard-Checklisten-Einträge:**
```json
[
  { "key": "training", "label": "Training absolviert" },
  { "key": "steps", "label": "Schritte-Ziel erreicht" },
  { "key": "calories", "label": "Kalorien im Ziel" },
  { "key": "water", "label": "Genug getrunken" },
  { "key": "sleep", "label": "7+ Stunden Schlaf" }
]
```

### 3.2 Neue Tabelle: `daily_checkins`

| Spalte | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `date` | TEXT | NOT NULL, UNIQUE | Datum im Format YYYY-MM-DD |
| `items` | JSONB | NOT NULL | Array von `{ key, label, checked }` |

**Beispiel-Eintrag:**
```json
{
  "date": "2026-03-26",
  "items": [
    { "key": "training", "label": "Training absolviert", "checked": true },
    { "key": "steps", "label": "Schritte-Ziel erreicht", "checked": true },
    { "key": "calories", "label": "Kalorien im Ziel", "checked": false },
    { "key": "water", "label": "Genug getrunken", "checked": true },
    { "key": "sleep", "label": "7+ Stunden Schlaf", "checked": false }
  ]
}
```

### 3.3 Bestehende Tabellen (unverändert)

- `weight_entries` — Gewichtseinträge (date, weight)
- `training_plan` — 7-Tage-Trainingsplan
- `workout_logs` — Trainingsprotokoll

---

## 4. Feature 1: Kalorienberechnung

### 4.1 Berechnungs-Pipeline

```
1. BMR (Mifflin-St Jeor):
   Männlich:  10 × Gewicht(kg) + 6,25 × Größe(cm) - 5 × Alter - 5
   Weiblich:  10 × Gewicht(kg) + 6,25 × Größe(cm) - 5 × Alter - 161

2. TDEE = BMR × Aktivitätsfaktor

3. Gewicht für Berechnung:
   - 7-Tage-Durchschnitt aus weight_entries
   - Fallback: letzter Eintrag wenn < 7 Einträge vorhanden
   - Fallback: startWeight wenn keine Einträge vorhanden

4. Tägliche Anpassung:
   - weekly_goal_rate × 1100 kcal/Tag
   - Beispiel: -0,5 kg/Woche → -550 kcal/Tag
   - (1 kg Körperfett ≈ 7.700 kcal, ÷ 7 Tage ≈ 1.100 kcal/Tag)

5. Sicherheits-Floor:
   - Männlich: Minimum 1.500 kcal
   - Weiblich: Minimum 1.200 kcal
   - Bei Clamping: Warnung anzeigen
   - Vorschlag: Zieldatum verlängern statt aggressiver Defizit

6. Ergebnis = TDEE + Anpassung (geclampt)
```

### 4.2 Dynamische Neuberechnung

- **Bei jedem neuen Gewichtseintrag:** BMR wird mit 7-Tage-Durchschnitt neu berechnet
- **Anzeige-Update:** Kalorienziel im Plan-Tab aktualisiert sich sofort
- **Wochenvergleich:** Geplante vs. tatsächliche Abnahme basierend auf realem Gewichtsverlauf

### 4.3 Fortschritts-Projektion

- Voraussichtliches Zieldatum basierend auf aktuellem weekly_goal_rate
- Wenn `goalWeight` und `goalDate` gesetzt: Rate wird daraus berechnet
- Wenn nur `goalWeight` und `weekly_goal_rate`: Datum wird projiziert
- Vergleich geplanter vs. tatsächlicher Verlauf (aus bestehender Oracle-Logik in analytics.js)

### 4.4 Neue Datei: `js/features/calories.js`

Exportiert `caloriesMixin()` mit:

**State:**
```javascript
{
  calorieData: {
    bmr: 0,
    tdee: 0,
    adjustment: 0,
    target: 0,
    isClamped: false,
    mode: 'deficit' | 'surplus' | 'maintenance'
  }
}
```

**Methoden:**
- `calculateBMR(weight, height, age, gender)` — Mifflin-St Jeor
- `calculateTDEE(bmr, activityLevel)` — BMR × Faktor
- `calculateCalorieTarget()` — Vollständige Pipeline, aktualisiert `calorieData`
- `getWeeklyComparison()` — Geplant vs. tatsächlich kg/Woche
- `getProjectedGoalDate()` — Voraussichtliches Zieldatum
- `recalculateCalories()` — Aufgerufen nach Gewichtseintrag oder Profil-Änderung

---

## 5. Feature 2: Plan-Tab

### 5.1 UI-Struktur (scrollbar)

1. **Kalorien-Hero-Karte**
   - Großes Kalorienziel (z.B. "2.150 kcal")
   - Badge: "Defizit · -550 kcal/Tag" oder "Überschuss · +300 kcal/Tag" oder "Erhaltung"
   - Farbe: Grün (Defizit), Orange (Überschuss), Blau (Erhaltung)

2. **Berechnungs-Karte**
   - Aufschlüsselung in Zeilen:
     - Grundumsatz (BMR): X kcal
     - Aktivitätsfaktor: × Y
     - Gesamtumsatz (TDEE): Z kcal
     - Defizit/Überschuss: ±W kcal (rot für Defizit, grün für Überschuss)
   - Wenn geclampt: Warnungs-Banner am unteren Rand

3. **Fortschritts-Karte**
   - Aktuelle → Ziel-Gewichtsanzeige mit Prozent
   - Fortschrittsbalken (animiert)
   - Voraussichtliches Zieldatum

4. **Wochenvergleich-Karte**
   - Zwei Kacheln nebeneinander: "Geplant" vs. "Tatsächlich" (kg/Woche)
   - Grün wenn auf Kurs oder besser, Rot wenn hinter Plan

### 5.2 Leere Zustände

- **Kein Profil ausgefüllt:** "Profil vervollständigen" Button → öffnet Profil-Modal
- **Keine Gewichtseinträge:** "Erstes Gewicht eintragen" Button → öffnet Gewichts-Modal
- **Kein Zielgewicht:** "Zielgewicht setzen" Button → öffnet Profil-Modal

---

## 6. Feature 3: Gewohnheiten-Tab

### 6.1 UI-Struktur (scrollbar)

1. **Streak-Hero-Karte**
   - Große Zahl der aktuellen Serie (Tage in Folge mit ≥1 Check)
   - "Tage in Folge" Label
   - Punkt-Indikatoren (letzte 7 Tage)

2. **Tägliche Checkliste**
   - Header: "Heute · X von Y"
   - Liste aller Checklist-Items
   - Checkbox: Rounded Square (8px radius), Amber wenn gecheckt
   - Abgehakte Items: durchgestrichen, reduzierte Opacity
   - Tippen toggled den Check-Status → sofort in Supabase speichern (Upsert)

3. **Wochenübersicht**
   - 7 Tages-Kacheln (Mo-So)
   - Ausgefüllte Amber-Kachel: alle/meiste erledigt (zeigt X/Y)
   - Halbtransparente Kachel: teilweise erledigt
   - Leere Kachel mit Border: noch nicht eingetragen

4. **Monatsübersicht**
   - 3 Statistik-Kacheln: Abschlussrate (%), Beste Serie, Aktive Tage

5. **Checkliste bearbeiten**
   - Button am Ende der Checkliste: "Einträge bearbeiten"
   - Öffnet Inline-Editor oder kleines Modal
   - Items hinzufügen (Name eingeben), entfernen (Swipe oder X-Button)
   - Reihenfolge ändern (Drag oder Pfeile)
   - Änderungen werden in `settings.checklist_items` gespeichert

### 6.2 Streak-Berechnung

- Ein Tag zählt als "aktiv" wenn mindestens 1 Item gecheckt ist
- Streak = aufeinanderfolgende aktive Tage bis heute (Lücke bricht Serie)
- Beste Serie = längste Serie aller Zeiten (berechnet aus daily_checkins History)

### 6.3 Neue Datei: `js/features/checkin.js`

Exportiert `checkinMixin()` mit:

**State:**
```javascript
{
  todayCheckin: [],          // Heutige Items mit checked-Status
  checkinHistory: [],        // Letzte 30 Tage
  checkinStreak: 0,          // Aktuelle Serie
  checkinBestStreak: 0,      // Beste Serie
  checkinMonthlyRate: 0,     // Abschlussrate diesen Monat (0-100)
  checkinActiveDays: 0,      // Aktive Tage diesen Monat
  checkinWeekData: [],       // 7 Tage [{date, total, checked}]
  checkinEditMode: false     // Bearbeitungsmodus
}
```

**Methoden:**
- `loadCheckins()` — Lade heutige + History aus Supabase
- `toggleCheckinItem(key)` — Toggle + sofort Upsert
- `addCheckinItem(label)` — Neues Item zu settings + heutigem Checkin
- `removeCheckinItem(key)` — Item entfernen
- `reorderCheckinItems(fromIdx, toIdx)` — Reihenfolge ändern
- `calculateCheckinStreak()` — Serie berechnen
- `calculateCheckinStats()` — Monatsstatistiken

### 6.4 Neue Supabase-Funktionen in `supabase.js`

```javascript
getCheckins(fromDate, toDate)     // Range-Query
upsertCheckin(date, items)        // Upsert by date
deleteCheckin(date)               // Löschen
clearAllCheckins()                // Alle löschen (Settings/Danger Zone)
```

---

## 7. Feature 4: UI-Redesign

### 7.1 Design-Tokens

**Farben (Light):**
```css
--bg: #f5f5f7
--surface: #ffffff
--surface-secondary: #f5f5f7
--text-primary: #1d1d1f
--text-secondary: #86868b
--border: rgba(0, 0, 0, 0.06)
--accent-health: #34c759 (Grün)
--accent-training: #007aff (Blau)
--accent-habits: #f59e0b (Amber)
--danger: #ef4444
--shadow: 0 1px 3px rgba(0, 0, 0, 0.06)
```

**Farben (Dark):**
```css
--bg: #050505
--surface: #1c1c1e
--surface-secondary: rgba(255, 255, 255, 0.04)
--text-primary: #f5f5f7
--text-secondary: #86868b
--border: rgba(255, 255, 255, 0.06)
--accent-health: #34c759
--accent-training: #0a84ff
--accent-habits: #f59e0b
--danger: #ff6b6b
--shadow: none (borders stattdessen)
```

**Typografie:**
```css
--font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif
--font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif
--font-mono: 'SF Mono', 'JetBrains Mono', monospace

--text-xs: 11px
--text-sm: 13px
--text-base: 15px
--text-lg: 18px
--text-xl: 22px
--text-2xl: 28px
--text-hero: 48px
```

**Spacing & Radii:**
```css
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-xl: 20px
--radius-full: 9999px

--space-xs: 4px
--space-sm: 8px
--space-md: 12px
--space-lg: 16px
--space-xl: 20px
--space-2xl: 24px
```

### 7.2 Komponenten-Stil

**Karten:**
- Light: `background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);`
- Dark: `background: #1c1c1e; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06);`
- Padding: 16-24px je nach Inhalt

**Bottom Tab Bar:**
- Fixiert am unteren Rand
- Frosted Glass: `backdrop-filter: blur(20px); background: rgba(255,255,255,0.85)` (Light)
- Dark: `background: rgba(28,28,30,0.85)`
- 4 Tabs: Gesundheit, Training, Plan, Gewohnheiten
- Aktiv: gefülltes Icon + Akzentfarbe, Inaktiv: Outline + muted
- Safe area padding für Geräte mit Home Indicator

**Modals:**
- Bottom Sheet auf Mobile (abgerundete obere Ecken, 16px radius)
- Zentriert auf Desktop
- Backdrop: `rgba(0,0,0,0.4)` mit Blur
- Slide-up Animation (300ms ease-out)

**Buttons:**
- Primary: Akzentfarbe, 12px radius, 600 weight
- Secondary: Surface-Farbe mit Border
- Tap-Effekt: `transform: scale(0.97)` (100ms)

**Listen:**
- Separator: 1px solid var(--border), mit linkem Einzug
- Item-Höhe: mindestens 44px (Apple HIG Touch Target)

### 7.3 Animationen

| Animation | Dauer | Easing | Anwendung |
|---|---|---|---|
| Tab-Wechsel | 200ms | ease-in-out | Cross-fade Content |
| Modal öffnen | 300ms | ease-out | Slide-up + Backdrop fade |
| Modal schließen | 200ms | ease-in | Slide-down + Backdrop fade |
| Karten-Tap | 100ms | ease | scale(0.97) |
| Zahlen-Counter | 600ms | ease-out | animateTo() für Statistiken |
| Fortschrittsbalken | 800ms | ease-out | Width-Transition beim Laden |
| Checkbox-Toggle | 200ms | spring | Scale bounce bei Check |
| Toast | 300ms | ease-out | Slide-up von unten |
| Skeleton Loading | 1.5s | ease-in-out | Shimmer-Gradient Animation |
| Swipe-Delete | 300ms | ease-out | Slide + Fade |

### 7.4 Tab-Struktur

| Tab | Name (DE) | Icon | Akzentfarbe | Inhalt |
|---|---|---|---|---|
| health | Gesundheit | Herz/Waage | Grün | Gewicht, BMI, Chart, Quick Log, Letzte Einträge |
| training | Training | Hantel | Blau | Tagesplan, Workout-Session, History |
| plan | Plan | Flamme/Zielscheibe | Grün | Kalorienziel, Berechnung, Fortschritt, Wochenvergleich |
| habits | Gewohnheiten | Checkliste | Amber | Tägliche Checks, Streaks, Wochen-/Monatsübersicht |

### 7.5 Header-Redesign

- Links: "Hallo, Raoul" (Greeting) — beibehalten
- Rechts: Avatar-Button → öffnet Dropdown mit:
  - Persönliche Daten (Profil-Modal)
  - Trainingsplan (Training-Modal)
  - Einstellungen (Settings-Modal)
- Frosted Glass Header bei Scroll (optional, wenn technisch einfach)

### 7.6 Responsive Verhalten

- **Mobile (< 768px):** Einspaltiges Layout, Bottom Tab Bar, Full-Width Karten
- **Tablet/Desktop (≥ 768px):** Zweispaltiges Grid (wie aktuell bei Health), Bottom Tab Bar bleibt (Konsistenz), max-width Container (800px)

---

## 8. Profil-Modal Erweiterung

### 8.1 Neue Felder im Profil-Formular

Bestehende Felder:
- Startgewicht (kg)
- Zielgewicht (kg)
- Zieldatum
- Größe (cm)
- Alter

Neue Felder:
- **Geschlecht:** Segmented Control (Männlich / Weiblich)
- **Aktivitätsniveau:** Dropdown/Select mit 5 Optionen (deutsche Labels)
- **Wöchentliches Ziel:** Slider oder Stepper (-1.0 bis +1.0 kg/Woche, Schritte 0.1)

### 8.2 Deutsche Labels für Aktivitätsniveau

| Wert | Label | Beschreibung |
|---|---|---|
| `sedentary` | Sitzend | Wenig oder keine Bewegung |
| `lightly_active` | Leicht aktiv | Sport 1-3×/Woche |
| `moderately_active` | Mäßig aktiv | Sport 3-5×/Woche |
| `very_active` | Sehr aktiv | Sport 6-7×/Woche |
| `extra_active` | Extrem aktiv | Sehr intensiv, körperliche Arbeit |

---

## 9. Supabase-Änderungen

### 9.1 Settings-Tabelle erweitern

Neue Spalten zur bestehenden `settings`-Tabelle hinzufügen. Die `saveSettings()` und `getSettings()` Funktionen in `supabase.js` müssen die neuen Felder mappen:

- `gender` ↔ `profileForm.gender`
- `activity_level` ↔ `profileForm.activityLevel`
- `weekly_goal_rate` ↔ `profileForm.weeklyGoalRate`
- `checklist_items` ↔ `profileForm.checklistItems` (JSONB — Supabase handles serialization natively)

### 9.2 Neue Tabelle `daily_checkins`

```sql
CREATE TABLE daily_checkins (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'
);
```

### 9.3 Neue Funktionen in `supabase.js`

```javascript
// Checkins
getCheckins(fromDate, toDate)
upsertCheckin(date, items)
deleteCheckin(date)
clearAllCheckins()
```

---

## 10. Neue Dateien

| Datei | Zweck |
|---|---|
| `js/features/calories.js` | caloriesMixin() — BMR, TDEE, Kalorienziel |
| `js/features/calories.test.js` | Tests für Kalorienberechnung |
| `js/features/checkin.js` | checkinMixin() — Check-In CRUD, Streaks |
| `js/features/checkin.test.js` | Tests für Check-In Logik |
| `templates/modals/checkin-edit.html` | Modal zum Bearbeiten der Checkliste |
| `templates/modals/calorie-warning.html` | Warnung bei zu niedrigem Kalorienziel (optional, kann auch inline sein) |

### Modifizierte Dateien

| Datei | Änderungen |
|---|---|
| `js/main.js` | Neue Mixins importieren & spreaden, 4-Tab activeTab, neue Getters |
| `js/store/supabase.js` | Neue Checkin-Funktionen, erweiterte Settings-Mappings |
| `js/store/settings.js` | Neue Profil-Felder (gender, activity_level, weekly_goal_rate, checklist_items) |
| `js/utils/constants.js` | Aktivitätsfaktoren, Standard-Checkliste, Kalorien-Konstanten |
| `index.html` | 4-Tab Navigation, Plan-Tab Content, Habits-Tab Content, Bottom Tab Bar |
| `templates/modals/profile.html` | Neue Felder: Geschlecht, Aktivitätsniveau, Wöchentliches Ziel |
| `css/styles.css` | Komplett neue Design-Tokens, Apple-inspirierte Komponenten |

---

## 11. Bestehende Features (unverändert)

Alle folgenden Features müssen nach dem Redesign identisch funktionieren:

- Gewichtseingabe (Modal + Quick Log)
- BMI-Berechnung & Detail-Modal
- Gewichtsverlauf-Chart (Chart.js) mit Filtern (1M, 3M, ALLE)
- Smart Prediction (Oracle)
- 7-Tage-Trainingsplan Editor (4 Übungstypen)
- Workout-Session mit Set-Tracking
- Rest-Timer zwischen Sätzen
- Workout-History
- Pull-to-Refresh
- Offline-Erkennung
- Crash-Recovery (localStorage)
- PWA (Service Worker, Manifest)
- Dark/Light Theme Toggle
- Haptic Feedback
- Swipe-to-Delete
- Toast-Benachrichtigungen mit Undo
- Streak-Berechnung (Gewichtseinträge)
- Profil Dirty-Tracking

---

## 12. Edge Cases & Sicherheit

### 12.1 Leere Zustände

| Situation | Verhalten |
|---|---|
| Kein Profil (gender/activity fehlt) | Plan-Tab zeigt "Profil vervollständigen" Button |
| Keine Gewichtseinträge | Plan-Tab zeigt "Erstes Gewicht eintragen" Button |
| Kein Zielgewicht gesetzt | Plan-Tab zeigt "Zielgewicht setzen" Button |
| Keine Checkins vorhanden | Habits-Tab zeigt leere Checkliste, Streak = 0 |
| Gewicht = Zielgewicht | Modus = "Erhaltung", keine Anpassung |

### 12.2 Kalorien-Sicherheit

- **Minimum:** 1.500 kcal (männlich), 1.200 kcal (weiblich)
- **Maximum weekly_goal_rate:** -1,0 kg/Woche (Abnahme), +1,0 kg/Woche (Zunahme)
- **Bei Clamping:** Gelber Warnungs-Banner mit Text: "Dein berechnetes Ziel wäre zu niedrig. Wir empfehlen, das Zieldatum zu verlängern."
- **Kein Kalorienziel unter 0** (mathematisch nicht möglich bei Clamping, aber defensiv prüfen)

### 12.3 Daten-Konsistenz

- Checkin-Items synchron halten: wenn User Item aus Settings entfernt, altes Item in History bleibt lesbar
- Kalorienziel neu berechnen bei: Gewichtseintrag, Profil-Änderung (Alter, Größe, Geschlecht, Aktivität, Ziel)
- Graceful Degradation: wenn Supabase offline, Checkins in localStorage cachen (wie Workout Crash-Recovery)

---

## 13. Testplan

### 13.1 Unit Tests (Vitest)

**calories.test.js:**
- BMR-Berechnung: bekannte Werte für M/F, verschiedene Gewichte/Größen/Alter
- TDEE-Berechnung: BMR × jeden Aktivitätsfaktor
- Kalorienziel: Defizit, Überschuss, Erhaltung
- Clamping: Minimum-Floor bei aggressivem Defizit
- 7-Tage-Durchschnitt: mit < 7 Einträgen, genau 7, > 7
- Neuberechnung nach Gewichtseintrag

**checkin.test.js:**
- Toggle-Logik: check/uncheck
- Streak-Berechnung: consecutive Tage, Lücken, leere History
- Monatsstatistiken: Rate, aktive Tage, beste Serie
- Item hinzufügen/entfernen
- Wochenübersicht-Daten

### 13.2 Integrations-Verifikation (Playwright via Preview)

- Tab-Navigation funktioniert (alle 4 Tabs erreichbar)
- Profil-Modal hat neue Felder
- Plan-Tab zeigt Kalorienziel nach Profil-Setup
- Habits-Tab: Checkbox togglen → visuelles Feedback
- Dark Mode: alle neuen Karten korrekt gestylt
- Bestehende Features: Gewicht eintragen, Chart, Training, Workout

---

## 14. Implementierungs-Reihenfolge

1. **Batch 1: Datenmodell + Kalorienlogik** — constants, calories.js + Tests
2. **Batch 2: Profil-Erweiterung** — settings.js, supabase.js, profile.html
3. **Batch 3: Plan-Tab** — Plan-View in index.html, Anbindung an caloriesMixin
4. **Batch 4: Check-In System** — checkin.js + Tests, supabase.js, Habits-View
5. **Batch 5: UI-Redesign** — Design-Tokens, CSS Overhaul, Bottom Tab Bar, Animationen
6. **Batch 6: Verifikation** — Alle Tests, Playwright visuell, Dark Mode, Responsiveness
