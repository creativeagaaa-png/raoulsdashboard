import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../store/supabase.js', () => ({
    getCheckins: vi.fn().mockResolvedValue([]),
    upsertCheckin: vi.fn().mockResolvedValue(),
    getSettings: vi.fn().mockResolvedValue(null)
}));
vi.mock('../utils/formatting.js', () => ({
    getLocalDateString: vi.fn(() => '2026-03-26')
}));
vi.mock('../utils/constants.js', () => ({
    DEFAULT_PROFILE: {
        checklistItems: [
            { key: 'training', label: 'Training absolviert' },
            { key: 'steps', label: 'Schritte-Ziel erreicht' },
            { key: 'calories', label: 'Kalorien im Ziel' },
            { key: 'water', label: 'Genug getrunken' },
            { key: 'sleep', label: '7+ Stunden Schlaf' }
        ]
    }
}));

import { checkinMixin } from './checkin.js';

function createMixin(overrides = {}) {
    return {
        ...checkinMixin(),
        checklistItems: [
            { key: 'training', label: 'Training absolviert' },
            { key: 'steps', label: 'Schritte-Ziel erreicht' },
            { key: 'calories', label: 'Kalorien im Ziel' },
            { key: 'water', label: 'Genug getrunken' },
            { key: 'sleep', label: '7+ Stunden Schlaf' }
        ],
        showToast: vi.fn(),
        saveSettings: vi.fn(),
        ...overrides
    };
}

describe('initTodayCheckin', () => {
    it('erstellt leere Checkliste für heute', () => {
        const m = createMixin();
        m.initTodayCheckin();
        expect(m.todayCheckin).toHaveLength(5);
        expect(m.todayCheckin[0]).toEqual({ key: 'training', label: 'Training absolviert', checked: false });
        expect(m.todayCheckin.every(i => i.checked === false)).toBe(true);
    });
});

describe('toggleCheckinItem', () => {
    it('toggled ein Item', async () => {
        const m = createMixin();
        m.initTodayCheckin();
        await m.toggleCheckinItem('training');
        expect(m.todayCheckin.find(i => i.key === 'training').checked).toBe(true);
    });

    it('toggled zurück auf unchecked', async () => {
        const m = createMixin();
        m.initTodayCheckin();
        await m.toggleCheckinItem('training');
        await m.toggleCheckinItem('training');
        expect(m.todayCheckin.find(i => i.key === 'training').checked).toBe(false);
    });
});

describe('checkinCompletedCount', () => {
    it('zählt erledigte Items', async () => {
        const m = createMixin();
        m.initTodayCheckin();
        await m.toggleCheckinItem('training');
        await m.toggleCheckinItem('water');
        expect(m.getCheckinCompletedCount()).toBe(2);
    });
});

describe('calculateCheckinStreak', () => {
    it('berechnet aufeinanderfolgende Tage', () => {
        const m = createMixin();
        m.checkinHistory = [
            { date: '2026-03-26', items: [{ key: 'a', checked: true }] },
            { date: '2026-03-25', items: [{ key: 'a', checked: true }] },
            { date: '2026-03-24', items: [{ key: 'a', checked: true }] },
            { date: '2026-03-23', items: [{ key: 'a', checked: false }] }
        ];
        expect(m.calculateCheckinStreak()).toBe(3);
    });

    it('gibt 0 zurück bei leerer History', () => {
        const m = createMixin();
        m.checkinHistory = [];
        expect(m.calculateCheckinStreak()).toBe(0);
    });

    it('bricht Serie bei Lücke', () => {
        const m = createMixin();
        m.checkinHistory = [
            { date: '2026-03-26', items: [{ key: 'a', checked: true }] },
            { date: '2026-03-24', items: [{ key: 'a', checked: true }] }
        ];
        expect(m.calculateCheckinStreak()).toBe(1);
    });
});

describe('calculateCheckinStats', () => {
    it('berechnet Monatsstatistiken', () => {
        const m = createMixin();
        m.checkinHistory = [
            { date: '2026-03-26', items: [{ key: 'a', checked: true }, { key: 'b', checked: true }] },
            { date: '2026-03-25', items: [{ key: 'a', checked: true }, { key: 'b', checked: false }] },
            { date: '2026-03-24', items: [{ key: 'a', checked: false }, { key: 'b', checked: false }] }
        ];
        const stats = m.calculateCheckinStats();
        expect(stats.activeDays).toBe(2);
        expect(stats.completionRate).toBeGreaterThan(0);
    });
});

describe('getCheckinWeekData', () => {
    it('gibt 7-Tage Array zurück', () => {
        const m = createMixin();
        m.checkinHistory = [
            { date: '2026-03-26', items: [{ key: 'a', checked: true }, { key: 'b', checked: true }] }
        ];
        m.checklistItems = [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }];
        const week = m.getCheckinWeekData();
        expect(week).toHaveLength(7);
        expect(week[0]).toHaveProperty('date');
        expect(week[0]).toHaveProperty('total');
        expect(week[0]).toHaveProperty('checked');
    });
});

describe('addCheckinItem', () => {
    it('fügt neues Item hinzu', () => {
        const m = createMixin();
        m.initTodayCheckin();
        m.addCheckinItem('Meditation');
        expect(m.checklistItems).toHaveLength(6);
        expect(m.checklistItems[5].label).toBe('Meditation');
        expect(m.todayCheckin).toHaveLength(6);
    });
});

describe('removeCheckinItem', () => {
    it('entfernt Item', () => {
        const m = createMixin();
        m.initTodayCheckin();
        m.removeCheckinItem('water');
        expect(m.checklistItems).toHaveLength(4);
        expect(m.todayCheckin).toHaveLength(4);
        expect(m.checklistItems.find(i => i.key === 'water')).toBeUndefined();
    });
});
