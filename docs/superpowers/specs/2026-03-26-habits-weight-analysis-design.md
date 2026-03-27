# Gewohnheiten-Gewicht-Analyse — Design Spec

**Datum:** 2026-03-26
**Status:** Genehmigt
**Ziel:** Tägliche Gewichtsänderungen mit den eingetragenen Gewohnheiten verknüpfen, um dem Nutzer Feedback zu geben warum sein Gewicht gestiegen oder gefallen ist.

---

## Motivation

Gewichts-Tracking und Gewohnheiten-Checkins sind aktuell komplett getrennte Systeme. Der Nutzer sieht zwar seinen Gewichtsverlauf und seine Checkin-Streak, aber es gibt keine Verbindung zwischen beiden. Diese Analyse soll dem Nutzer helfen zu verstehen, welche Gewohnheiten seinen Gewichtsverlauf beeinflussen.

## Kernprinzip

Das **Oracle bleibt unverändert** — die Zieldatum-Vorhersage basiert weiterhin rein auf Gewichtsdaten (EWMA + gewichteter Slope). Die Gewohnheiten liefern nur die **Erklärung** für beobachtete Trends, nicht die Berechnung.

---

## Neue Komponente: "Tagesanalyse"-Karte

### Position
Gesundheits-Tab, unterhalb der Oracle-Vorhersage-Karte, oberhalb der Gewichtsverlauf-Liste.

### Sichtbarkeitsbedingungen
Die Karte erscheint nur wenn **alle** Bedingungen erfüllt sind:
- Heute existiert ein Gewichtseintrag
- Gestern existiert ein Gewichtseintrag (für Vergleich)
- Gestern existieren Checkin-Daten
- Mindestens 1 aktive Gewohnheit ist konfiguriert

Wenn keine gestrigen Checkin-Daten existieren, wird stattdessen ein dezenter Hinweis gezeigt: "Trage deine Gewohnheiten täglich ein, um Analysen zu erhalten."

### Inhalt der Karte

#### 1. Gewichtsänderung (Header)
- Zeigt die Differenz zum Vortag: z.B. "+0.4 kg" oder "-0.2 kg"
- Farbe und Icon basierend auf `calorieData.mode`:
  - **Defizit-Modus**: Abnahme = grün (positiv), Zunahme = orange (Hinweis)
  - **Überschuss-Modus**: Zunahme = grün (positiv), Abnahme = orange (Hinweis)
  - **Erhaltung**: Schwankung < 0.3 kg = neutral, darüber = orange Hinweis
- Kurze Einschätzung: z.B. "Gute Entwicklung!" oder "Leichte Schwankung — mögliche Gründe:"

#### 2. Gestern-Feedback (Sofort-Analyse)
- Listet die **nicht abgehakten** Gewohnheiten von gestern auf, priorisiert nach Gewichtungsklasse (siehe unten)
- Maximal 3 Items anzeigen (die relevantesten)
- Format pro Item: Icon + Gewohnheitsname
- Wenn alle Gewohnheiten abgehakt: "Gestern alles erledigt! Die Schwankung ist vermutlich natürlich (Wasser, Verdauung)."

#### 3. Wochentrend (7-Tage-Kontext)
- Compliance-Rate pro Gewohnheit der letzten 7 Tage
- Format: Gewohnheitsname + "X/Y Tage" + Mini-Fortschrittsbalken
- Sortiert nach Gewichtungsklasse (relevanteste oben)
- Nur Tage berücksichtigen an denen die jeweilige Gewohnheit existierte (für neu hinzugefügte Items)

---

## Gewichtungsklassen der Gewohnheiten

Nicht alle Gewohnheiten beeinflussen das Gewicht gleich stark. Die Analyse priorisiert Items nach ihrer Relevanz:

### Klasse 1: Direkte Gewichtsbeeinflussung (höchste Priorität)
- Items deren `key` enthält: `calories`, `kalorien`, `essen`, `ernährung`, `food`
- Items deren `key` enthält: `training`, `workout`, `sport`, `exercise`

### Klasse 2: Kurzfristige Schwankungen (mittlere Priorität)
- Items deren `key` enthält: `water`, `wasser`, `trinken`, `drink`
- Items deren `key` enthält: `sleep`, `schlaf`

### Klasse 3: Indirekt (niedrigste Priorität)
- Items deren `key` enthält: `steps`, `schritte`, `walk`, `bewegung`
- Alle anderen/custom Items

### Zuordnungslogik
- Matching erfolgt case-insensitive auf `key` **und** `label` des Items
- Custom Items (key beginnt mit `custom_`) werden primär über ihr `label` klassifiziert
- Nicht-zuordenbare Custom Items → Klasse 3

---

## Analyse-Nachrichten

### Bei Gewichtsänderung in unerwünschter Richtung

Wenn relevante Gewohnheiten gestern nicht erfüllt wurden:
> "Mögliche Gründe: Du hast gestern [Kalorien im Ziel] und [Training absolviert] nicht abgehakt."

Wenn alle Gewohnheiten erfüllt waren:
> "Gestern war alles erledigt. Kurzfristige Schwankungen (±0.5 kg) sind normal und hängen oft mit Wasserhaushalt oder Verdauung zusammen."

### Bei Gewichtsänderung in erwünschter Richtung

Wenn relevante Gewohnheiten gestern erfüllt wurden:
> "Weiter so! Gestern hast du [Training absolviert] und [Kalorien im Ziel] eingehalten."

Wenn Gewohnheiten nicht erfüllt waren:
> "Gute Entwicklung! Tägliche Schwankungen sind normal — bleib an deinen Gewohnheiten dran für langfristigen Erfolg."

### Bei minimaler Schwankung (< 0.1 kg)
> "Gewicht stabil. Dein Körper hält den Kurs."

---

## Datenfluss

```
Gewichtseintrag (heute) + Gewichtseintrag (gestern)
    → Differenz berechnen
    → Richtung bewerten (basierend auf calorieData.mode)

Checkin-History (gestern)
    → Nicht-erfüllte Items filtern
    → Nach Gewichtungsklasse sortieren
    → Top 3 als "mögliche Gründe" anzeigen

Checkin-History (letzte 7 Tage)
    → Pro Gewohnheit: Tage mit check / Tage mit Existenz
    → Compliance-Rate berechnen
    → Als Wochentrend anzeigen
```

## Neue Dateien / Änderungen

### Neue Datei: `js/features/weight-analysis.js`
- `weightAnalysisMixin()` — Alpine.js Mixin
- `getDailyAnalysis()` — Hauptfunktion die die Tagesanalyse berechnet
- `classifyHabitItem(item)` — Ordnet ein Checkin-Item einer Gewichtungsklasse zu
- `getWeeklyCompliance()` — Berechnet 7-Tage-Compliance pro Gewohnheit

### Änderung: `js/main.js`
- Import und Spread des neuen Mixins

### Änderung: `index.html`
- Neue Karte im Gesundheits-Tab (nach Oracle, vor Gewichtsverlauf)

### Keine Datenbankänderungen nötig
Alle benötigten Daten existieren bereits in `weight_entries` und `daily_checkins`.

---

## Was NICHT gebaut wird

- Keine Änderung am Oracle-Algorithmus
- Keine Machine-Learning-Korrelation zwischen Gewohnheiten und Gewicht
- Keine Push-Benachrichtigungen
- Keine historische Analyse über Monate (nur gestern + 7 Tage)
- Keine neue Datenbanktabelle
