# Training Generator — 6 Evidence-Based Issues: Design Spec

**Datum:** 2026-03-28
**Ansatz:** Option A — Modularer Ansatz (neue Konstanten-Datei + gezielte Funktions-Ergänzungen)
**Scope:** 6 Issues, jeweils isoliert testbar, rückwärtskompatibel

---

## Übersicht

Der Training-Generator hat 6 evidenzbasierte Lücken in der Planlogik. Dieses Dokument beschreibt die Lösung für jede Lücke als isolierten, testbaren Baustein innerhalb der bestehenden Mixin-Architektur.

### Abhängigkeitsgraph

```
Issue 2 (Level) ─┐
                  ├→ Issue 1 (Weekly Volume) ─→ Issue 5 (Recovery) ─→ Issue 4 (Periodisierung)
Issue 3 (Equip) ─┘                                                     Issue 6 (Warmup) [unabhängig]
```

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `js/data/training-constants.js` | **NEU** — alle Konstanten, Mappings, Budgets |
| `js/features/training-generator.js` | Erweitert — 6 neue Funktionen, `_buildPlan()` + `_selectTemplate()` angepasst |
| `js/features/training-generator.test.js` | Erweitert — Tests für alle 6 Issues |
| `js/data/split-templates.js` | Unverändert (Equipment-Score wird dynamisch berechnet) |

---

## Neue Datei: `js/data/training-constants.js`

Alle neuen Magic Numbers als benannte Konstanten, alle Data-Mappings als Config-Objekte.

```js
// ── Issue 1: Wöchentliches Volumen-Budget ──────────────────
// Schoenfeld et al. (2017): 10-20 Sets/Woche/Muskel optimal
export const WEEKLY_VOLUME_BUDGET = {
    OPTIMAL_MIN: 10,
    OPTIMAL_MAX: 20,
    BEGINNER_MAX: 12,
    INTERMEDIATE_MAX: 16,
    ADVANCED_MAX: 20,
    SMALL_MUSCLE_FACTOR: 0.6  // Kleine Muskeln brauchen weniger Volumen
};

// ── Issue 2: Trainings-Level ───────────────────────────────
export const TRAINING_LEVELS = ['beginner', 'intermediate', 'advanced'];

export const TRAINING_LEVEL_LABELS = {
    beginner:     'Anfaenger (0-12 Monate Trainingserfahrung)',
    intermediate: 'Fortgeschritten (1-3 Jahre)',
    advanced:     'Profi (3+ Jahre)'
};

// ── Issue 3: Equipment-Kompatibilität ──────────────────────
export const EQUIPMENT_COMPATIBILITY_THRESHOLD = 0.7;
export const EQUIPMENT_SCORE_BONUS = 8;
export const EQUIPMENT_SCORE_EXCLUDE_BELOW = 0.5;
export const EQUIPMENT_SCORE_PENALTY = -20;

// ── Issue 4: Periodisierung ────────────────────────────────
export const PERIODIZATION = {
    MESOCYCLE_WEEKS: 4,
    DELOAD_WEEK: 4,
    DELOAD_VOLUME_FACTOR: 0.5,
    WEEKLY_SET_INCREMENT: 1,
    WEEKLY_NOTES: [
        'Woche 1: Basisvolumen — Technik und Bewegungsqualitaet priorisieren',
        'Woche 2: +1 Satz pro Uebung — progressive Ueberlastung',
        'Woche 3: +1 Satz oder +2.5kg — Peak-Woche',
        'Woche 4: DELOAD — 50% Volumen, gleiches Gewicht, Erholung priorisieren'
    ]
};

// ── Issue 5: Sport → Muskelbelastungs-Profile ──────────────
// Werte 0-1: Anteil der maximalen Muskelbelastung durch die Sportart
// Quellen: ACE Exercise Library, NSCA Position Statements
export const SPORT_MUSCLE_LOAD = {
    fussball:    { quadriceps: 0.8, hamstrings: 0.7, calves: 0.6, glutes: 0.5 },
    soccer:      { quadriceps: 0.8, hamstrings: 0.7, calves: 0.6, glutes: 0.5 },
    schwimmen:   { back: 0.7, shoulders: 0.8, triceps: 0.5, abs: 0.4 },
    swimming:    { back: 0.7, shoulders: 0.8, triceps: 0.5, abs: 0.4 },
    radfahren:   { quadriceps: 0.9, hamstrings: 0.5, calves: 0.6 },
    cycling:     { quadriceps: 0.9, hamstrings: 0.5, calves: 0.6 },
    laufen:      { quadriceps: 0.6, hamstrings: 0.6, calves: 0.8, glutes: 0.4 },
    jogging:     { quadriceps: 0.6, hamstrings: 0.6, calves: 0.8, glutes: 0.4 },
    running:     { quadriceps: 0.6, hamstrings: 0.6, calves: 0.8, glutes: 0.4 },
    basketball:  { quadriceps: 0.7, calves: 0.7, shoulders: 0.4 },
    tennis:      { shoulders: 0.6, forearms: 0.5, calves: 0.5 },
    badminton:   { shoulders: 0.6, forearms: 0.5, calves: 0.5 },
    yoga:        { abs: 0.3, shoulders: 0.3 },
    pilates:     { abs: 0.4, lower_back: 0.3 },
    boxen:       { shoulders: 0.7, chest: 0.5, triceps: 0.5, abs: 0.5 },
    kickboxen:   { shoulders: 0.7, chest: 0.5, quadriceps: 0.6, calves: 0.5, abs: 0.5 },
    mma:         { shoulders: 0.7, chest: 0.5, quadriceps: 0.6, back: 0.5, abs: 0.5 },
    klettern:    { back: 0.8, biceps: 0.7, forearms: 0.9 },
    bouldern:    { back: 0.8, biceps: 0.7, forearms: 0.9 },
    handball:    { shoulders: 0.6, chest: 0.4, quadriceps: 0.5, calves: 0.5 },
    volleyball:  { shoulders: 0.6, calves: 0.6, quadriceps: 0.5 },
    tanzen:      { calves: 0.5, quadriceps: 0.4, abs: 0.3 },
    golf:        { lower_back: 0.4, abs: 0.3, forearms: 0.3 },
    rudern:      { back: 0.8, biceps: 0.6, shoulders: 0.5, abs: 0.4 }
};

export const SPORT_RECOVERY_REDUCTION = 0.4;

// ── Issue 6: Warmup nach Muskelgruppe ──────────────────────
// Dynamisches Stretching + Aktivierung pro Muskelgruppe
export const WARMUP_BY_MUSCLE = {
    chest:       'Schulterrotation + leichte Liegestuetze',
    back:        'Cat-Cow + Band Pull-Aparts',
    shoulders:   'Schulterkreisen + Band Dislocates',
    front_delts: 'Schulterrotation + Frontheben ohne Gewicht',
    side_delts:  'Schulterkreisen + Seitheben ohne Gewicht',
    rear_delts:  'Band Pull-Aparts + Reverse Flys ohne Gewicht',
    quadriceps:  'Hueftmobilitaet + Kniebeugen ohne Gewicht',
    hamstrings:  'Beinpendel + Rumaenisches Kreuzheben ohne Gewicht',
    glutes:      'Hueftkreise + Glute Bridges',
    biceps:      'Armkreisen + leichte Curls',
    triceps:     'Armkreisen + Trizeps-Stretches',
    abs:         'Cat-Cow + Dead Bugs',
    calves:      'Wadenheben einbeinig + Fusskreise',
    forearms:    'Handgelenk-Rotation + Finger-Spreizen',
    traps:       'Nackenkreisen + Schulterheben ohne Gewicht',
    lower_back:  'Cat-Cow + Beckenneigung'
};

export const MAX_WARMUP_ELEMENTS = 4;
```

---

## Issue 2: Training Level via Wizard-Step

### Änderungen

**`training-generator.js` — `generatorAnswers`:**
```js
generatorAnswers: {
    // ... bestehende Felder ...
    trainingLevel: null   // NEU: 'beginner' | 'intermediate' | 'advanced'
}
```

**`_buildPlan()` Zeile 357:**
```js
// ALT:
const template = this._selectTemplate(a, 'intermediate', daysPerWeek);
// NEU:
const level = a.trainingLevel || 'intermediate';
const template = this._selectTemplate(a, level, daysPerWeek);
```

**Wizard-UI:** Neuer Step zwischen Equipment und Goals (oder nach Goals). Drei Karten:
- Anfänger (0-12 Monate)
- Fortgeschritten (1-3 Jahre)
- Profi (3+ Jahre)

Fallback: Wenn `trainingLevel` nicht gesetzt → `'intermediate'` (Rückwärtskompatibilität).

### Tests

- `trainingLevel: 'beginner'` → Template mit `suitableFor.includes('beginner')` wird bevorzugt
- `trainingLevel: null` → Fallback auf `'intermediate'`
- Beginner bekommt kein PPL bei 3 Tagen (Ganzkörper statt Push/Pull/Legs)

---

## Issue 3: Equipment-Kompatibilität in Template-Selektion

### Neue Funktion: `_templateEquipmentScore(template, allowedEquipment)`

```
Input:  template (splitTemplate), allowedEquipment (string[])
Output: number 0-1 (Anteil der erfüllbaren Übungen)

Algorithmus:
1. Für jeden muscleTarget im Template:
   - Zähle verfügbare Übungen in exercises[] die:
     a) primaryMuscle oder muscleGroups matcht
     b) equipment in allowedEquipment enthalten ist
     c) compound-Flag zum Target passt
   - Braucht mindestens 1 Übung? → fulfilled++ oder missed++
2. Score = fulfilled / (fulfilled + missed)
```

### Integration in `_selectTemplate()`

```js
const scoreTemplate = (t) => {
    let score = 0;
    if (t.daysPerWeek === daysPerWeek) score += 10;
    if (t.suitableFor.includes(level)) score += 5;
    for (const g of answers.goals) {
        if (t.goals.includes(g)) score += 3;
    }
    // NEU: Equipment-Kompatibilität
    const eqScore = this._templateEquipmentScore(t, allowedEquipment);
    if (eqScore < EQUIPMENT_SCORE_EXCLUDE_BELOW) return -Infinity;
    if (eqScore >= EQUIPMENT_COMPATIBILITY_THRESHOLD) score += EQUIPMENT_SCORE_BONUS;
    else score += EQUIPMENT_SCORE_PENALTY;
    return score;
};
```

`_selectTemplate()` Signatur erweitert: `_selectTemplate(answers, level, daysPerWeek, allowedEquipment)`

### Tests

- `equipment: 'bodyweight'` → Bro-Split 5x (viele Machine-Übungen) wird ausgeschlossen
- `equipment: 'bodyweight'` → Calisthenics-3 oder Ganzkörper wird bevorzugt
- `equipment: 'full_gym'` → Alle Templates bleiben verfügbar
- Score-Berechnung: Template mit 5/7 machbaren Targets → Score 0.71

---

## Issue 1: Weekly Volume Budget

### Neue Funktion: `_createWeeklyVolumeBudget(level, muscleGroups)`

```
Input:  level ('beginner'|'intermediate'|'advanced'), muscleGroups (string[])
Output: { chest: 16, biceps: 10, ... }

Algorithmus:
1. maxSets = WEEKLY_VOLUME_BUDGET[level.toUpperCase() + '_MAX']
2. Für jeden Muskel:
   - isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(muscle)
   - budget = isSmall ? Math.round(maxSets * SMALL_MUSCLE_FACTOR) : maxSets
3. Return Map
```

### Neue Funktion: `_remainingWeeklyBudget(muscle, weeklyBudget, weeklyUsed)`

```
Input:  muscle (string), weeklyBudget (Map), weeklyUsed (Map)
Output: number (verbleibende Sets)

return Math.max(0, (weeklyBudget[muscle] || 0) - (weeklyUsed[muscle] || 0));
```

### Integration in `_buildPlan()`

```
Vor der Hauptschleife:
  weeklyBudget = _createWeeklyVolumeBudget(level, MUSCLE_GROUPS)
  weeklyUsed = {}

In der Übungsselektion (Zeilen 462-495, 504-542):
  Für jede Übung, für jeden Muskel:
    remainingWeekly = _remainingWeeklyBudget(muscle, weeklyBudget, weeklyUsed)
    remainingSession = sessionCap - (daySetsPerMuscle[muscle] || 0)
    effectiveCap = Math.min(remainingWeekly, remainingSession)

    Wenn effectiveCap < MIN_SETS_PER_EXERCISE → Übung überspringen
    Sonst: sets = Math.min(sets, effectiveCap)

  Nach Zuweisung: weeklyUsed[muscle] += zugewiesene Sets
```

### Tests

- 6-Tage Upper-Split + intermediate → max 16 Sets/Woche für Chest (nicht 30+)
- Beginner 3-Tage → max 12 Sets/Woche für große Muskeln
- Session-Cap bleibt als sekundärer Constraint aktiv
- Budget erschöpft → spätere Tage haben weniger Sets (graceful degradation)

---

## Issue 5: Other Sports → Recovery-Integration

### Neue Funktion: `_sportMuscleLoad(sportName)`

```
Input:  sportName (string, z.B. "Fußball", "Swimming")
Output: { quadriceps: 0.8, hamstrings: 0.7, ... } oder {} bei unbekanntem Sport

Algorithmus:
1. sportName.toLowerCase()
2. Für jeden Key in SPORT_MUSCLE_LOAD:
   - Wenn sportName den Key enthält → return SPORT_MUSCLE_LOAD[key]
3. Fallback: leeres Objekt (unbekannter Sport hat keine Reduktion)
```

### Integration in `_buildPlan()`

```
Vor der Hauptschleife, nach weeklyBudget-Erstellung:

if (a.hasOtherSports && a.otherSportsDays.length > 0) {
    const sportLoad = _sportMuscleLoad(a.otherSports);

    for (const sportDayIdx of a.otherSportsDays) {
        // Finde benachbarte Trainingstage (±1 Tag)
        for (const trainDayIdx of trainingDayIndices) {
            const gap = Math.abs(trainDayIdx - sportDayIdx);
            // Auch Wrap-Around: Sonntag→Montag = Gap 1
            const wrapGap = Math.min(gap, 7 - gap);
            if (wrapGap <= 1) {
                // Reduziere weeklyBudget für belastete Muskeln
                for (const [muscle, load] of Object.entries(sportLoad)) {
                    if (load >= 0.5) {  // Nur signifikante Belastung
                        weeklyBudget[muscle] = Math.round(
                            (weeklyBudget[muscle] || 0) * (1 - SPORT_RECOVERY_REDUCTION * load)
                        );
                    }
                }
            }
        }
    }
}
```

Zusätzlich: In der Recovery-Validierung (Zeile 676-701) otherSportsDays als trainierte Muskeln einbeziehen — `weeklyMuscleSchedule` wird auch für Sporttage befüllt.

### Tests

- Fußball am Mittwoch + Beintag am Donnerstag → Quad-Volume reduziert
- Schwimmen am Samstag + Rückentag am Freitag → Back/Shoulders reduziert
- Unbekannter Sport → keine Reduktion (Fallback)
- Sport ohne benachbarten Trainingstag → kein Effekt
- Wrap-Around: Sport Sonntag + Training Montag → Reduktion aktiv

---

## Issue 4: Periodisierung (Notes-basiert)

### Neue Funktion: `_generatePeriodizationNotes()`

```
Input:  keine (nutzt PERIODIZATION Konstanten)
Output: { mesocycleWeeks: 4, weeklyNotes: string[], deloadReminder: string }

Gibt die statischen PERIODIZATION.WEEKLY_NOTES zurück plus:
  deloadReminder: 'Nach 3 Wochen Training: Deload-Woche einlegen (50% Volumen)'
```

### Integration in `_buildPlan()`

```js
// Am Ende, vor return:
const periodization = this._generatePeriodizationNotes();

const meta = {
    templateName: adjustedTemplate.name,
    templateId: adjustedTemplate.id,
    restNote: primaryScheme.restNote,
    dayMetas,
    periodization  // NEU
};
```

### Tests

- `meta.periodization` existiert und hat 4 weeklyNotes
- Deload-Reminder enthält "50%"
- mesocycleWeeks === 4

---

## Issue 6: Muskelspezifisches Warmup

### Neue Funktion: `_generateWarmupNote(muscleTargets)`

```
Input:  muscleTargets (Array aus dayDef.muscleTargets)
Output: string (z.B. "Schulterrotation + leichte Liegestuetze, Hueftmobilitaet + Kniebeugen ohne Gewicht")

Algorithmus:
1. Sammle alle einzigartigen Muskeln aus muscleTargets[].muscle
2. Für jeden Muskel: lookup in WARMUP_BY_MUSCLE
3. Dedupliziere (manche Muskeln haben gleiche Warmups, z.B. front_delts + shoulders)
4. Begrenze auf MAX_WARMUP_ELEMENTS (4)
5. Priorisiere: Compound-Muskeln zuerst (die mit compound > 0 im Target)
6. Join mit ", "
7. Fallback: 'Leichtes Cardio + dynamisches Stretching' (wenn keine Matches)
```

### Integration in `_buildPlan()` (Zeile 443-450)

```js
// ALT:
note: 'Leichtes Cardio + dynamisches Stretching',

// NEU:
note: this._generateWarmupNote(dayDef.muscleTargets),
```

### Tests

- Chest-Day → Note enthält "Schulterrotation" und "Liegestuetze"
- Leg-Day → Note enthält "Hueftmobilitaet" und "Kniebeugen"
- Leere muscleTargets → Fallback-String
- Max 4 Elemente in der Note

---

## Rückwärtskompatibilität

| Szenario | Verhalten |
|----------|-----------|
| `trainingLevel` nicht gesetzt | Fallback `'intermediate'` |
| Bestehende gespeicherte Pläne | Keine Änderung (Plan-Objekt bleibt strukturell gleich) |
| Template ohne `equipmentFilter` | Score wird dynamisch berechnet |
| Unbekannter Sport in otherSports | Keine Recovery-Reduktion |
| `meta.periodization` fehlt in alten Plänen | UI prüft `meta.periodization?.weeklyNotes` |

---

## Implementierungsreihenfolge

1. `js/data/training-constants.js` erstellen (alle Konstanten)
2. Issue 2: `trainingLevel` Feld + Fallback
3. Issue 3: `_templateEquipmentScore()` + `_selectTemplate()` Erweiterung
4. Issue 1: `_createWeeklyVolumeBudget()` + `_remainingWeeklyBudget()` + Integration
5. Issue 5: `_sportMuscleLoad()` + Recovery-Integration
6. Issue 4: `_generatePeriodizationNotes()` + meta-Erweiterung
7. Issue 6: `_generateWarmupNote()` + Warmup-Ersetzung
