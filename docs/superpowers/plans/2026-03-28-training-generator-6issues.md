# Training Generator — 6 Evidence-Based Issues: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 evidence-based gaps in the training plan generator: weekly volume validation, user-level detection, equipment-aware template selection, periodization notes, cross-sport recovery, and muscle-specific warmups.

**Architecture:** Modularer Ansatz — neue Konstanten-Datei `js/data/training-constants.js` enthält alle Mappings und Budgets. 6 neue Funktionen in `training-generator.js` werden in `_buildPlan()` und `_selectTemplate()` integriert. Jedes Feature ist isoliert testbar. Rückwärtskompatibel durch Fallback-Defaults.

**Tech Stack:** Vanilla JS (ES Modules), Vitest, Alpine.js Mixin-Pattern

---

## File Structure

| Datei | Aktion | Verantwortung |
|-------|--------|---------------|
| `js/data/training-constants.js` | **NEU** | Alle neuen Konstanten, Mappings, Budgets |
| `js/features/training-generator.js` | **MODIFY** | 6 neue Funktionen + `_buildPlan()`/`_selectTemplate()` Integration |
| `js/features/training-generator.test.js` | **MODIFY** | Tests für alle 6 Issues |

---

## Task 1: Konstanten-Datei erstellen

**Files:**
- Create: `js/data/training-constants.js`
- Test: `js/features/training-generator.test.js`

- [ ] **Step 1: Erstelle `js/data/training-constants.js` mit allen Konstanten**

```js
// js/data/training-constants.js

// ── Issue 1: Woechentliches Volumen-Budget ──────────────────
// Schoenfeld et al. (2017): 10-20 Sets/Woche/Muskel optimal
export const WEEKLY_VOLUME_BUDGET = {
    OPTIMAL_MIN: 10,
    OPTIMAL_MAX: 20,
    BEGINNER_MAX: 12,
    INTERMEDIATE_MAX: 16,
    ADVANCED_MAX: 20,
    SMALL_MUSCLE_FACTOR: 0.6
};

// ── Issue 2: Trainings-Level ───────────────────────────────
export const TRAINING_LEVELS = ['beginner', 'intermediate', 'advanced'];

export const TRAINING_LEVEL_LABELS = {
    beginner:     'Anfaenger (0-12 Monate Trainingserfahrung)',
    intermediate: 'Fortgeschritten (1-3 Jahre)',
    advanced:     'Profi (3+ Jahre)'
};

// ── Issue 3: Equipment-Kompatibilitaet ──────────────────────
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
export const WARMUP_FALLBACK = 'Leichtes Cardio + dynamisches Stretching';
```

- [ ] **Step 2: Verifiziere, dass die Datei importierbar ist**

Run: `node -e "import('./js/data/training-constants.js').then(m => console.log(Object.keys(m).join(', ')))"`
Expected: Alle Export-Namen aufgelistet ohne Fehler

- [ ] **Step 3: Commit**

```bash
git add js/data/training-constants.js
git commit -m "feat: training-constants.js — alle Konstanten fuer 6 Issues"
```

---

## Task 2: Issue 2 — Training Level via Wizard-Step

**Files:**
- Modify: `js/features/training-generator.js:90-105` (generatorAnswers), `js/features/training-generator.js:356-357` (_buildPlan level)
- Test: `js/features/training-generator.test.js`

- [ ] **Step 1: Schreibe die fehlenden Tests**

Fuege am Ende von `training-generator.test.js` hinzu:

```js
// ── Issue 2: Training Level ──────────────────────────────────
describe('Issue 2 — Training Level', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('trainingLevel defaults to intermediate when not set', () => {
        mixin.generatorAnswers = defaultAnswers({ trainingLevel: null });
        const result = mixin._buildPlan();
        expect(result.meta.level).toBe('intermediate');
    });

    it('beginner with 3 days gets full-body template (not PPL)', () => {
        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'beginner',
            selectedDays: [0, 2, 4],
            goals: ['muscle']
        });
        const result = mixin._buildPlan();
        // Beginner templates are full-body or upper/lower, not PPL
        expect(result.meta.templateId).not.toMatch(/ppl/);
    });

    it('advanced level is passed to template selection', () => {
        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'advanced',
            selectedDays: [0, 1, 2, 3, 4],
            goals: ['muscle']
        });
        const result = mixin._buildPlan();
        expect(result.meta.level).toBe('advanced');
    });
});
```

- [ ] **Step 2: Fuehre Tests aus und verifiziere dass sie fehlschlagen**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -20`
Expected: 3 neue Tests FAIL (meta.level undefined, template selection nicht level-aware)

- [ ] **Step 3: Implementiere die Aenderungen**

In `js/features/training-generator.js`:

1. Import hinzufuegen (Zeile 6, nach den bestehenden Imports):
```js
import { WEEKLY_VOLUME_BUDGET, TRAINING_LEVELS, TRAINING_LEVEL_LABELS, EQUIPMENT_COMPATIBILITY_THRESHOLD, EQUIPMENT_SCORE_BONUS, EQUIPMENT_SCORE_EXCLUDE_BELOW, EQUIPMENT_SCORE_PENALTY, PERIODIZATION, SPORT_MUSCLE_LOAD, SPORT_RECOVERY_REDUCTION, WARMUP_BY_MUSCLE, MAX_WARMUP_ELEMENTS, WARMUP_FALLBACK } from '../data/training-constants.js';
```

2. `generatorAnswers` erweitern (nach Zeile 104, vor der schliessenden Klammer):
```js
        trainingLevel: null
```

3. `_buildPlan()` Zeile 356-357 aendern:
```js
        // 1. Template waehlen (level aus Wizard oder Fallback)
        const level = a.trainingLevel || 'intermediate';
        const template = this._selectTemplate(a, level, daysPerWeek);
```

4. `meta` Objekt erweitern (Zeile 724-729):
```js
        const meta = {
            templateName: adjustedTemplate.name,
            templateId: adjustedTemplate.id,
            restNote: primaryScheme.restNote,
            level,
            dayMetas
        };
```

In `js/features/training-generator.test.js`:

5. Mock fuer `training-constants.js` hinzufuegen (nach Zeile 23, vor dem Import):
```js
vi.mock('../data/training-constants.js', () => ({
    WEEKLY_VOLUME_BUDGET: { OPTIMAL_MIN: 10, OPTIMAL_MAX: 20, BEGINNER_MAX: 12, INTERMEDIATE_MAX: 16, ADVANCED_MAX: 20, SMALL_MUSCLE_FACTOR: 0.6 },
    TRAINING_LEVELS: ['beginner', 'intermediate', 'advanced'],
    TRAINING_LEVEL_LABELS: { beginner: 'Anfaenger', intermediate: 'Fortgeschritten', advanced: 'Profi' },
    EQUIPMENT_COMPATIBILITY_THRESHOLD: 0.7,
    EQUIPMENT_SCORE_BONUS: 8,
    EQUIPMENT_SCORE_EXCLUDE_BELOW: 0.5,
    EQUIPMENT_SCORE_PENALTY: -20,
    PERIODIZATION: { MESOCYCLE_WEEKS: 4, DELOAD_WEEK: 4, DELOAD_VOLUME_FACTOR: 0.5, WEEKLY_SET_INCREMENT: 1, WEEKLY_NOTES: ['W1', 'W2', 'W3', 'W4'] },
    SPORT_MUSCLE_LOAD: { fussball: { quadriceps: 0.8, hamstrings: 0.7, calves: 0.6 }, schwimmen: { back: 0.7, shoulders: 0.8 }, laufen: { quadriceps: 0.6, calves: 0.8 } },
    SPORT_RECOVERY_REDUCTION: 0.4,
    WARMUP_BY_MUSCLE: { chest: 'Schulterrotation + leichte Liegestuetze', back: 'Cat-Cow + Band Pull-Aparts', shoulders: 'Schulterkreisen + Band Dislocates', quadriceps: 'Hueftmobilitaet + Kniebeugen ohne Gewicht', hamstrings: 'Beinpendel + Rumaenisches Kreuzheben ohne Gewicht', glutes: 'Hueftkreise + Glute Bridges', biceps: 'Armkreisen + leichte Curls', triceps: 'Armkreisen + Trizeps-Stretches', abs: 'Cat-Cow + Dead Bugs', calves: 'Wadenheben einbeinig + Fusskreise', forearms: 'Handgelenk-Rotation + Finger-Spreizen', traps: 'Nackenkreisen + Schulterheben ohne Gewicht', lower_back: 'Cat-Cow + Beckenneigung', front_delts: 'Schulterrotation + Frontheben ohne Gewicht', side_delts: 'Schulterkreisen + Seitheben ohne Gewicht', rear_delts: 'Band Pull-Aparts + Reverse Flys ohne Gewicht' },
    MAX_WARMUP_ELEMENTS: 4,
    WARMUP_FALLBACK: 'Leichtes Cardio + dynamisches Stretching'
}));
```

6. `defaultAnswers` erweitern — `trainingLevel: null` hinzufuegen:
```js
function defaultAnswers(overrides = {}) {
    return {
        selectedDays: [0, 2, 4],
        equipment: 'full_gym',
        goals: ['muscle'],
        muscleFocus: 'balanced',
        hasOtherSports: false,
        otherSports: '',
        otherSportsDays: [],
        sessionDuration: 60,
        injuryRegions: [],
        injuryText: '',
        hasInjuries: false,
        avoidedEquipment: [],
        preferredEquipment: [],
        exercisePreferences: '',
        trainingLevel: null,
        ...overrides
    };
}
```

- [ ] **Step 4: Fuehre Tests aus und verifiziere dass alle bestehenden + neuen Tests passen**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -30`
Expected: Alle Tests PASS, inklusive der 3 neuen

- [ ] **Step 5: Commit**

```bash
git add js/features/training-generator.js js/features/training-generator.test.js
git commit -m "feat(Issue 2): Training Level via Wizard-Step mit Fallback auf intermediate"
```

---

## Task 3: Issue 3 — Equipment-Kompatibilitaet in Template-Selektion

**Files:**
- Modify: `js/features/training-generator.js:734-782` (_selectTemplate), neue Funktion `_templateEquipmentScore`
- Test: `js/features/training-generator.test.js`

- [ ] **Step 1: Schreibe die fehlenden Tests**

Fuege am Ende von `training-generator.test.js` hinzu:

```js
// ── Issue 3: Equipment-Kompatibilitaet ───────────────────────
describe('Issue 3 — Equipment Compatibility in Template Selection', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('bodyweight user does not get gym-heavy templates', () => {
        mixin.generatorAnswers = defaultAnswers({
            equipment: 'bodyweight',
            selectedDays: [0, 1, 2, 3, 4],
            goals: ['muscle'],
            trainingLevel: 'intermediate'
        });
        const result = mixin._buildPlan();
        // Template should not be a bro-split or machine-heavy variant
        expect(result.meta.templateId).not.toMatch(/bro/i);
    });

    it('_templateEquipmentScore returns 1.0 for full_gym with any template', () => {
        const fullGymEquipment = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band'];
        // Pick any template from the actual templates
        const result = mixin._buildPlan();
        // Full gym should be fully compatible (score close to 1.0)
        const score = mixin._templateEquipmentScore(
            { structure: [{ muscleTargets: [{ muscle: 'chest', compound: 1, isolation: 1 }] }] },
            fullGymEquipment
        );
        expect(score).toBeGreaterThanOrEqual(0.7);
    });

    it('_templateEquipmentScore returns lower score for bodyweight with machine-heavy targets', () => {
        const bodyweightEquipment = ['bodyweight', 'band'];
        // A target requiring many compound chest exercises — some need barbells
        const score = mixin._templateEquipmentScore(
            { structure: [
                { muscleTargets: [
                    { muscle: 'chest', compound: 2, isolation: 2 },
                    { muscle: 'back', compound: 2, isolation: 2 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 }
                ]}
            ]},
            bodyweightEquipment
        );
        // Bodyweight has fewer options for these muscles
        expect(score).toBeLessThan(1.0);
    });

    it('full_gym user still has all templates available', () => {
        mixin.generatorAnswers = defaultAnswers({
            equipment: 'full_gym',
            selectedDays: [0, 1, 2],
            goals: ['muscle']
        });
        // Should not throw or return undefined
        const result = mixin._buildPlan();
        expect(result.meta.templateId).toBeDefined();
    });
});
```

- [ ] **Step 2: Fuehre Tests aus und verifiziere dass sie fehlschlagen**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -20`
Expected: `_templateEquipmentScore` Tests FAIL (function not defined)

- [ ] **Step 3: Implementiere `_templateEquipmentScore` und erweitere `_selectTemplate`**

In `js/features/training-generator.js`, nach `_selectTemplate` (nach Zeile 782), fuege neue Funktion ein:

```js
    /**
     * Berechnet Equipment-Kompatibilitaets-Score fuer ein Template.
     * Prueft wie viele der benoetigten Uebungen mit dem verfuegbaren Equipment machbar sind.
     * @param {Object} template - Split-Template mit structure[].muscleTargets
     * @param {string[]} allowedEquipment - Erlaubte Equipment-Typen
     * @returns {number} Score 0-1 (1 = alle Uebungen machbar)
     */
    _templateEquipmentScore(template, allowedEquipment) {
        let totalNeeded = 0;
        let totalFulfilled = 0;

        for (const day of template.structure) {
            for (const target of day.muscleTargets) {
                const needed = (target.compound || 0) + (target.isolation || 0);
                if (needed === 0) continue;

                const availableForMuscle = exercises.filter(ex => {
                    if (ex.type !== 'strength') return false;
                    if (ex.equipment && !allowedEquipment.includes(ex.equipment)) return false;
                    return ex.primaryMuscle === target.muscle || (ex.muscleGroups && ex.muscleGroups.includes(target.muscle));
                });

                const compoundAvailable = availableForMuscle.filter(ex => ex.compound).length;
                const isolationAvailable = availableForMuscle.filter(ex => !ex.compound).length;

                const compoundFulfilled = Math.min(target.compound || 0, compoundAvailable);
                const isolationFulfilled = Math.min(target.isolation || 0, isolationAvailable);

                totalNeeded += needed;
                totalFulfilled += compoundFulfilled + isolationFulfilled;
            }
        }

        return totalNeeded === 0 ? 1 : totalFulfilled / totalNeeded;
    },
```

Aendere `_selectTemplate` Signatur und Scoring (Zeile 734):

```js
    _selectTemplate(answers, level, daysPerWeek, allowedEquipment) {
        const scoreTemplate = (t) => {
            let score = 0;
            if (t.daysPerWeek === daysPerWeek) score += 10;
            if (t.suitableFor.includes(level)) score += 5;
            for (const g of answers.goals) {
                if (t.goals.includes(g)) score += 3;
            }
            // Equipment-Kompatibilitaet
            if (allowedEquipment) {
                const eqScore = this._templateEquipmentScore(t, allowedEquipment);
                if (eqScore < EQUIPMENT_SCORE_EXCLUDE_BELOW) return -Infinity;
                if (eqScore >= EQUIPMENT_COMPATIBILITY_THRESHOLD) score += EQUIPMENT_SCORE_BONUS;
                else score += EQUIPMENT_SCORE_PENALTY;
            }
            return score;
        };
```

Aendere den Aufruf in `_buildPlan()` (Zeile 357):

```js
        const level = a.trainingLevel || 'intermediate';
        const allowedEquipment = EQUIPMENT_MAP[a.equipment] || EQUIPMENT_MAP.full_gym;
        const template = this._selectTemplate(a, level, daysPerWeek, allowedEquipment);
```

Aendere Zeile 363 (allowedEquipment nutzt jetzt Template-Filter oder die bereits definierte Variable):

```js
        const effectiveEquipment = adjustedTemplate.equipmentFilter || allowedEquipment;
```

Alle Referenzen auf `allowedEquipment` ab Zeile 363 muessen zu `effectiveEquipment` geaendert werden:
- Zeile 377: `!effectiveEquipment.includes(ex.equipment)`
- Zeile 552: `this._pickCardioExercise(available, effectiveEquipment, usedCardioIds, a)`

- [ ] **Step 4: Fuehre Tests aus**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -30`
Expected: Alle Tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/features/training-generator.js js/features/training-generator.test.js
git commit -m "feat(Issue 3): Equipment-Kompatibilitaets-Score in Template-Selektion"
```

---

## Task 4: Issue 1 — Weekly Volume Budget

**Files:**
- Modify: `js/features/training-generator.js:417-496` (_buildPlan volume logic), neue Funktionen
- Test: `js/features/training-generator.test.js`

- [ ] **Step 1: Schreibe die fehlenden Tests**

Fuege am Ende von `training-generator.test.js` hinzu:

```js
// ── Issue 1: Weekly Volume Validation ────────────────────────
describe('Issue 1 — Weekly Volume Budget', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('no muscle exceeds 20 sets per week (advanced, 6 days)', () => {
        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'advanced',
            selectedDays: [0, 1, 2, 3, 4, 5],
            goals: ['muscle'],
            sessionDuration: 60
        });
        const result = mixin._buildPlan();
        const weeklySets = {};
        for (const day of result.plan) {
            for (const ex of day) {
                if (ex.type !== 'strength' || !ex._muscles) continue;
                for (const m of ex._muscles) {
                    weeklySets[m] = (weeklySets[m] || 0) + (ex.sets || 0);
                }
            }
        }
        for (const [muscle, sets] of Object.entries(weeklySets)) {
            expect(sets, `${muscle} hat ${sets} Sets/Woche`).toBeLessThanOrEqual(20);
        }
    });

    it('beginner does not exceed 12 sets per week per muscle', () => {
        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'beginner',
            selectedDays: [0, 2, 4],
            goals: ['muscle'],
            sessionDuration: 60
        });
        const result = mixin._buildPlan();
        const weeklySets = {};
        for (const day of result.plan) {
            for (const ex of day) {
                if (ex.type !== 'strength' || !ex._muscles) continue;
                for (const m of ex._muscles) {
                    weeklySets[m] = (weeklySets[m] || 0) + (ex.sets || 0);
                }
            }
        }
        for (const [muscle, sets] of Object.entries(weeklySets)) {
            expect(sets, `${muscle} hat ${sets} Sets/Woche (beginner)`).toBeLessThanOrEqual(12);
        }
    });

    it('intermediate does not exceed 16 sets per week per muscle', () => {
        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'intermediate',
            selectedDays: [0, 1, 2, 3],
            goals: ['muscle'],
            sessionDuration: 60
        });
        const result = mixin._buildPlan();
        const weeklySets = {};
        for (const day of result.plan) {
            for (const ex of day) {
                if (ex.type !== 'strength' || !ex._muscles) continue;
                for (const m of ex._muscles) {
                    weeklySets[m] = (weeklySets[m] || 0) + (ex.sets || 0);
                }
            }
        }
        for (const [muscle, sets] of Object.entries(weeklySets)) {
            expect(sets, `${muscle} hat ${sets} Sets/Woche (intermediate)`).toBeLessThanOrEqual(16);
        }
    });

    it('session cap still applies as secondary constraint', () => {
        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'advanced',
            selectedDays: [0],
            goals: ['muscle'],
            sessionDuration: 90
        });
        const result = mixin._buildPlan();
        // Single day — session cap (10 sets) should still be respected
        for (const day of result.plan) {
            const setsPerMuscle = {};
            for (const ex of day) {
                if (ex.type !== 'strength' || !ex._muscles) continue;
                for (const m of ex._muscles) {
                    setsPerMuscle[m] = (setsPerMuscle[m] || 0) + (ex.sets || 0);
                }
            }
            for (const [muscle, sets] of Object.entries(setsPerMuscle)) {
                expect(sets, `${muscle} session cap`).toBeLessThanOrEqual(10);
            }
        }
    });

    it('_createWeeklyVolumeBudget returns correct values per level', () => {
        const budgetBeg = mixin._createWeeklyVolumeBudget('beginner');
        const budgetAdv = mixin._createWeeklyVolumeBudget('advanced');
        expect(budgetBeg.chest).toBe(12);
        expect(budgetBeg.biceps).toBe(Math.round(12 * 0.6));
        expect(budgetAdv.chest).toBe(20);
        expect(budgetAdv.biceps).toBe(Math.round(20 * 0.6));
    });
});
```

- [ ] **Step 2: Fuehre Tests aus und verifiziere dass sie fehlschlagen**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -20`
Expected: 5 neue Tests FAIL

- [ ] **Step 3: Implementiere `_createWeeklyVolumeBudget`, `_remainingWeeklyBudget` und integriere in `_buildPlan`**

In `js/features/training-generator.js`, fuege neue Funktionen ein (nach `_templateEquipmentScore`):

```js
    /**
     * Erstellt woechentliches Volumen-Budget pro Muskelgruppe basierend auf Trainings-Level.
     * @param {string} level - 'beginner' | 'intermediate' | 'advanced'
     * @returns {Object} Map: { muscle: maxSetsPerWeek }
     */
    _createWeeklyVolumeBudget(level) {
        const maxSets = level === 'beginner' ? WEEKLY_VOLUME_BUDGET.BEGINNER_MAX
            : level === 'advanced' ? WEEKLY_VOLUME_BUDGET.ADVANCED_MAX
            : WEEKLY_VOLUME_BUDGET.INTERMEDIATE_MAX;

        const budget = {};
        for (const muscle of MUSCLE_GROUPS) {
            const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(muscle);
            budget[muscle] = isSmall ? Math.round(maxSets * WEEKLY_VOLUME_BUDGET.SMALL_MUSCLE_FACTOR) : maxSets;
        }
        return budget;
    },

    /**
     * Berechnet verbleibendes woechentliches Budget fuer eine Muskelgruppe.
     * @param {string} muscle - Muskelgruppen-ID
     * @param {Object} weeklyBudget - Budget-Map aus _createWeeklyVolumeBudget
     * @param {Object} weeklyUsed - Bisher verbrauchte Sets pro Muskel
     * @returns {number} Verbleibende Sets
     */
    _remainingWeeklyBudget(muscle, weeklyBudget, weeklyUsed) {
        return Math.max(0, (weeklyBudget[muscle] || 0) - (weeklyUsed[muscle] || 0));
    },
```

Importiere `MUSCLE_GROUPS` — aendere Zeile 5:
```js
import { exercises, EQUIPMENT_MAP, MUSCLE_GROUPS } from '../data/exercises.js';
```

In `_buildPlan()`, nach `const dayMetas = [];` (Zeile 428), fuege ein:

```js
        // Issue 1: Weekly Volume Budget — beschraenkt Gesamt-Sets pro Muskel pro Woche
        const weeklyBudget = this._createWeeklyVolumeBudget(level);
        const weeklyUsed = {};
```

In der Volume-Cap-Logik (Zeilen 469-496 fuer Compounds und 516-543 fuer Isolations), ersetze die blocked/cap Berechnung. Fuer BEIDE Bloecke (compounds und isolations), aendere die Berechnung:

Compounds (ersetze Zeilen 469-496):
```js
                    // Volume cap check — session + weekly budget
                    const muscles = formatted._muscles || [];
                    let blocked = false;
                    for (const m of muscles) {
                        const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(m);
                        const sessionCap = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                        const sessionRemaining = sessionCap - (daySetsPerMuscle[m] || 0);
                        const weeklyRemaining = this._remainingWeeklyBudget(m, weeklyBudget, weeklyUsed);
                        const effectiveRemaining = Math.min(sessionRemaining, weeklyRemaining);
                        if (effectiveRemaining < PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE) {
                            blocked = true;
                            break;
                        }
                    }
                    if (blocked) continue;

                    // Cap sets if needed for any muscle
                    let cappedSets = formatted.sets || 3;
                    for (const m of muscles) {
                        const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(m);
                        const sessionCap = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                        const sessionRemaining = sessionCap - (daySetsPerMuscle[m] || 0);
                        const weeklyRemaining = this._remainingWeeklyBudget(m, weeklyBudget, weeklyUsed);
                        cappedSets = Math.min(cappedSets, sessionRemaining, weeklyRemaining);
                    }
                    cappedSets = Math.max(cappedSets, PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE);
                    formatted.sets = cappedSets;

                    // Track volume (session + weekly)
                    for (const m of muscles) {
                        daySetsPerMuscle[m] = (daySetsPerMuscle[m] || 0) + cappedSets;
                        weeklyUsed[m] = (weeklyUsed[m] || 0) + cappedSets;
                    }
```

Isolations (ersetze Zeilen 516-543 mit identischer Logik — gleicher Code wie oben).

- [ ] **Step 4: Fuehre Tests aus**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -30`
Expected: Alle Tests PASS — weekly caps eingehalten, session caps weiterhin eingehalten

- [ ] **Step 5: Commit**

```bash
git add js/features/training-generator.js js/features/training-generator.test.js
git commit -m "feat(Issue 1): Weekly Volume Budget pro Muskelgruppe — level-basiert"
```

---

## Task 5: Issue 5 — Other Sports Recovery Integration

**Files:**
- Modify: `js/features/training-generator.js:657-674` (otherSports), neue Funktion `_sportMuscleLoad`
- Test: `js/features/training-generator.test.js`

- [ ] **Step 1: Schreibe die fehlenden Tests**

Fuege am Ende von `training-generator.test.js` hinzu:

```js
// ── Issue 5: Other Sports Recovery ───────────────────────────
describe('Issue 5 — Other Sports Recovery', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('_sportMuscleLoad returns correct profile for known sport', () => {
        const load = mixin._sportMuscleLoad('Fussball');
        expect(load.quadriceps).toBe(0.8);
        expect(load.hamstrings).toBe(0.7);
    });

    it('_sportMuscleLoad returns empty object for unknown sport', () => {
        const load = mixin._sportMuscleLoad('Curling');
        expect(Object.keys(load).length).toBe(0);
    });

    it('soccer on Wednesday reduces leg volume on adjacent Thursday training', () => {
        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'intermediate',
            selectedDays: [3],  // Thursday only
            hasOtherSports: true,
            otherSports: 'Fussball',
            otherSportsDays: [2],  // Wednesday
            goals: ['muscle'],
            sessionDuration: 60
        });
        const withSport = mixin._buildPlan();

        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'intermediate',
            selectedDays: [3],  // Thursday only
            hasOtherSports: false,
            otherSports: '',
            otherSportsDays: [],
            goals: ['muscle'],
            sessionDuration: 60
        });
        const withoutSport = mixin._buildPlan();

        // Count quad sets on Thursday
        const quadSetsWith = withSport.plan[3]
            .filter(ex => ex.type === 'strength' && (ex._muscles || []).includes('quadriceps'))
            .reduce((sum, ex) => sum + (ex.sets || 0), 0);
        const quadSetsWithout = withoutSport.plan[3]
            .filter(ex => ex.type === 'strength' && (ex._muscles || []).includes('quadriceps'))
            .reduce((sum, ex) => sum + (ex.sets || 0), 0);

        expect(quadSetsWith).toBeLessThanOrEqual(quadSetsWithout);
    });

    it('non-adjacent sport day does not affect training volume', () => {
        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'intermediate',
            selectedDays: [0],  // Monday
            hasOtherSports: true,
            otherSports: 'Fussball',
            otherSportsDays: [4],  // Friday — 4 days apart
            goals: ['muscle'],
            sessionDuration: 60
        });
        const withSport = mixin._buildPlan();

        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'intermediate',
            selectedDays: [0],
            hasOtherSports: false,
            otherSports: '',
            otherSportsDays: [],
            goals: ['muscle'],
            sessionDuration: 60
        });
        const withoutSport = mixin._buildPlan();

        // Volume should be identical (or very close) since sport is far away
        const totalWith = withSport.plan[0].filter(ex => ex.type === 'strength').reduce((s, ex) => s + (ex.sets || 0), 0);
        const totalWithout = withoutSport.plan[0].filter(ex => ex.type === 'strength').reduce((s, ex) => s + (ex.sets || 0), 0);
        expect(totalWith).toBe(totalWithout);
    });
});
```

- [ ] **Step 2: Fuehre Tests aus und verifiziere dass sie fehlschlagen**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -20`
Expected: `_sportMuscleLoad` Tests FAIL (function not defined), volume Tests may FAIL

- [ ] **Step 3: Implementiere `_sportMuscleLoad` und Recovery-Integration**

In `js/features/training-generator.js`, fuege neue Funktion ein (nach `_remainingWeeklyBudget`):

```js
    /**
     * Ermittelt Muskelbelastungs-Profil fuer eine Sportart.
     * Matched den Sport-Namen fuzzy gegen SPORT_MUSCLE_LOAD Keys.
     * @param {string} sportName - Name der Sportart (z.B. "Fussball", "Swimming")
     * @returns {Object} Map: { muscle: loadFactor 0-1 } oder {} bei unbekanntem Sport
     */
    _sportMuscleLoad(sportName) {
        if (!sportName) return {};
        const normalized = sportName.toLowerCase();
        for (const [key, profile] of Object.entries(SPORT_MUSCLE_LOAD)) {
            if (normalized.includes(key)) return { ...profile };
        }
        return {};
    },
```

In `_buildPlan()`, nach der weeklyBudget-Erstellung (nach `const weeklyUsed = {};`), fuege ein:

```js
        // Issue 5: Other Sports Recovery — reduziere Budget fuer belastete Muskeln
        if (a.hasOtherSports && a.otherSportsDays.length > 0) {
            const sportLoad = this._sportMuscleLoad(a.otherSports);
            const reducedMuscles = new Set();

            for (const sportDayIdx of a.otherSportsDays) {
                for (const trainDayIdx of trainingDayIndices) {
                    const gap = Math.abs(trainDayIdx - sportDayIdx);
                    const wrapGap = Math.min(gap, 7 - gap);
                    if (wrapGap <= 1) {
                        for (const [muscle, load] of Object.entries(sportLoad)) {
                            if (load >= 0.5 && !reducedMuscles.has(muscle)) {
                                weeklyBudget[muscle] = Math.round(
                                    (weeklyBudget[muscle] || 0) * (1 - SPORT_RECOVERY_REDUCTION * load)
                                );
                                reducedMuscles.add(muscle);
                            }
                        }
                    }
                }
            }
        }
```

Auch in der Recovery-Validierung (Zeilen 657-674), erweitere `weeklyMuscleSchedule` fuer Sporttage:

```js
        // Add other sports days to plan + Recovery-Integration
        if (a.hasOtherSports && a.otherSportsDays.length > 0) {
            const sportName = a.otherSports || 'Andere Sportart';
            const sportLoad = this._sportMuscleLoad(a.otherSports);
            for (const dayIdx of a.otherSportsDays) {
                if (!plan[dayIdx]) plan[dayIdx] = [];
                if (plan[dayIdx].length === 0) {
                    plan[dayIdx].push({
                        name: sportName,
                        type: 'cardio',
                        duration: '',
                        note: '',
                        _isOtherSport: true
                    });
                    dayMetas.push({ dayIndex: dayIdx, label: sportName, estimatedTime: 0, isOtherSport: true });
                }
                // Issue 5: Sport-Muskeln in Recovery-Tracking eintragen
                const sportMuscles = new Set(Object.keys(sportLoad).filter(m => sportLoad[m] >= 0.5));
                if (sportMuscles.size > 0) {
                    weeklyMuscleSchedule[dayIdx] = weeklyMuscleSchedule[dayIdx]
                        ? new Set([...weeklyMuscleSchedule[dayIdx], ...sportMuscles])
                        : sportMuscles;
                }
            }
        }
```

- [ ] **Step 4: Fuehre Tests aus**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -30`
Expected: Alle Tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/features/training-generator.js js/features/training-generator.test.js
git commit -m "feat(Issue 5): Other Sports Recovery — Muskelbelastung reduziert benachbartes Training"
```

---

## Task 6: Issue 4 — Periodisierung (Notes-basiert)

**Files:**
- Modify: `js/features/training-generator.js:724-731` (meta), neue Funktion `_generatePeriodizationNotes`
- Test: `js/features/training-generator.test.js`

- [ ] **Step 1: Schreibe die fehlenden Tests**

Fuege am Ende von `training-generator.test.js` hinzu:

```js
// ── Issue 4: Periodisierung ──────────────────────────────────
describe('Issue 4 — Periodization Notes', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('meta contains periodization with 4 weekly notes', () => {
        mixin.generatorAnswers = defaultAnswers();
        const result = mixin._buildPlan();
        expect(result.meta.periodization).toBeDefined();
        expect(result.meta.periodization.weeklyNotes).toHaveLength(4);
        expect(result.meta.periodization.mesocycleWeeks).toBe(4);
    });

    it('deload reminder mentions 50% volume', () => {
        mixin.generatorAnswers = defaultAnswers();
        const result = mixin._buildPlan();
        expect(result.meta.periodization.deloadReminder).toContain('50%');
    });

    it('weekly notes contain progression keywords', () => {
        mixin.generatorAnswers = defaultAnswers();
        const result = mixin._buildPlan();
        const notes = result.meta.periodization.weeklyNotes;
        // Week 1 — basis
        expect(notes[0].toLowerCase()).toContain('basisvolumen');
        // Week 4 — deload
        expect(notes[3].toLowerCase()).toContain('deload');
    });
});
```

- [ ] **Step 2: Fuehre Tests aus und verifiziere dass sie fehlschlagen**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -20`
Expected: 3 Tests FAIL (meta.periodization undefined)

- [ ] **Step 3: Implementiere `_generatePeriodizationNotes`**

In `js/features/training-generator.js`, fuege neue Funktion ein (nach `_sportMuscleLoad`):

```js
    /**
     * Generiert Periodisierungs-Hinweise fuer den Mesozyklus (4 Wochen).
     * @returns {Object} { mesocycleWeeks, weeklyNotes, deloadReminder }
     */
    _generatePeriodizationNotes() {
        return {
            mesocycleWeeks: PERIODIZATION.MESOCYCLE_WEEKS,
            weeklyNotes: [...PERIODIZATION.WEEKLY_NOTES],
            deloadReminder: 'Nach 3 Wochen Training: Deload-Woche einlegen (50% Volumen, gleiches Gewicht)'
        };
    },
```

In `_buildPlan()`, vor dem `const meta = {` Block:

```js
        // Issue 4: Periodisierung
        const periodization = this._generatePeriodizationNotes();
```

Erweitere das `meta` Objekt:

```js
        const meta = {
            templateName: adjustedTemplate.name,
            templateId: adjustedTemplate.id,
            restNote: primaryScheme.restNote,
            level,
            dayMetas,
            periodization
        };
```

- [ ] **Step 4: Fuehre Tests aus**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -30`
Expected: Alle Tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/features/training-generator.js js/features/training-generator.test.js
git commit -m "feat(Issue 4): Periodisierung — Mesozyklus-Notes mit Deload-Reminder"
```

---

## Task 7: Issue 6 — Muskelspezifisches Warmup

**Files:**
- Modify: `js/features/training-generator.js:443-450` (warmup), neue Funktion `_generateWarmupNote`
- Test: `js/features/training-generator.test.js`

- [ ] **Step 1: Schreibe die fehlenden Tests**

Fuege am Ende von `training-generator.test.js` hinzu:

```js
// ── Issue 6: Muskelspezifisches Warmup ───────────────────────
describe('Issue 6 — Muscle-Specific Warmup', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('_generateWarmupNote returns muscle-specific warmup for chest targets', () => {
        const note = mixin._generateWarmupNote([
            { muscle: 'chest', compound: 1, isolation: 1 },
            { muscle: 'triceps', compound: 0, isolation: 1 }
        ]);
        expect(note).toContain('Schulterrotation');
        expect(note).toContain('Liegestuetze');
    });

    it('_generateWarmupNote returns leg-specific warmup for leg targets', () => {
        const note = mixin._generateWarmupNote([
            { muscle: 'quadriceps', compound: 1, isolation: 0 },
            { muscle: 'hamstrings', compound: 1, isolation: 0 },
            { muscle: 'glutes', compound: 0, isolation: 1 }
        ]);
        expect(note).toContain('Hueftmobilitaet');
        expect(note).toContain('Kniebeugen');
    });

    it('_generateWarmupNote returns fallback for empty targets', () => {
        const note = mixin._generateWarmupNote([]);
        expect(note).toBe('Leichtes Cardio + dynamisches Stretching');
    });

    it('_generateWarmupNote limits to 4 elements', () => {
        const note = mixin._generateWarmupNote([
            { muscle: 'chest', compound: 1, isolation: 0 },
            { muscle: 'back', compound: 1, isolation: 0 },
            { muscle: 'quadriceps', compound: 1, isolation: 0 },
            { muscle: 'hamstrings', compound: 1, isolation: 0 },
            { muscle: 'shoulders', compound: 1, isolation: 0 },
            { muscle: 'biceps', compound: 0, isolation: 1 }
        ]);
        const elements = note.split(', ');
        expect(elements.length).toBeLessThanOrEqual(4);
    });

    it('warmup note in generated plan is not the generic fallback', () => {
        mixin.generatorAnswers = defaultAnswers();
        const result = mixin._buildPlan();
        const trainingDays = result.plan.filter(day => day.length > 0);
        for (const day of trainingDays) {
            const warmup = day.find(ex => ex._isWarmup);
            if (warmup) {
                // Should NOT be the generic string (unless no muscleTargets match)
                expect(warmup.note).not.toBe('Leichtes Cardio + dynamisches Stretching');
            }
        }
    });
});
```

- [ ] **Step 2: Fuehre Tests aus und verifiziere dass sie fehlschlagen**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -20`
Expected: `_generateWarmupNote` Tests FAIL (function not defined), warmup note Test FAIL

- [ ] **Step 3: Implementiere `_generateWarmupNote` und ersetze hardcoded Warmup**

In `js/features/training-generator.js`, fuege neue Funktion ein (nach `_generatePeriodizationNotes`):

```js
    /**
     * Generiert muskelspezifische Warmup-Note basierend auf den Muskelzielen des Tages.
     * Priorisiert Compound-Muskeln und begrenzt auf MAX_WARMUP_ELEMENTS.
     * @param {Array} muscleTargets - Array aus { muscle, compound, isolation }
     * @returns {string} Warmup-Beschreibung
     */
    _generateWarmupNote(muscleTargets) {
        if (!muscleTargets || muscleTargets.length === 0) return WARMUP_FALLBACK;

        // Sortiere: Compound-Muskeln zuerst (compound > 0)
        const sorted = [...muscleTargets].sort((a, b) => (b.compound || 0) - (a.compound || 0));

        const seen = new Set();
        const elements = [];
        for (const target of sorted) {
            if (elements.length >= MAX_WARMUP_ELEMENTS) break;
            const warmup = WARMUP_BY_MUSCLE[target.muscle];
            if (warmup && !seen.has(warmup)) {
                seen.add(warmup);
                elements.push(warmup);
            }
        }

        return elements.length > 0 ? elements.join(', ') : WARMUP_FALLBACK;
    },
```

In `_buildPlan()`, ersetze die Warmup-Erstellung (Zeilen 443-450):

```js
            // Warm-up — muskelspezifisch (Issue 6)
            const warmupMin = PHYSIO_CONSTRAINTS.WARMUP_MINUTES[a.sessionDuration] || 5;
            dayExercises.push({
                name: 'Aufwaermen',
                type: 'cardio',
                duration: warmupMin + ' min',
                note: this._generateWarmupNote(dayDef.muscleTargets),
                _isWarmup: true
            });
```

- [ ] **Step 4: Fuehre Tests aus**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | tail -30`
Expected: Alle Tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/features/training-generator.js js/features/training-generator.test.js
git commit -m "feat(Issue 6): Muskelspezifisches Warmup statt generischem Stretching"
```

---

## Task 8: Finale Regression-Tests und Cleanup

**Files:**
- Modify: `js/features/training-generator.test.js` (nur falls noetig)

- [ ] **Step 1: Fuehre die gesamte Test-Suite aus**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -40`
Expected: ALLE Tests PASS — keine Regressionen

- [ ] **Step 2: Verifiziere Rueckwaertskompatibilitaet**

Run: `npx vitest run js/features/training-generator.test.js --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|✓|×)" | head -40`
Expected: Alle bestehenden Tests (Constraint 1-4, Edge Cases) weiterhin PASS

- [ ] **Step 3: Pruefe dass alle Imports korrekt aufgeloest werden**

Run: `node -e "import('./js/features/training-generator.js').then(() => console.log('OK')).catch(e => console.error(e.message))"`
Expected: "OK"

- [ ] **Step 4: Finaler Commit falls Fixes noetig waren**

```bash
git add -A
git commit -m "fix: finale Regression-Fixes nach 6-Issue Refactoring"
```

Nur ausfuehren falls es tatsaechlich Aenderungen gab. Sonst ueberspringen.
