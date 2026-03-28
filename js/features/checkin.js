import * as Supa from '../store/supabase.js';
import { getLocalDateString } from '../utils/formatting.js';
import { DEFAULT_PROFILE } from '../utils/constants.js';

// Migrate old boolean checked format to new status format
function migrateItem(item) {
    if ('status' in item) return item;
    return {
        key: item.key,
        label: item.label,
        status: item.checked ? 'done' : 'none',
        reason: null
    };
}

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
    checkinSelectedDate: null,

    getCheckinItems() {
        const items = [...(this.checklistItems || DEFAULT_PROFILE.checklistItems)];
        // Auto-add calorie goal if profile is complete
        if (this.gender && this.userHeight && this.userAge && this.calorieData) {
            const hasAutoCalories = items.some(i => i.key === 'auto_calories');
            if (!hasAutoCalories) {
                const target = this.calorieData.target ? this.calorieData.target.toLocaleString('de-DE') : '—';
                items.push({ key: 'auto_calories', label: 'Kalorien im Ziel: ' + target + ' kcal' });
            } else {
                // Update label with current target
                const idx = items.findIndex(i => i.key === 'auto_calories');
                if (idx >= 0) {
                    const target = this.calorieData.target ? this.calorieData.target.toLocaleString('de-DE') : '—';
                    items[idx] = { ...items[idx], label: 'Kalorien im Ziel: ' + target + ' kcal' };
                }
            }
        }
        return items;
    },

    initTodayCheckin() {
        const items = this.getCheckinItems();
        this.todayCheckin = items.map(item => ({
            key: item.key,
            label: item.label,
            status: 'none',
            reason: null
        }));
    },

    async loadCheckins() {
        try {
            const today = getLocalDateString();
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const fromDate = sixtyDaysAgo.toISOString().split('T')[0];

            const data = await Supa.getCheckins(fromDate, today);
            // Migrate all history items
            this.checkinHistory = (data || []).map(entry => ({
                ...entry,
                items: (entry.items || []).map(migrateItem)
            }));

            const todayEntry = this.checkinHistory.find(c => c.date === today);
            if (todayEntry) {
                const items = this.getCheckinItems();
                this.todayCheckin = items.map(item => {
                    const existing = todayEntry.items.find(i => i.key === item.key);
                    return {
                        key: item.key,
                        label: item.label,
                        status: existing ? existing.status : 'none',
                        reason: existing ? existing.reason : null
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

    async setCheckinStatus(key, newStatus) {
        const item = this.todayCheckin.find(i => i.key === key);
        if (!item) return;
        const oldStatus = item.status;
        const oldReason = item.reason;
        item.status = newStatus;
        if (newStatus !== 'missed') item.reason = null;

        try {
            const activeDate = this.checkinGetActiveDate();
            await Supa.upsertCheckin(activeDate, this.todayCheckin);

            const idx = this.checkinHistory.findIndex(c => c.date === activeDate);
            if (idx >= 0) {
                this.checkinHistory[idx].items = [...this.todayCheckin];
            } else {
                this.checkinHistory.unshift({ date: activeDate, items: [...this.todayCheckin] });
            }
            this.checkinStreak = this.calculateCheckinStreak();
            this.checkinWeekData = this.getCheckinWeekData();
        } catch (e) {
            console.error('Failed to save checkin:', e);
            item.status = oldStatus;
            item.reason = oldReason;
        }
    },

    cycleCheckinStatus(key) {
        const item = this.todayCheckin.find(i => i.key === key);
        if (!item) return;
        const next = item.status === 'none' ? 'done' : item.status === 'done' ? 'missed' : 'none';
        this.setCheckinStatus(key, next);
    },

    async saveCheckinReason(key, reason) {
        const item = this.todayCheckin.find(i => i.key === key);
        if (!item || item.status !== 'missed') return;
        item.reason = reason || null;

        try {
            const activeDate = this.checkinGetActiveDate();
            await Supa.upsertCheckin(activeDate, this.todayCheckin);
            const idx = this.checkinHistory.findIndex(c => c.date === activeDate);
            if (idx >= 0) {
                this.checkinHistory[idx].items = [...this.todayCheckin];
            }
        } catch (e) {
            console.error('Failed to save reason:', e);
        }
    },

    // Keep backward compat for old toggleCheckinItem calls
    async toggleCheckinItem(key) {
        const item = this.todayCheckin.find(i => i.key === key);
        if (!item) return;
        const next = item.status === 'done' ? 'none' : 'done';
        this.setCheckinStatus(key, next);
    },

    getCheckinCompletedCount() {
        return this.todayCheckin.filter(i => i.status === 'done').length;
    },

    calculateCheckinStreak() {
        if (this.checkinHistory.length === 0) return 0;

        const today = getLocalDateString();
        const activeDates = this.checkinHistory
            .filter(c => c.items && c.items.some(i => i.status === 'done' || i.checked === true))
            .map(c => c.date)
            .sort()
            .reverse();

        if (activeDates.length === 0) return 0;

        // Timezone-safe: String-basierter Vergleich über UTC-Mitternacht
        const daysBetween = (dateStrA, dateStrB) => {
            const a = new Date(dateStrA + 'T12:00:00');
            const b = new Date(dateStrB + 'T12:00:00');
            return Math.round((a - b) / 86400000);
        };

        const lastDate = activeDates[0];
        if (daysBetween(today, lastDate) > 1) return 0;

        let streak = 1;
        for (let i = 0; i < activeDates.length - 1; i++) {
            const diff = daysBetween(activeDates[i], activeDates[i + 1]);
            if (diff === 1) streak++;
            else break;
        }
        return streak;
    },

    calculateCheckinStats() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthStr = getLocalDateString(monthStart);

        const monthEntries = this.checkinHistory.filter(c => c.date >= monthStr);

        let activeDays = 0;
        let totalDone = 0;
        let totalItems = 0;

        for (const entry of monthEntries) {
            const done = entry.items.filter(i => i.status === 'done' || i.checked === true).length;
            if (done > 0) activeDays++;
            totalDone += done;
            totalItems += entry.items.length;
        }

        const completionRate = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

        const allDates = this.checkinHistory
            .filter(c => c.items && c.items.some(i => i.status === 'done' || i.checked === true))
            .map(c => c.date)
            .sort();

        let bestStreak = 0;
        let currentStreak = 1;
        for (let i = 1; i < allDates.length; i++) {
            const diff = Math.round(
                (new Date(allDates[i] + 'T12:00:00') - new Date(allDates[i - 1] + 'T12:00:00')) / 86400000
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

        const totalItems = this.getCheckinItems().length;
        const week = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = getLocalDateString(d);
            const entry = this.checkinHistory.find(c => c.date === dateStr);
            const checked = entry ? entry.items.filter(i => i.status === 'done' || i.checked === true).length : 0;
            week.push({ date: dateStr, total: totalItems, checked });
        }
        return week;
    },

    addCheckinItem(label) {
        if (!label || !label.trim()) return;
        const key = 'custom_' + Date.now();
        this.checklistItems.push({ key, label: label.trim() });
        this.todayCheckin.push({ key, label: label.trim(), status: 'none', reason: null });
        this.newCheckinLabel = '';
        this.saveSettings();
    },

    removeCheckinItem(key) {
        if (key === 'auto_calories') return; // Can't remove auto-calorie item
        this.checklistItems = this.checklistItems.filter(i => i.key !== key);
        this.todayCheckin = this.todayCheckin.filter(i => i.key !== key);
        this.saveSettings();
    },

    checkinIsToday() {
        return !this.checkinSelectedDate || this.checkinSelectedDate === getLocalDateString();
    },

    checkinGetActiveDate() {
        return this.checkinSelectedDate || getLocalDateString();
    },

    selectCheckinDate(dateStr) {
        const today = getLocalDateString();
        if (dateStr === today) {
            this.checkinSelectedDate = null;
            // Reload today's checkin from history
            const todayEntry = this.checkinHistory.find(c => c.date === today);
            if (todayEntry) {
                const items = this.getCheckinItems();
                this.todayCheckin = items.map(item => {
                    const existing = todayEntry.items.find(i => i.key === item.key);
                    return {
                        key: item.key,
                        label: item.label,
                        status: existing ? existing.status : 'none',
                        reason: existing ? existing.reason : null
                    };
                });
            } else {
                this.initTodayCheckin();
            }
        } else {
            this.checkinSelectedDate = dateStr;
            // Load that day's checkin
            const entry = this.checkinHistory.find(c => c.date === dateStr);
            const items = this.getCheckinItems();
            this.todayCheckin = items.map(item => {
                const existing = entry ? entry.items.find(i => i.key === item.key) : null;
                return {
                    key: item.key,
                    label: item.label,
                    status: existing ? existing.status : 'none',
                    reason: existing ? existing.reason : null
                };
            });
        }
    },

    checkinSelectedLabel() {
        if (this.checkinIsToday()) return 'Heute';
        const d = new Date(this.checkinSelectedDate + 'T12:00:00');
        const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        return days[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
    }
});
