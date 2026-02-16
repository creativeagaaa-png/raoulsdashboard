import { describe, it, expect, vi } from 'vitest';

// Mock haptics
vi.mock('../utils/haptics.js', () => ({
    hapticHeavy: vi.fn()
}));

const { rewardsMixin } = await import('./rewards.js');

function createMixin(overrides = {}) {
    return {
        ...rewardsMixin(),
        rewards: [],
        lootboxOpen: false,
        unlockedReward: null,
        showToast: vi.fn(),
        ...overrides
    };
}

describe('checkUnlocks', () => {
    it('does nothing when oldW is not a number', () => {
        const m = createMixin({
            rewards: [{ target: 75, title: 'Test', icon: '⭐' }]
        });
        m.checkUnlocks(null, 74);
        expect(m.lootboxOpen).toBe(false);
    });

    it('does nothing when newW is not a number', () => {
        const m = createMixin({
            rewards: [{ target: 75, title: 'Test', icon: '⭐' }]
        });
        m.checkUnlocks(76, undefined);
        expect(m.lootboxOpen).toBe(false);
    });

    it('does nothing when no reward target is crossed', () => {
        const m = createMixin({
            rewards: [{ target: 70, title: 'Goal', icon: '🏆' }]
        });
        m.checkUnlocks(76, 75);
        expect(m.lootboxOpen).toBe(false);
        expect(m.unlockedReward).toBeNull();
    });

    it('unlocks reward when weight crosses target downward', () => {
        vi.useFakeTimers();
        const m = createMixin({
            rewards: [{ target: 75, title: '75kg erreicht!', icon: '🎉' }]
        });
        m.checkUnlocks(76, 74);
        expect(m.lootboxOpen).toBe(true);
        expect(m.unlockedReward).toEqual({ target: 75, title: '75kg erreicht!', icon: '🎉' });
        vi.useRealTimers();
    });

    it('does not unlock when weight goes up past target', () => {
        const m = createMixin({
            rewards: [{ target: 75, title: 'Goal', icon: '⭐' }]
        });
        m.checkUnlocks(74, 76);
        expect(m.lootboxOpen).toBe(false);
    });

    it('does not unlock when weight equals target but was already below', () => {
        const m = createMixin({
            rewards: [{ target: 75, title: 'Goal', icon: '⭐' }]
        });
        m.checkUnlocks(74, 75);
        expect(m.lootboxOpen).toBe(false);
    });

    it('unlocks the first matching reward when multiple exist', () => {
        vi.useFakeTimers();
        const m = createMixin({
            rewards: [
                { target: 80, title: '80kg', icon: '⭐' },
                { target: 75, title: '75kg', icon: '🏆' },
                { target: 70, title: '70kg', icon: '🎉' }
            ]
        });
        m.checkUnlocks(76, 74);
        expect(m.unlockedReward.target).toBe(75);
        vi.useRealTimers();
    });
});

describe('closeLootbox', () => {
    it('sets lootboxOpen to false', () => {
        const m = createMixin();
        m.lootboxOpen = true;
        m.closeLootbox();
        expect(m.lootboxOpen).toBe(false);
    });
});

describe('triggerConfetti', () => {
    it('does not throw when confetti is not a function', () => {
        const m = createMixin();
        // confetti is not defined globally
        expect(() => m.triggerConfetti()).not.toThrow();
    });

    it('calls confetti when available', () => {
        const m = createMixin();
        globalThis.confetti = vi.fn();
        m.triggerConfetti();
        expect(globalThis.confetti).toHaveBeenCalled();
        delete globalThis.confetti;
    });

    it('does not throw when confetti throws', () => {
        const m = createMixin();
        globalThis.confetti = vi.fn(() => { throw new Error('fail'); });
        expect(() => m.triggerConfetti()).not.toThrow();
        delete globalThis.confetti;
    });
});
