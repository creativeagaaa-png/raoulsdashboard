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
    WEEKDAYS: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
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
        checkPersonalRecords: vi.fn().mockResolvedValue(undefined),
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

describe('formatDelta', () => {
    it('returns ±0 when values are equal', () => {
        const m = createMixin();
        expect(m.formatDelta(100, 100)).toBe('±0');
    });

    it('returns positive delta with + prefix', () => {
        const m = createMixin();
        expect(m.formatDelta(105, 100)).toBe('+5.0');
    });

    it('returns negative delta', () => {
        const m = createMixin();
        expect(m.formatDelta(95, 100)).toBe('-5.0');
    });

    it('handles zero previous', () => {
        const m = createMixin();
        expect(m.formatDelta(50, 0)).toBe('+50');
    });

    it('handles zero current and zero previous', () => {
        const m = createMixin();
        expect(m.formatDelta(0, 0)).toBe('–');
    });

    it('handles null previous', () => {
        const m = createMixin();
        expect(m.formatDelta(50, null)).toBe('+50');
    });
});

describe('parseDurationMinutes', () => {
    it('returns 0 for null', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes(null)).toBe(0);
    });

    it('returns 0 for empty string', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes('')).toBe(0);
    });

    it('parses "25 min"', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes('25 min')).toBe(25);
    });

    it('parses plain number', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes('45')).toBe(45);
    });

    it('parses MM:SS format', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes('30:00')).toBe(30);
    });

    it('parses HH:MM:SS format', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes('1:30:00')).toBe(90);
    });

    it('parses MM:SS with seconds', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes('25:30')).toBe(25.5);
    });

    it('returns 0 for non-numeric string', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes('abc')).toBe(0);
    });
});

describe('parseDistance', () => {
    it('returns 0 for null', () => {
        const m = createMixin();
        expect(m.parseDistance(null)).toBe(0);
    });

    it('returns 0 for empty string', () => {
        const m = createMixin();
        expect(m.parseDistance('')).toBe(0);
    });

    it('parses decimal with dot', () => {
        const m = createMixin();
        expect(m.parseDistance('22.5')).toBe(22.5);
    });

    it('parses decimal with comma (German format)', () => {
        const m = createMixin();
        expect(m.parseDistance('22,5')).toBe(22.5);
    });

    it('parses integer', () => {
        const m = createMixin();
        expect(m.parseDistance('10')).toBe(10);
    });

    it('returns 0 for non-numeric', () => {
        const m = createMixin();
        expect(m.parseDistance('abc')).toBe(0);
    });
});

describe('getCircuitRoundsCompleted', () => {
    it('returns 0 for null', () => {
        const m = createMixin();
        expect(m.getCircuitRoundsCompleted(null)).toBe(0);
    });

    it('returns 0 for exercise without rounds', () => {
        const m = createMixin();
        expect(m.getCircuitRoundsCompleted({ name: 'test' })).toBe(0);
    });

    it('counts completed rounds', () => {
        const m = createMixin();
        const ex = {
            rounds: [
                { done: true },
                { done: true },
                { done: false }
            ]
        };
        expect(m.getCircuitRoundsCompleted(ex)).toBe(2);
    });
});

describe('getCircuitRoundsTotal', () => {
    it('returns total rounds', () => {
        const m = createMixin();
        const ex = {
            rounds: [{ done: true }, { done: false }, { done: false }]
        };
        expect(m.getCircuitRoundsTotal(ex)).toBe(3);
    });
});

describe('formatDurationCompare', () => {
    it('returns – for 0', () => {
        const m = createMixin();
        expect(m.formatDurationCompare(0)).toBe('–');
    });

    it('returns – for null', () => {
        const m = createMixin();
        expect(m.formatDurationCompare(null)).toBe('–');
    });

    it('formats seconds to minutes', () => {
        const m = createMixin();
        expect(m.formatDurationCompare(2700)).toBe('45 Min');
    });

    it('rounds down partial minutes', () => {
        const m = createMixin();
        expect(m.formatDurationCompare(150)).toBe('2 Min');
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

// --- Comparison Logic Tests ---

describe('openWorkoutComparison', () => {
    it('does nothing for null workout', () => {
        const m = createMixin();
        m.openWorkoutComparison(null);
        expect(m.workoutComparisonOpen).toBe(false);
        expect(m.workoutComparisonData).toBeNull();
    });

    it('does nothing for workout without exercises', () => {
        const m = createMixin();
        m.openWorkoutComparison({ date: '2025-01-01' });
        expect(m.workoutComparisonOpen).toBe(false);
    });

    it('opens comparison for valid workout', () => {
        const m = createMixin();
        m.workoutHistory = [];
        const workout = {
            date: '2025-01-01',
            startedAt: '2025-01-01T10:00:00Z',
            durationSeconds: 3600,
            exercises: [
                { name: 'Bench Press', type: 'strength', sets: [{ weight: 100, reps: 10, done: true }] }
            ]
        };
        m.openWorkoutComparison(workout);
        expect(m.workoutComparisonOpen).toBe(true);
        expect(m.workoutComparisonData).not.toBeNull();
        expect(m.workoutComparisonData.comparisons).toHaveLength(1);
        expect(m.workoutComparisonData.comparisons[0].name).toBe('Bench Press');
    });

    it('finds previous workout for comparison', () => {
        const m = createMixin();
        m.workoutHistory = [
            {
                date: '2025-01-08',
                startedAt: '2025-01-08T10:00:00Z',
                durationSeconds: 3000,
                exercises: [
                    { name: 'Bench Press', type: 'strength', sets: [{ weight: 90, reps: 10, done: true }] }
                ]
            }
        ];
        const workout = {
            date: '2025-01-15',
            startedAt: '2025-01-15T10:00:00Z',
            durationSeconds: 3600,
            exercises: [
                { name: 'Bench Press', type: 'strength', sets: [{ weight: 100, reps: 10, done: true }] }
            ]
        };
        m.openWorkoutComparison(workout);
        expect(m.workoutComparisonData.comparisons[0].previous).not.toBeNull();
        expect(m.workoutComparisonData.comparisons[0].previous.sets[0].weight).toBe(90);
    });

    it('sets previous to null when no matching exercise found', () => {
        const m = createMixin();
        m.workoutHistory = [
            {
                date: '2025-01-08',
                startedAt: '2025-01-08T10:00:00Z',
                exercises: [
                    { name: 'Squat', type: 'strength', sets: [{ weight: 120, reps: 5, done: true }] }
                ]
            }
        ];
        const workout = {
            date: '2025-01-15',
            startedAt: '2025-01-15T10:00:00Z',
            exercises: [
                { name: 'Bench Press', type: 'strength', sets: [{ weight: 100, reps: 10, done: true }] }
            ]
        };
        m.openWorkoutComparison(workout);
        expect(m.workoutComparisonData.comparisons[0].previous).toBeNull();
    });

    it('skips untracked exercises in comparison', () => {
        const m = createMixin();
        m.workoutHistory = [];
        const workout = {
            date: '2025-01-15',
            startedAt: '2025-01-15T10:00:00Z',
            exercises: [
                { name: 'Bench Press', type: 'strength', tracked: false, sets: [] },
                { name: 'Squat', type: 'strength', sets: [{ weight: 100, reps: 5, done: true }] }
            ]
        };
        m.openWorkoutComparison(workout);
        expect(m.workoutComparisonData.comparisons).toHaveLength(1);
        expect(m.workoutComparisonData.comparisons[0].name).toBe('Squat');
    });

    it('includes workout duration comparison data', () => {
        const m = createMixin();
        m.workoutHistory = [
            {
                date: '2025-01-08',
                startedAt: '2025-01-08T10:00:00Z',
                durationSeconds: 2700,
                exercises: [{ name: 'Bench Press', type: 'strength', sets: [] }]
            }
        ];
        const workout = {
            date: '2025-01-15',
            startedAt: '2025-01-15T10:00:00Z',
            durationSeconds: 3600,
            exercises: [
                { name: 'Bench Press', type: 'strength', sets: [{ weight: 100, reps: 10, done: true }] }
            ]
        };
        m.openWorkoutComparison(workout);
        expect(m.workoutComparisonData.previousWorkoutDuration).toBe(2700);
        expect(m.workoutComparisonData.previousWorkoutDate).toBe('2025-01-08');
    });
});

describe('closeWorkoutComparison', () => {
    it('resets comparison state', () => {
        const m = createMixin();
        m.workoutComparisonOpen = true;
        m.workoutComparisonData = { test: true };
        m.closeWorkoutComparison();
        expect(m.workoutComparisonOpen).toBe(false);
        expect(m.workoutComparisonData).toBeNull();
    });
});

// --- History Tests ---

describe('getLastWorkoutForExercise', () => {
    it('returns null for empty history', () => {
        const m = createMixin();
        m.workoutHistory = [];
        expect(m.getLastWorkoutForExercise('Bench Press')).toBeNull();
    });

    it('finds exercise case-insensitively', () => {
        const m = createMixin();
        m.workoutHistory = [
            {
                date: '2025-01-01',
                exercises: [{ name: 'bench press', type: 'strength', sets: [{ weight: 80, reps: 10, done: true }] }]
            }
        ];
        const result = m.getLastWorkoutForExercise('Bench Press');
        expect(result).not.toBeNull();
        expect(result.exercise.name).toBe('bench press');
    });

    it('skips untracked workouts', () => {
        const m = createMixin();
        m.workoutHistory = [
            {
                date: '2025-01-02',
                tracked: false,
                exercises: [{ name: 'Bench Press', type: 'strength', sets: [] }]
            },
            {
                date: '2025-01-01',
                exercises: [{ name: 'Bench Press', type: 'strength', sets: [{ weight: 80, reps: 10, done: true }] }]
            }
        ];
        const result = m.getLastWorkoutForExercise('Bench Press');
        expect(result.date).toBe('2025-01-01');
    });
});

// --- Post-Workout Comparison ---

describe('showPostWorkoutComparison', () => {
    it('does nothing when no last finished workout', () => {
        const m = createMixin();
        m._lastFinishedWorkout = null;
        m.workoutHistory = [];
        m.showPostWorkoutComparison();
        expect(m.workoutComparisonOpen).toBe(false);
    });

    it('opens comparison and clears last finished workout', () => {
        const m = createMixin();
        m.workoutHistory = [];
        m._lastFinishedWorkout = {
            date: '2025-01-15',
            startedAt: '2025-01-15T10:00:00Z',
            exercises: [{ name: 'Squat', type: 'strength', sets: [{ weight: 100, reps: 5, done: true }] }]
        };
        m.showPostWorkoutComparison();
        expect(m.workoutComparisonOpen).toBe(true);
        expect(m._lastFinishedWorkout).toBeNull();
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

// --- Edge Cases ---

describe('edge cases', () => {
    it('comparison handles exercise name case mismatch', () => {
        const m = createMixin();
        m.workoutHistory = [
            {
                date: '2025-01-08',
                startedAt: '2025-01-08T10:00:00Z',
                exercises: [
                    { name: 'BENCH PRESS', type: 'strength', sets: [{ weight: 90, reps: 10, done: true }] }
                ]
            }
        ];
        const workout = {
            date: '2025-01-15',
            startedAt: '2025-01-15T10:00:00Z',
            exercises: [
                { name: 'bench press', type: 'strength', sets: [{ weight: 100, reps: 10, done: true }] }
            ]
        };
        m.openWorkoutComparison(workout);
        expect(m.workoutComparisonData.comparisons[0].previous).not.toBeNull();
    });

    it('comparison skips same workout by date+startedAt', () => {
        const m = createMixin();
        const workout = {
            date: '2025-01-15',
            startedAt: '2025-01-15T10:00:00Z',
            exercises: [
                { name: 'Bench Press', type: 'strength', sets: [{ weight: 100, reps: 10, done: true }] }
            ]
        };
        m.workoutHistory = [workout]; // Same workout is in history
        m.openWorkoutComparison(workout);
        expect(m.workoutComparisonData.comparisons[0].previous).toBeNull();
    });

    it('parseDurationMinutes handles number input', () => {
        const m = createMixin();
        expect(m.parseDurationMinutes(30)).toBe(30);
    });

    it('parseDistance handles number input', () => {
        const m = createMixin();
        expect(m.parseDistance(10.5)).toBe(10.5);
    });
});
