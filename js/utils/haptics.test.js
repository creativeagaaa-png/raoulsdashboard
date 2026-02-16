import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning, hapticError, hapticHeavy, hapticSelection } from './haptics.js';

describe('Haptics Utility', () => {
    let vibrateMock;

    beforeEach(() => {
        vibrateMock = vi.fn();
        navigator.vibrate = vibrateMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('hapticLight triggers short vibration', () => {
        hapticLight();
        expect(vibrateMock).toHaveBeenCalledWith(10);
    });

    it('hapticMedium triggers medium vibration', () => {
        hapticMedium();
        expect(vibrateMock).toHaveBeenCalledWith(20);
    });

    it('hapticSuccess triggers pattern vibration', () => {
        hapticSuccess();
        expect(vibrateMock).toHaveBeenCalledWith([15, 50, 15]);
    });

    it('hapticWarning triggers pattern vibration', () => {
        hapticWarning();
        expect(vibrateMock).toHaveBeenCalledWith([30, 40, 30]);
    });

    it('hapticError triggers pattern vibration', () => {
        hapticError();
        expect(vibrateMock).toHaveBeenCalledWith([50, 30, 50, 30, 50]);
    });

    it('hapticHeavy triggers pattern vibration', () => {
        hapticHeavy();
        expect(vibrateMock).toHaveBeenCalledWith([20, 40, 20, 40, 30]);
    });

    it('hapticSelection triggers short vibration', () => {
        hapticSelection();
        expect(vibrateMock).toHaveBeenCalledWith(8);
    });

    it('does not throw when navigator.vibrate is unavailable', () => {
        delete navigator.vibrate;
        expect(() => hapticLight()).not.toThrow();
        expect(() => hapticSuccess()).not.toThrow();
        expect(() => hapticHeavy()).not.toThrow();
    });

    it('does not throw when navigator.vibrate throws', () => {
        navigator.vibrate = vi.fn(() => { throw new Error('fail'); });
        expect(() => hapticLight()).not.toThrow();
    });
});
