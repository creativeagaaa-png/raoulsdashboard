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

            const todayEntry = this.checkinHistory.find(c => c.date === today);
            if (todayEntry) {
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

        try {
            const today = getLocalDateString();
            await Supa.upsertCheckin(today, this.todayCheckin);

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
            item.checked = !item.checked;
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
