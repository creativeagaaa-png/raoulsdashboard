import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../store/supabase.js', () => ({
    getCheckins: vi.fn().mockResolvedValue([]),
    upsertCheckin: vi.fn().mockResolvedValue(),
    getSettings: vi.fn().mockResolvedValue(null)
}));
vi.mock('../utils/formatting.js', () => ({
    getLocalDateString: vi.fn((date) => {
        if (date) {
            const d = date instanceof Date ? date : new Date(date);
            return d.toISOString().split('T')[0];
        }
        return '2026-03-26';
    })
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
        expect(m.todayCheckin[0]).toEqual({ key: 'training', label: 'Training absolviert', status: 'none', reason: null });
        expect(m.todayCheckin.every(i => i.status === 'none')).toBe(true);
    });
});

describe('toggleCheckinItem', () => {
    it('toggled ein Item auf done', async () => {
        const m = createMixin();
        m.initTodayCheckin();
        await m.toggleCheckinItem('training');
        expect(m.todayCheckin.find(i => i.key === 'training').status).toBe('done');
    });

    it('toggled zurück auf none', async () => {
        const m = createMixin();
        m.initTodayCheckin();
        await m.toggleCheckinItem('training');
        await m.toggleCheckinItem('training');
        expect(m.todayCheckin.find(i => i.key === 'training').status).toBe('none');
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
            { date: '2026-03-26', items: [{ key: 'a', status: 'done', reason: null }] },
            { date: '2026-03-25', items: [{ key: 'a', status: 'done', reason: null }] },
            { date: '2026-03-24', items: [{ key: 'a', status: 'done', reason: null }] },
            { date: '2026-03-23', items: [{ key: 'a', status: 'none', reason: null }] }
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
            { date: '2026-03-26', items: [{ key: 'a', status: 'done', reason: null }] },
            { date: '2026-03-24', items: [{ key: 'a', status: 'done', reason: null }] }
        ];
        expect(m.calculateCheckinStreak()).toBe(1);
    });
});

describe('calculateCheckinStats', () => {
    it('berechnet Monatsstatistiken', () => {
        const m = createMixin();
        m.checkinHistory = [
            { date: '2026-03-26', items: [{ key: 'a', status: 'done', reason: null }, { key: 'b', status: 'done', reason: null }] },
            { date: '2026-03-25', items: [{ key: 'a', status: 'done', reason: null }, { key: 'b', status: 'none', reason: null }] },
            { date: '2026-03-24', items: [{ key: 'a', status: 'none', reason: null }, { key: 'b', status: 'none', reason: null }] }
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
            { date: '2026-03-26', items: [{ key: 'a', status: 'done', reason: null }, { key: 'b', status: 'done', reason: null }] }
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

describe('cycleCheckinStatus', () => {
    it('zykliert none → done → missed → none', () => {
        const m = createMixin();
        m.initTodayCheckin();
        const item = () => m.todayCheckin.find(i => i.key === 'training');

        expect(item().status).toBe('none');
        m.cycleCheckinStatus('training');
        expect(item().status).toBe('done');
        m.cycleCheckinStatus('training');
        expect(item().status).toBe('missed');
        m.cycleCheckinStatus('training');
        expect(item().status).toBe('none');
    });
});

describe('setCheckinStatus', () => {
    it('setzt Status direkt', async () => {
        const m = createMixin();
        m.initTodayCheckin();
        await m.setCheckinStatus('training', 'done');
        expect(m.todayCheckin.find(i => i.key === 'training').status).toBe('done');
    });

    it('löscht reason bei non-missed Status', async () => {
        const m = createMixin();
        m.initTodayCheckin();
        await m.setCheckinStatus('training', 'missed');
        m.todayCheckin.find(i => i.key === 'training').reason = 'Krank';
        await m.setCheckinStatus('training', 'done');
        expect(m.todayCheckin.find(i => i.key === 'training').reason).toBeNull();
    });
});
