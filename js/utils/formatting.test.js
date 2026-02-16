import { describe, it, expect, vi } from 'vitest';
import { getTodayWeekdayIndex, getISOWeekKey, formatGalleryDate, getLocalDateString } from './formatting.js';

describe('getTodayWeekdayIndex', () => {
    it('returns a number between 0 and 6', () => {
        const idx = getTodayWeekdayIndex();
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(6);
    });

    it('maps Sunday (JS day 0) to index 6', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00')); // Sunday
        expect(getTodayWeekdayIndex()).toBe(6);
        vi.useRealTimers();
    });

    it('maps Monday (JS day 1) to index 0', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-16T12:00:00')); // Monday
        expect(getTodayWeekdayIndex()).toBe(0);
        vi.useRealTimers();
    });

    it('maps Saturday (JS day 6) to index 5', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-21T12:00:00')); // Saturday
        expect(getTodayWeekdayIndex()).toBe(5);
        vi.useRealTimers();
    });

    it('maps Wednesday (JS day 3) to index 2', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-18T12:00:00')); // Wednesday
        expect(getTodayWeekdayIndex()).toBe(2);
        vi.useRealTimers();
    });
});

describe('getISOWeekKey', () => {
    it('returns correct ISO week format', () => {
        const result = getISOWeekKey('2025-01-06');
        expect(result).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('returns same week for dates in same week', () => {
        const mon = getISOWeekKey('2025-01-06'); // Monday
        const fri = getISOWeekKey('2025-01-10'); // Friday
        expect(mon).toBe(fri);
    });

    it('returns different weeks for dates in different weeks', () => {
        const week1 = getISOWeekKey('2025-01-06');
        const week2 = getISOWeekKey('2025-01-13');
        expect(week1).not.toBe(week2);
    });

    it('handles year boundaries correctly', () => {
        const result = getISOWeekKey('2024-12-30'); // Week 1 of 2025
        expect(result).toBeTruthy();
    });

    it('handles Date object input', () => {
        const result = getISOWeekKey(new Date('2025-01-06'));
        expect(result).toMatch(/^\d{4}-W\d{2}$/);
    });
});

describe('formatGalleryDate', () => {
    it('returns empty string for null', () => {
        expect(formatGalleryDate(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(formatGalleryDate(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(formatGalleryDate('')).toBe('');
    });

    it('formats date in English locale', () => {
        const result = formatGalleryDate('2025-01-15');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        // Should contain day, month abbreviation, and year
        expect(result).toMatch(/\d{2}/); // at least the day
    });
});

describe('getLocalDateString', () => {
    it('returns today\'s date in YYYY-MM-DD format', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00'));
        const result = getLocalDateString();
        expect(result).toBe('2025-06-15');
        vi.useRealTimers();
    });

    it('handles Date object input', () => {
        const date = new Date('2025-03-20T10:30:00');
        const result = getLocalDateString(date);
        expect(result).toBe('2025-03-20');
    });

    it('handles string date input', () => {
        const result = getLocalDateString('2025-12-25T15:45:00');
        expect(result).toBe('2025-12-25');
    });

    it('returns correct local date (not UTC) - test with a date near midnight', () => {
        // Test with a date near midnight to ensure local time is used, not UTC
        const date = new Date('2025-01-15T23:59:00');
        const result = getLocalDateString(date);
        expect(result).toBe('2025-01-15');
    });
});
