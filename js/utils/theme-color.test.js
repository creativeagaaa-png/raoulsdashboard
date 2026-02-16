import { describe, it, expect } from 'vitest';

/**
 * Pure logic test for theme-color selection (no DOM needed).
 * Mirrors the logic inside updateThemeColor().
 */
function resolveThemeColor(workoutActive, activeTab, isLight) {
    if (workoutActive) return isLight ? '#059669' : '#064e3b';
    if (activeTab === 'training') return isLight ? '#f0fdf4' : '#050505';
    return isLight ? '#f5f5f7' : '#050505';
}

describe('Dynamic Theme Color Logic', () => {
    it('returns dark default for health tab', () => {
        expect(resolveThemeColor(false, 'health', false)).toBe('#050505');
    });

    it('returns light default for health tab', () => {
        expect(resolveThemeColor(false, 'health', true)).toBe('#f5f5f7');
    });

    it('returns dark green for active workout', () => {
        expect(resolveThemeColor(true, 'training', false)).toBe('#064e3b');
    });

    it('returns light green for active workout', () => {
        expect(resolveThemeColor(true, 'training', true)).toBe('#059669');
    });

    it('returns dark default for training tab (no workout)', () => {
        expect(resolveThemeColor(false, 'training', false)).toBe('#050505');
    });

    it('returns light training color for training tab (no workout)', () => {
        expect(resolveThemeColor(false, 'training', true)).toBe('#f0fdf4');
    });

    it('workout-active overrides tab selection', () => {
        expect(resolveThemeColor(true, 'health', false)).toBe('#064e3b');
        expect(resolveThemeColor(true, 'health', true)).toBe('#059669');
    });
});
