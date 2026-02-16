import { getLocalDateString } from '../utils/formatting.js';
import { STEPS_GOAL } from '../utils/constants.js';
import * as Supa from '../store/supabase.js';
import { hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics.js';

export const stepsMixin = () => ({
    // --- Steps State ---
    todaySteps: 0,
    displaySteps: 0,
    _stepsCelebrated: false,
    stepsLogOpen: false,
    stepsHistory: [],
    stepsInput: '',
    stepsInputDate: getLocalDateString(),
    stepsLogView: 'days',

    // --- STEPS COMPUTED ---
    get stepsProgress() {
        return Math.min((this.todaySteps / STEPS_GOAL) * 100, 100);
    },

    get stepsRingColor() {
        if (this.todaySteps >= STEPS_GOAL) return '#facc15';
        if (this.todaySteps >= 5000) return '#f59e0b';
        return '#ef4444';
    },

    get stepsRingGlow() {
        if (this.todaySteps > STEPS_GOAL) return 'drop-shadow(0 0 12px rgba(250, 204, 21, 0.5))';
        return 'none';
    },

    checkStepsCelebration(oldSteps, newSteps) {
        if (oldSteps < STEPS_GOAL && newSteps >= STEPS_GOAL && !this._stepsCelebrated) {
            this._stepsCelebrated = true;
            this.showToast('10,000 steps reached! 🎉');
            setTimeout(() => this.triggerConfetti(), 300);
        }
    },

    async openStepsLog() {
        hapticLight();
        this.stepsLogOpen = true;
        this.stepsInput = '';
        this.stepsInputDate = getLocalDateString();
        try {
            this.stepsHistory = await Supa.getStepHistory();
        } catch (e) {
            console.error('Failed to load step history:', e);
            this.stepsHistory = [];
        }
    },
    closeStepsLog() {
        this.stepsLogOpen = false;
    },

    async saveManualSteps() {
        const addedSteps = parseInt(this.stepsInput);
        if (!addedSteps || isNaN(addedSteps) || addedSteps <= 0) return;
        const date = this.stepsInputDate;

        hapticSuccess();
        const oldSteps = this.todaySteps;

        // Find existing entry for that date and add to it
        const existing = this.stepsHistory.find(e => e.date === date);
        const previousSteps = existing ? existing.steps : 0;
        const newTotal = previousSteps + addedSteps;

        try {
            await Supa.upsertStepEntry(date, newTotal);
        } catch (e) {
            console.error('Failed to save steps:', e);
            this.showToast('Failed to save');
            return;
        }

        // Update today's steps if the entry is for today
        const today = getLocalDateString();
        if (date === today) {
            this.todaySteps = newTotal;
            this.checkStepsCelebration(oldSteps, newTotal);
            this.refreshAnimations();
        }

        // Update history in modal
        if (existing) {
            existing.steps = newTotal;
        } else {
            this.stepsHistory.push({ date, steps: newTotal });
            this.stepsHistory.sort((a, b) => b.date.localeCompare(a.date));
        }

        this.stepsInput = '';
        this.showToast('+' + addedSteps.toLocaleString('en-US') + ' steps → ' + newTotal.toLocaleString('en-US') + ' total');
    },

    async deleteStepEntry(date) {
        hapticWarning();
        const removed = this.stepsHistory.find(e => e.date === date);
        if (!removed) return;

        const today = getLocalDateString();

        // Use splice to mutate in-place so Alpine can track the removal cleanly
        const idx = this.stepsHistory.indexOf(removed);
        if (idx !== -1) this.stepsHistory.splice(idx, 1);

        if (date === today) {
            this.todaySteps = 0;
            this._stepsCelebrated = false;
            this.refreshAnimations();
        }

        try {
            await Supa.deleteStepEntry(date);
        } catch (e) {
            console.error('Failed to delete step entry:', e);
            // Rollback UI on failure
            this.stepsHistory.push(removed);
            this.stepsHistory.sort((a, b) => b.date.localeCompare(a.date));
            if (date === today) {
                this.todaySteps = removed.steps;
                this.refreshAnimations();
            }
            this.showToast('Failed to delete');
            return;
        }

        this.showToast('Entry deleted', async () => {
            this.stepsHistory.push(removed);
            this.stepsHistory.sort((a, b) => b.date.localeCompare(a.date));
            if (date === today) {
                this.todaySteps = removed.steps;
                this.refreshAnimations();
            }
            try {
                await Supa.upsertStepEntry(removed.date, removed.steps);
            } catch (e) {
                console.error('Failed to restore step entry:', e);
            }
        });
    },

    get stepsWeekAvg() {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekStr = getLocalDateString(weekAgo);
        const entries = this.stepsHistory.filter(e => e.date >= weekStr);
        if (entries.length === 0) return 0;
        return Math.round(entries.reduce((s, e) => s + e.steps, 0) / entries.length);
    },

    get stepsMonthAvg() {
        const now = new Date();
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthStr = getLocalDateString(monthAgo);
        const entries = this.stepsHistory.filter(e => e.date >= monthStr);
        if (entries.length === 0) return 0;
        return Math.round(entries.reduce((s, e) => s + e.steps, 0) / entries.length);
    },

    get stepsMonthly() {
        const groups = {};
        for (const entry of this.stepsHistory) {
            const key = entry.date.substring(0, 7); // YYYY-MM
            if (!groups[key]) groups[key] = [];
            groups[key].push(entry.steps);
        }
        return Object.keys(groups).sort().reverse().map(key => {
            const steps = groups[key];
            const [y, m] = key.split('-');
            const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return {
                key,
                label,
                days: steps.length,
                total: steps.reduce((s, v) => s + v, 0),
                avg: Math.round(steps.reduce((s, v) => s + v, 0) / steps.length),
                best: Math.max(...steps)
            };
        });
    },
});
