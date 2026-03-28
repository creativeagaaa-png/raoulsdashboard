import { DEFAULT_PROFILE } from '../utils/constants.js';
import * as Supa from './supabase.js';
import { debounce } from '../utils/debounce.js';

export const settingsMixin = () => ({
    _debouncedSaveSettings: null,
    settingsOpen: false,
    bmiDetailOpen: false,

    openBmiDetail() { this.bmiDetailOpen = true; },
    closeBmiDetail() { this.bmiDetailOpen = false; },

    profileOpen: false,
    profileForm: { ...DEFAULT_PROFILE },
    profileDirty: false,
    avatarUploading: false,

    async saveSettings() {
        if (!this._debouncedSaveSettings) {
            this._debouncedSaveSettings = debounce(async () => {
                try {
                    await Supa.saveSettings({
                        displayName: this.displayName,
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
                    this.showToast('Einstellungen konnten nicht gespeichert werden. Bitte erneut versuchen.');
                }
            }, 500);
        }
        this._debouncedSaveSettings();
    },

    openSettings() { this.settingsOpen = true; },
    closeSettings() { this.settingsOpen = false; },

    openProfile() {
        this.profileForm = {
            displayName: this.displayName || '',
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

        this.displayName = (f.displayName || '').trim() || this.displayName;
        this.startWeight = newStart;
        this.goalWeight = newGoal;
        this.goalDate = f.goalDate || null;
        this.userHeight = newHeight;
        this.userAge = parseInt(f.userAge) || 0;
        this.gender = f.gender || null;
        this.activityLevel = f.activityLevel || 'moderately_active';
        this.weeklyGoalRate = safeFloat(f.weeklyGoalRate);

        await this.saveSettings();
        if (this.recalculateCalories) this.recalculateCalories();

        this.refreshAnimations();
        this.profileDirty = false;
        this.profileOpen = false;

        this.$nextTick(() => {
            this.updateChart();
            this.showToast('Profil gespeichert');
        });
    },

    markProfileDirty() { this.profileDirty = true; },

    // ── Avatar / Profilbild ──────────────────────────
    async handleAvatarUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validierung
        const maxSize = 2 * 1024 * 1024; // 2 MB
        if (file.size > maxSize) {
            this.showToast('Bild ist zu gross (max. 2 MB)');
            return;
        }
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            this.showToast('Nur JPG, PNG oder WebP erlaubt');
            return;
        }

        this.avatarUploading = true;
        try {
            const url = await Supa.uploadAvatar(file);
            this.avatarUrl = url;
            this.showToast('Profilbild gespeichert');
        } catch (e) {
            console.error('Avatar upload failed:', e);
            this.showToast('Profilbild konnte nicht hochgeladen werden');
        } finally {
            this.avatarUploading = false;
            // Reset file input
            event.target.value = '';
        }
    },

    async removeAvatar() {
        this.avatarUploading = true;
        try {
            await Supa.deleteAvatar();
            this.avatarUrl = '';
            this.showToast('Profilbild entfernt');
        } catch (e) {
            console.error('Avatar delete failed:', e);
            this.showToast('Profilbild konnte nicht entfernt werden');
        } finally {
            this.avatarUploading = false;
        }
    }
});
