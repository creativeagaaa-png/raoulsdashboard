import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing the steps mixin
vi.mock('../store/supabase.js', () => ({
    getTodaySteps: vi.fn().mockResolvedValue(0),
    upsertStepEntry: vi.fn().mockResolvedValue(undefined),
    getStepHistory: vi.fn().mockResolvedValue([]),
    deleteStepEntry: vi.fn().mockResolvedValue(undefined),
}));

// Mock formatting — pin "today" to a fixed date for deterministic tests
vi.mock('../utils/formatting.js', () => ({
    getLocalDateString: vi.fn(() => '2026-02-16'),
}));

vi.mock('../utils/constants.js', () => ({
    STEPS_GOAL: 10000,
}));

vi.mock('../utils/haptics.js', () => ({
    hapticLight: vi.fn(),
    hapticSuccess: vi.fn(),
    hapticWarning: vi.fn(),
}));

const { stepsMixin } = await import('./steps.js');
const Supa = await import('../store/supabase.js');

function createMixin(overrides = {}) {
    return {
        ...stepsMixin(),
        showToast: vi.fn(),
        triggerConfetti: vi.fn(),
        refreshAnimations: vi.fn(),
        ...overrides,
    };
}

// ─── deleteStepEntry ────────────────────────────────────

describe('deleteStepEntry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('removes the entry from stepsHistory', async () => {
        const m = createMixin({
            stepsHistory: [
                { date: '2026-02-16', steps: 8000 },
                { date: '2026-02-15', steps: 5000 },
                { date: '2026-02-14', steps: 3000 },
            ],
        });

        await m.deleteStepEntry('2026-02-15');

        expect(m.stepsHistory).toHaveLength(2);
        expect(m.stepsHistory.find(e => e.date === '2026-02-15')).toBeUndefined();
    });

    it('calls Supa.deleteStepEntry with the correct date', async () => {
        const m = createMixin({
            stepsHistory: [{ date: '2026-02-14', steps: 3000 }],
        });

        await m.deleteStepEntry('2026-02-14');

        expect(Supa.deleteStepEntry).toHaveBeenCalledWith('2026-02-14');
        expect(Supa.deleteStepEntry).toHaveBeenCalledTimes(1);
    });

    it('resets todaySteps to 0 when deleting today\'s entry', async () => {
        const m = createMixin({
            todaySteps: 8000,
            stepsHistory: [{ date: '2026-02-16', steps: 8000 }],
        });

        await m.deleteStepEntry('2026-02-16');

        expect(m.todaySteps).toBe(0);
        expect(m._stepsCelebrated).toBe(false);
        expect(m.refreshAnimations).toHaveBeenCalled();
    });

    it('does NOT reset todaySteps when deleting a different day', async () => {
        const m = createMixin({
            todaySteps: 8000,
            stepsHistory: [
                { date: '2026-02-16', steps: 8000 },
                { date: '2026-02-15', steps: 5000 },
            ],
        });

        await m.deleteStepEntry('2026-02-15');

        expect(m.todaySteps).toBe(8000);
        expect(m.refreshAnimations).not.toHaveBeenCalled();
    });

    it('does nothing if entry not found', async () => {
        const m = createMixin({
            stepsHistory: [{ date: '2026-02-16', steps: 8000 }],
        });

        await m.deleteStepEntry('1999-01-01');

        expect(Supa.deleteStepEntry).not.toHaveBeenCalled();
        expect(m.stepsHistory).toHaveLength(1);
    });

    it('rolls back on Supabase failure', async () => {
        Supa.deleteStepEntry.mockRejectedValueOnce(new Error('DB error'));

        const m = createMixin({
            todaySteps: 8000,
            stepsHistory: [
                { date: '2026-02-16', steps: 8000 },
                { date: '2026-02-15', steps: 5000 },
            ],
        });

        await m.deleteStepEntry('2026-02-16');

        // Should have rolled back
        expect(m.stepsHistory).toHaveLength(2);
        expect(m.stepsHistory.find(e => e.date === '2026-02-16')).toBeDefined();
        expect(m.todaySteps).toBe(8000);
        expect(m.showToast).toHaveBeenCalledWith('Failed to delete');
    });

    it('rolls back a non-today entry on Supabase failure', async () => {
        Supa.deleteStepEntry.mockRejectedValueOnce(new Error('DB error'));

        const m = createMixin({
            stepsHistory: [
                { date: '2026-02-16', steps: 8000 },
                { date: '2026-02-15', steps: 5000 },
            ],
        });

        await m.deleteStepEntry('2026-02-15');

        expect(m.stepsHistory).toHaveLength(2);
        expect(m.stepsHistory.find(e => e.date === '2026-02-15').steps).toBe(5000);
    });

    it('keeps history sorted after rollback', async () => {
        Supa.deleteStepEntry.mockRejectedValueOnce(new Error('DB error'));

        const m = createMixin({
            stepsHistory: [
                { date: '2026-02-16', steps: 8000 },
                { date: '2026-02-15', steps: 5000 },
                { date: '2026-02-14', steps: 3000 },
            ],
        });

        await m.deleteStepEntry('2026-02-15');

        const dates = m.stepsHistory.map(e => e.date);
        expect(dates).toEqual(['2026-02-16', '2026-02-15', '2026-02-14']);
    });

    it('shows undo toast on success', async () => {
        const m = createMixin({
            stepsHistory: [{ date: '2026-02-15', steps: 5000 }],
        });

        await m.deleteStepEntry('2026-02-15');

        expect(m.showToast).toHaveBeenCalledWith('Entry deleted', expect.any(Function));
    });

    it('undo callback restores the entry and calls upsert', async () => {
        const m = createMixin({
            stepsHistory: [{ date: '2026-02-15', steps: 5000 }],
        });

        await m.deleteStepEntry('2026-02-15');

        expect(m.stepsHistory).toHaveLength(0);

        // Grab and call the undo callback
        const undoFn = m.showToast.mock.calls[0][1];
        await undoFn();

        expect(m.stepsHistory).toHaveLength(1);
        expect(m.stepsHistory[0]).toEqual({ date: '2026-02-15', steps: 5000 });
        expect(Supa.upsertStepEntry).toHaveBeenCalledWith('2026-02-15', 5000);
    });

    it('undo callback restores todaySteps for today\'s entry', async () => {
        const m = createMixin({
            todaySteps: 8000,
            stepsHistory: [{ date: '2026-02-16', steps: 8000 }],
        });

        await m.deleteStepEntry('2026-02-16');
        expect(m.todaySteps).toBe(0);

        const undoFn = m.showToast.mock.calls[0][1];
        await undoFn();

        expect(m.todaySteps).toBe(8000);
        expect(m.refreshAnimations).toHaveBeenCalledTimes(2); // once on delete, once on undo
    });
});

// ─── saveManualSteps ────────────────────────────────────

describe('saveManualSteps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does nothing for invalid input', async () => {
        const m = createMixin({ stepsInput: 'abc' });
        await m.saveManualSteps();
        expect(Supa.upsertStepEntry).not.toHaveBeenCalled();
    });

    it('does nothing for zero or negative input', async () => {
        const m = createMixin({ stepsInput: '0' });
        await m.saveManualSteps();
        expect(Supa.upsertStepEntry).not.toHaveBeenCalled();

        m.stepsInput = '-5';
        await m.saveManualSteps();
        expect(Supa.upsertStepEntry).not.toHaveBeenCalled();
    });

    it('adds steps to a new date', async () => {
        const m = createMixin({
            stepsInput: '3000',
            stepsInputDate: '2026-02-14',
            stepsHistory: [],
        });

        await m.saveManualSteps();

        expect(Supa.upsertStepEntry).toHaveBeenCalledWith('2026-02-14', 3000);
        expect(m.stepsHistory).toHaveLength(1);
        expect(m.stepsHistory[0]).toEqual({ date: '2026-02-14', steps: 3000 });
        expect(m.stepsInput).toBe('');
    });

    it('adds to existing entry for the same date', async () => {
        const m = createMixin({
            stepsInput: '2000',
            stepsInputDate: '2026-02-15',
            stepsHistory: [{ date: '2026-02-15', steps: 5000 }],
        });

        await m.saveManualSteps();

        expect(Supa.upsertStepEntry).toHaveBeenCalledWith('2026-02-15', 7000);
        expect(m.stepsHistory[0].steps).toBe(7000);
    });

    it('updates todaySteps when adding to today', async () => {
        const m = createMixin({
            stepsInput: '3000',
            stepsInputDate: '2026-02-16', // today per mock
            todaySteps: 5000,
            stepsHistory: [{ date: '2026-02-16', steps: 5000 }],
        });

        await m.saveManualSteps();

        expect(m.todaySteps).toBe(8000);
        expect(m.refreshAnimations).toHaveBeenCalled();
    });

    it('does not update todaySteps when adding to a different date', async () => {
        const m = createMixin({
            stepsInput: '3000',
            stepsInputDate: '2026-02-14',
            todaySteps: 5000,
            stepsHistory: [],
        });

        await m.saveManualSteps();

        expect(m.todaySteps).toBe(5000);
        expect(m.refreshAnimations).not.toHaveBeenCalled();
    });

    it('shows error toast on Supabase failure', async () => {
        Supa.upsertStepEntry.mockRejectedValueOnce(new Error('DB error'));

        const m = createMixin({
            stepsInput: '3000',
            stepsInputDate: '2026-02-14',
            stepsHistory: [],
        });

        await m.saveManualSteps();

        expect(m.showToast).toHaveBeenCalledWith('Failed to save');
        expect(m.stepsHistory).toHaveLength(0); // no change on failure
    });
});

// ─── Computed properties ────────────────────────────────

// Computed getters need proper `this` binding — use Object.create to preserve getters
function createGetterHost(overrides = {}) {
    const proto = stepsMixin();
    const obj = Object.create(proto);
    Object.assign(obj, {
        showToast: vi.fn(),
        triggerConfetti: vi.fn(),
        refreshAnimations: vi.fn(),
        ...overrides,
    });
    return obj;
}

describe('stepsProgress', () => {
    it('returns percentage capped at 100', () => {
        const m = createGetterHost({ todaySteps: 5000 });
        expect(m.stepsProgress).toBe(50);

        m.todaySteps = 10000;
        expect(m.stepsProgress).toBe(100);

        m.todaySteps = 15000;
        expect(m.stepsProgress).toBe(100);
    });

    it('returns 0 for 0 steps', () => {
        const m = createGetterHost({ todaySteps: 0 });
        expect(m.stepsProgress).toBe(0);
    });
});

describe('stepsRingColor', () => {
    it('returns red below 5000', () => {
        const m = createGetterHost({ todaySteps: 2000 });
        expect(m.stepsRingColor).toBe('#ef4444');
    });

    it('returns amber between 5000 and 10000', () => {
        const m = createGetterHost({ todaySteps: 7000 });
        expect(m.stepsRingColor).toBe('#f59e0b');
    });

    it('returns yellow at 10000+', () => {
        const m = createGetterHost({ todaySteps: 10000 });
        expect(m.stepsRingColor).toBe('#facc15');
    });
});

describe('stepsMonthly', () => {
    it('groups entries by month with correct stats', () => {
        const m = createGetterHost({
            stepsHistory: [
                { date: '2026-02-16', steps: 8000 },
                { date: '2026-02-15', steps: 10000 },
                { date: '2026-01-10', steps: 6000 },
            ],
        });

        const monthly = m.stepsMonthly;
        expect(monthly).toHaveLength(2);

        const feb = monthly[0];
        expect(feb.key).toBe('2026-02');
        expect(feb.days).toBe(2);
        expect(feb.total).toBe(18000);
        expect(feb.avg).toBe(9000);
        expect(feb.best).toBe(10000);

        const jan = monthly[1];
        expect(jan.key).toBe('2026-01');
        expect(jan.days).toBe(1);
        expect(jan.total).toBe(6000);
        expect(jan.best).toBe(6000);
    });

    it('returns empty array for no history', () => {
        const m = createGetterHost({ stepsHistory: [] });
        expect(m.stepsMonthly).toEqual([]);
    });
});

describe('openStepsLog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('opens the log and loads history', async () => {
        Supa.getStepHistory.mockResolvedValueOnce([
            { date: '2026-02-16', steps: 8000 },
        ]);

        const m = createMixin();
        await m.openStepsLog();

        expect(m.stepsLogOpen).toBe(true);
        expect(m.stepsHistory).toEqual([{ date: '2026-02-16', steps: 8000 }]);
        expect(m.stepsInput).toBe('');
    });

    it('sets empty history on load failure', async () => {
        Supa.getStepHistory.mockRejectedValueOnce(new Error('fail'));

        const m = createMixin({
            stepsHistory: [{ date: '2026-02-16', steps: 8000 }],
        });
        await m.openStepsLog();

        expect(m.stepsHistory).toEqual([]);
    });
});
