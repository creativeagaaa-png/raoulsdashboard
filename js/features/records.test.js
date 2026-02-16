import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('../store/supabase.js', () => ({
    getPersonalRecords: vi.fn().mockResolvedValue([]),
    savePersonalRecord: vi.fn().mockResolvedValue(undefined),
    clearAllPersonalRecords: vi.fn().mockResolvedValue(undefined)
}));

const { recordsMixin } = await import('./records.js');

function createMixin(overrides = {}) {
    return {
        ...recordsMixin(),
        showToast: vi.fn(),
        ...overrides
    };
}

describe('getPR', () => {
    it('returns null for empty records', () => {
        const m = createMixin();
        m.personalRecords = [];
        expect(m.getPR('Bench Press')).toBeNull();
    });

    it('returns best PR for exercise', () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'Bench Press', weight: 80, reps: 10, date: '2025-01-01' },
            { exercise_name: 'Bench Press', weight: 100, reps: 5, date: '2025-01-15' },
            { exercise_name: 'Bench Press', weight: 90, reps: 8, date: '2025-01-08' }
        ];
        const pr = m.getPR('Bench Press');
        expect(pr.weight).toBe(100);
    });

    it('is case insensitive', () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'bench press', weight: 100, reps: 5, date: '2025-01-15' }
        ];
        expect(m.getPR('Bench Press')).not.toBeNull();
        expect(m.getPR('BENCH PRESS')).not.toBeNull();
    });

    it('returns null for different exercise', () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'Squat', weight: 150, reps: 5, date: '2025-01-15' }
        ];
        expect(m.getPR('Bench Press')).toBeNull();
    });
});

describe('isPR', () => {
    it('returns true for first exercise entry', () => {
        const m = createMixin();
        m.personalRecords = [];
        expect(m.isPR('Bench Press', 80)).toBe(true);
    });

    it('returns true when weight exceeds current best', () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'Bench Press', weight: 80, reps: 10, date: '2025-01-01' }
        ];
        expect(m.isPR('Bench Press', 85)).toBe(true);
    });

    it('returns false when weight equals current best', () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'Bench Press', weight: 80, reps: 10, date: '2025-01-01' }
        ];
        expect(m.isPR('Bench Press', 80)).toBe(false);
    });

    it('returns false when weight is below current best', () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'Bench Press', weight: 80, reps: 10, date: '2025-01-01' }
        ];
        expect(m.isPR('Bench Press', 70)).toBe(false);
    });

    it('returns false for zero weight', () => {
        const m = createMixin();
        m.personalRecords = [];
        expect(m.isPR('Bench Press', 0)).toBe(false);
    });

    it('returns false for negative weight', () => {
        const m = createMixin();
        m.personalRecords = [];
        expect(m.isPR('Bench Press', -10)).toBe(false);
    });
});

describe('getRecentPRs', () => {
    it('returns empty for no records', () => {
        const m = createMixin();
        m.personalRecords = [];
        expect(m.getRecentPRs()).toEqual([]);
    });

    it('returns records sorted by date descending', () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'A', weight: 100, date: '2025-01-01' },
            { exercise_name: 'B', weight: 120, date: '2025-01-15' },
            { exercise_name: 'C', weight: 80, date: '2025-01-08' }
        ];
        const recent = m.getRecentPRs(3);
        expect(recent[0].exercise_name).toBe('B');
        expect(recent[1].exercise_name).toBe('C');
        expect(recent[2].exercise_name).toBe('A');
    });

    it('limits results', () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'A', weight: 100, date: '2025-01-01' },
            { exercise_name: 'B', weight: 120, date: '2025-01-02' },
            { exercise_name: 'C', weight: 80, date: '2025-01-03' }
        ];
        expect(m.getRecentPRs(2)).toHaveLength(2);
    });
});

describe('checkPersonalRecords', () => {
    it('detects new PR', async () => {
        const Supa = await import('../store/supabase.js');
        const m = createMixin();
        m.personalRecords = [];
        m.prCelebration = null;
        m.prCelebrationOpen = false;
        m.triggerPRConfetti = vi.fn();

        const session = {
            date: '2025-01-15',
            exercises: [
                {
                    name: 'Bench Press',
                    sets: [
                        { weight: 100, reps: 5, done: true },
                        { weight: 80, reps: 10, done: true }
                    ]
                }
            ]
        };

        await m.checkPersonalRecords(session);
        expect(Supa.savePersonalRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                exercise_name: 'Bench Press',
                weight: 100,
                reps: 5
            })
        );
    });

    it('does not trigger PR for lower weight', async () => {
        const m = createMixin();
        m.personalRecords = [
            { exercise_name: 'Bench Press', weight: 120, reps: 5, date: '2025-01-01' }
        ];
        m.prCelebrationOpen = false;
        m.triggerPRConfetti = vi.fn();

        const session = {
            date: '2025-01-15',
            exercises: [
                {
                    name: 'Bench Press',
                    sets: [{ weight: 100, reps: 10, done: true }]
                }
            ]
        };

        await m.checkPersonalRecords(session);
        expect(m.prCelebrationOpen).toBe(false);
    });

    it('skips exercises without completed sets', async () => {
        const m = createMixin();
        m.personalRecords = [];
        m.prCelebrationOpen = false;
        m.triggerPRConfetti = vi.fn();

        const session = {
            date: '2025-01-15',
            exercises: [
                {
                    name: 'Bench Press',
                    sets: [{ weight: 100, reps: 10, done: false }]
                }
            ]
        };

        await m.checkPersonalRecords(session);
        expect(m.prCelebrationOpen).toBe(false);
    });

    it('skips exercises without sets array', async () => {
        const m = createMixin();
        m.personalRecords = [];
        m.prCelebrationOpen = false;
        m.triggerPRConfetti = vi.fn();

        const session = {
            date: '2025-01-15',
            exercises: [
                { name: 'Running', type: 'cardio', done: true }
            ]
        };

        await m.checkPersonalRecords(session);
        expect(m.prCelebrationOpen).toBe(false);
    });
});
