import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PROFILE,
    WEEKDAYS,
    WEEKDAY_SHORT
} from './constants.js';

describe('DEFAULT_PROFILE', () => {
    it('has all required fields', () => {
        expect(DEFAULT_PROFILE).toHaveProperty('startWeight');
        expect(DEFAULT_PROFILE).toHaveProperty('goalWeight');
        expect(DEFAULT_PROFILE).toHaveProperty('userHeight');
        expect(DEFAULT_PROFILE).toHaveProperty('userAge');
    });

    it('defaults to zero values', () => {
        expect(DEFAULT_PROFILE.startWeight).toBe(0);
        expect(DEFAULT_PROFILE.goalWeight).toBe(0);
        expect(DEFAULT_PROFILE.userHeight).toBe(0);
        expect(DEFAULT_PROFILE.userAge).toBe(0);
    });
});

describe('WEEKDAYS', () => {
    it('has 7 days', () => {
        expect(WEEKDAYS).toHaveLength(7);
    });

    it('starts with Monday', () => {
        expect(WEEKDAYS[0]).toBe('Monday');
    });

    it('ends with Sunday', () => {
        expect(WEEKDAYS[6]).toBe('Sunday');
    });
});

describe('WEEKDAY_SHORT', () => {
    it('has 7 days', () => {
        expect(WEEKDAY_SHORT).toHaveLength(7);
    });

    it('starts with Mon', () => {
        expect(WEEKDAY_SHORT[0]).toBe('Mon');
    });

    it('ends with Sun', () => {
        expect(WEEKDAY_SHORT[6]).toBe('Sun');
    });

    it('matches WEEKDAYS order', () => {
        expect(WEEKDAY_SHORT[0]).toBe('Mon'); // Monday
        expect(WEEKDAY_SHORT[4]).toBe('Fri'); // Friday
    });
});
