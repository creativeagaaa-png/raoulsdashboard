import { DEFAULT_PROFILE } from '../utils/constants.js';
import * as Supa from './supabase.js';

export const settingsMixin = () => ({
    settingsOpen: false,

    // BMI detail modal state
    bmiDetailOpen: false,

    openBmiDetail() {
        this.bmiDetailOpen = true;
    },

    closeBmiDetail() {
        this.bmiDetailOpen = false;
    },

    // Profile modal state
    profileOpen: false,
    profileForm: { ...DEFAULT_PROFILE },
    profileDirty: false,

    // Milestones modal state
    milestonesOpen: false,
    milestonesForm: [],
    milestonesDirty: false,
    newMilestone: { title: '', target: '', icon: '⭐' },

    async saveSettings() {
        try {
            await Supa.saveSettings({
                startWeight: this.startWeight,
                goalWeight: this.goalWeight,
                goalDate: this.goalDate,
                userHeight: this.userHeight,
                userAge: this.userAge
            });
        } catch (e) {
            console.error('Failed to save settings:', e);
            this.showToast('Failed to save settings');
        }
    },

    // --- Settings Modal (now only Danger Zone) ---
    openSettings() {
        this.settingsOpen = true;
    },

    closeSettings() {
        this.settingsOpen = false;
    },

    // --- Profile Modal ---
    openProfile() {
        this.profileForm = {
            startWeight: this.startWeight,
            goalWeight: this.goalWeight,
            goalDate: this.goalDate || '',
            userHeight: this.userHeight,
            userAge: this.userAge
        };
        this.profileDirty = false;
        this.profileOpen = true;
    },

    closeProfile(force) {
        if (this.profileDirty && !force) {
            this.confirmModal = {
                show: true,
                title: 'Unsaved Changes',
                message: 'Discard changes to profile?',
                confirmLabel: 'Discard',
                onConfirm: () => {
                    this.profileOpen = false;
                }
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
            this.showToast('Error: Please fill in height and weight correctly');
            return;
        }

        const oldStart = this.startWeight;
        this.startWeight = newStart;
        this.goalWeight = newGoal;
        this.goalDate = f.goalDate || null;
        this.userHeight = newHeight;
        this.userAge = parseInt(f.userAge) || 0;
        await this.saveSettings();

        this.refreshAnimations();
        this.profileDirty = false;
        this.profileOpen = false;

        this.$nextTick(() => {
            this.updateChart();
            this.showToast('Profile saved');
        });
    },

    markProfileDirty() {
        this.profileDirty = true;
    },

    // --- Milestones Modal ---
    openMilestones() {
        this.milestonesForm = JSON.parse(JSON.stringify(this.rewards));
        this.milestonesDirty = false;
        this.newMilestone = { title: '', target: '', icon: '⭐' };
        this.milestonesOpen = true;
    },

    closeMilestones(force) {
        if (this.milestonesDirty && !force) {
            this.confirmModal = {
                show: true,
                title: 'Unsaved Changes',
                message: 'Discard milestone changes?',
                confirmLabel: 'Discard',
                onConfirm: () => {
                    this.milestonesOpen = false;
                }
            };
            return;
        }
        this.milestonesOpen = false;
    },

    addMilestone() {
        const m = this.newMilestone;
        if (!m.title || String(m.title).trim() === '') return;
        const safeFloat = (val) => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
            return parseFloat(val);
        };
        const target = safeFloat(m.target);
        if (!target || target <= 0) return;

        this.milestonesForm.push({
            target: target,
            title: String(m.title).trim(),
            icon: m.icon ? String(m.icon).trim() : '⭐'
        });
        this.newMilestone = { title: '', target: '', icon: '⭐' };
        this.milestonesDirty = true;
    },

    removeMilestone(index) {
        this.milestonesForm.splice(index, 1);
        this.milestonesDirty = true;
    },

    async applyMilestones() {
        const safeFloat = (val) => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
            return parseFloat(val);
        };

        const validRewards = this.milestonesForm.filter(r =>
            r.title && String(r.title).trim() !== '' &&
            r.target && safeFloat(r.target) > 0
        );

        this.rewards = validRewards.map(r => ({
            target: safeFloat(r.target),
            title: String(r.title).trim(),
            icon: r.icon ? String(r.icon).trim() : '⭐'
        })).sort((a, b) => b.target - a.target);

        try {
            await Supa.saveRewards(this.rewards);
        } catch (e) {
            console.error('Failed to save milestones:', e);
            this.showToast('Failed to save milestones');
        }
        this.milestonesDirty = false;
        this.milestonesOpen = false;
        this.showToast('Milestones saved');
    },

    markMilestonesDirty() {
        this.milestonesDirty = true;
    },

    // --- Danger Zone ---
    clearAllMilestones() {
        this.confirmModal = {
            show: true,
            title: 'Delete all milestones',
            message: 'Permanently delete all ' + this.rewards.length + ' milestones?',
            onConfirm: async () => {
                this.rewards = [];
                try {
                    await Supa.saveRewards([]);
                } catch (e) {
                    console.error('Failed to clear milestones:', e);
                }
                this.showToast('All milestones deleted');
            }
        };
    }
});
