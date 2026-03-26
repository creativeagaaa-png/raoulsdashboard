import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../store/supabase.js', () => ({}));

import { caloriesMixin } from './calories.js';

function createMixin(overrides = {}) {
    return {
        ...caloriesMixin(),
        history: [],
        startWeight: 80,
        goalWeight: 75,
        userHeight: 180,
        userAge: 30,
        gender: 'male',
        activityLevel: 'moderately_active',
        weeklyGoalRate: -0.5,
        ...overrides
    };
}

describe('calculateBMR', () => {
    it('berechnet BMR korrekt für Männer', () => {
        const m = createMixin();
        expect(m.calculateBMR(80, 180, 30, 'male')).toBe(1770);
    });

    it('berechnet BMR korrekt für Frauen', () => {
        const m = createMixin();
        expect(m.calculateBMR(65, 165, 28, 'female')).toBe(1380.25);
    });

    it('gibt 0 zurück bei fehlenden Werten', () => {
        const m = createMixin();
        expect(m.calculateBMR(0, 180, 30, 'male')).toBe(0);
        expect(m.calculateBMR(80, 0, 30, 'male')).toBe(0);
    });
});

describe('calculateTDEE', () => {
    it('multipliziert BMR mit Aktivitätsfaktor', () => {
        const m = createMixin();
        expect(m.calculateTDEE(1770, 'moderately_active')).toBeCloseTo(2743.5);
    });

    it('nutzt Standardfaktor bei unbekanntem Level', () => {
        const m = createMixin();
        expect(m.calculateTDEE(1770, 'unknown')).toBeCloseTo(2743.5);
    });
});

describe('calculateCalorieTarget', () => {
    it('berechnet Defizit-Ziel korrekt', () => {
        const m = createMixin({
            history: [
                { date: '2026-03-20', weight: 80 },
                { date: '2026-03-21', weight: 80.2 },
                { date: '2026-03-22', weight: 79.8 },
                { date: '2026-03-23', weight: 80.1 },
                { date: '2026-03-24', weight: 79.9 },
                { date: '2026-03-25', weight: 80.0 },
                { date: '2026-03-26', weight: 79.7 }
            ],
            weeklyGoalRate: -0.5
        });
        m.calculateCalorieTarget();
        expect(m.calorieData.target).toBeGreaterThan(2100);
        expect(m.calorieData.target).toBeLessThan(2300);
        expect(m.calorieData.mode).toBe('deficit');
        expect(m.calorieData.isClamped).toBe(false);
    });

    it('clampt auf Minimum bei aggressivem Defizit (männlich)', () => {
        const m = createMixin({
            history: [{ date: '2026-03-26', weight: 60 }],
            gender: 'male',
            activityLevel: 'sedentary',
            weeklyGoalRate: -1.0
        });
        m.calculateCalorieTarget();
        expect(m.calorieData.target).toBe(1500);
        expect(m.calorieData.isClamped).toBe(true);
    });

    it('clampt auf Minimum bei aggressivem Defizit (weiblich)', () => {
        const m = createMixin({
            history: [{ date: '2026-03-26', weight: 55 }],
            gender: 'female',
            activityLevel: 'sedentary',
            weeklyGoalRate: -1.0,
            userHeight: 165,
            userAge: 28
        });
        m.calculateCalorieTarget();
        expect(m.calorieData.target).toBe(1200);
        expect(m.calorieData.isClamped).toBe(true);
    });

    it('berechnet Erhaltung korrekt', () => {
        const m = createMixin({ weeklyGoalRate: 0 });
        m.history = [{ date: '2026-03-26', weight: 80 }];
        m.calculateCalorieTarget();
        expect(m.calorieData.mode).toBe('maintenance');
        expect(m.calorieData.adjustment).toBe(0);
        expect(m.calorieData.target).toBe(Math.round(m.calorieData.tdee));
    });

    it('berechnet Überschuss korrekt', () => {
        const m = createMixin({ weeklyGoalRate: 0.5 });
        m.history = [{ date: '2026-03-26', weight: 70 }];
        m.calculateCalorieTarget();
        expect(m.calorieData.mode).toBe('surplus');
        expect(m.calorieData.adjustment).toBeGreaterThan(0);
    });

    it('nutzt 7-Tage-Durchschnitt statt letztem Eintrag', () => {
        const m = createMixin({
            history: [
                { date: '2026-03-20', weight: 82 },
                { date: '2026-03-21', weight: 81 },
                { date: '2026-03-22', weight: 80 },
                { date: '2026-03-23', weight: 81 },
                { date: '2026-03-24', weight: 80 },
                { date: '2026-03-25', weight: 81 },
                { date: '2026-03-26', weight: 80 },
                { date: '2026-03-27', weight: 79 }
            ]
        });
        m.calculateCalorieTarget();
        const bmrWith7DayAvg = m.calculateBMR(80.29, 180, 30, 'male');
        expect(m.calorieData.bmr).toBeCloseTo(bmrWith7DayAvg, 0);
    });

    it('fallback zu startWeight wenn keine Einträge', () => {
        const m = createMixin({ history: [], startWeight: 85 });
        m.calculateCalorieTarget();
        const expectedBMR = m.calculateBMR(85, 180, 30, 'male');
        expect(m.calorieData.bmr).toBeCloseTo(expectedBMR);
    });
});

describe('getWeeklyComparison', () => {
    it('vergleicht geplante vs. tatsächliche Abnahme', () => {
        const m = createMixin({ weeklyGoalRate: -0.5 });
        m.history = [
            { date: '2026-03-16', weight: 81 },
            { date: '2026-03-17', weight: 80.8 },
            { date: '2026-03-18', weight: 80.6 },
            { date: '2026-03-19', weight: 80.5 },
            { date: '2026-03-23', weight: 80.2 },
            { date: '2026-03-24', weight: 80.0 },
            { date: '2026-03-25', weight: 79.8 },
            { date: '2026-03-26', weight: 79.7 }
        ];
        const comparison = m.getWeeklyComparison();
        expect(comparison.planned).toBe(-0.5);
        expect(comparison.actual).toBeDefined();
        expect(typeof comparison.actual).toBe('number');
    });
});

describe('getProjectedGoalDate', () => {
    it('projiziert Zieldatum basierend auf Rate', () => {
        const m = createMixin({
            weeklyGoalRate: -0.5,
            goalWeight: 75
        });
        m.history = [{ date: '2026-03-26', weight: 80 }];
        const date = m.getProjectedGoalDate();
        expect(date).toBeDefined();
        const projected = new Date(date);
        const now = new Date();
        const diffDays = (projected - now) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(55);
        expect(diffDays).toBeLessThan(85);
    });

    it('gibt null zurück wenn Ziel bereits erreicht', () => {
        const m = createMixin({ goalWeight: 80 });
        m.history = [{ date: '2026-03-26', weight: 79 }];
        expect(m.getProjectedGoalDate()).toBeNull();
    });

    it('gibt null zurück ohne weeklyGoalRate', () => {
        const m = createMixin({ weeklyGoalRate: 0 });
        m.history = [{ date: '2026-03-26', weight: 80 }];
        expect(m.getProjectedGoalDate()).toBeNull();
    });
});
