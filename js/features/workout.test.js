import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock Supabase before importing the workout mixin
vi.mock('../store/supabase.js', () => ({
    getWorkoutLogs: vi.fn().mockResolvedValue([]),
    saveWorkoutLog: vi.fn().mockResolvedValue(1),
    deleteWorkoutLog: vi.fn().mockResolvedValue(undefined),
    clearAllWorkoutLogs: vi.fn().mockResolvedValue(undefined)
}));

// Mock formatting.js
vi.mock('../utils/formatting.js', () => ({
    getTodayWeekdayIndex: vi.fn(() => 0)
}));

// Mock constants.js
vi.mock('../utils/constants.js', () => ({
    WEEKDAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
}));

const { workoutMixin } = await import('./workout.js');

function createMixin(overrides = {}) {
    const mixin = {
        ...workoutMixin(),
        trainingPlan: [
            [{ name: 'Bench Press', type: 'strength', sets: 3, reps: '10', weight: 80 }],
            [], [], [], [], [], []
        ],
        confirmModal: { show: false },
        showToast: vi.fn(),
        clearRestTimer: vi.fn(),
        ...overrides
    };
    return mixin;
}

// --- Helper Function Tests ---

describe('getExerciseMaxWeight', () => {
    it('returns 0 for null input', () => {
        const m = createMixin();
        expect(m.getExerciseMaxWeight(null)).toBe(0);
    });

    it('returns 0 for exercise with no sets', () => {
        const m = createMixin();
        expect(m.getExerciseMaxWeight({ name: 'test' })).toBe(0);
    });

    it('returns 0 when no sets are done', () => {
        const m = createMixin();
        const ex = { sets: [{ weight: 100, reps: 10, done: false }] };
        expect(m.getExerciseMaxWeight(ex)).toBe(0);
    });

    it('returns max weight from completed sets', () => {
        const m = createMixin();
        const ex = {
            sets: [
                { weight: 80, reps: 10, done: true },
                { weight: 100, reps: 8, done: true },
                { weight: 90, reps: 12, done: true }
            ]
        };
        expect(m.getExerciseMaxWeight(ex)).toBe(100);
    });

    it('ignores sets with weight 0', () => {
        const m = createMixin();
        const ex = {
            sets: [
                { weight: 0, reps: 10, done: true },
                { weight: 50, reps: 8, done: true }
            ]
        };
        expect(m.getExerciseMaxWeight(ex)).toBe(50);
    });
});

describe('getExerciseVolume', () => {
    it('returns 0 for null input', () => {
        const m = createMixin();
        expect(m.getExerciseVolume(null)).toBe(0);
    });

    it('calculates volume correctly', () => {
        const m = createMixin();
        const ex = {
            sets: [
                { weight: 100, reps: 10, done: true },
                { weight: 80, reps: 12, done: true },
                { weight: 60, reps: 15, done: false }
            ]
        };
        // Only done sets: 100*10 + 80*12 = 1000 + 960 = 1960
        expect(m.getExerciseVolume(ex)).toBe(1960);
    });

    it('handles missing weight/reps gracefully', () => {
        const m = createMixin();
        const ex = {
            sets: [
                { weight: null, reps: 10, done: true },
                { weight: 50, reps: null, done: true }
            ]
        };
        expect(m.getExerciseVolume(ex)).toBe(0);
    });
});


describe('formatWorkoutDuration', () => {
    it('returns "0 Min" for 0 seconds', () => {
        const m = createMixin();
        expect(m.formatWorkoutDuration(0)).toBe('0 Min');
    });

    it('returns "0 Min" for null', () => {
        const m = createMixin();
        expect(m.formatWorkoutDuration(null)).toBe('0 Min');
    });

    it('formats correctly', () => {
        const m = createMixin();
        expect(m.formatWorkoutDuration(3600)).toBe('60 Min');
    });
});

describe('getWorkoutExerciseCount', () => {
    it('returns 0 for empty workout', () => {
        const m = createMixin();
        expect(m.getWorkoutExerciseCount({})).toBe(0);
    });

    it('counts exercises', () => {
        const m = createMixin();
        const workout = {
            exercises: [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
        };
        expect(m.getWorkoutExerciseCount(workout)).toBe(3);
    });
});

describe('getWorkoutSetsCompleted', () => {
    it('returns 0 for empty workout', () => {
        const m = createMixin();
        expect(m.getWorkoutSetsCompleted({})).toBe(0);
    });

    it('counts only completed sets', () => {
        const m = createMixin();
        const workout = {
            exercises: [
                { sets: [{ done: true }, { done: true }, { done: false }] },
                { sets: [{ done: true }] }
            ]
        };
        expect(m.getWorkoutSetsCompleted(workout)).toBe(3);
    });

    it('handles exercises without sets', () => {
        const m = createMixin();
        const workout = {
            exercises: [
                { type: 'cardio', done: true }
            ]
        };
        expect(m.getWorkoutSetsCompleted(workout)).toBe(0);
    });
});


// --- Workout Session Tests ---

describe('toggleSet', () => {
    it('toggles set done state', () => {
        const m = createMixin();
        m.workoutSession = {
            exercises: [
                { sets: [{ weight: 100, reps: 10, done: false }] }
            ]
        };
        m.startRestTimer = vi.fn();
        m.toggleSet(0, 0);
        expect(m.workoutSession.exercises[0].sets[0].done).toBe(true);
    });

    it('calls startRestTimer when set is completed', () => {
        const m = createMixin();
        m.startRestTimer = vi.fn();
        m.workoutSession = {
            exercises: [
                { sets: [{ weight: 100, reps: 10, done: false }] }
            ]
        };
        m.toggleSet(0, 0);
        expect(m.startRestTimer).toHaveBeenCalled();
    });

    it('does nothing if no session', () => {
        const m = createMixin();
        m.workoutSession = null;
        m.toggleSet(0, 0);
        // No error thrown
    });
});

describe('toggleCircuitRound', () => {
    it('toggles round done state', () => {
        const m = createMixin();
        m.workoutSession = {
            exercises: [
                { type: 'circuit', rounds: [{ done: false }, { done: false }] }
            ]
        };
        m.toggleCircuitRound(0, 1);
        expect(m.workoutSession.exercises[0].rounds[1].done).toBe(true);
    });
});

describe('toggleExerciseDone', () => {
    it('toggles exercise done state', () => {
        const m = createMixin();
        m.workoutSession = {
            exercises: [
                { type: 'cardio', done: false }
            ]
        };
        m.toggleExerciseDone(0);
        expect(m.workoutSession.exercises[0].done).toBe(true);
    });
});

describe('addWorkoutSet', () => {
    it('adds a new set with previous set values', () => {
        const m = createMixin();
        m.workoutSession = {
            exercises: [
                { sets: [{ weight: 100, reps: 10, done: true }] }
            ]
        };
        m.addWorkoutSet(0);
        const sets = m.workoutSession.exercises[0].sets;
        expect(sets).toHaveLength(2);
        expect(sets[1].weight).toBe(100);
        expect(sets[1].reps).toBe(10);
        expect(sets[1].done).toBe(false);
    });
});

