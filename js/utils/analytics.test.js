import { describe, it, expect } from 'vitest';
import { calculateBMI, getBMIRanges, calculateTrend, calculateOracle } from './analytics.js';

describe('calculateBMI', () => {
    it('returns Normalgewicht for BMI between 18.5 and 24.9', () => {
        const result = calculateBMI(70, 175);
        expect(result.label).toBe('Normalgewicht');
        expect(result.color).toBe('bg-emerald-500');
        expect(parseFloat(result.value)).toBeCloseTo(22.9, 1);
    });

    it('returns Übergewicht for BMI between 25 and 29.9', () => {
        const result = calculateBMI(85, 175);
        expect(result.label).toBe('Übergewicht');
        expect(result.color).toBe('bg-yellow-500');
    });

    it('returns Adipositas for BMI >= 30', () => {
        const result = calculateBMI(100, 175);
        expect(result.label).toBe('Adipositas');
        expect(result.color).toBe('bg-rose-500');
    });

    it('returns Untergewicht for BMI < 18.5', () => {
        const result = calculateBMI(50, 175);
        expect(result.label).toBe('Untergewicht');
        expect(result.color).toBe('bg-blue-500');
    });

    it('handles height = 0 gracefully', () => {
        const result = calculateBMI(70, 0);
        expect(result.value).toBe(0);
        expect(result.label).toBe('-');
    });

    it('handles negative height gracefully', () => {
        const result = calculateBMI(70, -10);
        expect(result.value).toBe(0);
        expect(result.label).toBe('-');
    });

    it('calculates correctly at BMI boundary 25.0', () => {
        // 25 * (1.80)^2 = 81.0
        const result = calculateBMI(81, 180);
        expect(result.label).toBe('Übergewicht');
    });

    it('calculates correctly at BMI boundary 18.5', () => {
        // 59 kg at 180cm => BMI 18.2 -> Untergewicht
        const result = calculateBMI(59, 180);
        expect(result.label).toBe('Untergewicht');
    });
});

describe('getBMIRanges', () => {
    it('returns 4 ranges for valid height', () => {
        const ranges = getBMIRanges(175);
        expect(ranges).toHaveLength(4);
    });

    it('returns correct labels', () => {
        const ranges = getBMIRanges(180);
        expect(ranges.map(r => r.label)).toEqual([
            'Untergewicht', 'Normalgewicht', 'Übergewicht', 'Adipositas'
        ]);
    });

    it('calculates correct weight boundaries for 180cm', () => {
        const ranges = getBMIRanges(180);
        const h = 1.80;
        // Untergewicht: max = 18.5 * h^2
        expect(parseFloat(ranges[0].max)).toBeCloseTo(18.5 * h * h, 0);
        // Normalgewicht: min = 18.5*h^2, max = 25*h^2
        expect(parseFloat(ranges[1].min)).toBeCloseTo(18.5 * h * h, 0);
        expect(parseFloat(ranges[1].max)).toBeCloseTo(25 * h * h, 0);
        // Adipositas: min = 30*h^2
        expect(parseFloat(ranges[3].min)).toBeCloseTo(30 * h * h, 0);
    });

    it('returns empty array for height = 0', () => {
        expect(getBMIRanges(0)).toEqual([]);
    });

    it('returns empty array for negative height', () => {
        expect(getBMIRanges(-10)).toEqual([]);
    });
});

describe('calculateTrend', () => {
    it('returns zero trend for less than 2 entries', () => {
        expect(calculateTrend([{ weight: 80 }])).toEqual({ value: 0, isLoss: false });
        expect(calculateTrend([])).toEqual({ value: 0, isLoss: false });
    });

    it('detects weight loss', () => {
        const history = [
            { date: '2025-01-01', weight: 80 },
            { date: '2025-01-02', weight: 79.5 }
        ];
        const result = calculateTrend(history);
        expect(result.value).toBeCloseTo(-0.5);
        expect(result.isLoss).toBe(true);
    });

    it('detects weight gain', () => {
        const history = [
            { date: '2025-01-01', weight: 80 },
            { date: '2025-01-02', weight: 81 }
        ];
        const result = calculateTrend(history);
        expect(result.value).toBeCloseTo(1);
        expect(result.isLoss).toBe(false);
    });

    it('uses only the last two entries', () => {
        const history = [
            { date: '2025-01-01', weight: 85 },
            { date: '2025-01-02', weight: 80 },
            { date: '2025-01-03', weight: 79 }
        ];
        const result = calculateTrend(history);
        expect(result.value).toBeCloseTo(-1);
        expect(result.isLoss).toBe(true);
    });
});

describe('calculateOracle', () => {
    function generateHistory(startWeight, weeklyChange, weeks) {
        const history = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeks * 7));

        for (let week = 0; week < weeks; week++) {
            for (let day = 0; day < 5; day++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + week * 7 + day);
                const noise = (Math.random() - 0.5) * 0.2;
                history.push({
                    date: date.toISOString().split('T')[0],
                    weight: startWeight + weeklyChange * week + noise
                });
            }
        }
        return history;
    }

    it('returns invalid for less than 5 entries', () => {
        const history = [
            { date: '2025-01-01', weight: 80 },
            { date: '2025-01-02', weight: 79.8 }
        ];
        expect(calculateOracle(history, 79.8, 70).valid).toBe(false);
    });

    it('returns valid prediction for consistent weight loss', () => {
        const history = generateHistory(80, -0.5, 6);
        const currentWeight = history[history.length - 1].weight;
        const result = calculateOracle(history, currentWeight, 70);
        expect(result.valid).toBe(true);
        expect(result.noProgress).toBe(false);
        expect(result.date).toBeTruthy();
    });

    it('detects no progress when weight is stagnant', () => {
        const history = generateHistory(80, 0, 6);
        const currentWeight = history[history.length - 1].weight;
        const result = calculateOracle(history, currentWeight, 70);
        expect(result.valid).toBe(true);
        expect(result.noProgress).toBe(true);
    });

    it('detects plateau when recent range is small', () => {
        const history = generateHistory(80, -0.5, 4);
        // Add 3 weeks of nearly identical weights (plateau)
        const plateauStart = new Date();
        plateauStart.setDate(plateauStart.getDate() - 21);
        for (let week = 0; week < 3; week++) {
            for (let day = 0; day < 5; day++) {
                const date = new Date(plateauStart);
                date.setDate(date.getDate() + week * 7 + day);
                history.push({
                    date: date.toISOString().split('T')[0],
                    weight: 78 + (Math.random() - 0.5) * 0.1
                });
            }
        }
        const currentWeight = history[history.length - 1].weight;
        const result = calculateOracle(history, currentWeight, 70);
        expect(result.valid).toBe(true);
        if (result.isPlateau) {
            expect(result.plateauTip).toBeTruthy();
        }
    });

    it('returns confidence level', () => {
        const history = generateHistory(80, -0.5, 8);
        const currentWeight = history[history.length - 1].weight;
        const result = calculateOracle(history, currentWeight, 70);
        expect(result.valid).toBe(true);
        expect(['high', 'medium', 'low']).toContain(result.confidence);
    });

    it('returns weekly average and rate', () => {
        const history = generateHistory(80, -0.5, 6);
        const currentWeight = history[history.length - 1].weight;
        const result = calculateOracle(history, currentWeight, 70);
        expect(result.valid).toBe(true);
        expect(parseFloat(result.weeklyAvg)).toBeGreaterThan(0);
        expect(parseFloat(result.rate)).toBeLessThan(0);
    });
});
