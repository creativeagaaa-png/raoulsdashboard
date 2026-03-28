# Training-Generator Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Trainingsplan-Generator mit physiologischen Constraints absichern, die Exercise-DB korrigieren/erweitern, und alle bekannten Bugs fixen — ohne bestehende Tests zu brechen.

**Architecture:** Constraint-Layer als `PHYSIO_CONSTRAINTS` Objekt am Anfang von `training-generator.js`. Die bestehende `_buildPlan`-Pipeline wird an 4 Injection-Points mit Constraint-Checks angereichert. Exercise-DB bekommt neue Uebungen und ein `movementPattern`-Feld. Neues `strength` REPS_SCHEME.

**Tech Stack:** Vanilla JS (ES Modules), Alpine.js Mixin-Pattern, Vitest

**Spec:** `docs/superpowers/specs/2026-03-28-training-generator-refactor-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `js/data/split-templates.js` | Modify | Neues `strength` REPS_SCHEME |
| `js/data/exercises.js` | Modify | Neue Uebungen, `movementPattern`-Feld |
| `js/features/training-generator.js` | Modify | PHYSIO_CONSTRAINTS, Bug-Fixes, Constraint-Enforcement |
| `js/features/training-generator.test.js` | Create | Constraint-Tests, Edge-Case-Tests |

---

### Task 1: Neues strength REPS_SCHEME

**Files:**
- Modify: `js/data/split-templates.js:3-8`

- [ ] **Step 1: Add strength scheme to REPS_SCHEMES**

In `js/data/split-templates.js`, add `strength` entry to the `REPS_SCHEMES` object:

```js
export const REPS_SCHEMES = {
    strength:   { sets: 5, reps: '3-6',   restNote: '2-3 min Pause' },
    muscle:     { sets: 4, reps: '8-12',  restNote: '60-90s Pause' },
    fat_loss:   { sets: 3, reps: '12-15', restNote: '30-60s Pause' },
    endurance:  { sets: 3, reps: '15-20', restNote: '30s Pause' },
    general:    { sets: 3, reps: '10-12', restNote: '60s Pause' }
};
```

- [ ] **Step 2: Run existing tests to verify no breakage**

Run: `npx vitest run`
Expected: All existing tests in `training.test.js` and `workout.test.js` PASS

- [ ] **Step 3: Commit**

```bash
git add js/data/split-templates.js
git commit -m "feat: strength REPS_SCHEME ergaenzen (5x3-6, 2-3 min Pause)"
```

---

### Task 2: Exercise-DB — movementPattern-Feld fuer bestehende Compounds

**Files:**
- Modify: `js/data/exercises.js`

- [ ] **Step 1: Add movementPattern to all existing compound exercises**

Add a `movementPattern` field to every exercise in `exercises.js`. Use these patterns:

**Compounds:**
- `horizontal_push`: barbell-bench-press, dumbbell-bench-press, incline-barbell-bench, incline-dumbbell-bench, chest-press-machine, push-ups, band-chest-press, archer-push-ups, weighted-dips, dips-chest
- `vertical_push`: overhead-press, dumbbell-overhead-press, shoulder-press-machine, pike-push-ups, band-overhead-press, handstand-push-ups
- `horizontal_pull`: barbell-row, dumbbell-row, cable-row, seated-row-machine, inverted-rows, band-rows
- `vertical_pull`: lat-pulldown, pull-ups, chin-ups, muscle-ups, weighted-pull-ups
- `hip_hinge`: deadlift, deficit-deadlift, romanian-deadlift, dumbbell-rdl, good-mornings, single-leg-rdl, band-good-mornings, sumo-deadlift, hip-thrust, cable-pull-through, banded-hip-thrust
- `squat`: barbell-squat, goblet-squat, leg-press, bodyweight-squat, hack-squat, front-squat, band-squats, pistol-squat
- `lunge`: lunges, bulgarian-split-squat, step-ups, box-jumps
- `carry`: farmers-walk

**Isolations and non-strength:** set `movementPattern: 'isolation'`

Example for bench press:
```js
{
    id: 'barbell-bench-press',
    name: 'Bankdruecken (Langhantel)',
    // ... existing fields ...
    movementPattern: 'horizontal_push',
    priority: 5
},
```

Example for cable fly:
```js
{
    id: 'cable-fly',
    name: 'Cable Flys',
    // ... existing fields ...
    movementPattern: 'isolation',
    priority: 3
},
```

- [ ] **Step 2: Run existing tests**

Run: `npx vitest run`
Expected: All PASS (movementPattern is a new field, no existing code reads it yet)

- [ ] **Step 3: Commit**

```bash
git add js/data/exercises.js
git commit -m "feat: movementPattern-Feld fuer alle Uebungen ergaenzen"
```

---

### Task 3: Exercise-DB — Neue Uebungen

**Files:**
- Modify: `js/data/exercises.js`

- [ ] **Step 1: Add new exercises before the CARDIO section**

Insert these exercises into `exercises.js` in the appropriate muscle-group sections:

```js
// ── In SHOULDERS section (after band-face-pulls, before BICEPS) ──
{
    id: 'front-raise-dumbbell',
    name: 'Frontheben (Kurzhanteln)',
    type: 'strength',
    muscleGroups: ['shoulders', 'front_delts'],
    primaryMuscle: 'shoulders',
    equipment: 'dumbbell',
    difficulty: 'beginner',
    compound: false,
    movementPattern: 'isolation',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultWeight: 0,
    tags: ['push'],
    avoidWhenInjured: ['schulter'],
    priority: 3
},
{
    id: 'front-raise-cable',
    name: 'Frontheben (Kabel)',
    type: 'strength',
    muscleGroups: ['shoulders', 'front_delts'],
    primaryMuscle: 'shoulders',
    equipment: 'cable',
    difficulty: 'beginner',
    compound: false,
    movementPattern: 'isolation',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultWeight: 0,
    tags: ['push'],
    avoidWhenInjured: ['schulter'],
    priority: 3
},

// ── In HAMSTRINGS section (after band-good-mornings, before GLUTES) ──
{
    id: 'sliding-leg-curl',
    name: 'Sliding Leg Curls',
    type: 'strength',
    muscleGroups: ['hamstrings'],
    primaryMuscle: 'hamstrings',
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    compound: false,
    movementPattern: 'isolation',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultWeight: 0,
    tags: ['legs'],
    avoidWhenInjured: ['knie'],
    priority: 3
},

// ── In CALVES section (after bodyweight-calf-raise) ──
{
    id: 'dumbbell-calf-raise',
    name: 'Wadenheben (Kurzhanteln)',
    type: 'strength',
    muscleGroups: ['calves'],
    primaryMuscle: 'calves',
    equipment: 'dumbbell',
    difficulty: 'beginner',
    compound: false,
    movementPattern: 'isolation',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultWeight: 0,
    tags: ['legs'],
    avoidWhenInjured: ['wade', 'achilles'],
    priority: 3
},
{
    id: 'band-calf-raise',
    name: 'Wadenheben (Band)',
    type: 'strength',
    muscleGroups: ['calves'],
    primaryMuscle: 'calves',
    equipment: 'band',
    difficulty: 'beginner',
    compound: false,
    movementPattern: 'isolation',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultWeight: 0,
    tags: ['legs'],
    avoidWhenInjured: ['wade', 'achilles'],
    priority: 2
},

// ── In TRAPS section (after rack-pulls) ──
{
    id: 'cable-shrugs',
    name: 'Schulterheben (Kabel)',
    type: 'strength',
    muscleGroups: ['traps'],
    primaryMuscle: 'traps',
    equipment: 'cable',
    difficulty: 'beginner',
    compound: false,
    movementPattern: 'isolation',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultWeight: 0,
    tags: ['pull'],
    avoidWhenInjured: ['schulter', 'nacken'],
    priority: 3
},

// ── In LOWER_BACK section (after back-extension-machine) ──
{
    id: 'superman',
    name: 'Superman',
    type: 'strength',
    muscleGroups: ['lower_back', 'glutes'],
    primaryMuscle: 'lower_back',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    compound: false,
    movementPattern: 'isolation',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultWeight: 0,
    tags: ['core'],
    avoidWhenInjured: ['ruecken'],
    priority: 3
},
{
    id: 'bird-dog',
    name: 'Bird-Dog',
    type: 'strength',
    muscleGroups: ['lower_back', 'abs', 'glutes'],
    primaryMuscle: 'lower_back',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    compound: false,
    movementPattern: 'isolation',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultWeight: 0,
    tags: ['core'],
    avoidWhenInjured: ['ruecken'],
    priority: 3
}
```

- [ ] **Step 2: Run existing tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add js/data/exercises.js
git commit -m "feat: 9 neue Uebungen (Shoulders-Iso, Hamstring-BW, Calves, Traps, Lower-Back)"
```

---

### Task 4: PHYSIO_CONSTRAINTS + Shared Helper — Test First

**Files:**
- Create: `js/features/training-generator.test.js`
- Modify: `js/features/training-generator.js:1-7`

- [ ] **Step 1: Create test file with constraint constant tests**

Create `js/features/training-generator.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies that training-generator.js imports
vi.mock('../utils/constants.js', () => ({
    WEEKDAYS: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
    WEEKDAY_SHORT: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    EQUIPMENT_LABELS: { barbell: 'Langhantel', dumbbell: 'Kurzhantel', machine: 'Maschine', cable: 'Kabelzug', bodyweight: 'Koerpergewicht', band: 'Widerstandsband' },
    MUSCLE_LABELS: {},
    INJURY_REGIONS: [],
    INJURY_KEYWORD_MAP: {},
    UPPER_MUSCLES: ['chest', 'back', 'shoulders', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'traps', 'forearms'],
    LOWER_MUSCLES: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
    CORE_MUSCLES: ['abs', 'lower_back']
}));

vi.mock('../utils/formatting.js', () => ({
    getTodayWeekdayIndex: vi.fn(() => 0)
}));

vi.mock('../store/supabase.js', () => ({
    saveTrainingPlan: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined)
}));

const { trainingGeneratorMixin } = await import('./training-generator.js');

function createMixin(overrides = {}) {
    return {
        ...trainingGeneratorMixin(),
        trainingPlan: [[], [], [], [], [], [], []],
        workoutLogs: [],
        confirmModal: { show: false },
        showToast: vi.fn(),
        saveTrainingPlan: vi.fn().mockResolvedValue(undefined),
        saveSettings: vi.fn().mockResolvedValue(undefined),
        recalculateCalories: vi.fn(),
        openTraining: vi.fn(),
        ...overrides
    };
}

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
        ...overrides
    };
}

describe('PHYSIO_CONSTRAINTS enforcement', () => {
    let mixin;

    beforeEach(() => {
        mixin = createMixin();
    });

    describe('Max sets per muscle per session', () => {
        it('no muscle group exceeds 10 sets in a single session', () => {
            mixin.generatorAnswers = defaultAnswers();
            const result = mixin._buildPlan();

            for (const day of result.plan) {
                const setsPerMuscle = {};
                for (const ex of day) {
                    if (ex.type !== 'strength' || !ex._muscles) continue;
                    for (const m of ex._muscles) {
                        setsPerMuscle[m] = (setsPerMuscle[m] || 0) + (ex.sets || 0);
                    }
                }
                for (const [muscle, sets] of Object.entries(setsPerMuscle)) {
                    expect(sets, `${muscle} hat ${sets} Sets`).toBeLessThanOrEqual(10);
                }
            }
        });

        it('small muscles do not exceed 6 sets in a single session', () => {
            mixin.generatorAnswers = defaultAnswers({ goals: ['muscle'] });
            const result = mixin._buildPlan();
            const smallMuscles = ['biceps', 'triceps', 'calves', 'forearms', 'rear_delts', 'side_delts', 'front_delts'];

            for (const day of result.plan) {
                const setsPerMuscle = {};
                for (const ex of day) {
                    if (ex.type !== 'strength' || !ex._muscles) continue;
                    for (const m of ex._muscles) {
                        setsPerMuscle[m] = (setsPerMuscle[m] || 0) + (ex.sets || 0);
                    }
                }
                for (const [muscle, sets] of Object.entries(setsPerMuscle)) {
                    if (smallMuscles.includes(muscle)) {
                        expect(sets, `Small muscle ${muscle} hat ${sets} Sets`).toBeLessThanOrEqual(6);
                    }
                }
            }
        });
    });

    describe('Max exercises per session', () => {
        it('no day exceeds 10 exercises total', () => {
            mixin.generatorAnswers = defaultAnswers({ sessionDuration: 90 });
            const result = mixin._buildPlan();

            for (const day of result.plan) {
                if (day.length === 0) continue;
                expect(day.length, `Day has ${day.length} exercises`).toBeLessThanOrEqual(10);
            }
        });
    });

    describe('Exercise ordering — compounds before isolations', () => {
        it('compound exercises appear before isolation exercises for same muscle group', () => {
            mixin.generatorAnswers = defaultAnswers();
            const result = mixin._buildPlan();

            for (const day of result.plan) {
                const strengthExercises = day.filter(ex => ex.type === 'strength');
                // Group by primary muscle, check ordering
                const muscleOrder = {};
                for (let i = 0; i < strengthExercises.length; i++) {
                    const ex = strengthExercises[i];
                    const muscle = ex._primaryMuscle;
                    if (!muscle) continue;
                    if (!muscleOrder[muscle]) muscleOrder[muscle] = [];
                    muscleOrder[muscle].push({ index: i, compound: ex._compound });
                }
                for (const [muscle, entries] of Object.entries(muscleOrder)) {
                    let seenIsolation = false;
                    for (const entry of entries) {
                        if (!entry.compound) seenIsolation = true;
                        if (entry.compound && seenIsolation) {
                            throw new Error(`Compound after isolation for ${muscle}`);
                        }
                    }
                }
            }
        });
    });

    describe('Sets per exercise limits', () => {
        it('no exercise has more than 5 sets', () => {
            mixin.generatorAnswers = defaultAnswers({ sessionDuration: 90 });
            const result = mixin._buildPlan();

            for (const day of result.plan) {
                for (const ex of day) {
                    if (ex.type === 'strength' && ex.sets) {
                        expect(ex.sets, `${ex.name} hat ${ex.sets} Sets`).toBeLessThanOrEqual(5);
                    }
                }
            }
        });

        it('no exercise has fewer than 2 sets', () => {
            mixin.generatorAnswers = defaultAnswers({ sessionDuration: 30 });
            const result = mixin._buildPlan();

            for (const day of result.plan) {
                for (const ex of day) {
                    if (ex.type === 'strength' && ex.sets) {
                        expect(ex.sets, `${ex.name} hat ${ex.sets} Sets`).toBeGreaterThanOrEqual(2);
                    }
                }
            }
        });
    });

    describe('Cardio duration cap', () => {
        it('no cardio exercise exceeds 20 minutes', () => {
            mixin.generatorAnswers = defaultAnswers({ goals: ['fat_loss'], sessionDuration: 90 });
            const result = mixin._buildPlan();

            for (const day of result.plan) {
                for (const ex of day) {
                    if (ex.type === 'cardio' && ex.duration && !ex._isWarmup && !ex._isCooldown) {
                        const mins = parseInt(ex.duration);
                        if (!isNaN(mins)) {
                            expect(mins, `${ex.name}: ${ex.duration}`).toBeLessThanOrEqual(20);
                        }
                    }
                }
            }
        });
    });

    describe('Movement pattern dedup', () => {
        it('no two compounds with same movementPattern on same day', () => {
            mixin.generatorAnswers = defaultAnswers();
            const result = mixin._buildPlan();

            for (const day of result.plan) {
                const patterns = {};
                for (const ex of day) {
                    if (ex.type !== 'strength' || !ex._movementPattern || ex._movementPattern === 'isolation') continue;
                    patterns[ex._movementPattern] = (patterns[ex._movementPattern] || 0) + 1;
                    expect(patterns[ex._movementPattern], `Pattern ${ex._movementPattern} doppelt`).toBeLessThanOrEqual(1);
                }
            }
        });
    });
});

describe('Edge cases', () => {
    let mixin;

    beforeEach(() => {
        mixin = createMixin();
    });

    it('bodyweight-only with all injuries still generates a plan', () => {
        mixin.generatorAnswers = defaultAnswers({
            equipment: 'bodyweight',
            hasInjuries: true,
            injuryRegions: ['schulter', 'knie', 'ruecken']
        });
        const result = mixin._buildPlan();

        // Should still produce at least some exercises per training day
        const trainingDays = result.plan.filter(day => day.length > 0);
        expect(trainingDays.length).toBeGreaterThan(0);
    });

    it('30-min session produces a shorter workout than 90-min', () => {
        mixin.generatorAnswers = defaultAnswers({ sessionDuration: 30 });
        const result30 = mixin._buildPlan();

        mixin.generatorAnswers = defaultAnswers({ sessionDuration: 90 });
        const result90 = mixin._buildPlan();

        const count30 = result30.plan.flat().filter(ex => ex.type === 'strength').length;
        const count90 = result90.plan.flat().filter(ex => ex.type === 'strength').length;
        expect(count30).toBeLessThan(count90);
    });

    it('empty goals falls back to general scheme', () => {
        mixin.generatorAnswers = defaultAnswers({ goals: [] });
        // Should not throw
        const result = mixin._buildPlan();
        expect(result.plan).toBeDefined();
        expect(result.meta).toBeDefined();
    });

    it('_enrichWithHistory handles undefined workoutLogs', async () => {
        mixin.workoutLogs = undefined;
        const plan = [[], [], [], [], [], [], []];
        // Should not throw
        await mixin._enrichWithHistory(plan);
    });

    it('_selectTemplate returns fallback when no exact match', () => {
        const answers = defaultAnswers({ goals: ['strength'] });
        // daysPerWeek=3, goal='strength' - no template has strength goal
        const template = mixin._selectTemplate(answers, 'intermediate', 3);
        expect(template).toBeDefined();
        expect(template.structure).toBeDefined();
    });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run js/features/training-generator.test.js`
Expected: Multiple FAILs (constraints not yet enforced, _movementPattern not exposed, empty goals not guarded)

- [ ] **Step 3: Commit test file**

```bash
git add js/features/training-generator.test.js
git commit -m "test: Training-Generator Constraint- und Edge-Case-Tests (red phase)"
```

---

### Task 5: PHYSIO_CONSTRAINTS Objekt + Shared Helper

**Files:**
- Modify: `js/features/training-generator.js:1-7`

- [ ] **Step 1: Add PHYSIO_CONSTRAINTS and shared helper at top of file**

After the import block (line 6) in `training-generator.js`, add:

```js
// ── Physiologische Leitplanken ──────────────────────────
// Alle Limits als benannte Konstanten mit sportwissenschaftlicher Begruendung.
const PHYSIO_CONSTRAINTS = {
    // Volumen pro Muskelgruppe pro Session
    // Schoenfeld et al. (2017): 10-20 Sets/Woche optimal → max 6-10/Session
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

    // Ermuedungs-Management
    FATIGUE_REDUCTION_AFTER_EXERCISE: 6,
    MAX_EXERCISES_PER_SESSION: 10,

    // Duration Sanity
    MAX_CARDIO_DURATION_MINUTES: 20,
    MIN_SESSION_MINUTES: 20,
    MAX_SESSION_MINUTES: 120,
    WARMUP_MINUTES: { 30: 5, 45: 5, 60: 8, 90: 10 },
    COOLDOWN_MINUTES: 5,

    // Set-Limits pro Uebung
    MAX_SETS_PER_EXERCISE: 5,
    MIN_SETS_PER_EXERCISE: 2,

    // Duplikat-Schutz
    MAX_SAME_MOVEMENT_PATTERN: 1
};

// Shared helper: geschaetzte Zeit einer einzelnen Uebung in Minuten
function _exerciseTimeEstimate(ex) {
    if (ex.type === 'strength') {
        const minsPerSet = ex._compound ? 4 : 3;
        return (ex.sets || 3) * minsPerSet;
    }
    if (ex.type === 'cardio' || ex.type === 'distance') {
        return parseInt(ex.duration) || 10;
    }
    return 5;
}
```

- [ ] **Step 2: Run existing tests**

Run: `npx vitest run js/features/training.test.js js/features/workout.test.js`
Expected: All PASS (no behavioral change yet)

- [ ] **Step 3: Commit**

```bash
git add js/features/training-generator.js
git commit -m "feat: PHYSIO_CONSTRAINTS Objekt + shared _exerciseTimeEstimate Helper"
```

---

### Task 6: Bug-Fix — _compound Flag Timing + _estimateTime DRY

**Files:**
- Modify: `js/features/training-generator.js`

- [ ] **Step 1: Move flag deletion AFTER _adjustForDuration and _applySupersets**

In `_buildPlan()`, find the block that deletes internal flags (around line 407-412):

```js
// REMOVE this block from its current position:
// dayExercises.forEach(ex => {
//     delete ex._compound;
//     delete ex._isWarmup;
//     delete ex._isCooldown;
// });
```

Move it to AFTER the superset and progressive overload logic, just before `plan[dayIndex] = dayExercises;` (around line 414). The new position should be:

```js
            // Progressive overload note
            for (const ex of dayExercises) {
                if (ex.type === 'strength' && !ex.note) {
                    ex.note = primaryScheme.restNote;
                }
            }

            // Remove internal flags but keep _muscles for heatmap
            dayExercises.forEach(ex => {
                delete ex._compound;
                delete ex._isWarmup;
                delete ex._isCooldown;
            });

            plan[dayIndex] = dayExercises;
```

- [ ] **Step 2: Replace _estimateTime with shared helper**

Replace `_estimateTime` method body:

```js
_estimateTime(dayExercises) {
    return dayExercises.reduce((sum, ex) => sum + _exerciseTimeEstimate(ex), 0);
},
```

- [ ] **Step 3: Replace inline time estimate in _adjustForDuration**

In `_adjustForDuration`, replace the `estimateTime` inner function:

```js
_adjustForDuration(dayExercises, targetMinutes) {
    if (!targetMinutes) return;

    let estimated = dayExercises.reduce((sum, ex) => sum + _exerciseTimeEstimate(ex), 0);

    // Too long — remove isolation exercises from the end
    if (estimated > targetMinutes * 1.2 && dayExercises.length > 3) {
        for (let i = dayExercises.length - 1; i >= 0; i--) {
            if (estimated <= targetMinutes * 1.1) break;
            if (dayExercises[i].type === 'strength' && !dayExercises[i]._compound) {
                const removedTime = _exerciseTimeEstimate(dayExercises[i]);
                dayExercises.splice(i, 1);
                estimated -= removedTime;
            }
        }
    }

    // Too short — boost sets on isolation exercises, then compounds
    estimated = dayExercises.reduce((sum, ex) => sum + _exerciseTimeEstimate(ex), 0);
    if (estimated < targetMinutes * 0.8 && dayExercises.length > 0) {
        let boostRounds = 0;
        while (dayExercises.reduce((s, e) => s + _exerciseTimeEstimate(e), 0) < targetMinutes * 0.8 && boostRounds < 2) {
            let boosted = false;
            for (let i = dayExercises.length - 1; i >= 0; i--) {
                if (dayExercises[i].type === 'strength' && !dayExercises[i]._compound) {
                    if ((dayExercises[i].sets || 3) < PHYSIO_CONSTRAINTS.MAX_SETS_PER_EXERCISE) {
                        dayExercises[i].sets = (dayExercises[i].sets || 3) + 1;
                        boosted = true;
                        break;
                    }
                }
            }
            if (!boosted) {
                for (let i = dayExercises.length - 1; i >= 0; i--) {
                    if (dayExercises[i].type === 'strength') {
                        if ((dayExercises[i].sets || 3) < PHYSIO_CONSTRAINTS.MAX_SETS_PER_EXERCISE) {
                            dayExercises[i].sets = (dayExercises[i].sets || 3) + 1;
                            break;
                        }
                    }
                }
            }
            boostRounds++;
        }
    }
},
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All existing tests PASS; some new constraint tests may start passing

- [ ] **Step 5: Commit**

```bash
git add js/features/training-generator.js
git commit -m "fix: _compound Flag-Timing + _estimateTime DRY + Set-Cap in _adjustForDuration"
```

---

### Task 7: Bug-Fix — Input Validation + Defensive Checks

**Files:**
- Modify: `js/features/training-generator.js`

- [ ] **Step 1: Add guard clause to generatePlan()**

Replace the start of `generatePlan()`:

```js
async generatePlan() {
    if (!this.generatorAnswers) return;
    this.generatorLoading = true;
    await new Promise(r => setTimeout(r, 400));
    // ... rest unchanged
```

- [ ] **Step 2: Add empty goals fallback in _buildPlan()**

At the start of `_buildPlan()`, after `const daysPerWeek = a.selectedDays.length;`:

```js
    // Defensive: falls keine Goals gesetzt, Fallback auf 'general'
    if (!a.goals || a.goals.length === 0) {
        a.goals = ['general'];
    }
```

- [ ] **Step 3: Fix _selectTemplate final fallback**

In `_selectTemplate`, replace the last fallback block:

```js
    if (candidates.length === 0) {
        const sorted = [...splitTemplates].sort((a, b) =>
            Math.abs(a.daysPerWeek - daysPerWeek) - Math.abs(b.daysPerWeek - daysPerWeek)
        );
        if (sorted.length === 0) {
            throw new Error('No split templates available');
        }
        candidates = [sorted[0]];
    }
```

- [ ] **Step 4: Fix _enrichWithHistory optional chaining**

Replace the first line of `_enrichWithHistory`:

```js
async _enrichWithHistory(plan) {
    if (!this.workoutLogs?.length) return;
```

- [ ] **Step 5: Fix confirmSwap scheme selection**

In `confirmSwap`, replace the scheme selection:

```js
confirmSwap(alternativeId) {
    if (!this.swapTarget) return;
    const alt = exercises.find(e => e.id === alternativeId);
    if (!alt) return;

    const { dayIndex, exIndex } = this.swapTarget;
    const primaryGoal = this.generatorAnswers.goals[0] || 'general';
    const secondaryGoal = this.generatorAnswers.goals.length > 1 ? this.generatorAnswers.goals[1] : null;
    const primaryScheme = REPS_SCHEMES[primaryGoal] || REPS_SCHEMES.general;
    const secondaryScheme = secondaryGoal ? (REPS_SCHEMES[secondaryGoal] || null) : null;
    // Compounds use primary scheme, isolations use secondary (or primary)
    const scheme = alt.compound ? primaryScheme : (secondaryScheme || primaryScheme);
    const formatted = this._formatExercise(alt, scheme, primaryGoal, alt.compound);
    delete formatted._compound;

    this.generatedPlan[dayIndex].splice(exIndex, 1, formatted);
    this.swapOptions = null;
    this.swapTarget = null;
},
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: Edge-case tests for empty goals and undefined workoutLogs now PASS

- [ ] **Step 7: Commit**

```bash
git add js/features/training-generator.js
git commit -m "fix: Input-Validation, Null-Checks, confirmSwap Scheme-Selektion"
```

---

### Task 8: Constraint Enforcement — Volumen-Cap, Session-Cap, Ordering, Movement-Pattern Dedup

**Files:**
- Modify: `js/features/training-generator.js`

- [ ] **Step 1: Add _movementPattern to _formatExercise output**

In `_formatExercise`, add `_movementPattern` to the returned object:

```js
_formatExercise(ex, scheme, goal, isCompound) {
    const entry = {
        name: ex.name,
        type: ex.type || 'strength',
        note: '',
        _muscles: ex.muscleGroups || [ex.primaryMuscle],
        _primaryMuscle: ex.primaryMuscle,
        _equipment: ex.equipment,
        _exerciseId: ex.id,
        _movementPattern: ex.movementPattern || 'isolation'
    };

    if (entry.type === 'strength') {
        entry.sets = scheme.sets;
        entry.reps = scheme.reps;
        entry.weight = ex.defaultWeight || 0;
        entry._compound = ex.compound === true;

        // Intelligente Rest-Notes basierend auf Goal + Compound-Status
        if (isCompound && (goal === 'strength' || goal === 'muscle')) {
            entry.note = PHYSIO_CONSTRAINTS.REST_BY_GOAL[goal] === '60-90s Pause'
                ? '90-120s Pause' : PHYSIO_CONSTRAINTS.REST_BY_GOAL[goal] || scheme.restNote;
        }
    } else if (entry.type === 'cardio') {
        entry.duration = ex.defaultDuration || '20 min';
    } else if (entry.type === 'distance') {
        entry.distance = ex.defaultDistance || '';
        entry.duration = ex.defaultDuration || '';
    }

    return entry;
},
```

- [ ] **Step 2: Add movement pattern dedup to _pickExercises**

In `_pickExercises`, add a `usedPatterns` parameter and filter:

```js
_pickExercises(available, muscle, isCompound, count, usedIds, usedEquipmentForMuscle = null, usedPatterns = null) {
    if (count <= 0) return [];

    let candidates = available.filter(ex =>
        (ex.primaryMuscle === muscle || ex.muscleGroups.includes(muscle)) &&
        ex.compound === isCompound &&
        ex.type === 'strength' &&
        !usedIds.has(ex.id)
    );

    // Fallback: wenn primaryMuscle 0 Treffer, nur muscleGroups nutzen
    if (candidates.length === 0) {
        candidates = available.filter(ex =>
            ex.muscleGroups.includes(muscle) &&
            ex.compound === isCompound &&
            ex.type === 'strength' &&
            !usedIds.has(ex.id)
        );
    }

    // Movement pattern dedup fuer Compounds
    if (usedPatterns && isCompound) {
        candidates = candidates.filter(ex => {
            const pattern = ex.movementPattern || 'isolation';
            if (pattern === 'isolation') return true;
            return !usedPatterns.has(pattern);
        });
    }

    const byPriority = {};
    for (const ex of candidates) {
        const p = ex.priority ?? 3;
        if (!byPriority[p]) byPriority[p] = [];
        byPriority[p].push(ex);
    }
    const priorityLevels = Object.keys(byPriority).map(Number).sort((a, b) => b - a);
    let sorted = [];
    for (const p of priorityLevels) {
        sorted.push(...this._fisherYatesShuffle(byPriority[p]));
    }

    const picked = [];
    const pickedEquipment = usedEquipmentForMuscle ? new Set(usedEquipmentForMuscle) : new Set();

    for (const ex of sorted) {
        if (picked.length >= count) break;
        if (pickedEquipment.has(ex.equipment) && sorted.some(e =>
            !pickedEquipment.has(e.equipment) && !picked.includes(e)
        )) {
            continue;
        }
        picked.push(ex);
        pickedEquipment.add(ex.equipment);
    }

    if (picked.length < count) {
        for (const ex of sorted) {
            if (picked.length >= count) break;
            if (!picked.includes(ex)) picked.push(ex);
        }
    }

    picked.forEach(ex => {
        usedIds.add(ex.id);
        // Track movement pattern
        if (usedPatterns && ex.movementPattern && ex.movementPattern !== 'isolation') {
            usedPatterns.add(ex.movementPattern);
        }
    });
    return picked;
},
```

- [ ] **Step 3: Update _buildPlan to use usedPatterns and enforce constraints**

In `_buildPlan`, update the exercise-picking loop and add constraint enforcement. Replace the `for (let i = 0; ...)` loop body:

```js
        const usedPatterns = new Set();

        for (let i = 0; i < adjustedTemplate.structure.length; i++) {
            const dayDef = adjustedTemplate.structure[i];
            const dayIndex = trainingDayIndices[i];
            if (dayIndex === undefined) break;

            const dayExercises = [];
            const dayUsedPatterns = new Set();

            // Warm-up
            const warmupMins = PHYSIO_CONSTRAINTS.WARMUP_MINUTES[a.sessionDuration] || 5;
            dayExercises.push({
                name: 'Aufwaermen',
                type: 'cardio',
                duration: warmupMins + ' min',
                note: 'Leichtes Cardio + dynamisches Stretching',
                _isWarmup: true
            });

            let exerciseCount = 0;
            const daySetsPerMuscle = {};

            for (const target of dayDef.muscleTargets) {
                if (exerciseCount >= PHYSIO_CONSTRAINTS.MAX_EXERCISES_PER_SESSION - 2) break; // Reserve Warmup+Cooldown

                const equipmentUsedForMuscle = [];

                const compounds = this._pickExercises(
                    available, target.muscle, true, target.compound, usedExerciseIds, equipmentUsedForMuscle, dayUsedPatterns
                );
                compounds.forEach(ex => { if (ex.equipment) equipmentUsedForMuscle.push(ex.equipment); });

                for (const ex of compounds) {
                    if (exerciseCount >= PHYSIO_CONSTRAINTS.MAX_EXERCISES_PER_SESSION - 2) break;
                    const formatted = this._formatExercise(ex, primaryScheme, primaryGoal, true);

                    // Volumen-Cap pruefen
                    const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(target.muscle);
                    const maxSets = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                    const currentSets = daySetsPerMuscle[target.muscle] || 0;
                    if (currentSets + formatted.sets > maxSets) {
                        formatted.sets = Math.max(PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE, maxSets - currentSets);
                    }
                    if (formatted.sets < PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE) continue;

                    daySetsPerMuscle[target.muscle] = (daySetsPerMuscle[target.muscle] || 0) + formatted.sets;
                    dayExercises.push(formatted);
                    exerciseCount++;
                }

                const isolations = this._pickExercises(
                    available, target.muscle, false, target.isolation, usedExerciseIds, equipmentUsedForMuscle, dayUsedPatterns
                );
                const isoScheme = secondaryScheme || primaryScheme;

                for (const ex of isolations) {
                    if (exerciseCount >= PHYSIO_CONSTRAINTS.MAX_EXERCISES_PER_SESSION - 2) break;
                    const formatted = this._formatExercise(ex, isoScheme, secondaryGoal || primaryGoal, false);

                    // Volumen-Cap
                    const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(target.muscle);
                    const maxSets = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                    const currentSets = daySetsPerMuscle[target.muscle] || 0;
                    if (currentSets + formatted.sets > maxSets) {
                        formatted.sets = Math.max(PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE, maxSets - currentSets);
                    }
                    if (formatted.sets < PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE) continue;

                    // Fatigue reduction fuer spaetere Uebungen
                    if (exerciseCount >= PHYSIO_CONSTRAINTS.FATIGUE_REDUCTION_AFTER_EXERCISE) {
                        formatted.sets = Math.max(PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE, formatted.sets - 1);
                    }

                    daySetsPerMuscle[target.muscle] = (daySetsPerMuscle[target.muscle] || 0) + formatted.sets;
                    dayExercises.push(formatted);
                    exerciseCount++;
                }
            }

            // Cardio
            if (adjustedTemplate.addCardioToEachDay || a.goals.includes('fat_loss') || a.goals.includes('endurance')) {
                const cardioEx = this._pickCardioExercise(available, allowedEquipment, usedCardioIds, a);
                if (cardioEx) dayExercises.push(cardioEx);
            }

            // Cooldown
            dayExercises.push({
                name: 'Cooldown / Stretching',
                type: 'cardio',
                duration: PHYSIO_CONSTRAINTS.COOLDOWN_MINUTES + ' min',
                note: 'Statisches Dehnen der beanspruchten Muskelgruppen',
                _isCooldown: true
            });

            // Time adjustment
            const adjustableExercises = dayExercises.filter(ex => !ex._isWarmup && !ex._isCooldown);
            this._adjustForDuration(adjustableExercises, a.sessionDuration);

            // Post-sort: Compounds vor Isolations erzwingen (pro Muskelgruppe)
            const warmups = dayExercises.filter(ex => ex._isWarmup);
            const cooldowns = dayExercises.filter(ex => ex._isCooldown);
            const strength = dayExercises.filter(ex => ex.type === 'strength');
            const cardio = dayExercises.filter(ex => (ex.type === 'cardio' || ex.type === 'distance') && !ex._isWarmup && !ex._isCooldown);

            strength.sort((a, b) => {
                if (a._compound && !b._compound) return -1;
                if (!a._compound && b._compound) return 1;
                return 0;
            });

            // Reassemble: Warmup → Compounds → Isolations → Cardio → Cooldown
            dayExercises.length = 0;
            dayExercises.push(...warmups, ...strength, ...cardio, ...cooldowns);

            // Estimated time
            const estimatedTime = this._estimateTime(dayExercises);

            // Superset pairing for short sessions
            if (a.sessionDuration <= 30) {
                this._applySupersets(dayExercises);
            }

            // Progressive overload note (nur wo noch keine Note gesetzt)
            for (const ex of dayExercises) {
                if (ex.type === 'strength' && !ex.note) {
                    ex.note = primaryScheme.restNote;
                }
            }

            // Remove internal flags but keep _muscles, _primaryMuscle, _movementPattern for heatmap/dedup
            dayExercises.forEach(ex => {
                delete ex._compound;
                delete ex._isWarmup;
                delete ex._isCooldown;
            });

            plan[dayIndex] = dayExercises;
            dayMetas.push({ dayIndex, label: dayDef.label, estimatedTime });
        }
```

- [ ] **Step 4: Cap cardio duration in _pickCardioExercise**

In `_pickCardioExercise`, cap the duration:

```js
    const durations = { 30: '10 min', 45: '15 min', 60: '20 min', 90: '20 min' };
    const duration = durations[answers.sessionDuration] || '15 min';
    const cappedMins = Math.min(parseInt(duration) || 15, PHYSIO_CONSTRAINTS.MAX_CARDIO_DURATION_MINUTES);
    const cappedDuration = cappedMins + ' min';
```

Then use `cappedDuration` instead of `duration` in the return statements.

- [ ] **Step 5: Clean up _movementPattern in applyGeneratedPlan and switchToManualEdit**

In both `applyGeneratedPlan` and `switchToManualEdit`, add `_movementPattern` to the delete list:

```js
delete ex._movementPattern;
```

- [ ] **Step 6: Run ALL tests**

Run: `npx vitest run`
Expected: ALL tests PASS — both existing and new constraint tests

- [ ] **Step 7: Commit**

```bash
git add js/features/training-generator.js
git commit -m "feat: Constraint-Enforcement (Volumen-Cap, Session-Cap, Ordering, Movement-Dedup)"
```

---

### Task 9: Final Regression Check

**Files:** None modified

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests in `training.test.js`, `workout.test.js`, and `training-generator.test.js` PASS

- [ ] **Step 2: Verify build passes**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Final commit if any outstanding changes**

```bash
git status
# If any uncommitted changes:
git add -A && git commit -m "chore: Finales Cleanup nach Training-Generator Refactoring"
```

---

## Dependency Graph

```
Task 1 (REPS_SCHEME) ──────────────────────────────┐
Task 2 (movementPattern) ──┐                        │
Task 3 (neue Uebungen) ────┤                        │
                            ├── Task 4 (Tests) ──── Task 5 (PHYSIO_CONSTRAINTS)
                            │                        │
                            │                        ├── Task 6 (Bug-Fixes DRY)
                            │                        ├── Task 7 (Input Validation)
                            │                        └── Task 8 (Constraint Enforcement)
                            │                                     │
                            └─────────────────────── Task 9 (Regression)
```

Tasks 1, 2, 3 are independent and can run in parallel.
Tasks 5, 6, 7 depend on Task 4 (tests) but are independent of each other.
Task 8 depends on Tasks 5, 6, 7.
Task 9 depends on all.
