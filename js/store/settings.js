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

    // --- Settings Modal (Danger Zone) ---
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
    }
});
