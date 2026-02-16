import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PROFILE,
    DEFAULT_REWARDS,
    WEEKDAYS,
    WEEKDAY_SHORT,
    WIDGET_REGISTRY,
    DEFAULT_LAYOUT,
    TRAINING_WIDGET_REGISTRY,
    DEFAULT_TRAINING_LAYOUT
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

describe('DEFAULT_REWARDS', () => {
    it('is an empty array', () => {
        expect(DEFAULT_REWARDS).toEqual([]);
    });
});

describe('WEEKDAYS', () => {
    it('has 7 days', () => {
        expect(WEEKDAYS).toHaveLength(7);
    });

    it('starts with Monday (German)', () => {
        expect(WEEKDAYS[0]).toBe('Montag');
    });

    it('ends with Sunday (German)', () => {
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

describe('WIDGET_REGISTRY', () => {
    it('has expected widget keys', () => {
        const keys = Object.keys(WIDGET_REGISTRY);
        expect(keys).toContain('current-status');
        expect(keys).toContain('analytics');
        expect(keys).toContain('logs');
    });

    it('each widget has a label', () => {
        Object.values(WIDGET_REGISTRY).forEach(widget => {
            expect(widget).toHaveProperty('label');
            expect(typeof widget.label).toBe('string');
        });
    });
});

describe('DEFAULT_LAYOUT', () => {
    it('has left and right columns', () => {
        expect(DEFAULT_LAYOUT).toHaveProperty('left');
        expect(DEFAULT_LAYOUT).toHaveProperty('right');
        expect(Array.isArray(DEFAULT_LAYOUT.left)).toBe(true);
        expect(Array.isArray(DEFAULT_LAYOUT.right)).toBe(true);
    });

    it('contains only valid widget IDs', () => {
        const allWidgets = Object.keys(WIDGET_REGISTRY);
        [...DEFAULT_LAYOUT.left, ...DEFAULT_LAYOUT.right].forEach(id => {
            expect(allWidgets).toContain(id);
        });
    });

    it('contains all widgets from WIDGET_REGISTRY', () => {
        const allInLayout = [...DEFAULT_LAYOUT.left, ...DEFAULT_LAYOUT.right];
        Object.keys(WIDGET_REGISTRY).forEach(id => {
            expect(allInLayout).toContain(id);
        });
    });
});

describe('TRAINING_WIDGET_REGISTRY', () => {
    it('has expected keys', () => {
        expect(TRAINING_WIDGET_REGISTRY).toHaveProperty('workouts');
        expect(TRAINING_WIDGET_REGISTRY).toHaveProperty('training-stats');
        expect(TRAINING_WIDGET_REGISTRY).toHaveProperty('personal-records');
    });
});

describe('DEFAULT_TRAINING_LAYOUT', () => {
    it('has left and right columns', () => {
        expect(DEFAULT_TRAINING_LAYOUT).toHaveProperty('left');
        expect(DEFAULT_TRAINING_LAYOUT).toHaveProperty('right');
    });

    it('contains only valid training widget IDs', () => {
        const allWidgets = Object.keys(TRAINING_WIDGET_REGISTRY);
        [...DEFAULT_TRAINING_LAYOUT.left, ...DEFAULT_TRAINING_LAYOUT.right].forEach(id => {
            expect(allWidgets).toContain(id);
        });
    });
});
