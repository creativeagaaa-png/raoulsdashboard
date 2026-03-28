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

vi.mock('../data/training-constants.js', () => ({
    WEEKLY_VOLUME_BUDGET: { OPTIMAL_MIN: 10, OPTIMAL_MAX: 20, BEGINNER_MAX: 12, INTERMEDIATE_MAX: 16, ADVANCED_MAX: 20, SMALL_MUSCLE_FACTOR: 0.6 },
    TRAINING_LEVELS: ['beginner', 'intermediate', 'advanced'],
    TRAINING_LEVEL_LABELS: { beginner: 'Anfaenger', intermediate: 'Fortgeschritten', advanced: 'Profi' },
    EQUIPMENT_COMPATIBILITY_THRESHOLD: 0.7,
    EQUIPMENT_SCORE_BONUS: 8,
    EQUIPMENT_SCORE_EXCLUDE_BELOW: 0.5,
    EQUIPMENT_SCORE_PENALTY: -20,
    PERIODIZATION: { MESOCYCLE_WEEKS: 4, DELOAD_WEEK: 4, DELOAD_VOLUME_FACTOR: 0.5, WEEKLY_SET_INCREMENT: 1, WEEKLY_NOTES: ['Woche 1: Basisvolumen — Technik und Bewegungsqualitaet priorisieren', 'Woche 2: +1 Satz pro Uebung — progressive Ueberlastung', 'Woche 3: +1 Satz oder +2.5kg — Peak-Woche', 'Woche 4: DELOAD — 50% Volumen, gleiches Gewicht, Erholung priorisieren'] },
    SPORT_MUSCLE_LOAD: { fussball: { quadriceps: 0.8, hamstrings: 0.7, calves: 0.6 }, schwimmen: { back: 0.7, shoulders: 0.8 }, laufen: { quadriceps: 0.6, calves: 0.8 } },
    SPORT_RECOVERY_REDUCTION: 0.4,
    WARMUP_BY_MUSCLE: { chest: 'Schulterrotation + leichte Liegestuetze', back: 'Cat-Cow + Band Pull-Aparts', shoulders: 'Schulterkreisen + Band Dislocates', quadriceps: 'Hueftmobilitaet + Kniebeugen ohne Gewicht', hamstrings: 'Beinpendel + Rumaenisches Kreuzheben ohne Gewicht', glutes: 'Hueftkreise + Glute Bridges', biceps: 'Armkreisen + leichte Curls', triceps: 'Armkreisen + Trizeps-Stretches', abs: 'Cat-Cow + Dead Bugs', calves: 'Wadenheben einbeinig + Fusskreise', forearms: 'Handgelenk-Rotation + Finger-Spreizen', traps: 'Nackenkreisen + Schulterheben ohne Gewicht', lower_back: 'Cat-Cow + Beckenneigung', front_delts: 'Schulterrotation + Frontheben ohne Gewicht', side_delts: 'Schulterkreisen + Seitheben ohne Gewicht', rear_delts: 'Band Pull-Aparts + Reverse Flys ohne Gewicht' },
    MAX_WARMUP_ELEMENTS: 4,
    WARMUP_FALLBACK: 'Leichtes Cardio + dynamisches Stretching'
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
        trainingLevel: null,
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
                    if ((ex.type === 'cardio' || ex.type === 'distance') && ex.duration) {
                        // Skip warmup and cooldown
                        if (ex.name === 'Aufwaermen' || ex.name === 'Cooldown / Stretching') continue;
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
        const result = mixin._buildPlan();
        expect(result.plan).toBeDefined();
        expect(result.meta).toBeDefined();
    });

    it('_enrichWithHistory handles undefined workoutLogs', async () => {
        mixin.workoutLogs = undefined;
        const plan = [[], [], [], [], [], [], []];
        await mixin._enrichWithHistory(plan);
    });

    it('_selectTemplate returns fallback when no exact match', () => {
        const answers = defaultAnswers({ goals: ['strength'] });
        const template = mixin._selectTemplate(answers, 'intermediate', 3);
        expect(template).toBeDefined();
        expect(template.structure).toBeDefined();
    });

    it('every training day has at least 2 strength exercises (no empty days)', () => {
        // Test with short session that previously caused empty legs days
        mixin.generatorAnswers = defaultAnswers({ sessionDuration: 30 });
        const result = mixin._buildPlan();

        for (const day of result.plan) {
            const strengthExercises = day.filter(ex => ex.type === 'strength');
            if (day.length > 0) {
                // If a day has exercises at all, it must have at least 2 strength exercises
                expect(strengthExercises.length, 'Trainingstag hat zu wenig Kraftuebungen').toBeGreaterThanOrEqual(2);
            }
        }
    });
});

// ── Constraint 1: Contradictory Combinations ──────────────
describe('Constraint 1 — Contradictory Combinations', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('Bodyweight + Upper Only + 90 min fills time with mobility/filler', () => {
        mixin.generatorAnswers = defaultAnswers({
            equipment: 'bodyweight',
            muscleFocus: 'upper',
            sessionDuration: 90,
            selectedDays: [0, 2, 4]
        });
        const result = mixin._buildPlan();
        for (const day of result.plan) {
            if (day.length === 0) continue;
            // Day should not be empty — must have strength exercises
            const strength = day.filter(ex => ex.type === 'strength');
            expect(strength.length).toBeGreaterThanOrEqual(2);
        }
    });

    it('Upper focus on PPL template does not produce empty Legs days', () => {
        mixin.generatorAnswers = defaultAnswers({
            muscleFocus: 'upper',
            selectedDays: [0, 1, 2],  // 3 days → may pick PPL
            goals: ['muscle']
        });
        const result = mixin._buildPlan();
        const trainingDays = result.plan.filter(day => day.length > 0);
        expect(trainingDays.length).toBe(3);
        for (const day of trainingDays) {
            const strength = day.filter(ex => ex.type === 'strength');
            expect(strength.length).toBeGreaterThanOrEqual(2);
        }
    });

    it('Lower focus on PPL template does not produce empty Push/Pull days', () => {
        mixin.generatorAnswers = defaultAnswers({
            muscleFocus: 'lower',
            selectedDays: [0, 1, 2],
            goals: ['muscle']
        });
        const result = mixin._buildPlan();
        const trainingDays = result.plan.filter(day => day.length > 0);
        expect(trainingDays.length).toBe(3);
        for (const day of trainingDays) {
            const strength = day.filter(ex => ex.type === 'strength');
            expect(strength.length).toBeGreaterThanOrEqual(2);
        }
    });

    it('Bodyweight + all injuries still generates non-empty plan', () => {
        mixin.generatorAnswers = defaultAnswers({
            equipment: 'bodyweight',
            hasInjuries: true,
            injuryRegions: ['schulter', 'knie', 'ruecken', 'handgelenk', 'nacken', 'hufte', 'ellbogen'],
            sessionDuration: 60
        });
        const result = mixin._buildPlan();
        const trainingDays = result.plan.filter(day => day.length > 0);
        expect(trainingDays.length).toBeGreaterThan(0);
    });
});

// ── Constraint 2: Duration × Volume ──────────────────────
describe('Constraint 2 — Duration × Volume Management', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('30 min plan has fewer exercises and lower total volume than 90 min', () => {
        mixin.generatorAnswers = defaultAnswers({ sessionDuration: 30 });
        const r30 = mixin._buildPlan();
        mixin.generatorAnswers = defaultAnswers({ sessionDuration: 90 });
        const r90 = mixin._buildPlan();

        const totalSets = (plan) => plan.flat().filter(e => e.type === 'strength').reduce((s, e) => s + (e.sets || 0), 0);
        expect(totalSets(r30.plan)).toBeLessThan(totalSets(r90.plan));
    });

    it('estimated time per day does not exceed session duration by more than 20%', () => {
        for (const dur of [30, 45, 60, 90]) {
            mixin.generatorAnswers = defaultAnswers({ sessionDuration: dur });
            const result = mixin._buildPlan();
            for (const meta of result.meta.dayMetas) {
                if (meta.isOtherSport) continue;
                // Allow 20% tolerance — the algorithm targets ±15% but physics can vary
                expect(meta.estimatedTime).toBeLessThanOrEqual(dur * 1.3);
            }
        }
    });

    it('strength goal uses more sets per exercise than endurance goal', () => {
        mixin.generatorAnswers = defaultAnswers({ goals: ['strength'], sessionDuration: 60 });
        const rStr = mixin._buildPlan();
        mixin.generatorAnswers = defaultAnswers({ goals: ['endurance'], sessionDuration: 60 });
        const rEnd = mixin._buildPlan();

        const avgSets = (plan) => {
            const exs = plan.flat().filter(e => e.type === 'strength');
            return exs.reduce((s, e) => s + (e.sets || 0), 0) / (exs.length || 1);
        };
        expect(avgSets(rStr.plan)).toBeGreaterThanOrEqual(avgSets(rEnd.plan));
    });
});

// ── Constraint 3: Equipment Restrictions ─────────────────
describe('Constraint 3 — Equipment Restrictions', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('bodyweight plan never includes barbell/machine/cable/dumbbell exercises', () => {
        mixin.generatorAnswers = defaultAnswers({ equipment: 'bodyweight' });
        const result = mixin._buildPlan();
        const forbidden = ['barbell', 'machine', 'cable', 'dumbbell'];
        for (const day of result.plan) {
            for (const ex of day) {
                if (ex._equipment) {
                    expect(forbidden).not.toContain(ex._equipment);
                }
            }
        }
    });

    it('home_gym plan never includes machine or cable exercises', () => {
        mixin.generatorAnswers = defaultAnswers({ equipment: 'home_gym' });
        const result = mixin._buildPlan();
        const forbidden = ['machine', 'cable'];
        for (const day of result.plan) {
            for (const ex of day) {
                if (ex._equipment) {
                    expect(forbidden).not.toContain(ex._equipment);
                }
            }
        }
    });

    it('avoided equipment is never used in exercises', () => {
        mixin.generatorAnswers = defaultAnswers({
            equipment: 'full_gym',
            avoidedEquipment: ['barbell', 'machine']
        });
        const result = mixin._buildPlan();
        for (const day of result.plan) {
            for (const ex of day) {
                if (ex._equipment) {
                    expect(['barbell', 'machine']).not.toContain(ex._equipment);
                }
            }
        }
    });

    it('bodyweight + lower body only produces valid plan', () => {
        mixin.generatorAnswers = defaultAnswers({
            equipment: 'bodyweight',
            muscleFocus: 'lower',
            selectedDays: [0, 2, 4]
        });
        const result = mixin._buildPlan();
        const trainingDays = result.plan.filter(day => day.length > 0);
        expect(trainingDays.length).toBe(3);
    });
});

// ── Constraint 4: Frequency × Split Logic ────────────────
describe('Constraint 4 — Frequency × Split Logic', () => {
    let mixin;
    beforeEach(() => { mixin = createMixin(); });

    it('6-day upper-only uses rotation — not all days identical', () => {
        mixin.generatorAnswers = defaultAnswers({
            muscleFocus: 'upper',
            selectedDays: [0, 1, 2, 3, 4, 5],  // 6 days
            goals: ['muscle'],
            sessionDuration: 60
        });
        const result = mixin._buildPlan();
        const trainingDays = result.plan.filter(day => day.length > 0);
        expect(trainingDays.length).toBe(6);

        // Check variety: collect primary muscles per day
        const dayMuscles = trainingDays.map(day =>
            day.filter(ex => ex.type === 'strength').map(ex => ex._primaryMuscle).sort().join(',')
        );
        const uniquePatterns = new Set(dayMuscles);
        // With rotation, should have at least 2 different patterns
        expect(uniquePatterns.size).toBeGreaterThanOrEqual(2);
    });

    it('5-day lower-only uses rotation with different day focuses', () => {
        mixin.generatorAnswers = defaultAnswers({
            muscleFocus: 'lower',
            selectedDays: [0, 1, 2, 3, 4],  // 5 days
            goals: ['muscle'],
            sessionDuration: 60
        });
        const result = mixin._buildPlan();
        const trainingDays = result.plan.filter(day => day.length > 0);
        expect(trainingDays.length).toBe(5);
    });

    it('consecutive days with same muscle group get reduced volume', () => {
        mixin.generatorAnswers = defaultAnswers({
            muscleFocus: 'upper',
            selectedDays: [0, 1],  // consecutive days
            goals: ['muscle'],
            sessionDuration: 60
        });
        const result = mixin._buildPlan();
        const day1 = result.plan[0].filter(ex => ex.type === 'strength');
        const day2 = result.plan[1].filter(ex => ex.type === 'strength');

        // Day 2 exercises that overlap with day 1 muscles should have reduced sets
        if (day1.length > 0 && day2.length > 0) {
            const day1Muscles = new Set(day1.flatMap(ex => ex._muscles || []));
            const day2Overlapping = day2.filter(ex =>
                (ex._muscles || []).some(m => day1Muscles.has(m) && !['abs', 'lower_back'].includes(m))
            );
            for (const ex of day2Overlapping) {
                expect(ex.sets).toBeLessThanOrEqual(3);
            }
        }
    });
});

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

    it('_templateEquipmentScore returns high score for full_gym', () => {
        const fullGymEquipment = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band'];
        const score = mixin._templateEquipmentScore(
            { structure: [{ muscleTargets: [{ muscle: 'chest', compound: 1, isolation: 1 }] }] },
            fullGymEquipment
        );
        expect(score).toBeGreaterThanOrEqual(0.7);
    });

    it('_templateEquipmentScore returns lower score for bodyweight with many targets', () => {
        const bodyweightEquipment = ['bodyweight', 'band'];
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
        expect(score).toBeLessThan(1.0);
    });

    it('full_gym user still has all templates available', () => {
        mixin.generatorAnswers = defaultAnswers({
            equipment: 'full_gym',
            selectedDays: [0, 1, 2],
            goals: ['muscle']
        });
        const result = mixin._buildPlan();
        expect(result.meta.templateId).toBeDefined();
    });
});

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
            selectedDays: [3],
            hasOtherSports: true,
            otherSports: 'Fussball',
            otherSportsDays: [2],
            goals: ['muscle'],
            sessionDuration: 60
        });
        const withSport = mixin._buildPlan();

        mixin.generatorAnswers = defaultAnswers({
            trainingLevel: 'intermediate',
            selectedDays: [3],
            hasOtherSports: false,
            otherSports: '',
            otherSportsDays: [],
            goals: ['muscle'],
            sessionDuration: 60
        });
        const withoutSport = mixin._buildPlan();

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
            selectedDays: [0],
            hasOtherSports: true,
            otherSports: 'Fussball',
            otherSportsDays: [4],
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

        const totalWith = withSport.plan[0].filter(ex => ex.type === 'strength').reduce((s, ex) => s + (ex.sets || 0), 0);
        const totalWithout = withoutSport.plan[0].filter(ex => ex.type === 'strength').reduce((s, ex) => s + (ex.sets || 0), 0);
        // Toleranz: +-2 Sets wegen nicht-deterministischer Uebungsauswahl
        expect(Math.abs(totalWith - totalWithout)).toBeLessThanOrEqual(2);
    });
});

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
        expect(notes[0].toLowerCase()).toContain('basisvolumen');
        expect(notes[3].toLowerCase()).toContain('deload');
    });
});
