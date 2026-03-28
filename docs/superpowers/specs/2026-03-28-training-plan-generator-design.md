# Training Plan Generator — Design Spec

## Zusammenfassung

Erweiterung der AGAsDashboard-App um einen regelbasierten Trainingsplan-Generator.
Der User waehlt zwischen manuellem Plan-Editor (bestehendes Feature) und automatischer
Plan-Generierung per Fragebogen. Der Generator arbeitet komplett clientseitig mit
statischen Uebungsdaten und Split-Templates — keine AI API, keine Edge Function,
keine laufenden Kosten.

## Architektur

### Entscheidung: Statische JSON-Daten im Frontend-Bundle

Uebungsdatenbank (~150 Uebungen) und Split-Templates (~10 Templates) werden als
JS-Module unter `js/data/` gespeichert und mit Vite gebundelt.

**Begruendung:**
- Null API-Calls, sofort verfuegbar, funktioniert offline (PWA)
- Kein Supabase-Quota-Verbrauch (Free-Tier-freundlich)
- ~25KB gzipped — vernachlaessigbar
- Uebungsdaten aendern sich selten; Update = Git-Push + Netlify-Redeploy
- Keine Migrations, RLS-Policies oder Seeding noetig

### Entscheidung: Kein AI API / keine Edge Function

**Begruendung:**
- App hat mehrere Nutzer, keine API-Kosten gewuenscht
- Regelbasierter Algorithmus liefert zuverlaessige, sofortige Ergebnisse
- Keine Rate-Limits, kein API-Key-Management, keine Fehlerbehandlung fuer externe APIs

---

## Komponenten

### 1. Uebungs-Datenbank (`js/data/exercises.js`)

Exportiert ein Array von Uebungsobjekten:

```javascript
export const exercises = [
  {
    id: "barbell-bench-press",
    name: "Bankdruecken (Langhantel)",
    type: "strength",                    // strength | cardio | distance | circuit
    muscleGroups: ["chest", "triceps", "front_delts"],
    primaryMuscle: "chest",
    equipment: "barbell",                // barbell | dumbbell | machine | cable | bodyweight | band
    difficulty: "beginner",              // beginner | intermediate | advanced
    compound: true,                      // Grunduebung vs Isolation
    defaultSets: 3,
    defaultReps: "8-12",
    defaultWeight: 0,                    // 0 = User muss selbst eintragen
    tags: ["push"],                      // fuer Split-Zuordnung
    avoidWhenInjured: ["shoulder", "chest", "wrist"]  // Verletzungs-Keywords
  },
  // ...
];
```

**Muskelgruppen-Taxonomie:**
chest, back, shoulders (front_delts, side_delts, rear_delts), biceps, triceps,
quadriceps, hamstrings, glutes, calves, abs, forearms, traps, lower_back

**Equipment-Kategorien (Mapping zum Fragebogen):**
- "Ja (Geraete + Freihantel)" → alle Equipment-Typen erlaubt
- "Nur Freihantel/Home-Gym" → barbell, dumbbell, band, bodyweight
- "Nur Calisthenics/Bodyweight" → bodyweight, band

**Umfang:** ~150 Uebungen, aufgeteilt:
- ~60 Strength (Compound + Isolation)
- ~30 Maschinen-Uebungen
- ~25 Bodyweight/Calisthenics
- ~15 Cardio
- ~10 Distance
- ~10 Cable-Uebungen

### 2. Split-Templates (`js/data/split-templates.js`)

Exportiert ein Array von Template-Objekten:

```javascript
export const splitTemplates = [
  {
    id: "full-body-3",
    name: "Ganzkoerper 3x",
    daysPerWeek: 3,
    suitableFor: ["beginner"],           // Level-Filter
    goals: ["muscle", "general"],        // Trainingsziel-Filter
    structure: [
      {
        label: "Ganzkoerper A",
        muscleGroups: ["chest", "back", "quadriceps", "shoulders", "biceps", "triceps"],
        compoundCount: 3,                // Anzahl Grunduebungen
        isolationCount: 2,               // Anzahl Isolationsuebungen
        cardioMinutes: 0
      },
      // null = Ruhetag
      null,
      {
        label: "Ganzkoerper B",
        muscleGroups: ["back", "chest", "hamstrings", "glutes", "shoulders", "abs"],
        compoundCount: 3,
        isolationCount: 2,
        cardioMinutes: 0
      },
      null,
      {
        label: "Ganzkoerper C",
        muscleGroups: ["quadriceps", "chest", "back", "shoulders", "calves", "abs"],
        compoundCount: 3,
        isolationCount: 2,
        cardioMinutes: 0
      },
      null,
      null
    ]
  },
  // Weitere Templates:
  // - full-body-2 (Anfaenger, 2x/Woche)
  // - upper-lower-4 (Fortgeschritten, 4x/Woche)
  // - ppl-3 (Fortgeschritten, 3x/Woche)
  // - ppl-6 (Fortgeschritten/Profi, 6x/Woche)
  // - bro-split-5 (Fortgeschritten, 5x/Woche)
  // - push-pull-4 (Fortgeschritten, 4x/Woche)
  // - calisthenics-3 (Anfaenger-Fortgeschritten, 3x Bodyweight)
  // - cardio-focus-4 (Ausdauer-Fokus, 4x/Woche)
  // - hybrid-5 (Allgemeine Fitness, 5x/Woche)
];
```

**Template-Auswahl-Logik:**
1. Filter nach `daysPerWeek` (exact match oder naechstliegend)
2. Filter nach `suitableFor` (muss Level enthalten)
3. Filter nach `goals` (mindestens ein Ziel muss matchen)
4. Bei mehreren Treffern: zufaellige Auswahl fuer Variation

### 3. Generator-Engine (`js/features/training-generator.js`)

Neues Alpine.js Mixin: `trainingGeneratorMixin()`

**State:**
```javascript
{
  // Wizard-State
  generatorOpen: false,
  generatorStep: 0,              // 0 = Auswahl-Screen, 1-8 = Fragebogen, 9 = Vorschau
  generatorAnswers: {
    fitnessLevel: null,           // 'beginner' | 'intermediate' | 'advanced'
    daysPerWeek: 3,
    equipment: null,              // 'full_gym' | 'home_gym' | 'bodyweight'
    goals: [],                    // ['muscle', 'fat_loss', 'endurance', 'general']
    otherSports: '',
    otherSportsDays: [],              // [0,3] = Montag+Donnerstag belegt
    hasOtherSports: false,
    sessionDuration: null,        // 30 | 45 | 60 | 90
    injuries: '',
    exercisePreferences: ''
  },
  generatedPlan: null,            // Array[7] wie trainingPlan
  generatorLoading: false,
  showSelectionScreen: true       // true = Auswahl manual/auto, false = direkt in Wizard
}
```

**Methoden:**
```
openGenerator()                   — Oeffnet Modal mit Auswahl-Screen
closeGenerator()                  — Schliesst Modal
startWizard()                     — Startet Fragebogen bei Step 1
prevStep()                        — Zurueck im Wizard
nextStep()                        — Weiter im Wizard (mit Validierung)
generatePlan()                    — Fuehrt Algorithmus aus
swapExercise(dayIndex, exIndex)   — Tauscht einzelne Uebung gegen Alternative
applyGeneratedPlan()              — Uebernimmt Plan in trainingPlan + speichert
regeneratePlan()                  — Neu generieren mit gleichen Antworten
switchToManualEdit()              — Uebernimmt Plan und oeffnet manuellen Editor
```

**Generator-Algorithmus (`generatePlan()`):**

```
1. TEMPLATE WAEHLEN
   - Filter splitTemplates nach daysPerWeek, fitnessLevel, goals
   - Zufaellige Auswahl bei mehreren Treffern

2. UEBUNGEN FILTERN
   - Verfuegbare Uebungen = exercises.filter(equipment + difficulty)
   - Verletzungs-Filter: Entferne Uebungen deren avoidWhenInjured
     Keywords aus dem injuries-Freitext matcht
   - Praeferenz-Filter: Entferne Uebungen aus exercisePreferences ("vermeiden")

3. PRO TRAININGSTAG:
   a. Hole muscleGroups aus Template-Structure
   b. Waehle compoundCount Grunduebungen (compound=true, passende Muskelgruppe)
   c. Waehle isolationCount Isolationsuebungen
   d. Sortiere: Compounds zuerst, dann Isolation
   e. Bei goals.includes('fat_loss') oder goals.includes('endurance'):
      Fuege Cardio-Uebung am Ende hinzu (Dauer nach sessionDuration)

4. SETS/REPS ANPASSEN (nach Trainingsziel)
   - Muskelaufbau:  3-4 Sets × 8-12 Reps
   - Fettabbau:     3 Sets × 12-15 Reps + Cardio
   - Ausdauer:      2-3 Sets × 15-20 Reps + mehr Cardio
   - Allgemeine Fitness: 3 Sets × 10-12 Reps

5. ZEITBUDGET PRUEFEN
   - Geschaetzte Dauer berechnen (~3 Min/Set + Pausen)
   - Wenn > sessionDuration: letzte Isolationsuebung entfernen
   - Wenn < sessionDuration * 0.7: Extra-Uebung hinzufuegen

6. WORKOUT-HISTORY INTEGRIEREN (Bonus-Feature)
   - workout_logs aus Supabase pruefen
   - Wenn User eine Uebung schon gemacht hat:
     → defaultWeight durch letztes genutztes Gewicht ersetzen

7. TAGE VERTEILEN (mit blockierten Tagen)
   - Verfuegbare Tage = alle 7 Wochentage MINUS otherSportsDays
   - Trainingstage gleichmaessig auf verfuegbare Tage verteilen
   - Template-Structure auf die konkreten Wochentage mappen
   - Nicht-Trainingstage = leeres Array (Ruhetag)
   - Beispiel: 3 Trainingstage, Fussball Di+Do →
     Generator nutzt Mo, Mi, Fr (oder Mo, Mi, Sa)

8. AUSGABE
   - Array[7] im exakt gleichen Format wie trainingPlan:
     [{name, type, sets, reps, weight, duration, distance,
       rounds, circuitExercises, note}]
```

### 4. UI-Komponenten

#### 4a. Selection Screen (im Training-Modal)

Wird VOR dem bestehenden Modal-Inhalt angezeigt (x-show auf generatorStep === 0).

```
┌─────────────────────────────────────────┐
│                                         │
│   Trainingsplan erstellen               │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  📝 Manuellen Trainingsplan     │   │
│   │     hinzufuegen                 │   │
│   │  Erstelle deinen Plan selbst    │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  ✨ Lass dir einen Trainings-   │   │
│   │     plan erstellen              │   │
│   │  Beantworte 8 kurze Fragen     │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ⚠️ Warnung wenn Plan existiert       │
│                                         │
└─────────────────────────────────────────┘
```

**Verhalten:**
- Karte 1 → `openTraining()` (bestehendes Verhalten, unveraendert)
- Karte 2 → `startWizard()` (neuer Fragebogen)
- Wenn `trainingPlan` bereits Uebungen enthaelt: Warnung anzeigen
  "Dein bestehender Plan wird ersetzt." mit Bestaetigung

#### 4b. Fragebogen-Wizard (8 Steps)

Wizard mit Progress-Bar, einer Frage pro Schritt, Zurueck/Weiter-Navigation.

**Step 1: Fitnesslevel**
- 3 Radio-Karten: Anfaenger / Fortgeschritten / Profi
- Jede mit kurzer Beschreibung

**Step 2: Trainingstage**
- Slider oder +/- Picker (1-7)
- Visuell: 7 Kreise fuer Wochentage, ausgewaehlte Anzahl faerbt sich

**Step 3: Equipment**
- 3 Radio-Karten mit Icons:
  - Fitnessstudio (Geraete + Freihantel)
  - Home-Gym (Freihantel + Baender)
  - Bodyweight/Calisthenics

**Step 4: Trainingsziel**
- 4 Toggle-Chips (Multi-Select): Muskelaufbau / Fettabbau / Ausdauer / Allgemeine Fitness
- Mindestens eins muss gewaehlt sein

**Step 5: Andere Sportarten**
- Toggle: "Nein, nur diesen Trainingsplan" / "Ja"
- Bei Ja:
  - Textfeld fuer Sportart (z.B. "Fussball")
  - **Tage-Auswahl:** 7 Wochentag-Buttons (Mo-So) zum Anklicken
    → User markiert an welchen Tagen die andere Sportart stattfindet
  - Diese Tage sind dann fuer den Generator BLOCKIERT
  - Der Generator verteilt Trainingstage nur auf die verbleibenden freien Tage
  - Validierung: Wenn blockierte Tage + gewuenschte Trainingstage > 7 → Warnung
    "Du hast X Tage fuer andere Sportarten belegt. Fuer Y Trainingstage
    bleiben nicht genug freie Tage. Bitte passe die Anzahl an."

**Step 6: Zeit pro Training**
- 4 Radio-Karten: 30 Min / 45 Min / 60 Min / 90+ Min

**Step 7: Verletzungen**
- Toggle: "Keine" / "Ja, folgende:"
- Bei Ja: Textfeld mit Platzhalter "z.B. Knie, Schulter..."

**Step 8: Uebungspraeferenzen**
- Optionales Textfeld
- Platzhalter: "z.B. Kniebeuge bevorzugt, Kreuzheben vermeiden..."
- "Ueberspringen"-Button prominent

**Navigation:**
- Progress-Bar oben: Step X von 8
- "Zurueck"-Button (ab Step 2)
- "Weiter"-Button (validiert aktuelle Antwort)
- Step 8: "Plan generieren"-Button statt "Weiter"

#### 4c. Generierungs-Animation

Kurze Animation (200-500ms da clientseitig) mit:
- Spinner/Pulse-Animation
- Text: "Dein Trainingsplan wird zusammengestellt..."
- Sofortiger Uebergang zur Vorschau

#### 4d. Plan-Vorschau

Zeigt den generierten Plan Tag fuer Tag:

```
┌─────────────────────────────────────────┐
│  Dein Trainingsplan          Step 9     │
│                                         │
│  [Mo] [Di] [Mi] [Do] [Fr] [Sa] [So]   │
│                                         │
│  Montag — Push                          │
│  ─────────────────────────────          │
│  1. Bankdruecken        3×8-12  ↻       │
│  2. Schraegbankdruecken 3×10    ↻       │
│  3. Seitheben           3×12    ↻       │
│  4. Trizeps-Pushdown    3×12    ↻       │
│                                         │
│  ↻ = Uebung tauschen (Alternative)     │
│                                         │
│  ┌─────────────┐ ┌──────────────────┐  │
│  │ Nochmal     │ │ Plan uebernehmen │  │
│  │ generieren  │ │                  │  │
│  └─────────────┘ └──────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Im Editor anpassen             │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Uebung-Tauschen-Feature:**
- Klick auf ↻ neben einer Uebung
- Zeigt 2-3 Alternativen (gleiche Muskelgruppe + Equipment)
- Auswahl ersetzt sofort im Plan

**Aktionen:**
- "Plan uebernehmen" → speichert in `trainingPlan` + Supabase
- "Nochmal generieren" → `regeneratePlan()` mit gleichen Antworten
- "Im Editor anpassen" → uebernimmt Plan, oeffnet manuellen Editor

### 5. Integration mit bestehendem Code

#### 5a. Training-Modal Anpassung (`templates/modals/training.html`)

Das bestehende Modal wird um den Selection Screen erweitert:

```html
<!-- NEUER Selection Screen -->
<div x-show="showSelectionScreen && !trainingOpen">
  <!-- Zwei Karten: Manuell / Generator -->
</div>

<!-- NEUER Wizard + Vorschau -->
<div x-show="generatorOpen">
  <!-- Steps 1-8 + Vorschau -->
</div>

<!-- BESTEHENDES Modal (unveraendert) -->
<div x-show="trainingOpen">
  <!-- Alles bleibt exakt wie es ist -->
</div>
```

#### 5b. Trigger-Aenderung

Aktuell oeffnet `openTraining()` direkt den Editor.
NEU: Der Trigger-Button oeffnet den Selection Screen.

```javascript
// NEU: Einstiegspunkt
openTrainingSelection() {
  this.showSelectionScreen = true;
}

// UNVERAENDERT: Manueller Editor
openTraining() { /* bestehender Code, keine Aenderung */ }

// NEU: Generator starten
startWizard() {
  this.showSelectionScreen = false;
  this.generatorOpen = true;
  this.generatorStep = 1;
}
```

Alle Stellen die `openTraining()` aufrufen werden auf `openTrainingSelection()` umgestellt.

#### 5c. Plan-Format-Kompatibilitaet

Der Generator gibt exakt das gleiche Format wie `trainingPlan` zurueck:

```javascript
// Bestehende Struktur (aus getTrainingPlan()):
trainingPlan[dayIndex] = [
  {
    name: "Bankdruecken",
    type: "strength",
    sets: 3,
    reps: "8-12",
    weight: 60,
    note: "",
    // Cardio:
    duration: "",
    // Distance:
    distance: "",
    // Circuit:
    rounds: 0,
    circuitExercises: []
  }
]

// Generator-Output: IDENTISCHES Format
// → Workout-Picker, Workout-Ausfuehrung, History funktionieren sofort
```

#### 5d. Speichern

`applyGeneratedPlan()` setzt `this.trainingPlan = this.generatedPlan`
und ruft dann die bestehende `saveTrainingPlan()` auf — null Aenderung
an der Supabase-Logik.

### 6. Workout-History-Integration (Bonus)

Beim Generieren werden `workout_logs` aus Supabase geladen:

```javascript
async enrichWithHistory(plan) {
  const logs = this.workoutLogs; // bereits im App-State geladen

  for (const day of plan) {
    for (const exercise of day) {
      // Suche letzte Ausfuehrung dieser Uebung
      const lastPerformed = findLastPerformed(logs, exercise.name);
      if (lastPerformed) {
        exercise.weight = lastPerformed.weight;
        exercise.reps = lastPerformed.reps;
      }
    }
  }
}
```

### 7. Dateien-Uebersicht

```
js/data/exercises.js              — Uebungsdatenbank (~150 Uebungen)
js/data/split-templates.js        — Split-Templates (~10 Templates)
js/features/training-generator.js — Generator-Mixin (Wizard + Algorithmus)
templates/modals/training.html    — Erweitert um Selection Screen + Wizard
js/main.js                        — Neues Mixin importieren + spreaden
js/store/supabase.js              — Keine Aenderung
mockup-trainingsplan-ai.html      — Standalone-Mockup fuer visuellen Review
```

### 8. Nicht im Scope (spaetere Features)

- Aufwaerm-/Cooldown-Generierung
- Deload-Hinweis nach X Wochen
- Plan als PDF exportieren
- Admin-UI fuer Uebungsdatenbank
- Supabase-Migration der Uebungsdaten

### 9. Edge Cases

| Fall | Verhalten |
|------|-----------|
| Kein bestehendes Profil (Alter, Gewicht etc.) | Generator funktioniert trotzdem — nur Fragebogen-Antworten bestimmen den Plan |
| Keine Workout-History | defaultWeight = 0 bei allen Uebungen, User traegt selbst ein |
| Nur 1 Trainingstag gewaehlt | Ganzkoerper-Template mit allen Muskelgruppen |
| 7 Trainingstage gewaehlt | PPL × 2 + aktive Erholung oder 6-Tage-Split + 1 Ruhetag mit Hinweis |
| Bodyweight + "Muskelaufbau" | Calisthenics-Compound-Uebungen mit progressiven Varianten |
| Alle Muskelgruppen "verletzt" | Warnung: "Bitte konsultiere einen Arzt" + leerer Plan |
| Fragebogen abgebrochen | State wird zurueckgesetzt, kein Plan gespeichert |
| Browser-Refresh waehrend Wizard | Fragebogen startet neu (kein Persistence noetig) |
| Plan existiert + "Plan uebernehmen" | Bestehender Plan wird vollstaendig ersetzt |
| Uebung tauschen — keine Alternative da | Swap-Button ausgegraut, Tooltip: "Keine Alternative verfuegbar" |
