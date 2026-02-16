import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock haptics
vi.mock('../utils/haptics.js', () => ({
    hapticSuccess: vi.fn()
}));

const { restTimerMixin } = await import('./rest-timer.js');

function createMixin() {
    return { ...restTimerMixin() };
}

describe('Rest Timer (timestamp-based)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initializes with correct defaults', () => {
        const mixin = createMixin();
        expect(mixin.restTimer.active).toBe(false);
        expect(mixin.restTimer.remaining).toBe(0);
        expect(mixin.restTimer.total).toBe(90);
        expect(mixin.restTimer.defaultDuration).toBe(90);
        expect(mixin.restTimer._endTimestamp).toBe(null);
    });

    it('startRestTimer sets end timestamp and active state', () => {
        const mixin = createMixin();
        const now = Date.now();
        mixin.startRestTimer(60);
        expect(mixin.restTimer.active).toBe(true);
        expect(mixin.restTimer.total).toBe(60);
        expect(mixin.restTimer.remaining).toBe(60);
        expect(mixin.restTimer._endTimestamp).toBeGreaterThanOrEqual(now + 59000);
    });

    it('uses default duration when no argument given', () => {
        const mixin = createMixin();
        mixin.restTimer.defaultDuration = 120;
        mixin.startRestTimer();
        expect(mixin.restTimer.total).toBe(120);
    });

    it('counts down remaining time correctly', () => {
        const mixin = createMixin();
        mixin.startRestTimer(10);
        vi.advanceTimersByTime(3000);
        expect(mixin.restTimer.remaining).toBeLessThanOrEqual(7);
        expect(mixin.restTimer.remaining).toBeGreaterThanOrEqual(6);
    });

    it('clearRestTimer resets all state', () => {
        const mixin = createMixin();
        mixin.startRestTimer(30);
        mixin.clearRestTimer();
        expect(mixin.restTimer.active).toBe(false);
        expect(mixin.restTimer.remaining).toBe(0);
        expect(mixin.restTimer._endTimestamp).toBe(null);
        expect(mixin.restTimer.interval).toBe(null);
    });

    it('skipRestTimer clears the timer', () => {
        const mixin = createMixin();
        mixin.startRestTimer(30);
        mixin.skipRestTimer();
        expect(mixin.restTimer.active).toBe(false);
    });

    it('setRestDuration updates default and restarts if active', () => {
        const mixin = createMixin();
        mixin.startRestTimer(30);
        mixin.setRestDuration(45);
        expect(mixin.restTimer.defaultDuration).toBe(45);
        expect(mixin.restTimer.total).toBe(45);
    });

    it('timer catches up after simulated background pause', () => {
        const mixin = createMixin();
        mixin.startRestTimer(60);
        // Simulate 30 seconds passing without interval ticks (background)
        vi.advanceTimersByTime(30000);
        expect(mixin.restTimer.remaining).toBeLessThanOrEqual(30);
    });
});
