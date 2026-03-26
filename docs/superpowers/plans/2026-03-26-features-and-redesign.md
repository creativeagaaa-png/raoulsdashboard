# Features & UI-Redesign Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drei neue Features (Kalorienberechnung, Plan-Tab, Gewohnheiten-Tracker) plus Apple-inspiriertes UI-Redesign mit Dark Mode implementieren.

**Architecture:** Inkrementelle Addition via Alpine.js Mixin-Pattern. Neue Features als eigenständige Mixins (`caloriesMixin`, `checkinMixin`), neue Supabase-Tabelle für Check-Ins, Design-Tokens via CSS Custom Properties, 4-Tab Bottom Navigation.

**Tech Stack:** Alpine.js, Chart.js, Supabase (PostgreSQL), Tailwind CSS v4, Vite, Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-features-and-redesign-design.md`

---

## Dateistruktur

### Neue Dateien
| Datei | Verantwortung |
|---|---|
| `js/features/calories.js` | `caloriesMixin()` — BMR, TDEE, Kalorienziel-Berechnung |
| `js/features/calories.test.js` | Unit Tests für Kalorienlogik |
| `js/features/checkin.js` | `checkinMixin()` — Tägliches Check-In, Streaks, Statistiken |
| `js/features/checkin.test.js` | Unit Tests für Check-In-Logik |

### Modifizierte Dateien
| Datei | Änderungen |
|---|---|
| `js/utils/constants.js` | Aktivitätsfaktoren, Standard-Checkliste, Kalorien-Konstanten, deutsche Wochentage |
| `js/store/supabase.js` | Neue Check-In-Funktionen, erweiterte Settings-Mappings |
| `js/store/settings.js` | Neue Profil-Felder (gender, activityLevel, weeklyGoalRate, checklistItems) |
| `js/main.js` | Neue Mixin-Imports, 4-Tab Navigation, Calorie/Checkin Getters |
| `index.html` | 4-Tab Bottom Nav, Plan-Tab, Habits-Tab, Redesign aller Sektionen |
| `templates/modals/profile.html` | Neue Felder: Geschlecht, Aktivitätsniveau, Wöchentliches Ziel |
| `css/styles.css` | Apple-Design-Tokens, neue Komponenten, Bottom Tab Bar |

---

## Task 1: Konstanten & Kalorien-Hilfswerte

**Files:**
- Modify: `js/utils/constants.js`
- Test: `js/features/calories.test.js` (erstellen)

- [ ] **Step 1: Erweiterte Konstanten schreiben**

```javascript
// js/utils/constants.js — KOMPLETT ERSETZEN

export const DEFAULT_PROFILE = {
    startWeight: 0,
    goalWeight: 0,
    userHeight: 0,
    userAge: 0,
    gender: null,
    activityLevel: 'moderately_active',
    weeklyGoalRate: 0,
    checklistItems: [
        { key: 'training', label: 'Training absolviert' },
        { key: 'steps', label: 'Schritte-Ziel erreicht' },
        { key: 'calories', label: 'Kalorien im Ziel' },
        { key: 'water', label: 'Genug getrunken' },
        { key: 'sleep', label: '7+ Stunden Schlaf' }
    ]
};

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const ACTIVITY_LEVELS = {
    sedentary:         { factor: 1.2,   label: 'Sitzend',      description: 'Wenig oder keine Bewegung' },
    lightly_active:    { factor: 1.375, label: 'Leicht aktiv',  description: 'Sport 1-3×/Woche' },
    moderately_active: { factor: 1.55,  label: 'Mäßig aktiv',   description: 'Sport 3-5×/Woche' },
    very_active:       { factor: 1.725, label: 'Sehr aktiv',    description: 'Sport 6-7×/Woche' },
    extra_active:      { factor: 1.9,   label: 'Extrem aktiv',  description: 'Sehr intensiv, körperliche Arbeit' }
};

export const CALORIE_CONSTANTS = {
    KCAL_PER_KG_FAT: 7700,
    MIN_CALORIES_MALE: 1500,
    MIN_CALORIES_FEMALE: 1200,
    MAX_WEEKLY_LOSS: -1.0,
    MAX_WEEKLY_GAIN: 1.0
};
```

- [ ] **Step 2: Failing Test für BMR-Berechnung schreiben**

```javascript
// js/features/calories.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
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
        // Mifflin-St Jeor: 10 × 80 + 6.25 × 180 - 5 × 30 - 5 = 800 + 1125 - 150 - 5 = 1770
        expect(m.calculateBMR(80, 180, 30, 'male')).toBe(1770);
    });

    it('berechnet BMR korrekt für Frauen', () => {
        const m = createMixin();
        // 10 × 65 + 6.25 × 165 - 5 × 28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25
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
        // 1770 × 1.55 = 2743.5
        expect(m.calculateTDEE(1770, 'moderately_active')).toBeCloseTo(2743.5);
    });

    it('nutzt Standardfaktor bei unbekanntem Level', () => {
        const m = createMixin();
        // Fallback zu moderately_active (1.55)
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
        // 7-Tage-Schnitt ≈ 79.96 kg
        // BMR = 10 × 79.96 + 6.25 × 180 - 5 × 30 - 5 = 1769.6
        // TDEE = 1769.6 × 1.55 ≈ 2742.88
        // Adjustment = -0.5 × 7700/7 = -550
        // Target ≈ 2742.88 - 550 ≈ 2193
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
        // BMR = 10×60 + 6.25×180 - 5×30 - 5 = 600+1125-150-5 = 1570
        // TDEE = 1570 × 1.2 = 1884
        // Adjustment = -1.0 × 1100 = -1100
        // Raw = 1884 - 1100 = 784 → clamped to 1500
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
        // TDEE = BMR × 1.55
        expect(m.calorieData.target).toBeCloseTo(m.calorieData.tdee);
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
        // 7-Tage-Schnitt der letzten 7: (81+80+81+80+81+80+79)/7 ≈ 80.29
        // Nicht 79 (letzter Eintrag)
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
        // 5 kg ÷ 0.5 kg/Woche = 10 Wochen ≈ 70 Tage
        expect(date).toBeDefined();
        const projected = new Date(date);
        const now = new Date('2026-03-26');
        const diffDays = (projected - now) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(60);
        expect(diffDays).toBeLessThan(80);
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
```

- [ ] **Step 3: Tests ausführen — sicherstellen, dass sie fehlschlagen**

Run: `npx vitest run js/features/calories.test.js`
Expected: FAIL — `caloriesMixin` existiert noch nicht

- [ ] **Step 4: `calories.js` Mixin implementieren**

```javascript
// js/features/calories.js
import { ACTIVITY_LEVELS, CALORIE_CONSTANTS } from '../utils/constants.js';

export const caloriesMixin = () => ({
    calorieData: {
        bmr: 0,
        tdee: 0,
        adjustment: 0,
        target: 0,
        isClamped: false,
        mode: 'maintenance'
    },

    calculateBMR(weight, height, age, gender) {
        if (!weight || !height || !age || !gender) return 0;
        if (gender === 'male') {
            return 10 * weight + 6.25 * height - 5 * age - 5;
        }
        return 10 * weight + 6.25 * height - 5 * age - 161;
    },

    calculateTDEE(bmr, activityLevel) {
        const level = ACTIVITY_LEVELS[activityLevel] || ACTIVITY_LEVELS.moderately_active;
        return bmr * level.factor;
    },

    get7DayAverageWeight() {
        if (this.history.length === 0) return this.startWeight || 0;
        const sorted = [...this.history].sort((a, b) => a.date.localeCompare(b.date));
        const last7 = sorted.slice(-7);
        return last7.reduce((sum, e) => sum + e.weight, 0) / last7.length;
    },

    calculateCalorieTarget() {
        const weight = this.get7DayAverageWeight();
        const height = this.userHeight;
        const age = this.userAge;
        const gender = this.gender;

        const bmr = this.calculateBMR(weight, height, age, gender);
        const tdee = this.calculateTDEE(bmr, this.activityLevel);
        const rate = this.weeklyGoalRate || 0;
        const adjustment = rate * (CALORIE_CONSTANTS.KCAL_PER_KG_FAT / 7);

        let target = Math.round(tdee + adjustment);
        let isClamped = false;

        const minCal = gender === 'female'
            ? CALORIE_CONSTANTS.MIN_CALORIES_FEMALE
            : CALORIE_CONSTANTS.MIN_CALORIES_MALE;

        if (target < minCal) {
            target = minCal;
            isClamped = true;
        }

        let mode = 'maintenance';
        if (rate < 0) mode = 'deficit';
        else if (rate > 0) mode = 'surplus';

        this.calorieData = { bmr, tdee, adjustment: Math.round(adjustment), target, isClamped, mode };
    },

    recalculateCalories() {
        if (this.gender && this.userHeight && this.userAge) {
            this.calculateCalorieTarget();
        }
    },

    getWeeklyComparison() {
        const now = new Date();
        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        thisMonday.setHours(0, 0, 0, 0);
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(lastMonday.getDate() - 7);

        const thisWeek = this.history.filter(h => new Date(h.date) >= thisMonday);
        const lastWeek = this.history.filter(h => {
            const d = new Date(h.date);
            return d >= lastMonday && d < thisMonday;
        });

        const avg = arr => arr.length ? arr.reduce((s, e) => s + e.weight, 0) / arr.length : null;
        const thisAvg = avg(thisWeek);
        const lastAvg = avg(lastWeek);

        return {
            planned: this.weeklyGoalRate || 0,
            actual: (thisAvg !== null && lastAvg !== null) ? Math.round((thisAvg - lastAvg) * 10) / 10 : null,
            thisWeekAvg: thisAvg,
            lastWeekAvg: lastAvg
        };
    },

    getProjectedGoalDate() {
        const rate = this.weeklyGoalRate;
        if (!rate || rate === 0) return null;

        const currentWeight = this.get7DayAverageWeight();
        const diff = this.goalWeight - currentWeight;

        // Ziel bereits erreicht
        if ((rate < 0 && diff >= 0) || (rate > 0 && diff <= 0)) return null;

        const weeksNeeded = Math.abs(diff / rate);
        const daysNeeded = Math.round(weeksNeeded * 7);
        const projected = new Date();
        projected.setDate(projected.getDate() + daysNeeded);
        return projected.toISOString().split('T')[0];
    }
});
```

- [ ] **Step 5: Tests ausführen — sicherstellen, dass sie bestehen**

Run: `npx vitest run js/features/calories.test.js`
Expected: PASS — alle Tests grün

- [ ] **Step 6: Commit**

```bash
git add js/utils/constants.js js/features/calories.js js/features/calories.test.js
git commit -m "feat: Kalorienberechnung (BMR/TDEE) mit Tests

Mifflin-St Jeor Formel, Aktivitätsfaktoren, Sicherheits-Floor,
7-Tage-Durchschnitt, Wochenvergleich, Zieldatum-Projektion.
Deutsche Wochentage und Konstanten.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Check-In Mixin

**Files:**
- Create: `js/features/checkin.js`
- Create: `js/features/checkin.test.js`

- [ ] **Step 1: Failing Tests für Check-In-Logik schreiben**

```javascript
// js/features/checkin.test.js
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
    it('toggled ein Item', () => {
        const m = createMixin();
        m.initTodayCheckin();
        m.toggleCheckinItem('training');
        expect(m.todayCheckin.find(i => i.key === 'training').checked).toBe(true);
    });

    it('toggled zurück auf unchecked', () => {
        const m = createMixin();
        m.initTodayCheckin();
        m.toggleCheckinItem('training');
        m.toggleCheckinItem('training');
        expect(m.todayCheckin.find(i => i.key === 'training').checked).toBe(false);
    });
});

describe('checkinCompletedCount', () => {
    it('zählt erledigte Items', () => {
        const m = createMixin();
        m.initTodayCheckin();
        m.toggleCheckinItem('training');
        m.toggleCheckinItem('water');
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
        expect(stats.activeDays).toBe(2); // 2 Tage mit ≥1 Check
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
```

- [ ] **Step 2: Tests ausführen — sicherstellen, dass sie fehlschlagen**

Run: `npx vitest run js/features/checkin.test.js`
Expected: FAIL — `checkinMixin` existiert noch nicht

- [ ] **Step 3: `checkin.js` Mixin implementieren**

```javascript
// js/features/checkin.js
import * as Supa from '../store/supabase.js';
import { getLocalDateString } from '../utils/formatting.js';
import { DEFAULT_PROFILE } from '../utils/constants.js';

export const checkinMixin = () => ({
    todayCheckin: [],
    checkinHistory: [],
    checkinStreak: 0,
    checkinBestStreak: 0,
    checkinMonthlyRate: 0,
    checkinActiveDays: 0,
    checkinWeekData: [],
    checkinEditMode: false,
    newCheckinLabel: '',

    initTodayCheckin() {
        const items = this.checklistItems || DEFAULT_PROFILE.checklistItems;
        this.todayCheckin = items.map(item => ({
            key: item.key,
            label: item.label,
            checked: false
        }));
    },

    async loadCheckins() {
        try {
            const today = getLocalDateString();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

            const data = await Supa.getCheckins(fromDate, today);
            this.checkinHistory = data || [];

            // Heutigen Checkin laden oder erstellen
            const todayEntry = this.checkinHistory.find(c => c.date === today);
            if (todayEntry) {
                // Merge mit aktuellen checklistItems (neue Items hinzufügen, gelöschte behalten in History)
                const items = this.checklistItems || DEFAULT_PROFILE.checklistItems;
                this.todayCheckin = items.map(item => {
                    const existing = todayEntry.items.find(i => i.key === item.key);
                    return {
                        key: item.key,
                        label: item.label,
                        checked: existing ? existing.checked : false
                    };
                });
            } else {
                this.initTodayCheckin();
            }

            this.checkinStreak = this.calculateCheckinStreak();
            const stats = this.calculateCheckinStats();
            this.checkinBestStreak = stats.bestStreak;
            this.checkinMonthlyRate = stats.completionRate;
            this.checkinActiveDays = stats.activeDays;
            this.checkinWeekData = this.getCheckinWeekData();
        } catch (e) {
            console.error('Failed to load checkins:', e);
            this.initTodayCheckin();
        }
    },

    async toggleCheckinItem(key) {
        const item = this.todayCheckin.find(i => i.key === key);
        if (!item) return;
        item.checked = !item.checked;

        // Sofort in Supabase speichern
        try {
            const today = getLocalDateString();
            await Supa.upsertCheckin(today, this.todayCheckin);

            // Stats aktualisieren
            const todayIdx = this.checkinHistory.findIndex(c => c.date === today);
            if (todayIdx >= 0) {
                this.checkinHistory[todayIdx].items = [...this.todayCheckin];
            } else {
                this.checkinHistory.unshift({ date: today, items: [...this.todayCheckin] });
            }
            this.checkinStreak = this.calculateCheckinStreak();
            this.checkinWeekData = this.getCheckinWeekData();
        } catch (e) {
            console.error('Failed to save checkin:', e);
            item.checked = !item.checked; // Rollback
        }
    },

    getCheckinCompletedCount() {
        return this.todayCheckin.filter(i => i.checked).length;
    },

    calculateCheckinStreak() {
        if (this.checkinHistory.length === 0) return 0;

        const today = getLocalDateString();
        const activeDates = this.checkinHistory
            .filter(c => c.items && c.items.some(i => i.checked))
            .map(c => c.date)
            .sort()
            .reverse();

        if (activeDates.length === 0) return 0;

        // Prüfe ob heute oder gestern aktiv
        const lastDate = activeDates[0];
        const diffFromToday = Math.round(
            (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
        );
        if (diffFromToday > 1) return 0;

        let streak = 1;
        for (let i = 0; i < activeDates.length - 1; i++) {
            const curr = new Date(activeDates[i]);
            const prev = new Date(activeDates[i + 1]);
            const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
            if (diff === 1) streak++;
            else break;
        }
        return streak;
    },

    calculateCheckinStats() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthStr = monthStart.toISOString().split('T')[0];

        const monthEntries = this.checkinHistory.filter(c => c.date >= monthStr);

        let activeDays = 0;
        let totalChecked = 0;
        let totalItems = 0;

        for (const entry of monthEntries) {
            const checked = entry.items.filter(i => i.checked).length;
            if (checked > 0) activeDays++;
            totalChecked += checked;
            totalItems += entry.items.length;
        }

        const completionRate = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

        // Beste Serie berechnen
        const allDates = this.checkinHistory
            .filter(c => c.items && c.items.some(i => i.checked))
            .map(c => c.date)
            .sort();

        let bestStreak = 0;
        let currentStreak = 1;
        for (let i = 1; i < allDates.length; i++) {
            const diff = Math.round(
                (new Date(allDates[i]) - new Date(allDates[i - 1])) / (1000 * 60 * 60 * 24)
            );
            if (diff === 1) currentStreak++;
            else {
                bestStreak = Math.max(bestStreak, currentStreak);
                currentStreak = 1;
            }
        }
        bestStreak = Math.max(bestStreak, currentStreak);
        if (allDates.length === 0) bestStreak = 0;

        return { activeDays, completionRate, bestStreak };
    },

    getCheckinWeekData() {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);

        const totalItems = (this.checklistItems || DEFAULT_PROFILE.checklistItems).length;
        const week = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const entry = this.checkinHistory.find(c => c.date === dateStr);
            const checked = entry ? entry.items.filter(i => i.checked).length : 0;
            week.push({ date: dateStr, total: totalItems, checked });
        }
        return week;
    },

    addCheckinItem(label) {
        if (!label || !label.trim()) return;
        const key = 'custom_' + Date.now();
        this.checklistItems.push({ key, label: label.trim() });
        this.todayCheckin.push({ key, label: label.trim(), checked: false });
        this.newCheckinLabel = '';
    },

    removeCheckinItem(key) {
        this.checklistItems = this.checklistItems.filter(i => i.key !== key);
        this.todayCheckin = this.todayCheckin.filter(i => i.key !== key);
    }
});
```

- [ ] **Step 4: Tests ausführen — sicherstellen, dass sie bestehen**

Run: `npx vitest run js/features/checkin.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/features/checkin.js js/features/checkin.test.js
git commit -m "feat: Check-In Mixin mit Streak-Berechnung und Tests

Tägliche Checkliste, Toggle mit Supabase-Persistenz,
Streak-Berechnung, Monatsstatistiken, Wochenübersicht,
benutzerdefinierte Items hinzufügen/entfernen.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Supabase-Erweiterungen

**Files:**
- Modify: `js/store/supabase.js:55-85`

- [ ] **Step 1: Check-In Funktionen und erweiterte Settings-Mappings hinzufügen**

Am Ende von `js/store/supabase.js` (nach `clearAllWorkoutLogs`):

```javascript
// ── Daily Check-Ins ─────────────────────────────────────

export async function getCheckins(fromDate, toDate) {
    const { data, error } = await requireDb()
        .from('daily_checkins')
        .select('date, items')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function upsertCheckin(date, items) {
    const { error } = await requireDb()
        .from('daily_checkins')
        .upsert({ date, items }, { onConflict: 'date' });
    if (error) throw error;
}

export async function deleteCheckin(date) {
    const { error } = await requireDb()
        .from('daily_checkins')
        .delete()
        .eq('date', date);
    if (error) throw error;
}

export async function clearAllCheckins() {
    const { error } = await requireDb()
        .from('daily_checkins')
        .delete()
        .gte('id', 0);
    if (error) throw error;
}
```

- [ ] **Step 2: `saveSettings` erweitern für neue Felder**

In `js/store/supabase.js`, die `saveSettings` Funktion erweitern:

```javascript
export async function saveSettings(profile) {
    const row = {
        id: 1,
        start_weight: profile.startWeight,
        goal_weight: profile.goalWeight,
        user_height: profile.userHeight,
        user_age: profile.userAge
    };
    if (profile.goalDate !== undefined) {
        row.goal_date = profile.goalDate || null;
    }
    if (profile.gender !== undefined) {
        row.gender = profile.gender;
    }
    if (profile.activityLevel !== undefined) {
        row.activity_level = profile.activityLevel;
    }
    if (profile.weeklyGoalRate !== undefined) {
        row.weekly_goal_rate = profile.weeklyGoalRate;
    }
    if (profile.checklistItems !== undefined) {
        row.checklist_items = profile.checklistItems;
    }
    const { error } = await requireDb()
        .from('settings')
        .upsert(row);
    if (error) throw error;
}
```

- [ ] **Step 3: Bestehende Tests ausführen**

Run: `npx vitest run`
Expected: Alle bestehenden Tests bestehen weiterhin

- [ ] **Step 4: Commit**

```bash
git add js/store/supabase.js
git commit -m "feat: Supabase Check-In CRUD und erweiterte Settings

Neue Funktionen: getCheckins, upsertCheckin, deleteCheckin, clearAllCheckins.
saveSettings unterstützt jetzt gender, activity_level, weekly_goal_rate, checklist_items.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Settings-Mixin & Profil-Modal Erweiterung

**Files:**
- Modify: `js/store/settings.js`
- Modify: `templates/modals/profile.html`

- [ ] **Step 1: Settings-Mixin um neue Felder erweitern**

`js/store/settings.js` komplett ersetzen:

```javascript
import { DEFAULT_PROFILE } from '../utils/constants.js';
import * as Supa from './supabase.js';

export const settingsMixin = () => ({
    settingsOpen: false,
    bmiDetailOpen: false,

    openBmiDetail() { this.bmiDetailOpen = true; },
    closeBmiDetail() { this.bmiDetailOpen = false; },

    profileOpen: false,
    profileForm: { ...DEFAULT_PROFILE },
    profileDirty: false,

    async saveSettings() {
        try {
            await Supa.saveSettings({
                startWeight: this.startWeight,
                goalWeight: this.goalWeight,
                goalDate: this.goalDate,
                userHeight: this.userHeight,
                userAge: this.userAge,
                gender: this.gender,
                activityLevel: this.activityLevel,
                weeklyGoalRate: this.weeklyGoalRate,
                checklistItems: this.checklistItems
            });
        } catch (e) {
            console.error('Einstellungen konnten nicht gespeichert werden:', e);
            this.showToast('Fehler beim Speichern');
        }
    },

    openSettings() { this.settingsOpen = true; },
    closeSettings() { this.settingsOpen = false; },

    openProfile() {
        this.profileForm = {
            startWeight: this.startWeight,
            goalWeight: this.goalWeight,
            goalDate: this.goalDate || '',
            userHeight: this.userHeight,
            userAge: this.userAge,
            gender: this.gender || '',
            activityLevel: this.activityLevel || 'moderately_active',
            weeklyGoalRate: this.weeklyGoalRate || 0
        };
        this.profileDirty = false;
        this.profileOpen = true;
    },

    closeProfile(force) {
        if (this.profileDirty && !force) {
            this.confirmModal = {
                show: true,
                title: 'Ungespeicherte Änderungen',
                message: 'Änderungen am Profil verwerfen?',
                confirmLabel: 'Verwerfen',
                onConfirm: () => { this.profileOpen = false; }
            };
            return;
        }
        this.profileOpen = false;
    },

    async applyProfile() {
        const f = this.profileForm;
        const safeFloat = (val) => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
            return parseFloat(val);
        };

        const newStart = safeFloat(f.startWeight);
        const newGoal = safeFloat(f.goalWeight);
        const newHeight = parseInt(f.userHeight);

        if (!newStart || newStart <= 0 || !newGoal || newGoal <= 0 || !newHeight || newHeight <= 0) {
            this.showToast('Fehler: Bitte Größe und Gewicht korrekt ausfüllen');
            return;
        }

        this.startWeight = newStart;
        this.goalWeight = newGoal;
        this.goalDate = f.goalDate || null;
        this.userHeight = newHeight;
        this.userAge = parseInt(f.userAge) || 0;
        this.gender = f.gender || null;
        this.activityLevel = f.activityLevel || 'moderately_active';
        this.weeklyGoalRate = safeFloat(f.weeklyGoalRate);

        await this.saveSettings();
        this.recalculateCalories();

        this.refreshAnimations();
        this.profileDirty = false;
        this.profileOpen = false;

        this.$nextTick(() => {
            this.updateChart();
            this.showToast('Profil gespeichert');
        });
    },

    markProfileDirty() { this.profileDirty = true; }
});
```

- [ ] **Step 2: Profil-Modal Template erweitern**

`templates/modals/profile.html` komplett ersetzen:

```html
<!-- Profil-Einstellungen Modal -->
<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-mobile-sheet"
     :class="profileOpen ? 'pointer-events-auto' : 'pointer-events-none'"
     role="dialog" aria-modal="true" aria-label="Profil-Einstellungen">

    <div class="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl"
         x-show="profileOpen"
         x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
         x-transition:leave="transition ease-in duration-200" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
         @click="closeProfile()"></div>

    <div class="bg-surface border border-white/10 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
         x-show="profileOpen"
         x-swipe-dismiss="closeProfile()"
         x-transition:enter="transition ease-out duration-400" x-transition:enter-start="translate-y-12 opacity-0 scale-90" x-transition:enter-end="translate-y-0 opacity-100 scale-100"
         x-transition:leave="transition ease-in duration-200" x-transition:leave-start="translate-y-0 opacity-100 scale-100" x-transition:leave-end="translate-y-12 opacity-0 scale-90">

        <div class="flex justify-center pt-3 pb-1 md:hidden"><div class="w-10 h-1 rounded-full bg-white/15"></div></div>

        <div class="p-6 border-b border-white/5 flex justify-between items-center bg-surface z-20 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/60 border border-white/5">
                    <i class="ph ph-user text-lg"></i>
                </div>
                <h2 class="text-lg font-bold text-white">Profil</h2>
            </div>
            <button type="button" @click="closeProfile()" class="text-muted hover:text-white transition-colors p-2 -mr-2 hover:bg-white/5 rounded-xl">
                <i class="ph ph-x text-lg"></i>
            </button>
        </div>

        <div class="overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <!-- Geschlecht -->
            <div class="space-y-2">
                <label class="text-[10px] text-muted uppercase font-bold">Geschlecht</label>
                <div class="flex gap-2">
                    <button type="button" @click="profileForm.gender = 'male'; markProfileDirty()"
                            :class="profileForm.gender === 'male' ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'"
                            class="flex-1 py-3 rounded-xl font-bold text-xs transition-all active:scale-[0.97]">
                        Männlich
                    </button>
                    <button type="button" @click="profileForm.gender = 'female'; markProfileDirty()"
                            :class="profileForm.gender === 'female' ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/5'"
                            class="flex-1 py-3 rounded-xl font-bold text-xs transition-all active:scale-[0.97]">
                        Weiblich
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="text-[10px] text-muted uppercase font-bold">Startgewicht</label>
                    <div class="relative">
                        <input type="number" step="0.1" x-model="profileForm.startWeight" @input="markProfileDirty()" class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-white/20 outline-none transition-colors placeholder-white/10">
                        <span class="absolute right-4 top-3.5 text-xs text-muted">kg</span>
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] text-muted uppercase font-bold">Zielgewicht</label>
                    <div class="relative">
                        <input type="number" step="0.1" x-model="profileForm.goalWeight" @input="markProfileDirty()" class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-white/20 outline-none transition-colors placeholder-white/10">
                        <span class="absolute right-4 top-3.5 text-xs text-muted">kg</span>
                    </div>
                </div>
                <div class="space-y-2 col-span-2">
                    <label class="text-[10px] text-muted uppercase font-bold">Zieldatum</label>
                    <input type="date" x-model="profileForm.goalDate" @input="markProfileDirty()" class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-white/20 outline-none transition-colors placeholder-white/10">
                    <p class="text-[10px] text-muted">Zeigt eine Ziellinie im Diagramm</p>
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] text-muted uppercase font-bold">Größe</label>
                    <div class="relative">
                        <input type="number" x-model="profileForm.userHeight" @input="markProfileDirty()" class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-white/20 outline-none transition-colors placeholder-white/10">
                        <span class="absolute right-4 top-3.5 text-xs text-muted">cm</span>
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] text-muted uppercase font-bold">Alter</label>
                    <input type="number" x-model="profileForm.userAge" @input="markProfileDirty()" class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-white/20 outline-none transition-colors placeholder-white/10">
                </div>
            </div>

            <!-- Aktivitätsniveau -->
            <div class="space-y-2">
                <label class="text-[10px] text-muted uppercase font-bold">Aktivitätsniveau</label>
                <select x-model="profileForm.activityLevel" @change="markProfileDirty()"
                        class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-white/20 outline-none transition-colors appearance-none">
                    <option value="sedentary">Sitzend — Wenig Bewegung</option>
                    <option value="lightly_active">Leicht aktiv — 1-3×/Woche</option>
                    <option value="moderately_active">Mäßig aktiv — 3-5×/Woche</option>
                    <option value="very_active">Sehr aktiv — 6-7×/Woche</option>
                    <option value="extra_active">Extrem aktiv — Sehr intensiv</option>
                </select>
            </div>

            <!-- Wöchentliches Ziel -->
            <div class="space-y-2">
                <label class="text-[10px] text-muted uppercase font-bold">Wöchentliches Ziel</label>
                <div class="flex items-center gap-3">
                    <input type="range" min="-1.0" max="1.0" step="0.1"
                           x-model.number="profileForm.weeklyGoalRate" @input="markProfileDirty()"
                           class="flex-1 accent-white">
                    <span class="text-sm font-bold text-white min-w-[80px] text-right"
                          x-text="(profileForm.weeklyGoalRate > 0 ? '+' : '') + Number(profileForm.weeklyGoalRate).toFixed(1) + ' kg/W'"></span>
                </div>
                <p class="text-[10px] text-muted"
                   x-text="profileForm.weeklyGoalRate < 0 ? 'Abnehmen: ' + Math.abs(profileForm.weeklyGoalRate).toFixed(1) + ' kg pro Woche' : profileForm.weeklyGoalRate > 0 ? 'Zunehmen: ' + profileForm.weeklyGoalRate.toFixed(1) + ' kg pro Woche' : 'Gewicht halten'"></p>
            </div>
        </div>

        <div class="p-6 border-t border-white/5 bg-surface z-20 flex gap-3 shrink-0">
            <button type="button" @click="closeProfile()" class="flex-1 py-3.5 rounded-xl border border-white/5 text-muted font-bold text-xs hover:bg-white/5 active:scale-[0.97] transition-all">
                Abbrechen
            </button>
            <button type="button" @click="applyProfile()" class="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-gray-200 active:scale-[0.97] transition-all shadow-lg shadow-white/5">
                Speichern
            </button>
        </div>
    </div>
</div>
```

- [ ] **Step 3: Tests ausführen**

Run: `npx vitest run`
Expected: Alle Tests bestehen

- [ ] **Step 4: Commit**

```bash
git add js/store/settings.js templates/modals/profile.html
git commit -m "feat: Profil-Modal um Geschlecht, Aktivität, Wochenziel erweitert

Segmented Control für Geschlecht, Dropdown für Aktivitätsniveau,
Range-Slider für wöchentliches Ziel. Deutsche Labels.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Main.js Integration — Neue Mixins & 4-Tab Navigation

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Neue Imports und Mixin-Spread hinzufügen**

Am Anfang von `js/main.js`, nach den bestehenden Imports (Zeile 11):

```javascript
import { caloriesMixin } from './features/calories.js';
import { checkinMixin } from './features/checkin.js';
```

- [ ] **Step 2: Neue State-Felder in der app() Funktion hinzufügen**

Nach `userAge` (Zeile 59), neue Felder:

```javascript
        gender: null,
        activityLevel: 'moderately_active',
        weeklyGoalRate: 0,
        checklistItems: [...DEFAULT_PROFILE.checklistItems],
```

- [ ] **Step 3: Neue Mixins spreaden**

Nach `...restTimerMixin(),` (Zeile 126):

```javascript
        ...caloriesMixin(),
        ...checkinMixin(),
```

- [ ] **Step 4: initApp() erweitern — neue Settings laden + Checkins laden**

Im `if (settings)` Block (nach Zeile 253), neue Felder laden:

```javascript
                    this.gender = settings.gender || null;
                    this.activityLevel = settings.activity_level || 'moderately_active';
                    this.weeklyGoalRate = settings.weekly_goal_rate != null ? Number(settings.weekly_goal_rate) : 0;
                    this.checklistItems = settings.checklist_items || [...DEFAULT_PROFILE.checklistItems];
```

Nach dem try/catch Block (nach Zeile 273), Kalorien und Checkins laden:

```javascript
            // Kalorien berechnen
            this.recalculateCalories();

            // Checkins laden
            await this.loadCheckins();
```

- [ ] **Step 5: refreshDashboard() erweitern**

Im `if (settings)` Block von `refreshDashboard()` (nach Zeile 410), die gleichen neuen Felder laden:

```javascript
                    this.gender = settings.gender || null;
                    this.activityLevel = settings.activity_level || 'moderately_active';
                    this.weeklyGoalRate = settings.weekly_goal_rate != null ? Number(settings.weekly_goal_rate) : 0;
                    this.checklistItems = settings.checklist_items || [...DEFAULT_PROFILE.checklistItems];
```

Und nach `this.workoutHistoryLoaded = true;`:

```javascript
                this.recalculateCalories();
                await this.loadCheckins();
```

- [ ] **Step 6: addEntry() und quickLogSave() erweitern — Kalorien neu berechnen**

In `addEntry()`, nach dem `hapticSuccess()` (Zeile 459):

```javascript
                this.recalculateCalories();
```

In `quickLogSave()`, nach dem `hapticSuccess()` (Zeile 527):

```javascript
                this.recalculateCalories();
```

- [ ] **Step 7: resetData() erweitern — neue Felder zurücksetzen**

Im `resetData()` onConfirm Callback, nach `this.workoutHistory = [];` (Zeile 613):

```javascript
                    this.gender = null;
                    this.activityLevel = 'moderately_active';
                    this.weeklyGoalRate = 0;
                    this.checklistItems = [...DEFAULT_PROFILE.checklistItems];
                    this.calorieData = { bmr: 0, tdee: 0, adjustment: 0, target: 0, isClamped: false, mode: 'maintenance' };
                    this.todayCheckin = [];
                    this.checkinHistory = [];
                    this.checkinStreak = 0;
```

Und im `Promise.all`, `Supa.clearAllCheckins()` hinzufügen:

```javascript
                        await Promise.all([
                            Supa.clearAllWeightEntries(),
                            Supa.saveSettings({
                                startWeight: 0, goalWeight: 0, goalDate: null,
                                userHeight: 0, userAge: 0,
                                gender: null, activityLevel: 'moderately_active',
                                weeklyGoalRate: 0, checklistItems: DEFAULT_PROFILE.checklistItems
                            }),
                            Supa.saveTrainingPlan(Array.from({ length: 7 }, () => [])),
                            Supa.clearAllWorkoutLogs(),
                            Supa.clearAllCheckins()
                        ]);
```

- [ ] **Step 8: Deutsche Texte in bestehenden UI-Strings**

Alle englischen Strings in `main.js` auf Deutsch ändern:

- `'Failed to load data — check your connection'` → `'Daten konnten nicht geladen werden — Verbindung prüfen'`
- `'Dashboard refreshed'` → `'Dashboard aktualisiert'`
- `'Failed to refresh'` → `'Aktualisierung fehlgeschlagen'`
- `' kg saved'` → `' kg gespeichert'`
- `'Failed to save'` → `'Fehler beim Speichern'`
- `'Failed to save entry:'` → (console.error, kann englisch bleiben)
- `'Entry deleted'` → `'Eintrag gelöscht'`
- `'All entries deleted'` → `'Alle Einträge gelöscht'`
- `'Delete all entries'` → `'Alle Einträge löschen'`
- `'Delete all '` → `'Alle '`
- `' weight entries?'` → `' Gewichtseinträge löschen?'`
- `'Full Reset'` → `'Vollständiger Reset'`
- `'Delete all data including settings and training?'` → `'Alle Daten inklusive Einstellungen und Training löschen?'`
- `'All data deleted'` → `'Alle Daten gelöscht'`
- `'Profile saved'` → `'Profil gespeichert'`
- `'Workout saved!'` → `'Training gespeichert!'`

- [ ] **Step 9: Tests ausführen**

Run: `npx vitest run`
Expected: Alle Tests bestehen

- [ ] **Step 10: Commit**

```bash
git add js/main.js
git commit -m "feat: Kalorien- und Check-In-Mixins in main.js integriert

4-Tab Navigation vorbereitet, neue Settings-Felder laden,
Kalorien-Neuberechnung bei Gewichtseintrag, deutsche UI-Texte.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: HTML — Plan-Tab, Habits-Tab & Bottom Navigation

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Tab Navigation zu Bottom Tab Bar umbauen**

Die bestehende Tab-Leiste (ca. Zeile 116-130 in index.html) durch eine Bottom Tab Bar ersetzen. Die alte Tab-Leiste im Header entfernen und am Ende von `<main>` vor `</main>` die neue Bottom Nav einfügen:

```html
<!-- Bottom Tab Bar -->
<nav class="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
     style="background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid rgba(0,0,0,0.06);">
    <div class="flex justify-around items-center max-w-lg mx-auto px-2 py-1">
        <button @click="switchTab('health')" class="flex flex-col items-center py-2 px-3 min-w-[64px] transition-all duration-200"
                :class="activeTab === 'health' ? 'text-emerald-500' : 'text-gray-400'">
            <i class="ph" :class="activeTab === 'health' ? 'ph-fill ph-heart' : 'ph ph-heart'" class="text-xl"></i>
            <span class="text-[10px] font-semibold mt-0.5">Gesundheit</span>
        </button>
        <button @click="switchTab('training')" class="flex flex-col items-center py-2 px-3 min-w-[64px] transition-all duration-200"
                :class="activeTab === 'training' ? 'text-blue-500' : 'text-gray-400'">
            <i class="ph" :class="activeTab === 'training' ? 'ph-fill ph-barbell' : 'ph ph-barbell'" class="text-xl"></i>
            <span class="text-[10px] font-semibold mt-0.5">Training</span>
        </button>
        <button @click="switchTab('plan')" class="flex flex-col items-center py-2 px-3 min-w-[64px] transition-all duration-200"
                :class="activeTab === 'plan' ? 'text-emerald-500' : 'text-gray-400'">
            <i class="ph" :class="activeTab === 'plan' ? 'ph-fill ph-flame' : 'ph ph-flame'" class="text-xl"></i>
            <span class="text-[10px] font-semibold mt-0.5">Plan</span>
        </button>
        <button @click="switchTab('habits')" class="flex flex-col items-center py-2 px-3 min-w-[64px] transition-all duration-200"
                :class="activeTab === 'habits' ? 'text-amber-500' : 'text-gray-400'">
            <i class="ph" :class="activeTab === 'habits' ? 'ph-fill ph-check-square' : 'ph ph-check-square'" class="text-xl"></i>
            <span class="text-[10px] font-semibold mt-0.5">Gewohnheiten</span>
        </button>
    </div>
</nav>
```

Auch: `<main>` braucht padding-bottom für die Tab Bar: `class="... pb-20"`.

Dark Mode CSS für die Tab Bar (in styles.css):

```css
@media (prefers-color-scheme: dark) {
    nav.fixed.bottom-0 {
        background: rgba(28, 28, 30, 0.85) !important;
        border-top-color: rgba(255, 255, 255, 0.06) !important;
    }
}
```

- [ ] **Step 2: Plan-Tab HTML einfügen**

Nach dem Training-Tab Template, neuen Plan-Tab hinzufügen:

```html
<!-- Plan Tab -->
<template x-if="activeTab === 'plan'">
    <div class="space-y-3 animate-fade-in">
        <!-- Leerer Zustand: Profil nicht vollständig -->
        <template x-if="!gender || !userHeight || !userAge">
            <div class="bento-card p-8 text-center">
                <i class="ph ph-user-circle text-4xl text-muted mb-3"></i>
                <p class="text-white font-bold mb-2">Profil vervollständigen</p>
                <p class="text-muted text-sm mb-4">Für die Kalorienberechnung werden Geschlecht, Größe und Alter benötigt.</p>
                <button @click="openProfile()" class="px-6 py-3 rounded-xl bg-white text-black font-bold text-xs active:scale-[0.97] transition-all">
                    Profil öffnen
                </button>
            </div>
        </template>

        <!-- Kalorien-Dashboard (wenn Profil vollständig) -->
        <template x-if="gender && userHeight && userAge">
            <div class="space-y-3">
                <!-- Kalorien-Hero -->
                <div class="bento-card p-6 text-center">
                    <p class="text-[10px] text-emerald-400 uppercase font-bold tracking-widest mb-1">Tägliches Ziel</p>
                    <p class="text-5xl font-extrabold text-white leading-none" x-text="calorieData.target.toLocaleString('de-DE')"></p>
                    <p class="text-muted text-sm mt-1">kcal</p>
                    <div class="inline-block mt-3 px-4 py-1.5 rounded-full text-xs font-bold"
                         :class="calorieData.mode === 'deficit' ? 'bg-emerald-500/15 text-emerald-400' : calorieData.mode === 'surplus' ? 'bg-orange-500/15 text-orange-400' : 'bg-blue-500/15 text-blue-400'"
                         x-text="calorieData.mode === 'deficit' ? 'Defizit · ' + calorieData.adjustment + ' kcal/Tag' : calorieData.mode === 'surplus' ? 'Überschuss · +' + calorieData.adjustment + ' kcal/Tag' : 'Erhaltung'"></div>

                    <!-- Clamping Warnung -->
                    <template x-if="calorieData.isClamped">
                        <div class="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-left">
                            <p class="text-yellow-400 text-xs font-bold"><i class="ph ph-warning mr-1"></i>Sicherheitsgrenze erreicht</p>
                            <p class="text-yellow-400/70 text-xs mt-1">Dein berechnetes Ziel wäre zu niedrig. Wir empfehlen, das Zieldatum zu verlängern.</p>
                        </div>
                    </template>
                </div>

                <!-- Berechnung -->
                <div class="bento-card p-4">
                    <p class="text-sm font-bold text-white mb-3">Berechnung</p>
                    <div class="space-y-0">
                        <div class="flex justify-between py-2 border-b border-white/5">
                            <span class="text-sm text-muted">Grundumsatz (BMR)</span>
                            <span class="text-sm font-bold text-white" x-text="Math.round(calorieData.bmr).toLocaleString('de-DE') + ' kcal'"></span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-white/5">
                            <span class="text-sm text-muted">Aktivitätsfaktor</span>
                            <span class="text-sm font-bold text-white" x-text="'× ' + (ACTIVITY_LEVELS[activityLevel] ? ACTIVITY_LEVELS[activityLevel].factor.toFixed(2).replace('.', ',') : '1,55')"></span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-white/5">
                            <span class="text-sm text-muted">Gesamtumsatz (TDEE)</span>
                            <span class="text-sm font-bold text-white" x-text="Math.round(calorieData.tdee).toLocaleString('de-DE') + ' kcal'"></span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-sm" :class="calorieData.adjustment < 0 ? 'text-red-400' : calorieData.adjustment > 0 ? 'text-emerald-400' : 'text-muted'"
                                  x-text="calorieData.adjustment < 0 ? 'Defizit' : calorieData.adjustment > 0 ? 'Überschuss' : 'Keine Anpassung'"></span>
                            <span class="text-sm font-bold" :class="calorieData.adjustment < 0 ? 'text-red-400' : calorieData.adjustment > 0 ? 'text-emerald-400' : 'text-muted'"
                                  x-text="(calorieData.adjustment > 0 ? '+' : '') + calorieData.adjustment.toLocaleString('de-DE') + ' kcal'"></span>
                        </div>
                    </div>
                </div>

                <!-- Fortschritt -->
                <div class="bento-card p-4">
                    <p class="text-sm font-bold text-white mb-2">Fortschritt zum Zielgewicht</p>
                    <div class="flex justify-between mb-2">
                        <span class="text-xs text-muted" x-text="currentWeight.toFixed(1) + ' kg → ' + goalWeight.toFixed(1) + ' kg'"></span>
                        <span class="text-xs font-bold text-emerald-400" x-text="globalProgress + '%'"></span>
                    </div>
                    <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-800"
                             :style="'width:' + globalProgress + '%'"></div>
                    </div>
                    <template x-if="getProjectedGoalDate()">
                        <p class="text-xs text-muted mt-2" x-text="'Voraussichtliches Zieldatum: ' + new Date(getProjectedGoalDate()).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })"></p>
                    </template>
                </div>

                <!-- Wochenvergleich -->
                <div class="bento-card p-4">
                    <p class="text-sm font-bold text-white mb-3">Wochenvergleich</p>
                    <div class="flex gap-2">
                        <div class="flex-1 bg-white/5 rounded-xl p-3 text-center">
                            <p class="text-[10px] text-muted">Geplant</p>
                            <p class="text-lg font-extrabold text-white" x-text="(weeklyGoalRate > 0 ? '+' : '') + weeklyGoalRate.toFixed(1)"></p>
                            <p class="text-[10px] text-muted">kg/Woche</p>
                        </div>
                        <div class="flex-1 rounded-xl p-3 text-center"
                             :class="getWeeklyComparison().actual !== null ? (Math.abs(getWeeklyComparison().actual) >= Math.abs(weeklyGoalRate) ? 'bg-emerald-500/10' : 'bg-red-500/10') : 'bg-white/5'">
                            <p class="text-[10px] text-muted">Tatsächlich</p>
                            <p class="text-lg font-extrabold"
                               :class="getWeeklyComparison().actual !== null ? 'text-white' : 'text-muted'"
                               x-text="getWeeklyComparison().actual !== null ? (getWeeklyComparison().actual > 0 ? '+' : '') + getWeeklyComparison().actual.toFixed(1) : '—'"></p>
                            <p class="text-[10px] text-muted">kg/Woche</p>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
```

- [ ] **Step 3: Habits-Tab HTML einfügen**

Nach dem Plan-Tab:

```html
<!-- Habits Tab -->
<template x-if="activeTab === 'habits'">
    <div class="space-y-3 animate-fade-in">
        <!-- Streak Hero -->
        <div class="bento-card p-6 text-center">
            <p class="text-[10px] text-amber-400 uppercase font-bold tracking-widest mb-1">Aktuelle Serie</p>
            <p class="text-5xl font-extrabold text-white leading-none" x-text="checkinStreak"></p>
            <p class="text-muted text-sm mt-1">Tage in Folge</p>
            <div class="flex justify-center gap-1 mt-3">
                <template x-for="d in checkinWeekData" :key="d.date">
                    <div class="w-2 h-2 rounded-full"
                         :class="d.checked > 0 ? 'bg-amber-400' : 'bg-white/10'"></div>
                </template>
            </div>
        </div>

        <!-- Tägliche Checkliste -->
        <div class="bento-card overflow-hidden">
            <div class="p-4 border-b border-white/5 flex justify-between items-center">
                <p class="text-sm font-bold text-white" x-text="'Heute · ' + getCheckinCompletedCount() + ' von ' + todayCheckin.length"></p>
                <button @click="checkinEditMode = !checkinEditMode" class="text-xs text-muted hover:text-white transition-colors">
                    <i class="ph" :class="checkinEditMode ? 'ph-check' : 'ph-pencil-simple'"></i>
                    <span x-text="checkinEditMode ? 'Fertig' : 'Bearbeiten'"></span>
                </button>
            </div>

            <template x-for="item in todayCheckin" :key="item.key">
                <div class="flex items-center px-4 py-3.5 border-b border-white/5 last:border-0 transition-colors"
                     :class="item.checked ? 'opacity-50' : ''">
                    <button @click="toggleCheckinItem(item.key)"
                            class="w-6 h-6 rounded-lg mr-3 flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90"
                            :class="item.checked ? 'bg-amber-500 text-white' : 'border-2 border-white/15'">
                        <i x-show="item.checked" class="ph ph-check text-sm"></i>
                    </button>
                    <span class="text-[15px] text-white transition-all"
                          :class="item.checked ? 'line-through' : ''"
                          x-text="item.label"></span>
                    <button x-show="checkinEditMode" @click="removeCheckinItem(item.key)"
                            class="ml-auto text-red-400 hover:text-red-300 p-1">
                        <i class="ph ph-minus-circle"></i>
                    </button>
                </div>
            </template>

            <!-- Neues Item hinzufügen (nur im Edit-Modus) -->
            <template x-if="checkinEditMode">
                <div class="flex items-center px-4 py-3 border-t border-white/5">
                    <input type="text" x-model="newCheckinLabel" @keydown.enter="addCheckinItem(newCheckinLabel)"
                           placeholder="Neues Item hinzufügen..."
                           class="flex-1 bg-transparent text-white text-sm placeholder-white/20 outline-none">
                    <button @click="addCheckinItem(newCheckinLabel)"
                            :disabled="!newCheckinLabel.trim()"
                            class="text-amber-400 disabled:text-white/10 font-bold text-xs ml-2">
                        <i class="ph ph-plus-circle text-lg"></i>
                    </button>
                </div>
            </template>
        </div>

        <!-- Wochenübersicht -->
        <div class="bento-card p-4">
            <p class="text-sm font-bold text-white mb-3">Diese Woche</p>
            <div class="flex justify-between">
                <template x-for="(d, idx) in checkinWeekData" :key="d.date">
                    <div class="text-center">
                        <p class="text-[10px] text-muted mb-1" x-text="WEEKDAY_SHORT[idx]"></p>
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                             :class="d.checked === 0 && d.date < new Date().toISOString().split('T')[0] ? 'border border-white/10 text-muted' :
                                     d.checked === 0 ? 'border border-white/10 text-muted' :
                                     d.checked === d.total ? 'bg-amber-500 text-white' :
                                     'bg-amber-500/20 text-amber-400'"
                             x-text="d.checked > 0 ? d.checked + '/' + d.total : '—'"></div>
                    </div>
                </template>
            </div>
        </div>

        <!-- Monatsübersicht -->
        <div class="bento-card p-4">
            <p class="text-sm font-bold text-white mb-3">Monatsübersicht</p>
            <div class="flex gap-2">
                <div class="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <p class="text-xl font-extrabold text-white" x-text="checkinMonthlyRate + '%'"></p>
                    <p class="text-[10px] text-muted">Abschlussrate</p>
                </div>
                <div class="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <p class="text-xl font-extrabold text-white" x-text="checkinBestStreak"></p>
                    <p class="text-[10px] text-muted">Beste Serie</p>
                </div>
                <div class="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <p class="text-xl font-extrabold text-white" x-text="checkinActiveDays"></p>
                    <p class="text-[10px] text-muted">Aktive Tage</p>
                </div>
            </div>
        </div>
    </div>
</template>
```

- [ ] **Step 4: ACTIVITY_LEVELS im Template verfügbar machen**

In `js/main.js`, nach dem `WEEKDAY_SHORT` Import (Zeile 4), auch importieren:

```javascript
import { DEFAULT_PROFILE, WEEKDAYS, WEEKDAY_SHORT, ACTIVITY_LEVELS } from './utils/constants.js';
```

In der app() Funktion, nach `WEEKDAY_SHORT,` (Zeile 131):

```javascript
        ACTIVITY_LEVELS,
```

- [ ] **Step 5: Deutsche Labels in bestehenden HTML-Templates übersetzen**

Alle englischen Labels in `index.html` und allen `templates/modals/*.html` auf Deutsch ändern. Wichtige Stellen:

- Header: "Hello, Raoul" → "Hallo, Raoul"
- Tab Names: bereits Deutsch in Bottom Nav
- "Current Status" → "Aktueller Status"
- "Weight" → "Gewicht"
- "Goal" → "Ziel"
- "Progress" → "Fortschritt"
- "Recent Logs" → "Letzte Einträge"
- "Today" → "Heute"
- "Rest Day" → "Ruhetag"
- Alle weiteren englischen Strings identifizieren und übersetzen

- [ ] **Step 6: Tests ausführen und Dev-Server starten**

Run: `npx vitest run`
Expected: Alle Tests bestehen

Run: `npm run dev`
Expected: App lädt mit 4 Tabs

- [ ] **Step 7: Commit**

```bash
git add index.html js/main.js
git commit -m "feat: Plan-Tab, Habits-Tab und Bottom Navigation

4-Tab Bottom Bar (Gesundheit, Training, Plan, Gewohnheiten),
Kalorien-Dashboard mit Berechnung und Fortschritt,
Tägliche Checkliste mit Streak und Wochenübersicht.
Alle UI-Texte auf Deutsch.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: UI-Redesign — CSS Design Tokens & Apple-Ästhetik

**Files:**
- Modify: `css/styles.css`
- Modify: `index.html` (Klassen-Updates)

- [ ] **Step 1: Design Tokens in CSS definieren**

Am Anfang von `css/styles.css`, die bestehenden `:root` Variablen ersetzen mit dem neuen Apple-Design-System:

```css
:root {
    /* Apple-inspirierte Design Tokens */
    --bg: #f5f5f7;
    --surface: #ffffff;
    --surface-secondary: #f5f5f7;
    --text-primary: #1d1d1f;
    --text-secondary: #86868b;
    --border: rgba(0, 0, 0, 0.06);
    --glass: rgba(255, 255, 255, 0.85);
    --glass-border: rgba(0, 0, 0, 0.06);

    --accent-health: #34c759;
    --accent-training: #007aff;
    --accent-habits: #f59e0b;
    --accent-danger: #ef4444;

    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);

    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;

    --font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
    --font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
    --font-mono: 'SF Mono', 'JetBrains Mono', monospace;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #050505;
        --surface: #1c1c1e;
        --surface-secondary: rgba(255, 255, 255, 0.04);
        --text-primary: #f5f5f7;
        --text-secondary: #86868b;
        --border: rgba(255, 255, 255, 0.06);
        --glass: rgba(28, 28, 30, 0.85);
        --glass-border: rgba(255, 255, 255, 0.06);

        --accent-training: #0a84ff;
        --accent-danger: #ff6b6b;

        --shadow-sm: none;
        --shadow-md: none;
        --shadow-lg: none;
    }
}
```

- [ ] **Step 2: Globale Stile und Komponentenklassen aktualisieren**

Bestehende `.glass-panel`, `.bento-card` etc. an neue Tokens anpassen:

```css
body {
    font-family: var(--font-body);
    background: var(--bg);
    color: var(--text-primary);
}

.bento-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    transition: transform 0.1s ease, box-shadow 0.2s ease;
}

.bento-card:active {
    transform: scale(0.97);
}

/* Bottom Tab Bar */
.bottom-tab-bar {
    background: var(--glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--glass-border);
}

/* Animationen */
.animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Skeleton Loading */
.skeleton {
    background: linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface) 50%, var(--surface-secondary) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: var(--radius-md);
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Checkbox Bounce */
.check-bounce {
    animation: checkBounce 0.2s ease;
}

@keyframes checkBounce {
    0% { transform: scale(0.8); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}
```

- [ ] **Step 3: Chart.js Schriftart aktualisieren**

In `js/main.js`, `renderChart()` Methode:
```javascript
Chart.defaults.font.family = "var(--font-mono), 'JetBrains Mono', monospace";
```

Und Chart-Tooltip Labels auf Deutsch:
```javascript
label: (ctx) => {
    if (ctx.dataset.label === 'Ziellinie') return null;
    const labels = { 'Gewicht': 'Gewicht', '7-Tage Ø': '7-Tage Ø' };
    return (labels[ctx.dataset.label] || ctx.dataset.label) + ': ' + ctx.parsed.y.toFixed(1) + ' kg';
}
```

Chart dataset labels ändern:
- `'Weight'` → `'Gewicht'`
- `'7-Day Avg'` → `'7-Tage Ø'`
- `'Goal Line'` → `'Ziellinie'`

- [ ] **Step 4: Alle bestehenden Tailwind-Klassen in index.html aktualisieren**

Die bestehenden Karten, Buttons und Layout-Klassen an das neue Design-System anpassen. Insbesondere:

- Hintergrundfarben: `bg-surface` → Tailwind `bg-[var(--surface)]` oder bestehende Klasse beibehalten wenn CSS-Variable gemappt
- Textfarben: `text-white` → `text-[var(--text-primary)]` (nur wo nötig, da Dark/Light automatisch)
- Border-Radius: auf 16px (lg) für Karten vereinheitlichen
- Abstände: großzügigeres Padding (p-6 statt p-4 für Hero-Karten)

- [ ] **Step 5: Tests + Dev-Server verifizieren**

Run: `npx vitest run`
Run: `npm run dev` → Browser öffnen, alle 4 Tabs visuell prüfen, Dark Mode testen

- [ ] **Step 6: Commit**

```bash
git add css/styles.css index.html js/main.js
git commit -m "design: Apple-inspiriertes UI-Redesign mit Design Tokens

Neue CSS Custom Properties für Light/Dark, System Font Stack,
16px Border-Radius, subtile Schatten, Frosted Glass Bottom Bar,
Fade-In Animationen, Skeleton Loading, Checkbox Bounce.
Alle Chart-Labels auf Deutsch.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Supabase-Tabelle erstellen & Production Build

**Files:**
- Keine Code-Änderungen, Supabase Dashboard / SQL

- [ ] **Step 1: SQL für neue Tabelle und Spalten vorbereiten**

In Supabase SQL Editor ausführen (oder als Migration):

```sql
-- Neue Spalten zur settings Tabelle
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderately_active';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS weekly_goal_rate REAL DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[{"key":"training","label":"Training absolviert"},{"key":"steps","label":"Schritte-Ziel erreicht"},{"key":"calories","label":"Kalorien im Ziel"},{"key":"water","label":"Genug getrunken"},{"key":"sleep","label":"7+ Stunden Schlaf"}]';

-- Neue Tabelle
CREATE TABLE IF NOT EXISTS daily_checkins (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]'
);

-- RLS (Row Level Security) für daily_checkins
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Policy anpassen (je nach bestehender RLS-Konfiguration)
-- Wenn die App ohne Auth arbeitet (anon key), dann:
CREATE POLICY "Allow all for anon" ON daily_checkins FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Production Build erstellen**

Run: `npx vite build`
Expected: Erfolgreich, neues Bundle im `dist/` Ordner

- [ ] **Step 3: Alle Tests final ausführen**

Run: `npx vitest run`
Expected: Alle Tests bestehen (bestehende + neue)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: Production Build und Datenbank-Dokumentation

SQL-Migrations-Kommentare für Supabase, neuer Production Build.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Finale Verifikation

- [ ] **Step 1: Dev-Server starten und visuell verifizieren**

Run: `npm run dev`

Prüfpunkte:
1. App lädt ohne Fehler (keine Console-Errors)
2. **Gesundheit-Tab**: Gewicht, BMI, Chart, Quick Log funktionieren
3. **Training-Tab**: Tagesplan, Workout starten/beenden
4. **Plan-Tab**: Kalorienziel wird angezeigt (nach Profil-Setup)
5. **Gewohnheiten-Tab**: Checkliste, Toggle, Streak
6. **Bottom Tab Bar**: Alle 4 Tabs erreichbar, richtige Icons/Farben
7. **Dark Mode**: Alle Karten korrekt gestylt
8. **Profil-Modal**: Geschlecht, Aktivität, Wochenziel Felder vorhanden
9. **Mobile**: Responsive, Touch-Targets ≥ 44px

- [ ] **Step 2: Bestehende Features Regressions-Test**

1. Gewicht eintragen (Modal + Quick Log)
2. Gewicht löschen (Swipe)
3. Chart Filter (1M, 3M, ALLE)
4. BMI Detail Modal
5. Trainingsplan bearbeiten
6. Workout starten, Set markieren, Rest Timer, beenden
7. Workout History öffnen
8. Pull-to-Refresh
9. Toast mit Undo

- [ ] **Step 3: Finale Tests**

Run: `npx vitest run`
Expected: Alle Tests grün

- [ ] **Step 4: Finaler Commit (wenn nötig)**

```bash
git add -A
git commit -m "fix: Finale Korrekturen nach Verifikation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
