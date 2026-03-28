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
});
