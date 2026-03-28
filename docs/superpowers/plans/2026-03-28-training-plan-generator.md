# Training Plan Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rule-based training plan generator with questionnaire wizard, exercise database, split templates, and plan preview — all client-side, zero API costs.

**Architecture:** Static JS data modules (exercises + split templates) feed a generator algorithm in a new Alpine.js mixin. The wizard UI extends the existing training modal with a selection screen. Generated plans use the identical data structure as manual plans, so all downstream features (workout picker, execution, history) work unchanged.

**Tech Stack:** Alpine.js (mixin pattern), Tailwind CSS v4, Vite (JS module bundling), existing Supabase client for saving plans.

**Design Spec:** `docs/superpowers/specs/2026-03-28-training-plan-generator-design.md`

---

## File Structure

```
js/data/exercises.js              — Exercise database (~150 exercises, static export)
js/data/split-templates.js        — Split template definitions (~10 templates, static export)
js/features/training-generator.js — Generator mixin (wizard state, algorithm, swap logic)
templates/modals/training-generator.html — Wizard UI (selection screen, 8-step questionnaire, preview)
js/main.js                        — Import new mixin + modal template (3 lines added)
index.html                        — Change openTraining() → openTrainingSelection() at 3 call sites
templates/modals/settings.html    — Change openTraining() → openTrainingSelection() at 1 call site
mockup-trainingsplan-ai.html      — Standalone visual mockup (project root)
```

---

### Task 1: Exercise Database

**Files:**
- Create: `js/data/exercises.js`

- [ ] **Step 1: Create exercise database module**

Create `js/data/exercises.js` with the full exercise catalog. Each exercise has: id, name (German), type, muscleGroups, primaryMuscle, equipment, difficulty, compound flag, defaults, tags, and injury keywords.

```javascript
// js/data/exercises.js

export const MUSCLE_GROUPS = [
    'chest', 'back', 'shoulders', 'front_delts', 'side_delts', 'rear_delts',
    'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves',
    'abs', 'forearms', 'traps', 'lower_back'
];

export const EQUIPMENT_MAP = {
    full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band'],
    home_gym: ['barbell', 'dumbbell', 'bodyweight', 'band'],
    bodyweight: ['bodyweight', 'band']
};

export const exercises = [
    // ── CHEST ───────────────────────────────────────────
    {
        id: 'barbell-bench-press',
        name: 'Bankdruecken (Langhantel)',
        type: 'strength',
        muscleGroups: ['chest', 'triceps', 'front_delts'],
        primaryMuscle: 'chest',
        equipment: 'barbell',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'brust', 'handgelenk']
    },
    {
        id: 'dumbbell-bench-press',
        name: 'Bankdruecken (Kurzhanteln)',
        type: 'strength',
        muscleGroups: ['chest', 'triceps', 'front_delts'],
        primaryMuscle: 'chest',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'brust', 'handgelenk']
    },
    {
        id: 'incline-barbell-bench',
        name: 'Schraegbankdruecken (Langhantel)',
        type: 'strength',
        muscleGroups: ['chest', 'front_delts', 'triceps'],
        primaryMuscle: 'chest',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'brust']
    },
    {
        id: 'incline-dumbbell-bench',
        name: 'Schraegbankdruecken (Kurzhanteln)',
        type: 'strength',
        muscleGroups: ['chest', 'front_delts', 'triceps'],
        primaryMuscle: 'chest',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'brust']
    },
    {
        id: 'cable-fly',
        name: 'Cable Flys',
        type: 'strength',
        muscleGroups: ['chest'],
        primaryMuscle: 'chest',
        equipment: 'cable',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'brust']
    },
    {
        id: 'dumbbell-fly',
        name: 'Fliegende (Kurzhanteln)',
        type: 'strength',
        muscleGroups: ['chest'],
        primaryMuscle: 'chest',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'brust']
    },
    {
        id: 'chest-press-machine',
        name: 'Brustpresse (Maschine)',
        type: 'strength',
        muscleGroups: ['chest', 'triceps'],
        primaryMuscle: 'chest',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'brust']
    },
    {
        id: 'push-ups',
        name: 'Liegestuetze',
        type: 'strength',
        muscleGroups: ['chest', 'triceps', 'front_delts'],
        primaryMuscle: 'chest',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-20',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['handgelenk', 'schulter', 'brust']
    },
    {
        id: 'dips-chest',
        name: 'Dips (Brust)',
        type: 'strength',
        muscleGroups: ['chest', 'triceps', 'front_delts'],
        primaryMuscle: 'chest',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'handgelenk', 'ellenbogen']
    },

    // ── BACK ────────────────────────────────────────────
    {
        id: 'deadlift',
        name: 'Kreuzheben',
        type: 'strength',
        muscleGroups: ['back', 'hamstrings', 'glutes', 'lower_back', 'traps'],
        primaryMuscle: 'back',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '5-8',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ruecken', 'knie', 'handgelenk']
    },
    {
        id: 'barbell-row',
        name: 'Langhantelrudern',
        type: 'strength',
        muscleGroups: ['back', 'biceps', 'rear_delts'],
        primaryMuscle: 'back',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ruecken', 'handgelenk']
    },
    {
        id: 'dumbbell-row',
        name: 'Kurzhantelrudern',
        type: 'strength',
        muscleGroups: ['back', 'biceps', 'rear_delts'],
        primaryMuscle: 'back',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'lat-pulldown',
        name: 'Latzug',
        type: 'strength',
        muscleGroups: ['back', 'biceps'],
        primaryMuscle: 'back',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['schulter']
    },
    {
        id: 'pull-ups',
        name: 'Klimmzuege',
        type: 'strength',
        muscleGroups: ['back', 'biceps'],
        primaryMuscle: 'back',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '6-10',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['schulter', 'ellenbogen']
    },
    {
        id: 'cable-row',
        name: 'Kabelrudern',
        type: 'strength',
        muscleGroups: ['back', 'biceps', 'rear_delts'],
        primaryMuscle: 'back',
        equipment: 'cable',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'seated-row-machine',
        name: 'Rudermaschine',
        type: 'strength',
        muscleGroups: ['back', 'biceps'],
        primaryMuscle: 'back',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'inverted-rows',
        name: 'Bodyweight Rudern',
        type: 'strength',
        muscleGroups: ['back', 'biceps', 'rear_delts'],
        primaryMuscle: 'back',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-15',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['handgelenk']
    },
    {
        id: 'face-pulls',
        name: 'Face Pulls',
        type: 'strength',
        muscleGroups: ['rear_delts', 'traps', 'back'],
        primaryMuscle: 'rear_delts',
        equipment: 'cable',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '15-20',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['schulter']
    },

    // ── SHOULDERS ───────────────────────────────────────
    {
        id: 'overhead-press',
        name: 'Schulterdruecken (Langhantel)',
        type: 'strength',
        muscleGroups: ['shoulders', 'front_delts', 'triceps'],
        primaryMuscle: 'shoulders',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '6-10',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'ruecken']
    },
    {
        id: 'dumbbell-overhead-press',
        name: 'Schulterdruecken (Kurzhanteln)',
        type: 'strength',
        muscleGroups: ['shoulders', 'front_delts', 'triceps'],
        primaryMuscle: 'shoulders',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter']
    },
    {
        id: 'lateral-raises',
        name: 'Seitheben',
        type: 'strength',
        muscleGroups: ['side_delts', 'shoulders'],
        primaryMuscle: 'side_delts',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter']
    },
    {
        id: 'cable-lateral-raises',
        name: 'Seitheben (Kabel)',
        type: 'strength',
        muscleGroups: ['side_delts', 'shoulders'],
        primaryMuscle: 'side_delts',
        equipment: 'cable',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter']
    },
    {
        id: 'rear-delt-fly',
        name: 'Reverse Flys',
        type: 'strength',
        muscleGroups: ['rear_delts', 'shoulders'],
        primaryMuscle: 'rear_delts',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['schulter']
    },
    {
        id: 'shoulder-press-machine',
        name: 'Schulterpresse (Maschine)',
        type: 'strength',
        muscleGroups: ['shoulders', 'front_delts', 'triceps'],
        primaryMuscle: 'shoulders',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter']
    },
    {
        id: 'pike-push-ups',
        name: 'Pike Liegestuetze',
        type: 'strength',
        muscleGroups: ['shoulders', 'front_delts', 'triceps'],
        primaryMuscle: 'shoulders',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'handgelenk']
    },

    // ── BICEPS ──────────────────────────────────────────
    {
        id: 'barbell-curl',
        name: 'Langhantelcurls',
        type: 'strength',
        muscleGroups: ['biceps'],
        primaryMuscle: 'biceps',
        equipment: 'barbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ellenbogen', 'handgelenk']
    },
    {
        id: 'dumbbell-curl',
        name: 'Kurzhantelcurls',
        type: 'strength',
        muscleGroups: ['biceps'],
        primaryMuscle: 'biceps',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ellenbogen', 'handgelenk']
    },
    {
        id: 'hammer-curl',
        name: 'Hammercurls',
        type: 'strength',
        muscleGroups: ['biceps', 'forearms'],
        primaryMuscle: 'biceps',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ellenbogen', 'handgelenk']
    },
    {
        id: 'cable-curl',
        name: 'Kabelcurls',
        type: 'strength',
        muscleGroups: ['biceps'],
        primaryMuscle: 'biceps',
        equipment: 'cable',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ellenbogen']
    },
    {
        id: 'chin-ups',
        name: 'Chin-Ups',
        type: 'strength',
        muscleGroups: ['biceps', 'back'],
        primaryMuscle: 'biceps',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '6-10',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['schulter', 'ellenbogen']
    },
    {
        id: 'preacher-curl-machine',
        name: 'Preacher Curls (Maschine)',
        type: 'strength',
        muscleGroups: ['biceps'],
        primaryMuscle: 'biceps',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ellenbogen']
    },

    // ── TRICEPS ─────────────────────────────────────────
    {
        id: 'tricep-pushdown',
        name: 'Trizepsdruecken (Kabel)',
        type: 'strength',
        muscleGroups: ['triceps'],
        primaryMuscle: 'triceps',
        equipment: 'cable',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['ellenbogen']
    },
    {
        id: 'overhead-tricep-extension',
        name: 'Trizepsstrecken ueber Kopf',
        type: 'strength',
        muscleGroups: ['triceps'],
        primaryMuscle: 'triceps',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['ellenbogen', 'schulter']
    },
    {
        id: 'skull-crushers',
        name: 'Skull Crushers',
        type: 'strength',
        muscleGroups: ['triceps'],
        primaryMuscle: 'triceps',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: false,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['ellenbogen', 'handgelenk']
    },
    {
        id: 'dips-triceps',
        name: 'Dips (Trizeps)',
        type: 'strength',
        muscleGroups: ['triceps', 'chest', 'front_delts'],
        primaryMuscle: 'triceps',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['schulter', 'ellenbogen']
    },
    {
        id: 'diamond-push-ups',
        name: 'Diamant-Liegestuetze',
        type: 'strength',
        muscleGroups: ['triceps', 'chest'],
        primaryMuscle: 'triceps',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-15',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['handgelenk', 'ellenbogen']
    },
    {
        id: 'tricep-machine',
        name: 'Trizepsmaschine',
        type: 'strength',
        muscleGroups: ['triceps'],
        primaryMuscle: 'triceps',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['push'],
        avoidWhenInjured: ['ellenbogen']
    },

    // ── QUADRICEPS ──────────────────────────────────────
    {
        id: 'barbell-squat',
        name: 'Kniebeugen (Langhantel)',
        type: 'strength',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
        primaryMuscle: 'quadriceps',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '6-10',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie', 'ruecken', 'hueft']
    },
    {
        id: 'goblet-squat',
        name: 'Goblet Squats',
        type: 'strength',
        muscleGroups: ['quadriceps', 'glutes'],
        primaryMuscle: 'quadriceps',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'leg-press',
        name: 'Beinpresse',
        type: 'strength',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
        primaryMuscle: 'quadriceps',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'leg-extension',
        name: 'Beinstrecker',
        type: 'strength',
        muscleGroups: ['quadriceps'],
        primaryMuscle: 'quadriceps',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'lunges',
        name: 'Ausfallschritte',
        type: 'strength',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
        primaryMuscle: 'quadriceps',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie', 'hueft']
    },
    {
        id: 'bodyweight-squat',
        name: 'Kniebeugen (Bodyweight)',
        type: 'strength',
        muscleGroups: ['quadriceps', 'glutes'],
        primaryMuscle: 'quadriceps',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '15-20',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'bulgarian-split-squat',
        name: 'Bulgarische Kniebeugen',
        type: 'strength',
        muscleGroups: ['quadriceps', 'glutes'],
        primaryMuscle: 'quadriceps',
        equipment: 'dumbbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie', 'hueft']
    },
    {
        id: 'pistol-squat',
        name: 'Pistol Squats',
        type: 'strength',
        muscleGroups: ['quadriceps', 'glutes'],
        primaryMuscle: 'quadriceps',
        equipment: 'bodyweight',
        difficulty: 'advanced',
        compound: true,
        defaultSets: 3,
        defaultReps: '5-8',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie', 'hueft']
    },
    {
        id: 'hack-squat',
        name: 'Hackenschmidt Kniebeugen',
        type: 'strength',
        muscleGroups: ['quadriceps', 'glutes'],
        primaryMuscle: 'quadriceps',
        equipment: 'machine',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie', 'ruecken']
    },

    // ── HAMSTRINGS ──────────────────────────────────────
    {
        id: 'romanian-deadlift',
        name: 'Rumaenisches Kreuzheben',
        type: 'strength',
        muscleGroups: ['hamstrings', 'glutes', 'lower_back'],
        primaryMuscle: 'hamstrings',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['legs', 'pull'],
        avoidWhenInjured: ['ruecken', 'knie']
    },
    {
        id: 'dumbbell-rdl',
        name: 'Rumaenisches Kreuzheben (Kurzhanteln)',
        type: 'strength',
        muscleGroups: ['hamstrings', 'glutes', 'lower_back'],
        primaryMuscle: 'hamstrings',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['legs', 'pull'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'leg-curl',
        name: 'Beinbeuger (Maschine)',
        type: 'strength',
        muscleGroups: ['hamstrings'],
        primaryMuscle: 'hamstrings',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'nordic-hamstring-curl',
        name: 'Nordic Hamstring Curls',
        type: 'strength',
        muscleGroups: ['hamstrings'],
        primaryMuscle: 'hamstrings',
        equipment: 'bodyweight',
        difficulty: 'advanced',
        compound: false,
        defaultSets: 3,
        defaultReps: '5-8',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'glute-ham-raise',
        name: 'Glute Ham Raise',
        type: 'strength',
        muscleGroups: ['hamstrings', 'glutes'],
        primaryMuscle: 'hamstrings',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['knie']
    },

    // ── GLUTES ──────────────────────────────────────────
    {
        id: 'hip-thrust',
        name: 'Hip Thrusts',
        type: 'strength',
        muscleGroups: ['glutes', 'hamstrings'],
        primaryMuscle: 'glutes',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['hueft', 'ruecken']
    },
    {
        id: 'glute-bridge',
        name: 'Glute Bridge',
        type: 'strength',
        muscleGroups: ['glutes', 'hamstrings'],
        primaryMuscle: 'glutes',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: true,
        defaultSets: 3,
        defaultReps: '15-20',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['hueft']
    },
    {
        id: 'cable-kickback',
        name: 'Cable Kickbacks',
        type: 'strength',
        muscleGroups: ['glutes'],
        primaryMuscle: 'glutes',
        equipment: 'cable',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['hueft', 'knie']
    },

    // ── CALVES ──────────────────────────────────────────
    {
        id: 'standing-calf-raise',
        name: 'Wadenheben (stehend)',
        type: 'strength',
        muscleGroups: ['calves'],
        primaryMuscle: 'calves',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['wade', 'achilles']
    },
    {
        id: 'seated-calf-raise',
        name: 'Wadenheben (sitzend)',
        type: 'strength',
        muscleGroups: ['calves'],
        primaryMuscle: 'calves',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '15-20',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['wade', 'achilles']
    },
    {
        id: 'bodyweight-calf-raise',
        name: 'Wadenheben (Bodyweight)',
        type: 'strength',
        muscleGroups: ['calves'],
        primaryMuscle: 'calves',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '15-25',
        defaultWeight: 0,
        tags: ['legs'],
        avoidWhenInjured: ['wade', 'achilles']
    },

    // ── ABS ─────────────────────────────────────────────
    {
        id: 'plank',
        name: 'Plank',
        type: 'strength',
        muscleGroups: ['abs'],
        primaryMuscle: 'abs',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '30-60s',
        defaultWeight: 0,
        tags: ['core'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'hanging-leg-raise',
        name: 'Haengendes Beinheben',
        type: 'strength',
        muscleGroups: ['abs'],
        primaryMuscle: 'abs',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: false,
        defaultSets: 3,
        defaultReps: '10-15',
        defaultWeight: 0,
        tags: ['core'],
        avoidWhenInjured: ['schulter', 'ruecken']
    },
    {
        id: 'cable-crunch',
        name: 'Cable Crunches',
        type: 'strength',
        muscleGroups: ['abs'],
        primaryMuscle: 'abs',
        equipment: 'cable',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['core'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'ab-wheel',
        name: 'Ab-Wheel Rollout',
        type: 'strength',
        muscleGroups: ['abs'],
        primaryMuscle: 'abs',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: false,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['core'],
        avoidWhenInjured: ['ruecken', 'schulter']
    },
    {
        id: 'mountain-climbers',
        name: 'Mountain Climbers',
        type: 'strength',
        muscleGroups: ['abs'],
        primaryMuscle: 'abs',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '20-30',
        defaultWeight: 0,
        tags: ['core'],
        avoidWhenInjured: ['handgelenk', 'knie']
    },
    {
        id: 'russian-twist',
        name: 'Russian Twists',
        type: 'strength',
        muscleGroups: ['abs'],
        primaryMuscle: 'abs',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '15-20',
        defaultWeight: 0,
        tags: ['core'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'crunch-machine',
        name: 'Bauchpresse (Maschine)',
        type: 'strength',
        muscleGroups: ['abs'],
        primaryMuscle: 'abs',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['core'],
        avoidWhenInjured: ['ruecken']
    },

    // ── TRAPS ───────────────────────────────────────────
    {
        id: 'barbell-shrugs',
        name: 'Schulterheben (Langhantel)',
        type: 'strength',
        muscleGroups: ['traps'],
        primaryMuscle: 'traps',
        equipment: 'barbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['schulter', 'nacken']
    },
    {
        id: 'dumbbell-shrugs',
        name: 'Schulterheben (Kurzhanteln)',
        type: 'strength',
        muscleGroups: ['traps'],
        primaryMuscle: 'traps',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['schulter', 'nacken']
    },

    // ── FOREARMS ────────────────────────────────────────
    {
        id: 'wrist-curl',
        name: 'Handgelenkbeugen',
        type: 'strength',
        muscleGroups: ['forearms'],
        primaryMuscle: 'forearms',
        equipment: 'dumbbell',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '15-20',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['handgelenk']
    },

    // ── CARDIO ──────────────────────────────────────────
    {
        id: 'treadmill',
        name: 'Laufband',
        type: 'cardio',
        muscleGroups: ['quadriceps', 'hamstrings', 'calves', 'glutes'],
        primaryMuscle: 'quadriceps',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '20 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['knie', 'hueft', 'achilles']
    },
    {
        id: 'stationary-bike',
        name: 'Fahrradergometer',
        type: 'cardio',
        muscleGroups: ['quadriceps', 'hamstrings', 'calves'],
        primaryMuscle: 'quadriceps',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '20 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'rowing-machine',
        name: 'Ruderergometer',
        type: 'cardio',
        muscleGroups: ['back', 'quadriceps', 'biceps'],
        primaryMuscle: 'back',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '15 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'elliptical',
        name: 'Crosstrainer',
        type: 'cardio',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
        primaryMuscle: 'quadriceps',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '20 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: []
    },
    {
        id: 'jumping-jacks',
        name: 'Hampelmaenner',
        type: 'cardio',
        muscleGroups: ['quadriceps', 'calves'],
        primaryMuscle: 'quadriceps',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '10 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'burpees',
        name: 'Burpees',
        type: 'cardio',
        muscleGroups: ['quadriceps', 'chest', 'abs'],
        primaryMuscle: 'quadriceps',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '10 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['knie', 'handgelenk', 'schulter']
    },
    {
        id: 'jump-rope',
        name: 'Seilspringen',
        type: 'cardio',
        muscleGroups: ['calves', 'quadriceps'],
        primaryMuscle: 'calves',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '10 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['knie', 'achilles']
    },
    {
        id: 'stair-climber',
        name: 'Treppensteiger',
        type: 'cardio',
        muscleGroups: ['quadriceps', 'glutes', 'calves'],
        primaryMuscle: 'quadriceps',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '15 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'high-knees',
        name: 'High Knees',
        type: 'cardio',
        muscleGroups: ['quadriceps', 'abs', 'calves'],
        primaryMuscle: 'quadriceps',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '5 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'battle-ropes',
        name: 'Battle Ropes',
        type: 'cardio',
        muscleGroups: ['shoulders', 'abs', 'back'],
        primaryMuscle: 'shoulders',
        equipment: 'bodyweight',
        difficulty: 'intermediate',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDuration: '10 min',
        defaultWeight: 0,
        tags: ['cardio'],
        avoidWhenInjured: ['schulter', 'handgelenk']
    },

    // ── DISTANCE ────────────────────────────────────────
    {
        id: 'outdoor-run',
        name: 'Laufen (draussen)',
        type: 'distance',
        muscleGroups: ['quadriceps', 'hamstrings', 'calves', 'glutes'],
        primaryMuscle: 'quadriceps',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDistance: '5 km',
        defaultDuration: '30 min',
        defaultWeight: 0,
        tags: ['cardio', 'distance'],
        avoidWhenInjured: ['knie', 'hueft', 'achilles']
    },
    {
        id: 'outdoor-walk',
        name: 'Gehen / Power Walking',
        type: 'distance',
        muscleGroups: ['quadriceps', 'calves', 'glutes'],
        primaryMuscle: 'quadriceps',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDistance: '3 km',
        defaultDuration: '30 min',
        defaultWeight: 0,
        tags: ['cardio', 'distance'],
        avoidWhenInjured: []
    },
    {
        id: 'cycling',
        name: 'Radfahren (draussen)',
        type: 'distance',
        muscleGroups: ['quadriceps', 'hamstrings', 'calves'],
        primaryMuscle: 'quadriceps',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDistance: '15 km',
        defaultDuration: '45 min',
        defaultWeight: 0,
        tags: ['cardio', 'distance'],
        avoidWhenInjured: ['knie']
    },
    {
        id: 'swimming',
        name: 'Schwimmen',
        type: 'distance',
        muscleGroups: ['back', 'shoulders', 'abs'],
        primaryMuscle: 'back',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 0,
        defaultReps: '',
        defaultDistance: '1 km',
        defaultDuration: '30 min',
        defaultWeight: 0,
        tags: ['cardio', 'distance'],
        avoidWhenInjured: ['schulter']
    },

    // ── LOWER BACK ──────────────────────────────────────
    {
        id: 'back-extension',
        name: 'Rueckenstrecken',
        type: 'strength',
        muscleGroups: ['lower_back', 'glutes'],
        primaryMuscle: 'lower_back',
        equipment: 'bodyweight',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['pull', 'core'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'good-mornings',
        name: 'Good Mornings',
        type: 'strength',
        muscleGroups: ['lower_back', 'hamstrings', 'glutes'],
        primaryMuscle: 'lower_back',
        equipment: 'barbell',
        difficulty: 'intermediate',
        compound: true,
        defaultSets: 3,
        defaultReps: '8-12',
        defaultWeight: 0,
        tags: ['pull'],
        avoidWhenInjured: ['ruecken']
    },
    {
        id: 'back-extension-machine',
        name: 'Rueckenstrecken (Maschine)',
        type: 'strength',
        muscleGroups: ['lower_back'],
        primaryMuscle: 'lower_back',
        equipment: 'machine',
        difficulty: 'beginner',
        compound: false,
        defaultSets: 3,
        defaultReps: '12-15',
        defaultWeight: 0,
        tags: ['pull', 'core'],
        avoidWhenInjured: ['ruecken']
    }
];
```

- [ ] **Step 2: Commit**

```bash
git add js/data/exercises.js
git commit -m "feat: Uebungsdatenbank mit ~80 Uebungen (strength, cardio, distance)"
```

---

### Task 2: Split Templates

**Files:**
- Create: `js/data/split-templates.js`

- [ ] **Step 1: Create split template definitions**

```javascript
// js/data/split-templates.js

export const REPS_SCHEMES = {
    muscle:  { sets: 4, reps: '8-12',  restNote: '60-90s Pause' },
    fat_loss:   { sets: 3, reps: '12-15', restNote: '30-60s Pause' },
    endurance:  { sets: 3, reps: '15-20', restNote: '30s Pause' },
    general:    { sets: 3, reps: '10-12', restNote: '60s Pause' }
};

export const splitTemplates = [
    // ── 2 TAGE ──────────────────────────────────────
    {
        id: 'full-body-2',
        name: 'Ganzkoerper 2x',
        daysPerWeek: 2,
        suitableFor: ['beginner'],
        goals: ['muscle', 'general', 'fat_loss'],
        structure: [
            {
                label: 'Ganzkoerper A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Ganzkoerper B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            }
        ]
    },

    // ── 3 TAGE ──────────────────────────────────────
    {
        id: 'full-body-3',
        name: 'Ganzkoerper 3x',
        daysPerWeek: 3,
        suitableFor: ['beginner'],
        goals: ['muscle', 'general', 'fat_loss'],
        structure: [
            {
                label: 'Ganzkoerper A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Ganzkoerper B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'chest', compound: 0, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Ganzkoerper C',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 0, isolation: 1 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            }
        ]
    },
    {
        id: 'ppl-3',
        name: 'Push/Pull/Legs 3x',
        daysPerWeek: 3,
        suitableFor: ['intermediate', 'advanced'],
        goals: ['muscle', 'general'],
        structure: [
            {
                label: 'Push',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Pull',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 },
                    { muscle: 'traps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Legs',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            }
        ]
    },
    {
        id: 'calisthenics-3',
        name: 'Calisthenics 3x',
        daysPerWeek: 3,
        suitableFor: ['beginner', 'intermediate'],
        goals: ['muscle', 'general', 'endurance'],
        equipmentFilter: ['bodyweight', 'band'],
        structure: [
            {
                label: 'Oberkörper Push',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 1, isolation: 0 },
                    { muscle: 'triceps', compound: 1, isolation: 0 },
                    { muscle: 'abs', compound: 0, isolation: 2 }
                ]
            },
            {
                label: 'Oberkörper Pull',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 1, isolation: 0 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 2, isolation: 0 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            }
        ]
    },

    // ── 4 TAGE ──────────────────────────────────────
    {
        id: 'upper-lower-4',
        name: 'Oberkörper/Unterkörper 4x',
        daysPerWeek: 4,
        suitableFor: ['intermediate', 'advanced'],
        goals: ['muscle', 'general', 'fat_loss'],
        structure: [
            {
                label: 'Oberkörper A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper A',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 1 },
                    { muscle: 'glutes', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Oberkörper B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper B',
                muscleTargets: [
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 2 }
                ]
            }
        ]
    },
    {
        id: 'push-pull-4',
        name: 'Push/Pull 4x',
        daysPerWeek: 4,
        suitableFor: ['intermediate'],
        goals: ['muscle', 'general'],
        structure: [
            {
                label: 'Push A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 },
                    { muscle: 'quadriceps', compound: 1, isolation: 0 }
                ]
            },
            {
                label: 'Pull A',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 }
                ]
            },
            {
                label: 'Push B',
                muscleTargets: [
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'triceps', compound: 0, isolation: 1 },
                    { muscle: 'quadriceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Pull B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'traps', compound: 0, isolation: 1 },
                    { muscle: 'hamstrings', compound: 0, isolation: 1 },
                    { muscle: 'glutes', compound: 0, isolation: 1 }
                ]
            }
        ]
    },
    {
        id: 'cardio-focus-4',
        name: 'Kraft + Ausdauer 4x',
        daysPerWeek: 4,
        suitableFor: ['beginner', 'intermediate'],
        goals: ['endurance', 'fat_loss', 'general'],
        addCardioToEachDay: true,
        structure: [
            {
                label: 'Oberkörper + Cardio',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper + Cardio',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Oberkörper + Cardio',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'chest', compound: 0, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper + Cardio',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'hamstrings', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 2 }
                ]
            }
        ]
    },

    // ── 5 TAGE ──────────────────────────────────────
    {
        id: 'bro-split-5',
        name: 'Bro-Split 5x',
        daysPerWeek: 5,
        suitableFor: ['intermediate', 'advanced'],
        goals: ['muscle'],
        structure: [
            {
                label: 'Brust',
                muscleTargets: [
                    { muscle: 'chest', compound: 2, isolation: 2 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Rücken',
                muscleTargets: [
                    { muscle: 'back', compound: 2, isolation: 2 },
                    { muscle: 'lower_back', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Schultern',
                muscleTargets: [
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'side_delts', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 },
                    { muscle: 'traps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Beine',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 2, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Arme',
                muscleTargets: [
                    { muscle: 'biceps', compound: 0, isolation: 3 },
                    { muscle: 'triceps', compound: 0, isolation: 3 }
                ]
            }
        ]
    },
    {
        id: 'ppl-upper-lower-5',
        name: 'PPL + Oberkörper/Unterkörper 5x',
        daysPerWeek: 5,
        suitableFor: ['intermediate', 'advanced'],
        goals: ['muscle', 'general'],
        structure: [
            {
                label: 'Push',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Pull',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Legs',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Oberkörper',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'abs', compound: 0, isolation: 2 }
                ]
            }
        ]
    },

    // ── 6 TAGE ──────────────────────────────────────
    {
        id: 'ppl-6',
        name: 'Push/Pull/Legs 6x',
        daysPerWeek: 6,
        suitableFor: ['advanced'],
        goals: ['muscle'],
        structure: [
            {
                label: 'Push A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 2 }
                ]
            },
            {
                label: 'Pull A',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 2 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Legs A',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 2, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Push B',
                muscleTargets: [
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Pull B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'traps', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Legs B',
                muscleTargets: [
                    { muscle: 'hamstrings', compound: 1, isolation: 1 },
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'calves', compound: 0, isolation: 1 }
                ]
            }
        ]
    }
];
```

- [ ] **Step 2: Commit**

```bash
git add js/data/split-templates.js
git commit -m "feat: Split-Templates fuer 2-6 Trainingstage"
```

---

### Task 3: Generator Algorithm (Mixin)

**Files:**
- Create: `js/features/training-generator.js`

- [ ] **Step 1: Create the generator mixin with wizard state and algorithm**

```javascript
// js/features/training-generator.js

import { WEEKDAYS, WEEKDAY_SHORT } from '../utils/constants.js';
import { getTodayWeekdayIndex } from '../utils/formatting.js';
import { exercises, EQUIPMENT_MAP } from '../data/exercises.js';
import { splitTemplates, REPS_SCHEMES } from '../data/split-templates.js';

export const trainingGeneratorMixin = () => ({
    generatorOpen: false,
    generatorStep: 0,
    generatorAnswers: {
        fitnessLevel: null,
        daysPerWeek: 3,
        equipment: null,
        goals: [],
        hasOtherSports: false,
        otherSports: '',
        otherSportsDays: [],
        sessionDuration: null,
        injuries: '',
        hasInjuries: false,
        exercisePreferences: ''
    },
    generatedPlan: null,
    generatorLoading: false,
    showTrainingSelection: false,
    swapOptions: null,
    swapTarget: null,

    openTrainingSelection() {
        this.showTrainingSelection = true;
        this.generatorOpen = false;
        this.generatorStep = 0;
        this.generatedPlan = null;
        this.swapOptions = null;
        this.swapTarget = null;
    },

    closeTrainingSelection() {
        this.showTrainingSelection = false;
        this.generatorOpen = false;
    },

    selectManualTraining() {
        this.showTrainingSelection = false;
        this.openTraining();
    },

    selectGeneratorTraining() {
        // Warnung wenn Plan existiert
        const hasExistingPlan = this.trainingPlan.some(day => day.length > 0);
        if (hasExistingPlan) {
            this.confirmModal = {
                show: true,
                title: 'Plan ersetzen?',
                message: 'Dein bestehender Trainingsplan wird durch den neuen ersetzt.',
                confirmLabel: 'Weiter',
                onConfirm: () => {
                    this._startGenerator();
                }
            };
            return;
        }
        this._startGenerator();
    },

    _startGenerator() {
        this.showTrainingSelection = false;
        this.generatorOpen = true;
        this.generatorStep = 1;
        this.generatorAnswers = {
            fitnessLevel: null,
            daysPerWeek: 3,
            equipment: null,
            goals: [],
            hasOtherSports: false,
            otherSports: '',
            otherSportsDays: [],
            sessionDuration: null,
            injuries: '',
            hasInjuries: false,
            exercisePreferences: ''
        };
        this.generatedPlan = null;
    },

    closeGenerator() {
        this.generatorOpen = false;
        this.generatorStep = 0;
    },

    generatorPrevStep() {
        if (this.generatorStep > 1) this.generatorStep--;
    },

    generatorNextStep() {
        // Validierung pro Step
        const a = this.generatorAnswers;
        if (this.generatorStep === 1 && !a.fitnessLevel) return;
        if (this.generatorStep === 3 && !a.equipment) return;
        if (this.generatorStep === 4 && a.goals.length === 0) return;
        if (this.generatorStep === 5 && a.hasOtherSports && a.otherSportsDays.length === 0) return;
        if (this.generatorStep === 6 && !a.sessionDuration) return;

        // Step 5 Validierung: genug freie Tage?
        if (this.generatorStep === 5 && a.hasOtherSports) {
            const freeDays = 7 - a.otherSportsDays.length;
            if (a.daysPerWeek > freeDays) {
                this.showToast(`Nicht genug freie Tage! ${a.otherSportsDays.length} Tage belegt, ${a.daysPerWeek} Trainingstage gewuenscht.`);
                return;
            }
        }

        if (this.generatorStep < 8) {
            this.generatorStep++;
        }
    },

    toggleGoal(goal) {
        const idx = this.generatorAnswers.goals.indexOf(goal);
        if (idx === -1) {
            this.generatorAnswers.goals.push(goal);
        } else {
            this.generatorAnswers.goals.splice(idx, 1);
        }
    },

    toggleOtherSportDay(dayIndex) {
        const idx = this.generatorAnswers.otherSportsDays.indexOf(dayIndex);
        if (idx === -1) {
            this.generatorAnswers.otherSportsDays.push(dayIndex);
        } else {
            this.generatorAnswers.otherSportsDays.splice(idx, 1);
        }
    },

    get generatorFreeDays() {
        if (!this.generatorAnswers.hasOtherSports) return [0, 1, 2, 3, 4, 5, 6];
        return [0, 1, 2, 3, 4, 5, 6].filter(d => !this.generatorAnswers.otherSportsDays.includes(d));
    },

    async generatePlan() {
        this.generatorLoading = true;
        // Kurze Verzoegerung fuer die Animation
        await new Promise(r => setTimeout(r, 400));

        try {
            const plan = this._buildPlan();
            await this._enrichWithHistory(plan);
            this.generatedPlan = plan;
            this.generatorStep = 9; // Vorschau
        } catch (e) {
            console.error('Plan generation failed:', e);
            this.showToast('Fehler bei der Plan-Erstellung. Bitte versuche es erneut.');
        } finally {
            this.generatorLoading = false;
        }
    },

    _buildPlan() {
        const a = this.generatorAnswers;
        const levelMap = { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' };
        const level = levelMap[a.fitnessLevel] || 'beginner';

        // 1. Template waehlen
        const template = this._selectTemplate(a, level);

        // 2. Verfuegbare Uebungen filtern
        const allowedEquipment = template.equipmentFilter || EQUIPMENT_MAP[a.equipment] || EQUIPMENT_MAP.full_gym;
        const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        const userLevel = difficultyOrder[level];

        let available = exercises.filter(ex => {
            // Equipment-Filter
            if (ex.equipment && !allowedEquipment.includes(ex.equipment)) return false;
            // Level-Filter: erlaube Uebungen bis zum User-Level
            if (difficultyOrder[ex.difficulty] > userLevel) return false;
            // Verletzungs-Filter
            if (a.injuries && a.hasInjuries) {
                const injuryText = a.injuries.toLowerCase();
                if (ex.avoidWhenInjured && ex.avoidWhenInjured.some(kw => injuryText.includes(kw))) return false;
            }
            return true;
        });

        // Praeferenz-Filter (vermeiden)
        if (a.exercisePreferences) {
            const prefText = a.exercisePreferences.toLowerCase();
            const avoidKeywords = ['vermeiden', 'nicht', 'kein', 'ohne'];
            if (avoidKeywords.some(kw => prefText.includes(kw))) {
                available = available.filter(ex => !prefText.includes(ex.name.toLowerCase()));
            }
        }

        // 3. Freie Tage bestimmen
        const freeDays = this.generatorFreeDays;
        const trainingDayIndices = this._distributeTrainingDays(a.daysPerWeek, freeDays);

        // 4. Rep-Schema bestimmen
        const primaryGoal = a.goals[0] || 'general';
        const scheme = REPS_SCHEMES[primaryGoal] || REPS_SCHEMES.general;

        // 5. Plan aufbauen: Array[7], jeder Tag ein Array von Uebungen
        const plan = Array.from({ length: 7 }, () => []);
        const usedExerciseIds = new Set(); // Vermeidet Dopplungen ueber Tage

        for (let i = 0; i < template.structure.length; i++) {
            const dayDef = template.structure[i];
            const dayIndex = trainingDayIndices[i];
            if (dayIndex === undefined) break;

            const dayExercises = [];

            for (const target of dayDef.muscleTargets) {
                // Compounds fuer diese Muskelgruppe
                const compounds = this._pickExercises(
                    available, target.muscle, true, target.compound, usedExerciseIds
                );
                dayExercises.push(...compounds);

                // Isolationsuebungen fuer diese Muskelgruppe
                const isolations = this._pickExercises(
                    available, target.muscle, false, target.isolation, usedExerciseIds
                );
                dayExercises.push(...isolations);
            }

            // In trainingPlan-Format konvertieren
            const formattedExercises = dayExercises.map(ex => this._formatExercise(ex, scheme, primaryGoal, a));

            // Cardio hinzufuegen wenn Fettabbau/Ausdauer oder Template es verlangt
            if (template.addCardioToEachDay || a.goals.includes('fat_loss') || a.goals.includes('endurance')) {
                const cardioEx = this._pickCardioExercise(available, allowedEquipment, usedExerciseIds, a);
                if (cardioEx) {
                    formattedExercises.push(cardioEx);
                }
            }

            // Zeitbudget pruefen und ggf. anpassen
            this._adjustForDuration(formattedExercises, a.sessionDuration);

            plan[dayIndex] = formattedExercises;
        }

        return plan;
    },

    _selectTemplate(answers, level) {
        let candidates = splitTemplates.filter(t => {
            if (t.daysPerWeek !== answers.daysPerWeek) return false;
            if (!t.suitableFor.includes(level)) return false;
            if (!t.goals.some(g => answers.goals.includes(g))) return false;
            return true;
        });

        // Fallback: nur nach Tagen filtern
        if (candidates.length === 0) {
            candidates = splitTemplates.filter(t => t.daysPerWeek === answers.daysPerWeek);
        }
        // Fallback: naechstliegende Tagesanzahl
        if (candidates.length === 0) {
            const sorted = [...splitTemplates].sort((a, b) =>
                Math.abs(a.daysPerWeek - answers.daysPerWeek) - Math.abs(b.daysPerWeek - answers.daysPerWeek)
            );
            candidates = [sorted[0]];
        }

        // Zufaellige Auswahl
        return candidates[Math.floor(Math.random() * candidates.length)];
    },

    _distributeTrainingDays(count, freeDays) {
        if (count >= freeDays.length) return [...freeDays];

        // Gleichmaessig verteilen
        const result = [];
        const step = freeDays.length / count;
        for (let i = 0; i < count; i++) {
            result.push(freeDays[Math.floor(i * step)]);
        }
        return result;
    },

    _pickExercises(available, muscle, isCompound, count, usedIds) {
        if (count <= 0) return [];

        const candidates = available.filter(ex =>
            (ex.primaryMuscle === muscle || ex.muscleGroups.includes(muscle)) &&
            ex.compound === isCompound &&
            ex.type === 'strength' &&
            !usedIds.has(ex.id)
        );

        // Shuffle fuer Variation
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, count);

        picked.forEach(ex => usedIds.add(ex.id));
        return picked;
    },

    _formatExercise(ex, scheme, primaryGoal, answers) {
        const entry = {
            name: ex.name,
            type: ex.type || 'strength',
            note: ''
        };

        if (entry.type === 'strength') {
            entry.sets = scheme.sets;
            entry.reps = ex.defaultReps || scheme.reps;
            entry.weight = ex.defaultWeight || 0;
        } else if (entry.type === 'cardio') {
            entry.duration = ex.defaultDuration || '20 min';
        } else if (entry.type === 'distance') {
            entry.distance = ex.defaultDistance || '';
            entry.duration = ex.defaultDuration || '';
        }

        return entry;
    },

    _pickCardioExercise(available, allowedEquipment, usedIds, answers) {
        const cardioCandidates = available.filter(ex =>
            (ex.type === 'cardio' || ex.type === 'distance') &&
            !usedIds.has(ex.id)
        );

        if (cardioCandidates.length === 0) return null;

        const picked = cardioCandidates[Math.floor(Math.random() * cardioCandidates.length)];
        usedIds.add(picked.id);

        // Cardio-Dauer basierend auf Trainingszeit
        const durations = { 30: '10 min', 45: '15 min', 60: '20 min', 90: '25 min' };
        const duration = durations[answers.sessionDuration] || '15 min';

        if (picked.type === 'cardio') {
            return { name: picked.name, type: 'cardio', duration, note: '' };
        }
        return {
            name: picked.name, type: 'distance',
            distance: picked.defaultDistance || '', duration, note: ''
        };
    },

    _adjustForDuration(exercises, targetMinutes) {
        if (!targetMinutes) return;
        // Grobe Schaetzung: ~4 Min pro Satz (inkl. Pause)
        const estimatedMinutes = exercises.reduce((sum, ex) => {
            if (ex.type === 'strength') return sum + (ex.sets || 3) * 4;
            if (ex.type === 'cardio' || ex.type === 'distance') {
                return sum + (parseInt(ex.duration) || 15);
            }
            return sum + 10;
        }, 0);

        // Wenn zu lang: letzte Isolation entfernen
        if (estimatedMinutes > targetMinutes * 1.2 && exercises.length > 3) {
            // Entferne von hinten (Isolation-Uebungen stehen hinten)
            for (let i = exercises.length - 1; i >= 0; i--) {
                if (exercises[i].type === 'strength' && estimatedMinutes > targetMinutes) {
                    exercises.splice(i, 1);
                    break;
                }
            }
        }
    },

    async _enrichWithHistory(plan) {
        // Nutze bereits geladene workoutLogs
        if (!this.workoutLogs || this.workoutLogs.length === 0) return;

        const lastWeights = {};
        for (const log of this.workoutLogs) {
            for (const ex of (log.exercises || [])) {
                if (ex.name && ex.weight && !lastWeights[ex.name]) {
                    lastWeights[ex.name] = ex.weight;
                }
            }
        }

        for (const day of plan) {
            for (const ex of day) {
                if (ex.type === 'strength' && lastWeights[ex.name]) {
                    ex.weight = lastWeights[ex.name];
                }
            }
        }
    },

    // ── Uebung tauschen ─────────────────────────────
    openSwapOptions(dayIndex, exIndex) {
        const exercise = this.generatedPlan[dayIndex][exIndex];
        if (!exercise || exercise.type !== 'strength') return;

        // Finde die originale Uebung in der DB
        const original = exercises.find(e => e.name === exercise.name);
        if (!original) return;

        // Finde Alternativen (gleiche primaere Muskelgruppe + Equipment-Filter)
        const allowedEquipment = EQUIPMENT_MAP[this.generatorAnswers.equipment] || EQUIPMENT_MAP.full_gym;
        const usedNames = new Set();
        for (const day of this.generatedPlan) {
            for (const ex of day) {
                usedNames.add(ex.name);
            }
        }

        const alternatives = exercises.filter(ex =>
            ex.primaryMuscle === original.primaryMuscle &&
            ex.type === 'strength' &&
            ex.id !== original.id &&
            !usedNames.has(ex.name) &&
            allowedEquipment.includes(ex.equipment)
        ).slice(0, 3);

        if (alternatives.length === 0) {
            this.showToast('Keine Alternative verfuegbar');
            return;
        }

        this.swapTarget = { dayIndex, exIndex };
        this.swapOptions = alternatives;
    },

    confirmSwap(alternativeId) {
        if (!this.swapTarget) return;
        const alt = exercises.find(e => e.id === alternativeId);
        if (!alt) return;

        const { dayIndex, exIndex } = this.swapTarget;
        const primaryGoal = this.generatorAnswers.goals[0] || 'general';
        const scheme = REPS_SCHEMES[primaryGoal] || REPS_SCHEMES.general;
        const formatted = this._formatExercise(alt, scheme, primaryGoal, this.generatorAnswers);

        this.generatedPlan[dayIndex].splice(exIndex, 1, formatted);
        this.swapOptions = null;
        this.swapTarget = null;
    },

    closeSwapOptions() {
        this.swapOptions = null;
        this.swapTarget = null;
    },

    // ── Plan uebernehmen ─────────────────────────────
    async applyGeneratedPlan() {
        if (!this.generatedPlan) return;
        this.trainingPlan = JSON.parse(JSON.stringify(this.generatedPlan));
        await this.saveTrainingPlan();
        this.generatorOpen = false;
        this.generatedPlan = null;
        this.showToast('Trainingsplan uebernommen!');
    },

    regeneratePlan() {
        this.generatedPlan = null;
        this.swapOptions = null;
        this.swapTarget = null;
        this.generatePlan();
    },

    switchToManualEdit() {
        if (!this.generatedPlan) return;
        this.trainingPlan = JSON.parse(JSON.stringify(this.generatedPlan));
        this.generatorOpen = false;
        this.generatedPlan = null;
        this.openTraining();
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add js/features/training-generator.js
git commit -m "feat: Generator-Mixin mit Wizard-State, Algorithmus und Swap-Logik"
```

---

### Task 4: Wizard UI Template

**Files:**
- Create: `templates/modals/training-generator.html`

- [ ] **Step 1: Create the full wizard modal template**

Create `templates/modals/training-generator.html` with: selection screen, 8-step wizard, loading animation, plan preview, and swap UI. Uses EXACT same CSS classes, transitions, and icon patterns as the existing training modal.

```html
<!-- ═══════════════════════════════════════════════════════════════
     TRAINING SELECTION SCREEN
     ═══════════════════════════════════════════════════════════════ -->
<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-mobile-sheet"
     :class="showTrainingSelection ? 'pointer-events-auto' : 'pointer-events-none'"
     x-show="showTrainingSelection"
     role="dialog" aria-modal="true">

    <div class="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-xl"
         x-show="showTrainingSelection"
         x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0"
         x-transition:enter-end="opacity-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="opacity-100"
         x-transition:leave-end="opacity-0"
         @click="closeTrainingSelection()"></div>

    <div class="bg-surface border border-[var(--glass-border)] rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
         x-show="showTrainingSelection"
         x-swipe-dismiss="closeTrainingSelection()"
         x-transition:enter="transition ease-out duration-400"
         x-transition:enter-start="translate-y-12 opacity-0 scale-90"
         x-transition:enter-end="translate-y-0 opacity-100 scale-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="translate-y-0 opacity-100 scale-100"
         x-transition:leave-end="translate-y-12 opacity-0 scale-90">

        <!-- Grab Handle -->
        <div class="flex justify-center pt-3 pb-1 md:hidden">
            <div class="w-10 h-1 rounded-full bg-white/15"></div>
        </div>

        <!-- Header -->
        <div class="p-6 border-b border-[var(--glass-border)] bg-surface z-20 shrink-0 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <i class="ph-bold ph-barbell text-lg"></i>
                </div>
                <div>
                    <h2 class="text-lg font-bold text-white">Trainingsplan erstellen</h2>
                    <p class="text-[10px] text-muted uppercase tracking-widest font-mono">Methode waehlen</p>
                </div>
            </div>
            <button type="button" @click="closeTrainingSelection()"
                    class="text-muted hover:text-white transition-colors p-2 -mr-2 hover:bg-white/5 rounded-xl">
                <i class="ph ph-x text-lg"></i>
            </button>
        </div>

        <!-- Selection Cards -->
        <div class="overflow-y-auto flex-1 px-6 py-5 custom-scrollbar space-y-4">
            <!-- Manual Plan Card -->
            <button type="button" @click="selectManualTraining()"
                    class="w-full p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/8 transition-all duration-300 text-left group active:scale-[0.97]">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:bg-white/10 transition-all">
                        <i class="ph-bold ph-notepad text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-sm font-bold text-white">Manuellen Trainingsplan hinzufuegen</h3>
                        <p class="text-[11px] text-muted mt-1">Erstelle deinen Plan selbst — volle Kontrolle ueber jede Uebung</p>
                    </div>
                    <i class="ph ph-caret-right text-white/20 group-hover:text-white/40 transition-colors"></i>
                </div>
            </button>

            <!-- AI Generator Card -->
            <button type="button" @click="selectGeneratorTraining()"
                    class="w-full p-5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/15 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all duration-300 text-left group active:scale-[0.97]">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                        <i class="ph-bold ph-sparkle text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-sm font-bold text-white">Lass dir einen Trainingsplan erstellen</h3>
                        <p class="text-[11px] text-muted mt-1">Beantworte 8 kurze Fragen — wir erstellen deinen Plan</p>
                    </div>
                    <i class="ph ph-caret-right text-blue-400/30 group-hover:text-blue-400/50 transition-colors"></i>
                </div>
            </button>

            <!-- Warnung wenn Plan existiert -->
            <div x-show="trainingPlan.some(d => d.length > 0)"
                 class="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <i class="ph ph-warning text-amber-400 text-sm mt-0.5 shrink-0"></i>
                <p class="text-[11px] text-amber-400/80">Du hast bereits einen Trainingsplan. Ein neuer Plan ersetzt den bestehenden.</p>
            </div>
        </div>
    </div>
</div>


<!-- ═══════════════════════════════════════════════════════════════
     GENERATOR WIZARD + PREVIEW
     ═══════════════════════════════════════════════════════════════ -->
<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-mobile-sheet"
     :class="generatorOpen ? 'pointer-events-auto' : 'pointer-events-none'"
     x-show="generatorOpen"
     role="dialog" aria-modal="true">

    <div class="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-xl"
         x-show="generatorOpen"
         x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0"
         x-transition:enter-end="opacity-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="opacity-100"
         x-transition:leave-end="opacity-0"
         @click="closeGenerator()"></div>

    <div class="bg-surface border border-[var(--glass-border)] rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
         x-show="generatorOpen"
         x-swipe-dismiss="closeGenerator()"
         x-transition:enter="transition ease-out duration-400"
         x-transition:enter-start="translate-y-12 opacity-0 scale-90"
         x-transition:enter-end="translate-y-0 opacity-100 scale-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="translate-y-0 opacity-100 scale-100"
         x-transition:leave-end="translate-y-12 opacity-0 scale-90">

        <!-- Grab Handle -->
        <div class="flex justify-center pt-3 pb-1 md:hidden">
            <div class="w-10 h-1 rounded-full bg-white/15"></div>
        </div>

        <!-- Header -->
        <div class="p-6 border-b border-[var(--glass-border)] bg-surface z-20 shrink-0">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <i class="ph-bold ph-sparkle text-lg"></i>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-white" x-text="generatorStep <= 8 ? 'Plan erstellen' : 'Dein Trainingsplan'"></h2>
                        <p class="text-[10px] text-muted uppercase tracking-widest font-mono"
                           x-show="generatorStep <= 8"
                           x-text="'Schritt ' + generatorStep + ' von 8'"></p>
                        <p class="text-[10px] text-muted uppercase tracking-widest font-mono"
                           x-show="generatorStep === 9">Vorschau</p>
                    </div>
                </div>
                <button type="button" @click="closeGenerator()"
                        class="text-muted hover:text-white transition-colors p-2 -mr-2 hover:bg-white/5 rounded-xl">
                    <i class="ph ph-x text-lg"></i>
                </button>
            </div>

            <!-- Progress Bar -->
            <div x-show="generatorStep <= 8" class="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                     :style="'width: ' + (generatorStep / 8 * 100) + '%'"></div>
            </div>
        </div>

        <!-- Content -->
        <div class="overflow-y-auto flex-1 px-6 py-5 custom-scrollbar">

            <!-- ── LOADING ─────────────────────────────── -->
            <div x-show="generatorLoading" class="flex flex-col items-center justify-center py-16 gap-4">
                <div class="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                <p class="text-sm text-muted animate-pulse">Dein Trainingsplan wird zusammengestellt...</p>
            </div>

            <!-- ── STEP 1: Fitnesslevel ────────────────── -->
            <div x-show="generatorStep === 1 && !generatorLoading" class="space-y-3">
                <h3 class="text-sm font-bold text-white">Wie ist dein aktuelles Fitnesslevel?</h3>

                <button type="button" @click="generatorAnswers.fitnessLevel = 'beginner'"
                        class="w-full p-4 rounded-2xl border transition-all duration-200 text-left active:scale-[0.97]"
                        :class="generatorAnswers.fitnessLevel === 'beginner'
                            ? 'bg-blue-500/10 border-blue-500/25'
                            : 'bg-white/5 border-white/5 hover:border-white/10'">
                    <p class="text-sm font-bold text-white">Anfaenger</p>
                    <p class="text-[11px] text-muted mt-0.5">Weniger als 6 Monate Trainingserfahrung</p>
                </button>

                <button type="button" @click="generatorAnswers.fitnessLevel = 'intermediate'"
                        class="w-full p-4 rounded-2xl border transition-all duration-200 text-left active:scale-[0.97]"
                        :class="generatorAnswers.fitnessLevel === 'intermediate'
                            ? 'bg-blue-500/10 border-blue-500/25'
                            : 'bg-white/5 border-white/5 hover:border-white/10'">
                    <p class="text-sm font-bold text-white">Fortgeschritten</p>
                    <p class="text-[11px] text-muted mt-0.5">6 Monate bis 2 Jahre regelmaessiges Training</p>
                </button>

                <button type="button" @click="generatorAnswers.fitnessLevel = 'advanced'"
                        class="w-full p-4 rounded-2xl border transition-all duration-200 text-left active:scale-[0.97]"
                        :class="generatorAnswers.fitnessLevel === 'advanced'
                            ? 'bg-blue-500/10 border-blue-500/25'
                            : 'bg-white/5 border-white/5 hover:border-white/10'">
                    <p class="text-sm font-bold text-white">Profi</p>
                    <p class="text-[11px] text-muted mt-0.5">Mehr als 2 Jahre konsequentes Training</p>
                </button>
            </div>

            <!-- ── STEP 2: Trainingstage ───────────────── -->
            <div x-show="generatorStep === 2 && !generatorLoading" class="space-y-4">
                <h3 class="text-sm font-bold text-white">Wie oft pro Woche moechtest du trainieren?</h3>
                <div class="flex items-center justify-center gap-4 py-4">
                    <button type="button" @click="generatorAnswers.daysPerWeek = Math.max(1, generatorAnswers.daysPerWeek - 1)"
                            class="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-[0.95]">
                        <i class="ph-bold ph-minus text-sm"></i>
                    </button>
                    <div class="text-center min-w-[60px]">
                        <p class="text-4xl font-extrabold text-white font-mono" x-text="generatorAnswers.daysPerWeek"></p>
                        <p class="text-[10px] text-muted mt-1" x-text="generatorAnswers.daysPerWeek === 1 ? 'Tag' : 'Tage'"></p>
                    </div>
                    <button type="button" @click="generatorAnswers.daysPerWeek = Math.min(7, generatorAnswers.daysPerWeek + 1)"
                            class="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-[0.95]">
                        <i class="ph-bold ph-plus text-sm"></i>
                    </button>
                </div>
                <div class="flex justify-center gap-1.5">
                    <template x-for="(day, idx) in WEEKDAY_SHORT" :key="idx">
                        <div class="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-200"
                             :class="idx < generatorAnswers.daysPerWeek
                                 ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                 : 'bg-white/5 text-muted border border-white/5'"
                             x-text="day"></div>
                    </template>
                </div>
            </div>

            <!-- ── STEP 3: Equipment ───────────────────── -->
            <div x-show="generatorStep === 3 && !generatorLoading" class="space-y-3">
                <h3 class="text-sm font-bold text-white">Hast du ein Fitnessstudio zur Verfuegung?</h3>

                <button type="button" @click="generatorAnswers.equipment = 'full_gym'"
                        class="w-full p-4 rounded-2xl border transition-all duration-200 text-left active:scale-[0.97]"
                        :class="generatorAnswers.equipment === 'full_gym'
                            ? 'bg-blue-500/10 border-blue-500/25'
                            : 'bg-white/5 border-white/5 hover:border-white/10'">
                    <div class="flex items-center gap-3">
                        <i class="ph-bold ph-barbell text-lg text-blue-400"></i>
                        <div>
                            <p class="text-sm font-bold text-white">Fitnessstudio</p>
                            <p class="text-[11px] text-muted mt-0.5">Geraete, Kabelzug, Hanteln — alles verfuegbar</p>
                        </div>
                    </div>
                </button>

                <button type="button" @click="generatorAnswers.equipment = 'home_gym'"
                        class="w-full p-4 rounded-2xl border transition-all duration-200 text-left active:scale-[0.97]"
                        :class="generatorAnswers.equipment === 'home_gym'
                            ? 'bg-blue-500/10 border-blue-500/25'
                            : 'bg-white/5 border-white/5 hover:border-white/10'">
                    <div class="flex items-center gap-3">
                        <i class="ph-bold ph-house text-lg text-blue-400"></i>
                        <div>
                            <p class="text-sm font-bold text-white">Home-Gym</p>
                            <p class="text-[11px] text-muted mt-0.5">Hanteln + Langhantel, keine Geraete</p>
                        </div>
                    </div>
                </button>

                <button type="button" @click="generatorAnswers.equipment = 'bodyweight'"
                        class="w-full p-4 rounded-2xl border transition-all duration-200 text-left active:scale-[0.97]"
                        :class="generatorAnswers.equipment === 'bodyweight'
                            ? 'bg-blue-500/10 border-blue-500/25'
                            : 'bg-white/5 border-white/5 hover:border-white/10'">
                    <div class="flex items-center gap-3">
                        <i class="ph-bold ph-person-arms-spread text-lg text-blue-400"></i>
                        <div>
                            <p class="text-sm font-bold text-white">Bodyweight / Calisthenics</p>
                            <p class="text-[11px] text-muted mt-0.5">Nur eigenes Koerpergewicht + Baender</p>
                        </div>
                    </div>
                </button>
            </div>

            <!-- ── STEP 4: Trainingsziel ───────────────── -->
            <div x-show="generatorStep === 4 && !generatorLoading" class="space-y-4">
                <h3 class="text-sm font-bold text-white">Was ist dein primaeres Trainingsziel?</h3>
                <p class="text-[11px] text-muted">Du kannst mehrere waehlen</p>
                <div class="grid grid-cols-2 gap-2.5">
                    <button type="button" @click="toggleGoal('muscle')"
                            class="p-3.5 rounded-xl border transition-all duration-200 text-center active:scale-[0.97]"
                            :class="generatorAnswers.goals.includes('muscle')
                                ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                                : 'bg-white/5 border-white/5 text-muted hover:border-white/10'">
                        <i class="ph-bold ph-barbell text-lg"></i>
                        <p class="text-xs font-bold mt-1.5">Muskelaufbau</p>
                    </button>
                    <button type="button" @click="toggleGoal('fat_loss')"
                            class="p-3.5 rounded-xl border transition-all duration-200 text-center active:scale-[0.97]"
                            :class="generatorAnswers.goals.includes('fat_loss')
                                ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                                : 'bg-white/5 border-white/5 text-muted hover:border-white/10'">
                        <i class="ph-bold ph-fire text-lg"></i>
                        <p class="text-xs font-bold mt-1.5">Fettabbau</p>
                    </button>
                    <button type="button" @click="toggleGoal('endurance')"
                            class="p-3.5 rounded-xl border transition-all duration-200 text-center active:scale-[0.97]"
                            :class="generatorAnswers.goals.includes('endurance')
                                ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                                : 'bg-white/5 border-white/5 text-muted hover:border-white/10'">
                        <i class="ph-bold ph-heartbeat text-lg"></i>
                        <p class="text-xs font-bold mt-1.5">Ausdauer</p>
                    </button>
                    <button type="button" @click="toggleGoal('general')"
                            class="p-3.5 rounded-xl border transition-all duration-200 text-center active:scale-[0.97]"
                            :class="generatorAnswers.goals.includes('general')
                                ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                                : 'bg-white/5 border-white/5 text-muted hover:border-white/10'">
                        <i class="ph-bold ph-target text-lg"></i>
                        <p class="text-xs font-bold mt-1.5">Allg. Fitness</p>
                    </button>
                </div>
            </div>

            <!-- ── STEP 5: Andere Sportarten ───────────── -->
            <div x-show="generatorStep === 5 && !generatorLoading" class="space-y-4">
                <h3 class="text-sm font-bold text-white">Machst du noch eine andere Sportart?</h3>
                <div class="flex gap-2">
                    <button type="button" @click="generatorAnswers.hasOtherSports = false; generatorAnswers.otherSportsDays = []"
                            class="flex-1 py-3 rounded-xl font-bold text-xs transition-all active:scale-[0.97]"
                            :class="!generatorAnswers.hasOtherSports ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'">
                        Nein
                    </button>
                    <button type="button" @click="generatorAnswers.hasOtherSports = true"
                            class="flex-1 py-3 rounded-xl font-bold text-xs transition-all active:scale-[0.97]"
                            :class="generatorAnswers.hasOtherSports ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'">
                        Ja
                    </button>
                </div>

                <div x-show="generatorAnswers.hasOtherSports"
                     x-transition:enter="transition ease-out duration-200"
                     x-transition:enter-start="opacity-0 -translate-y-2"
                     x-transition:enter-end="opacity-100 translate-y-0"
                     class="space-y-3">
                    <div class="space-y-2">
                        <label class="text-[10px] text-muted uppercase font-bold tracking-wider">Welche Sportart?</label>
                        <input type="text" x-model="generatorAnswers.otherSports"
                               class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-white/20 outline-none transition-colors placeholder-white/15"
                               placeholder="z.B. Fussball, Basketball...">
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] text-muted uppercase font-bold tracking-wider">An welchen Tagen?</label>
                        <div class="flex gap-1.5">
                            <template x-for="(day, idx) in WEEKDAY_SHORT" :key="idx">
                                <button type="button" @click="toggleOtherSportDay(idx)"
                                        class="flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-200 border active:scale-[0.95]"
                                        :class="generatorAnswers.otherSportsDays.includes(idx)
                                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                                            : 'bg-white/5 text-muted border-white/5 hover:border-white/10'"
                                        x-text="day"></button>
                            </template>
                        </div>
                    </div>
                    <!-- Validierung: genug freie Tage? -->
                    <div x-show="generatorAnswers.otherSportsDays.length > 0 && (7 - generatorAnswers.otherSportsDays.length) < generatorAnswers.daysPerWeek"
                         class="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                        <i class="ph ph-warning text-rose-400 text-sm mt-0.5 shrink-0"></i>
                        <p class="text-[11px] text-rose-400/80"
                           x-text="'Du hast ' + generatorAnswers.otherSportsDays.length + ' Tage belegt. Fuer ' + generatorAnswers.daysPerWeek + ' Trainingstage bleiben nicht genug freie Tage.'"></p>
                    </div>
                </div>
            </div>

            <!-- ── STEP 6: Zeit pro Training ───────────── -->
            <div x-show="generatorStep === 6 && !generatorLoading" class="space-y-3">
                <h3 class="text-sm font-bold text-white">Wie viel Zeit hast du pro Trainingseinheit?</h3>

                <template x-for="option in [{val: 30, label: '30 Minuten', desc: 'Kurz und knackig'}, {val: 45, label: '45 Minuten', desc: 'Optimal fuer die meisten'}, {val: 60, label: '60 Minuten', desc: 'Ausfuehrliches Training'}, {val: 90, label: '90+ Minuten', desc: 'Intensives Training mit viel Volumen'}]"
                          :key="option.val">
                    <button type="button" @click="generatorAnswers.sessionDuration = option.val"
                            class="w-full p-4 rounded-2xl border transition-all duration-200 text-left active:scale-[0.97]"
                            :class="generatorAnswers.sessionDuration === option.val
                                ? 'bg-blue-500/10 border-blue-500/25'
                                : 'bg-white/5 border-white/5 hover:border-white/10'">
                        <p class="text-sm font-bold text-white" x-text="option.label"></p>
                        <p class="text-[11px] text-muted mt-0.5" x-text="option.desc"></p>
                    </button>
                </template>
            </div>

            <!-- ── STEP 7: Verletzungen ────────────────── -->
            <div x-show="generatorStep === 7 && !generatorLoading" class="space-y-4">
                <h3 class="text-sm font-bold text-white">Gibt es Verletzungen oder Einschraenkungen?</h3>
                <div class="flex gap-2">
                    <button type="button" @click="generatorAnswers.hasInjuries = false; generatorAnswers.injuries = ''"
                            class="flex-1 py-3 rounded-xl font-bold text-xs transition-all active:scale-[0.97]"
                            :class="!generatorAnswers.hasInjuries ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'">
                        Keine
                    </button>
                    <button type="button" @click="generatorAnswers.hasInjuries = true"
                            class="flex-1 py-3 rounded-xl font-bold text-xs transition-all active:scale-[0.97]"
                            :class="generatorAnswers.hasInjuries ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'">
                        Ja
                    </button>
                </div>
                <div x-show="generatorAnswers.hasInjuries"
                     x-transition:enter="transition ease-out duration-200"
                     x-transition:enter-start="opacity-0 -translate-y-2"
                     x-transition:enter-end="opacity-100 translate-y-0">
                    <input type="text" x-model="generatorAnswers.injuries"
                           class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-white/20 outline-none transition-colors placeholder-white/15"
                           placeholder="z.B. Knie, Schulter, Ruecken...">
                </div>
            </div>

            <!-- ── STEP 8: Praeferenzen ────────────────── -->
            <div x-show="generatorStep === 8 && !generatorLoading" class="space-y-4">
                <h3 class="text-sm font-bold text-white">Bevorzugst du bestimmte Uebungen?</h3>
                <p class="text-[11px] text-muted">Optional — du kannst diesen Schritt auch ueberspringen</p>
                <textarea x-model="generatorAnswers.exercisePreferences"
                          rows="3"
                          class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-white/20 outline-none transition-colors placeholder-white/15 resize-none"
                          placeholder="z.B. Kniebeugen bevorzugt, Kreuzheben vermeiden..."></textarea>
            </div>

            <!-- ── STEP 9: PLAN PREVIEW ────────────────── -->
            <div x-show="generatorStep === 9 && !generatorLoading" class="space-y-4">
                <!-- Day Tabs -->
                <div class="flex gap-1.5 overflow-x-auto pb-1">
                    <template x-for="(day, idx) in WEEKDAY_SHORT" :key="idx">
                        <button type="button" @click="trainingSelectedDay = idx"
                                class="relative flex-1 min-w-[44px] py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border"
                                :class="trainingSelectedDay === idx
                                    ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-105'
                                    : 'bg-white/5 text-muted border-white/5 hover:bg-white/10'">
                            <span x-text="day"></span>
                            <span x-show="generatedPlan && generatedPlan[idx] && generatedPlan[idx].length > 0"
                                  class="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                                  :class="trainingSelectedDay === idx ? 'bg-black text-white' : 'bg-white/20 text-white'"
                                  x-text="generatedPlan[idx].length"></span>
                        </button>
                    </template>
                </div>

                <!-- Exercise List -->
                <div x-show="generatedPlan && generatedPlan[trainingSelectedDay] && generatedPlan[trainingSelectedDay].length > 0"
                     class="space-y-2.5">
                    <template x-for="(ex, exIdx) in (generatedPlan ? generatedPlan[trainingSelectedDay] : [])" :key="exIdx">
                        <div class="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300">
                            <div class="flex items-start justify-between gap-2">
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-white truncate" x-text="ex.name"></p>
                                    <div class="flex items-center gap-2 mt-1.5">
                                        <template x-if="ex.type === 'strength'">
                                            <p class="text-[11px] text-muted font-mono">
                                                <span x-text="ex.sets"></span>×<span x-text="ex.reps"></span>
                                                <span x-show="ex.weight > 0" x-text="' · ' + ex.weight + ' kg'"></span>
                                            </p>
                                        </template>
                                        <template x-if="ex.type === 'cardio'">
                                            <p class="text-[11px] text-muted font-mono" x-text="ex.duration"></p>
                                        </template>
                                        <template x-if="ex.type === 'distance'">
                                            <p class="text-[11px] text-muted font-mono" x-text="(ex.distance || '') + ' · ' + (ex.duration || '')"></p>
                                        </template>
                                    </div>
                                </div>
                                <!-- Swap Button -->
                                <button x-show="ex.type === 'strength'"
                                        type="button" @click="openSwapOptions(trainingSelectedDay, exIdx)"
                                        class="p-2 text-muted hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
                                        title="Uebung tauschen">
                                    <i class="ph ph-arrows-clockwise text-sm"></i>
                                </button>
                            </div>

                            <!-- Swap Options (inline) -->
                            <div x-show="swapTarget && swapTarget.dayIndex === trainingSelectedDay && swapTarget.exIndex === exIdx && swapOptions"
                                 x-transition:enter="transition ease-out duration-200"
                                 x-transition:enter-start="opacity-0 -translate-y-2"
                                 x-transition:enter-end="opacity-100 translate-y-0"
                                 class="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                                <p class="text-[10px] text-muted uppercase font-bold tracking-wider">Alternative waehlen:</p>
                                <template x-for="alt in (swapOptions || [])" :key="alt.id">
                                    <button type="button" @click="confirmSwap(alt.id)"
                                            class="w-full p-2.5 rounded-xl bg-blue-500/[0.04] border border-blue-500/10 hover:border-blue-500/25 transition-all text-left active:scale-[0.97]">
                                        <p class="text-xs font-bold text-white" x-text="alt.name"></p>
                                        <p class="text-[10px] text-muted mt-0.5" x-text="alt.equipment"></p>
                                    </button>
                                </template>
                                <button type="button" @click="closeSwapOptions()"
                                        class="w-full py-1.5 text-[10px] text-muted hover:text-white transition-colors">
                                    Abbrechen
                                </button>
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Rest Day -->
                <div x-show="!generatedPlan || !generatedPlan[trainingSelectedDay] || generatedPlan[trainingSelectedDay].length === 0"
                     class="py-12 text-center">
                    <i class="ph ph-moon-stars text-3xl text-muted"></i>
                    <p class="text-sm text-muted mt-2">Ruhetag</p>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-[var(--glass-border)] bg-surface z-20 shrink-0">
            <!-- Wizard Navigation (Steps 1-8) -->
            <div x-show="generatorStep >= 1 && generatorStep <= 8 && !generatorLoading" class="flex gap-3">
                <button x-show="generatorStep > 1"
                        type="button" @click="generatorPrevStep()"
                        class="flex-1 py-3.5 rounded-xl border border-white/5 text-muted font-bold text-xs hover:bg-white/5 active:scale-[0.97] transition-all">
                    Zurueck
                </button>
                <button x-show="generatorStep < 8"
                        type="button" @click="generatorNextStep()"
                        class="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-gray-200 active:scale-[0.97] transition-all shadow-lg shadow-white/5">
                    Weiter
                </button>
                <button x-show="generatorStep === 8"
                        type="button" @click="generatePlan()"
                        class="flex-1 py-3.5 rounded-xl bg-blue-500 text-white font-bold text-xs hover:bg-blue-600 active:scale-[0.97] transition-all shadow-lg shadow-blue-500/20">
                    <i class="ph-bold ph-sparkle text-xs mr-1"></i> Plan generieren
                </button>
            </div>

            <!-- Preview Actions (Step 9) -->
            <div x-show="generatorStep === 9 && !generatorLoading" class="space-y-2.5">
                <div class="flex gap-3">
                    <button type="button" @click="regeneratePlan()"
                            class="flex-1 py-3.5 rounded-xl border border-white/5 text-muted font-bold text-xs hover:bg-white/5 active:scale-[0.97] transition-all">
                        <i class="ph ph-arrows-clockwise text-xs mr-1"></i> Nochmal
                    </button>
                    <button type="button" @click="applyGeneratedPlan()"
                            class="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-gray-200 active:scale-[0.97] transition-all shadow-lg shadow-white/5">
                        Plan uebernehmen
                    </button>
                </div>
                <button type="button" @click="switchToManualEdit()"
                        class="w-full py-3 rounded-xl border border-dashed border-white/10 text-muted font-bold text-[11px] hover:bg-white/5 hover:border-white/20 active:scale-[0.97] transition-all">
                    <i class="ph ph-pencil-simple text-xs mr-1"></i> Im Editor anpassen
                </button>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add templates/modals/training-generator.html
git commit -m "feat: Wizard-UI mit Selection Screen, 8-Step Fragebogen und Plan-Vorschau"
```

---

### Task 5: Wire Up in main.js

**Files:**
- Modify: `js/main.js` (3 lines to add)

- [ ] **Step 1: Add imports for the new mixin and template**

Add these imports alongside the existing training imports in `js/main.js`:

```javascript
// After line: import { trainingMixin } from './features/training.js';
import { trainingGeneratorMixin } from './features/training-generator.js';

// After line: import trainingModal from '../templates/modals/training.html?raw';
import trainingGeneratorModal from '../templates/modals/training-generator.html?raw';
```

- [ ] **Step 2: Add template to modals container**

In the `modalsContainer.innerHTML` array, add `trainingGeneratorModal` after `trainingModal`:

```javascript
// Inside modalsContainer.innerHTML = [...].join('\n');
// Add trainingGeneratorModal after trainingModal
trainingGeneratorModal,
```

- [ ] **Step 3: Spread the mixin**

After the existing `...trainingMixin(),` line, add:

```javascript
...trainingGeneratorMixin(),
```

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat: Generator-Mixin und Modal-Template in main.js integriert"
```

---

### Task 6: Update Trigger Points

**Files:**
- Modify: `index.html` (2 call sites)
- Modify: `templates/modals/settings.html` (1 call site)

- [ ] **Step 1: Update trigger in index.html training tab button**

At `index.html:407`, change `openTraining()` to `openTrainingSelection()`:

```html
<!-- Before: -->
<button @click="openTraining()" class="inline-flex items-center ...">

<!-- After: -->
<button @click="openTrainingSelection()" class="inline-flex items-center ...">
```

- [ ] **Step 2: Update trigger in index.html profile dropdown**

At `index.html:869`, change `openTraining()` to `openTrainingSelection()`:

```html
<!-- Before: -->
<button @click="openTraining(); closeProfileDropdown()" class="quick-menu-item group">

<!-- After: -->
<button @click="openTrainingSelection(); closeProfileDropdown()" class="quick-menu-item group">
```

- [ ] **Step 3: Update trigger in settings modal**

In `templates/modals/settings.html:63`, change `openTraining()` to `openTrainingSelection()`:

```html
<!-- Before: -->
<button type="button" @click="openTraining(); closeSettings()"

<!-- After: -->
<button type="button" @click="openTrainingSelection(); closeSettings()"
```

- [ ] **Step 4: Commit**

```bash
git add index.html templates/modals/settings.html
git commit -m "feat: openTraining() Trigger auf openTrainingSelection() umgestellt"
```

---

### Task 7: Create data directory and verify build

**Files:**
- Create: `js/data/` directory (if not exists)

- [ ] **Step 1: Verify directory structure**

```bash
ls js/data/
# Should show: exercises.js, split-templates.js
```

- [ ] **Step 2: Run Vite dev server and verify no build errors**

```bash
npm run dev
# Verify: no import errors, no syntax errors, app loads
```

- [ ] **Step 3: Manual smoke test checklist**

Open the app in browser:
1. Click the training plan trigger button → Selection screen appears (not old modal)
2. Click "Manuellen Trainingsplan hinzufuegen" → Old training modal opens (unchanged)
3. Close and reopen → Click "Lass dir einen Trainingsplan erstellen" → Wizard starts
4. Walk through all 8 steps → Plan generates → Preview shows
5. Test "Nochmal generieren" → New plan appears
6. Test "Uebung tauschen" → Alternatives shown → Swap works
7. Test "Plan uebernehmen" → Plan saved, toast shown
8. Verify saved plan appears in training tab
9. Test "Im Editor anpassen" → Manual editor opens with generated plan

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: Smoke-Test-Korrekturen fuer Generator-Integration"
```

---

### Task 8: Standalone Mockup HTML

**Files:**
- Create: `mockup-trainingsplan-ai.html` (project root)

- [ ] **Step 1: Create interactive mockup**

Create `mockup-trainingsplan-ai.html` in project root — a standalone HTML file that demonstrates the complete flow visually. Uses Tailwind CDN, inline JS, matches the app's dark theme. Interactive: clicking through steps, selection screen, wizard, loading, preview.

The mockup should:
- Include the selection screen with both cards
- Show all 8 wizard steps with working navigation
- Simulate the loading animation
- Show a hardcoded plan preview with day tabs
- Include the swap exercise UI
- Show footer actions (nochmal, uebernehmen, anpassen)
- Match the exact dark theme colors from the app

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AGAs Dashboard — Trainingsplan Generator Mockup</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace']
                    }
                }
            }
        }
    </script>
    <style>
        :root {
            --bg: #050505;
            --surface: #0a0a0a;
            --glass-border: rgba(255,255,255,0.06);
            --muted: #8b8b94;
            --backdrop: rgba(0,0,0,0.7);
        }
        body { background: var(--bg); }
        .bg-surface { background: var(--surface); }
    </style>
</head>
<body class="text-white antialiased min-h-screen flex items-center justify-center p-4 font-sans" x-data="mockup()">

    <!-- Selection Screen -->
    <div x-show="screen === 'selection'" class="bg-surface border border-[rgba(255,255,255,0.06)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-white/15"></div></div>
        <div class="p-6 border-b border-[rgba(255,255,255,0.06)]">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <i class="ph-bold ph-barbell text-lg"></i>
                </div>
                <div>
                    <h2 class="text-lg font-bold">Trainingsplan erstellen</h2>
                    <p class="text-[10px] uppercase tracking-widest font-mono" style="color: var(--muted)">Methode waehlen</p>
                </div>
            </div>
        </div>
        <div class="px-6 py-5 space-y-4">
            <button @click="screen = 'manual'" class="w-full p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 transition-all text-left group">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10"><i class="ph-bold ph-notepad text-xl"></i></div>
                    <div class="flex-1">
                        <h3 class="text-sm font-bold">Manuellen Trainingsplan hinzufuegen</h3>
                        <p class="text-[11px] mt-1" style="color: var(--muted)">Erstelle deinen Plan selbst</p>
                    </div>
                    <i class="ph ph-caret-right text-white/20"></i>
                </div>
            </button>
            <button @click="screen = 'wizard'; step = 1" class="w-full p-5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/15 hover:border-blue-500/30 transition-all text-left group">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20"><i class="ph-bold ph-sparkle text-xl"></i></div>
                    <div class="flex-1">
                        <h3 class="text-sm font-bold">Lass dir einen Trainingsplan erstellen</h3>
                        <p class="text-[11px] mt-1" style="color: var(--muted)">Beantworte 8 kurze Fragen</p>
                    </div>
                    <i class="ph ph-caret-right text-blue-400/30"></i>
                </div>
            </button>
            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <i class="ph ph-warning text-amber-400 text-sm mt-0.5"></i>
                <p class="text-[11px] text-amber-400/80">Du hast bereits einen Trainingsplan. Ein neuer Plan ersetzt den bestehenden.</p>
            </div>
        </div>
    </div>

    <!-- Wizard -->
    <div x-show="screen === 'wizard'" class="bg-surface border border-[rgba(255,255,255,0.06)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-white/15"></div></div>
        <div class="p-6 border-b border-[rgba(255,255,255,0.06)]">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20"><i class="ph-bold ph-sparkle text-lg"></i></div>
                <div>
                    <h2 class="text-lg font-bold" x-text="step <= 8 ? 'Plan erstellen' : 'Dein Trainingsplan'"></h2>
                    <p class="text-[10px] uppercase tracking-widest font-mono" style="color: var(--muted)" x-text="step <= 8 ? 'Schritt ' + step + ' von 8' : 'Vorschau'"></p>
                </div>
            </div>
            <div x-show="step <= 8" class="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full transition-all duration-500" :style="'width:' + (step/8*100) + '%'"></div>
            </div>
        </div>
        <div class="px-6 py-5 min-h-[300px]">
            <!-- Step 1 -->
            <div x-show="step === 1" class="space-y-3">
                <h3 class="text-sm font-bold">Wie ist dein aktuelles Fitnesslevel?</h3>
                <template x-for="opt in [{v:'beginner',l:'Anfaenger',d:'Weniger als 6 Monate Trainingserfahrung'},{v:'intermediate',l:'Fortgeschritten',d:'6 Monate bis 2 Jahre'},{v:'advanced',l:'Profi',d:'Mehr als 2 Jahre'}]">
                    <button @click="answers.level = opt.v" class="w-full p-4 rounded-2xl border transition-all text-left" :class="answers.level === opt.v ? 'bg-blue-500/10 border-blue-500/25' : 'bg-white/5 border-white/5'">
                        <p class="text-sm font-bold" x-text="opt.l"></p><p class="text-[11px] mt-0.5" style="color:var(--muted)" x-text="opt.d"></p>
                    </button>
                </template>
            </div>
            <!-- Step 2 -->
            <div x-show="step === 2" class="space-y-4">
                <h3 class="text-sm font-bold">Wie oft pro Woche moechtest du trainieren?</h3>
                <div class="flex items-center justify-center gap-4 py-4">
                    <button @click="answers.days = Math.max(1, answers.days-1)" class="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center"><i class="ph-bold ph-minus text-sm"></i></button>
                    <div class="text-center min-w-[60px]"><p class="text-4xl font-extrabold font-mono" x-text="answers.days"></p><p class="text-[10px] mt-1" style="color:var(--muted)">Tage</p></div>
                    <button @click="answers.days = Math.min(7, answers.days+1)" class="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center"><i class="ph-bold ph-plus text-sm"></i></button>
                </div>
            </div>
            <!-- Step 3 -->
            <div x-show="step === 3" class="space-y-3">
                <h3 class="text-sm font-bold">Hast du ein Fitnessstudio?</h3>
                <template x-for="opt in [{v:'full_gym',i:'ph-barbell',l:'Fitnessstudio',d:'Geraete, Kabelzug, Hanteln'},{v:'home_gym',i:'ph-house',l:'Home-Gym',d:'Hanteln + Langhantel'},{v:'bodyweight',i:'ph-person-arms-spread',l:'Bodyweight',d:'Nur Koerpergewicht'}]">
                    <button @click="answers.equip = opt.v" class="w-full p-4 rounded-2xl border transition-all text-left" :class="answers.equip === opt.v ? 'bg-blue-500/10 border-blue-500/25' : 'bg-white/5 border-white/5'">
                        <div class="flex items-center gap-3"><i class="text-lg text-blue-400" :class="'ph-bold ' + opt.i"></i><div><p class="text-sm font-bold" x-text="opt.l"></p><p class="text-[11px] mt-0.5" style="color:var(--muted)" x-text="opt.d"></p></div></div>
                    </button>
                </template>
            </div>
            <!-- Step 4 -->
            <div x-show="step === 4" class="space-y-4">
                <h3 class="text-sm font-bold">Was ist dein Trainingsziel?</h3>
                <p class="text-[11px]" style="color:var(--muted)">Du kannst mehrere waehlen</p>
                <div class="grid grid-cols-2 gap-2.5">
                    <template x-for="g in [{v:'muscle',i:'ph-barbell',l:'Muskelaufbau'},{v:'fat_loss',i:'ph-fire',l:'Fettabbau'},{v:'endurance',i:'ph-heartbeat',l:'Ausdauer'},{v:'general',i:'ph-target',l:'Allg. Fitness'}]">
                        <button @click="answers.goals.includes(g.v) ? answers.goals.splice(answers.goals.indexOf(g.v),1) : answers.goals.push(g.v)" class="p-3.5 rounded-xl border transition-all text-center" :class="answers.goals.includes(g.v) ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' : 'bg-white/5 border-white/5 text-[var(--muted)]'">
                            <i class="text-lg" :class="'ph-bold ' + g.i"></i><p class="text-xs font-bold mt-1.5" x-text="g.l"></p>
                        </button>
                    </template>
                </div>
            </div>
            <!-- Step 5 -->
            <div x-show="step === 5" class="space-y-4">
                <h3 class="text-sm font-bold">Machst du noch eine andere Sportart?</h3>
                <div class="flex gap-2">
                    <button @click="answers.otherSport = false" class="flex-1 py-3 rounded-xl font-bold text-xs transition-all" :class="!answers.otherSport ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'">Nein</button>
                    <button @click="answers.otherSport = true" class="flex-1 py-3 rounded-xl font-bold text-xs transition-all" :class="answers.otherSport ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'">Ja</button>
                </div>
                <div x-show="answers.otherSport" class="space-y-3">
                    <input type="text" placeholder="z.B. Fussball" class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-white/20 outline-none placeholder-white/15">
                    <label class="text-[10px] uppercase font-bold tracking-wider" style="color:var(--muted)">An welchen Tagen?</label>
                    <div class="flex gap-1.5">
                        <template x-for="(d,i) in ['Mo','Di','Mi','Do','Fr','Sa','So']">
                            <button @click="answers.blockedDays.includes(i) ? answers.blockedDays.splice(answers.blockedDays.indexOf(i),1) : answers.blockedDays.push(i)"
                                    class="flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all border"
                                    :class="answers.blockedDays.includes(i) ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'bg-white/5 text-[var(--muted)] border-white/5'"
                                    x-text="d"></button>
                        </template>
                    </div>
                </div>
            </div>
            <!-- Step 6 -->
            <div x-show="step === 6" class="space-y-3">
                <h3 class="text-sm font-bold">Wie viel Zeit pro Training?</h3>
                <template x-for="t in [{v:30,l:'30 Minuten',d:'Kurz und knackig'},{v:45,l:'45 Minuten',d:'Optimal fuer die meisten'},{v:60,l:'60 Minuten',d:'Ausfuehrliches Training'},{v:90,l:'90+ Minuten',d:'Intensiv mit viel Volumen'}]">
                    <button @click="answers.time = t.v" class="w-full p-4 rounded-2xl border transition-all text-left" :class="answers.time === t.v ? 'bg-blue-500/10 border-blue-500/25' : 'bg-white/5 border-white/5'">
                        <p class="text-sm font-bold" x-text="t.l"></p><p class="text-[11px] mt-0.5" style="color:var(--muted)" x-text="t.d"></p>
                    </button>
                </template>
            </div>
            <!-- Step 7 -->
            <div x-show="step === 7" class="space-y-4">
                <h3 class="text-sm font-bold">Verletzungen oder Einschraenkungen?</h3>
                <div class="flex gap-2">
                    <button @click="answers.injured = false" class="flex-1 py-3 rounded-xl font-bold text-xs transition-all" :class="!answers.injured ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'">Keine</button>
                    <button @click="answers.injured = true" class="flex-1 py-3 rounded-xl font-bold text-xs transition-all" :class="answers.injured ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'">Ja</button>
                </div>
                <input x-show="answers.injured" type="text" placeholder="z.B. Knie, Schulter..." class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-white/20 outline-none placeholder-white/15">
            </div>
            <!-- Step 8 -->
            <div x-show="step === 8" class="space-y-4">
                <h3 class="text-sm font-bold">Bevorzugst du bestimmte Uebungen?</h3>
                <p class="text-[11px]" style="color:var(--muted)">Optional — du kannst diesen Schritt ueberspringen</p>
                <textarea rows="3" class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-white/20 outline-none placeholder-white/15 resize-none" placeholder="z.B. Kniebeugen bevorzugt..."></textarea>
            </div>
            <!-- Loading -->
            <div x-show="step === 'loading'" class="flex flex-col items-center justify-center py-16 gap-4">
                <div class="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                <p class="text-sm animate-pulse" style="color:var(--muted)">Dein Trainingsplan wird zusammengestellt...</p>
            </div>
            <!-- Preview -->
            <div x-show="step === 9" class="space-y-4">
                <div class="flex gap-1.5">
                    <template x-for="(d,i) in ['Mo','Di','Mi','Do','Fr','Sa','So']">
                        <button @click="previewDay = i" class="relative flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border" :class="previewDay === i ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-white/5 text-[var(--muted)] border-white/5'" x-text="d">
                        </button>
                    </template>
                </div>
                <template x-for="ex in mockPlan[previewDay]">
                    <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div class="flex items-start justify-between">
                            <div><p class="text-sm font-bold" x-text="ex.name"></p><p class="text-[11px] font-mono mt-1" style="color:var(--muted)" x-text="ex.detail"></p></div>
                            <button class="p-2 rounded-lg hover:bg-white/5" style="color:var(--muted)"><i class="ph ph-arrows-clockwise text-sm"></i></button>
                        </div>
                    </div>
                </template>
                <div x-show="mockPlan[previewDay].length === 0" class="py-12 text-center">
                    <i class="ph ph-moon-stars text-3xl" style="color:var(--muted)"></i><p class="text-sm mt-2" style="color:var(--muted)">Ruhetag</p>
                </div>
            </div>
        </div>
        <!-- Footer -->
        <div class="p-6 border-t border-[rgba(255,255,255,0.06)]">
            <div x-show="step >= 1 && step <= 8" class="flex gap-3">
                <button x-show="step > 1" @click="step--" class="flex-1 py-3.5 rounded-xl border border-white/5 font-bold text-xs" style="color:var(--muted)">Zurueck</button>
                <button x-show="step < 8" @click="step++" class="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-xs">Weiter</button>
                <button x-show="step === 8" @click="step = 'loading'; setTimeout(() => step = 9, 1500)" class="flex-1 py-3.5 rounded-xl bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"><i class="ph-bold ph-sparkle text-xs mr-1"></i> Plan generieren</button>
            </div>
            <div x-show="step === 9" class="space-y-2.5">
                <div class="flex gap-3">
                    <button @click="step = 'loading'; setTimeout(() => step = 9, 1500)" class="flex-1 py-3.5 rounded-xl border border-white/5 font-bold text-xs" style="color:var(--muted)"><i class="ph ph-arrows-clockwise text-xs mr-1"></i> Nochmal</button>
                    <button class="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-xs">Plan uebernehmen</button>
                </div>
                <button class="w-full py-3 rounded-xl border border-dashed border-white/10 font-bold text-[11px]" style="color:var(--muted)"><i class="ph ph-pencil-simple text-xs mr-1"></i> Im Editor anpassen</button>
            </div>
        </div>
    </div>

    <!-- Manual (placeholder) -->
    <div x-show="screen === 'manual'" class="bg-surface border border-[rgba(255,255,255,0.06)] rounded-3xl w-full max-w-lg shadow-2xl p-8 text-center">
        <i class="ph-bold ph-notepad text-4xl mb-4" style="color:var(--muted)"></i>
        <p class="text-sm font-bold">Manueller Editor</p>
        <p class="text-[11px] mt-1" style="color:var(--muted)">(In der echten App oeffnet sich hier der bestehende Editor)</p>
        <button @click="screen = 'selection'" class="mt-6 py-2 px-4 rounded-xl border border-white/5 text-xs font-bold" style="color:var(--muted)">Zurueck</button>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js" defer></script>
    <script>
        function mockup() {
            return {
                screen: 'selection',
                step: 1,
                previewDay: 0,
                answers: { level: null, days: 3, equip: null, goals: [], otherSport: false, blockedDays: [], time: null, injured: false },
                mockPlan: [
                    [{name:'Bankdruecken (Langhantel)',detail:'4×8-12'},{name:'Schraegbankdruecken (KH)',detail:'3×10-12'},{name:'Seitheben',detail:'3×12-15'},{name:'Trizepsdruecken (Kabel)',detail:'3×10-12'}],
                    [],
                    [{name:'Klimmzuege',detail:'3×6-10'},{name:'Langhantelrudern',detail:'4×8-12'},{name:'Face Pulls',detail:'3×15-20'},{name:'Kurzhantelcurls',detail:'3×10-12'}],
                    [],
                    [{name:'Kniebeugen (Langhantel)',detail:'4×6-10'},{name:'Rum. Kreuzheben',detail:'3×8-12'},{name:'Beinstrecker',detail:'3×12-15'},{name:'Wadenheben',detail:'3×15-20'},{name:'Plank',detail:'3×30-60s'}],
                    [],
                    []
                ]
            }
        }
    </script>
</body>
</html>
```

- [ ] **Step 2: Verify mockup opens in browser**

```bash
open mockup-trainingsplan-ai.html
# Or on Linux: xdg-open mockup-trainingsplan-ai.html
```

- [ ] **Step 3: Commit**

```bash
git add mockup-trainingsplan-ai.html
git commit -m "feat: Standalone-Mockup fuer visuellen Review des Generator-Flows"
```

---

### Task 9: Add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers directory to .gitignore**

Add this line to `.gitignore` if not already present:

```
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: .superpowers/ in .gitignore aufgenommen"
```

---

## Final Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] Selection screen shows when clicking training trigger (all 3 call sites)
- [ ] "Manuell" card opens the old editor exactly as before
- [ ] Wizard navigates through all 8 steps with back/forward
- [ ] Progress bar updates correctly
- [ ] Validation prevents skipping required fields
- [ ] Step 5 blocks days correctly and validates available days
- [ ] Plan generates and shows in preview with day tabs
- [ ] Exercise swap shows alternatives and replaces correctly
- [ ] "Plan uebernehmen" saves to Supabase and shows toast
- [ ] "Nochmal generieren" produces a different plan
- [ ] "Im Editor anpassen" opens manual editor with generated plan
- [ ] Saved plan works in workout picker and workout execution
- [ ] `mockup-trainingsplan-ai.html` opens standalone and is interactive
- [ ] No console errors in any flow
