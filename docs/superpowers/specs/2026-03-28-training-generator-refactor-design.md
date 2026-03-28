# Training-Generator Refactoring: Physiologische Constraints & Bug-Fixing

**Datum:** 2026-03-28
**Ansatz:** A — Constraint-Layer im bestehenden Code, keine Strukturaenderung
**Dateien:** `training-generator.js`, `exercises.js`, `split-templates.js`

---

## 1. Physiologische Constraints (PHYSIO_CONSTRAINTS)

Neues Konstanten-Objekt am Anfang von `training-generator.js`. Alle Werte als benannte
Konstanten mit Begruendung.

```js
const PHYSIO_CONSTRAINTS = {
    // Volumen-Limits pro Muskelgruppe pro Session
    // Schoenfeld et al. (2017): 10-20 Sets/Woche optimal → max 6-10 pro Session
    MAX_SETS_PER_MUSCLE_PER_SESSION: 10,
    MIN_SETS_PER_MUSCLE_PER_SESSION: 2,
    MAX_SETS_SMALL_MUSCLE: 6,
    SMALL_MUSCLES: ['biceps', 'triceps', 'calves', 'forearms', 'rear_delts', 'side_delts', 'front_delts'],

    // Satzpausen skaliert nach Intensitaet
    REST_BY_GOAL: {
        strength: '2-3 min Pause',
        muscle:   '60-90s Pause',
        fat_loss: '30-60s Pause',
        endurance:'30s Pause',
        general:  '60s Pause'
    },
    REST_COMPOUND_BONUS: '+30s fuer schwere Grunduebungen',

    // Ermuedungs-Management
    FATIGUE_REDUCTION_AFTER_EXERCISE: 6,  // Ab 7. Uebung: -1 Set
    MAX_EXERCISES_PER_SESSION: 10,        // Hard Cap inkl. Warmup/Cooldown

    // Duration Sanity
    MAX_CARDIO_DURATION_MINUTES: 20,
    MIN_SESSION_MINUTES: 20,
    MAX_SESSION_MINUTES: 120,
    WARMUP_MINUTES: { 30: 5, 45: 5, 60: 8, 90: 10 },
    COOLDOWN_MINUTES: 5,

    // Set-Limits pro Uebung
    MAX_SETS_PER_EXERCISE: 5,
    MIN_SETS_PER_EXERCISE: 2,

    // Duplikat-Schutz: max 1 Uebung pro Bewegungsmuster pro Tag
    MAX_SAME_MOVEMENT_PATTERN: 1
};
```

## 2. Neues REPS_SCHEME: strength

```js
strength: { sets: 5, reps: '3-6', restNote: '2-3 min Pause' }
```

Wird in `split-templates.js` REPS_SCHEMES ergaenzt. Keine UI-Aenderung noetig,
da Goals im Generator-Wizard bereits frei waehlbar sind und das Schema ueber
den Goal-Key gemappt wird.

## 3. Exercise-DB Korrekturen

### 3.1 Neue Uebungen (~8-12)

| ID | Name | primaryMuscle | compound | equipment | Begruendung |
|----|------|--------------|----------|-----------|-------------|
| front-raise-dumbbell | Frontheben (Kurzhanteln) | shoulders | false | dumbbell | Fehlende shoulders-Isolation |
| front-raise-cable | Frontheben (Kabel) | shoulders | false | cable | Fehlende shoulders-Isolation |
| sliding-leg-curl | Sliding Leg Curls | hamstrings | false | bodyweight | Hamstring-Iso fuer Calisthenics |
| superman | Superman | lower_back | false | bodyweight | lower_back Abdeckung |
| bird-dog | Bird-Dog | lower_back | false | bodyweight | lower_back Abdeckung |
| dumbbell-calf-raise | Wadenheben (Kurzhanteln) | calves | false | dumbbell | Calves ohne Machine |
| band-calf-raise | Wadenheben (Band) | calves | false | band | Calves fuer Band-only |
| cable-shrugs | Schulterheben (Kabel) | traps | false | cable | Traps Cable-Variante |

### 3.2 movementPattern-Feld

Neues optionales Feld `movementPattern` fuer Duplikat-Schutz:
- `horizontal_push` — Bench Press Varianten
- `horizontal_pull` — Row Varianten
- `vertical_push` — Overhead Press Varianten
- `vertical_pull` — Pulldown/Pull-Up Varianten
- `hip_hinge` — Deadlift/RDL Varianten
- `squat` — Squat Varianten
- `lunge` — Lunge/Split Squat Varianten
- `isolation` — Isolation Uebungen (kein Pattern-Conflict)

Wird nur auf Compound-Uebungen angewendet. Isolationsuebungen bekommen
`movementPattern: 'isolation'` und sind vom Duplikat-Check ausgenommen.

## 4. Bug-Fixes in training-generator.js

| # | Problem | Zeile | Fix |
|---|---------|-------|-----|
| 1 | `_pickExercises` findet 0 Kandidaten | 574 | Fallback: muscleGroups.includes() wenn primaryMuscle 0 Treffer |
| 2 | `_compound`-Flag vor Duration-Adjustment geloescht | 409 | Flags nach Adjustment loeschen |
| 3 | `_adjustForDuration` kein Set-Cap | 720 | MAX_SETS_PER_EXERCISE enforced |
| 4 | Compound/Isolation Reihenfolge nach Adjustment | 707 | Post-Sort erzwingen |
| 5 | `_estimateTime` dupliziert Logik | 678/694 | Shared Helper `_exerciseTimeEstimate()` |
| 6 | Kein Null-Check `generatorAnswers` in `generatePlan()` | 249 | Guard clause |
| 7 | `_selectTemplate` kein Final-Fallback | 476 | Defensiver Check |
| 8 | `confirmSwap` ignoriert compound/isolation Schema | 822 | Schema basierend auf alt.compound |
| 9 | `_enrichWithHistory` workoutLogs undefined | 745 | Optional chaining |
| 10 | Cardio-Duration nicht gecappt | 665 | MAX_CARDIO_DURATION_MINUTES |

## 5. Constraint-Enforcement im Ablauf

Vier Injection-Points in der bestehenden `_buildPlan`-Pipeline:

1. **Start** → Input-Validation: Guard clauses fuer alle generatorAnswers-Felder
2. **Nach _pickExercises** → Volumen-Cap: Summe Sets pro Muskelgruppe pruefen
3. **Nach _adjustForDuration** → Re-Sort: Compounds vor Isolations erzwingen
4. **Vor Zuweisung plan[dayIndex]** → Session-Cap + Fatigue-Reduction

`_formatExercise` bekommt intelligentere Rest-Notes:
- Compound + strength → "2-3 min Pause"
- Compound + muscle → "90-120s Pause"
- Isolation + muscle → "60-90s Pause"
- Isolation + fat_loss → "30-60s Pause"

## 6. Tests

Neue Datei: `js/features/training-generator.test.js`

### Constraint-Tests:
- Max Sets pro Muskelgruppe wird nie ueberschritten
- Max Exercises pro Session wird nie ueberschritten
- Compounds erscheinen immer vor Isolations (pro Muskelgruppe)
- Keine zwei Uebungen mit gleichem movementPattern am selben Tag
- Cardio-Duration nie ueber MAX_CARDIO_DURATION_MINUTES
- Sets pro Uebung zwischen MIN und MAX

### Edge-Case-Tests:
- Bodyweight-only + alle Injuries aktiv → Plan wird trotzdem generiert
- 30-min Session → Exercises werden korrekt reduziert
- 90-min Session → Exercises werden korrekt erweitert
- Leere goals → Fallback auf 'general'
- Template nicht gefunden → Naechstbestes Template

### Regression:
- Bestehende training.test.js und workout.test.js bleiben gruen

## 7. Was NICHT geaendert wird

- Keine neuen Features/UI-Elemente
- Keine Aenderung der Export-Signatur
- Keine Aenderung der Alpine.js Mixin-Struktur
- REPS_SCHEMES Objekt-Struktur bleibt gleich (nur neuer Key)
- Level bleibt hardcoded auf 'intermediate'
