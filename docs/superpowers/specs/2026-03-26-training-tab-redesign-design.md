# Training-Tab Redesign — Design Spec

**Datum:** 2026-03-26
**Status:** Genehmigt
**Ziel:** Training-Tab visuell an den Apple-inspirierten Stil der restlichen App (Plan-Tab, Gewohnheiten-Tab) angleichen.

---

## Motivation

Der aktuelle Training-Tab nutzt eine einzelne `bento-card` mit Expand/Collapse-Logik, die sich stilistisch von den anderen Tabs unterscheidet. Die neuen Tabs (Plan, Gewohnheiten) verwenden separate, kompakte Karten mit abgerundeten Ecken, subtilen Borders und klarer visueller Hierarchie. Der Training-Tab soll diesen Stil übernehmen.

## Genehmigtes Layout (v2 Kombination)

Von oben nach unten:

### 1. Hero-Card
- Zentriert, eigene Karte (`border-radius: 16px`, `bg: #1c1c1e`, `border: 1px solid rgba(255,255,255,0.06)`)
- Label: "HEUTIGES TRAINING" (uppercase, `color: #0a84ff`, `letter-spacing: 1.5px`, `font-size: 11px`)
- Großer Wochentag-Name (z.B. "Donnerstag") — `font-size: 42px`, `font-weight: 800`
- Badge: "⚡ X Übungen" oder "Ruhetag" — Pill-Style, `bg: rgba(10,132,255,0.12)`, `color: #0a84ff`
- Dynamisch: Zeigt den aktuell gewählten Tag (gesteuert durch `selectedDayIndex`)

### 2. Wochentag-Leiste (Kalender-Strip)
- Eigene Karte, gleicher Card-Style
- 7 Spalten (Mo–So), je:
  - Kurzname oben (`font-size: 10px`, `color: #86868b`)
  - Datumsnummer (`font-size: 16px`, `font-weight: 700`)
  - Blauer Punkt wenn Trainingstag (Übungen > 0 an dem Wochentag)
- Aktiver Tag: `bg: rgba(10,132,255,0.15)`, `border: 1px solid rgba(10,132,255,0.3)`, Kurzname in blau
- Klickbar: Setzt `trainingDayOffset` auf den gewählten Tag
- Datumsnummern: Echte Kalenderdaten der aktuellen Woche berechnen

### 3. Gruppierte Übungsliste
- Eigene Karte, `border-radius: 16px`, `overflow: hidden`
- Alle Übungen des gewählten Tages als Listeneinträge in einer Karte
- Je Eintrag: Icon-Box links (36×36, orange), Name + Typ-Label rechts, Chevron `›`
- Trennlinie zwischen Einträgen (`border-bottom: 1px solid rgba(255,255,255,0.04)`)
- Letzte Übung ohne Trennlinie
- Bei 0 Übungen: Ruhetag-Anzeige (wie bisher, zentriert mit Moon-Icon)

### 4. Wochenübersicht (Statistiken)
- Eigene Karte mit Titel "Wochenübersicht"
- 3 Stat-Boxen nebeneinander (flex):
  - **Trainingstage**: Anzahl der Wochentage mit ≥1 Übung
  - **Übungen**: Gesamtanzahl aller Übungen der Woche
  - **Ruhetage**: 7 minus Trainingstage
- Style: `bg: rgba(255,255,255,0.04)`, `border-radius: 10px`, zentriert

### 5. Bearbeiten-Button
- Zentriert unter den Karten
- "✏️ Trainingsplan bearbeiten"
- Style: `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 12px`, `color: #86868b`
- Öffnet `openTraining()` wie bisher

## Datenanbindung

Alle vorhandenen Alpine.js-Properties werden weiterverwendet:
- `selectedDayIndex` → für Hero-Card Wochentagname und aktiven Tag in der Leiste
- `selectedDayExercises` → für Übungsliste
- `trainingDayOffset` → wird durch Klick in der Wochentag-Leiste gesetzt
- `trainingPlan` → Array mit 7 Tagen, je ein Array von Übungen
- `WEEKDAYS` / `WEEKDAY_SHORT` → Tagnamen

Neue computed properties benötigt:
- `getWeekDates()` → Array mit 7 Datumsnummern (Mo–So der aktuellen Woche)
- `getWeekTrainingStats()` → `{ trainingDays, totalExercises, restDays }`

## Was entfällt

- Expand/Collapse-Logik (`trainingExpanded`)
- Prev/Next-Navigation (Pfeilbuttons) — ersetzt durch Kalender-Klick
- Gradient-Overlay im Header
- Nummerierte Übungs-Badges (1, 2, 3...)
- Typ-Tags in der Übungsliste (vereinfacht zu "Cardio · Komplett" etc.)

## Stilregeln

- Gleiche CSS-Variablen und Tailwind-Klassen wie Plan-Tab und Gewohnheiten-Tab
- `animate-fade-in` statt `animate-slide-up` (Konsistenz)
- Container: `md:col-span-12 max-w-lg mx-auto w-full space-y-3`
- Dark-first: Alle Farben für Dark Mode, Light Mode via CSS Media Query Override
