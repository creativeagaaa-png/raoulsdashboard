import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PROFILE,
    WEEKDAYS,
    WEEKDAY_SHORT,
    ACTIVITY_LEVELS,
    CALORIE_CONSTANTS
} from './constants.js';

describe('DEFAULT_PROFILE', () => {
    it('has all required fields', () => {
        expect(DEFAULT_PROFILE).toHaveProperty('startWeight');
        expect(DEFAULT_PROFILE).toHaveProperty('goalWeight');
        expect(DEFAULT_PROFILE).toHaveProperty('userHeight');
        expect(DEFAULT_PROFILE).toHaveProperty('userAge');
        expect(DEFAULT_PROFILE).toHaveProperty('gender');
        expect(DEFAULT_PROFILE).toHaveProperty('activityLevel');
        expect(DEFAULT_PROFILE).toHaveProperty('weeklyGoalRate');
        expect(DEFAULT_PROFILE).toHaveProperty('checklistItems');
    });

    it('defaults to zero values', () => {
        expect(DEFAULT_PROFILE.startWeight).toBe(0);
        expect(DEFAULT_PROFILE.goalWeight).toBe(0);
        expect(DEFAULT_PROFILE.userHeight).toBe(0);
        expect(DEFAULT_PROFILE.userAge).toBe(0);
    });

    it('has correct default activity level', () => {
        expect(DEFAULT_PROFILE.activityLevel).toBe('moderately_active');
    });

    it('has 5 checklist items', () => {
        expect(DEFAULT_PROFILE.checklistItems).toHaveLength(5);
    });
});

describe('WEEKDAYS', () => {
    it('has 7 days', () => {
        expect(WEEKDAYS).toHaveLength(7);
    });

    it('starts with Montag', () => {
        expect(WEEKDAYS[0]).toBe('Montag');
    });

    it('ends with Sonntag', () => {
        expect(WEEKDAYS[6]).toBe('Sonntag');
    });
});

describe('WEEKDAY_SHORT', () => {
    it('has 7 days', () => {
        expect(WEEKDAY_SHORT).toHaveLength(7);
    });

    it('starts with Mo', () => {
        expect(WEEKDAY_SHORT[0]).toBe('Mo');
    });

    it('ends with So', () => {
        expect(WEEKDAY_SHORT[6]).toBe('So');
    });

    it('matches WEEKDAYS order', () => {
        expect(WEEKDAY_SHORT[0]).toBe('Mo'); // Montag
        expect(WEEKDAY_SHORT[4]).toBe('Fr'); // Freitag
    });
});

describe('ACTIVITY_LEVELS', () => {
    it('has 5 levels', () => {
        expect(Object.keys(ACTIVITY_LEVELS)).toHaveLength(5);
    });

    it('each level has factor, label, description', () => {
        Object.values(ACTIVITY_LEVELS).forEach(level => {
            expect(level).toHaveProperty('factor');
            expect(level).toHaveProperty('label');
            expect(level).toHaveProperty('description');
        });
    });
});

describe('CALORIE_CONSTANTS', () => {
    it('has correct KCAL_PER_KG_FAT', () => {
        expect(CALORIE_CONSTANTS.KCAL_PER_KG_FAT).toBe(7700);
    });

    it('has minimum calorie values', () => {
        expect(CALORIE_CONSTANTS.MIN_CALORIES_MALE).toBe(1500);
        expect(CALORIE_CONSTANTS.MIN_CALORIES_FEMALE).toBe(1200);
    });
});
