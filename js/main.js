import Alpine from 'alpinejs';
import { Chart, registerables } from 'chart.js';
import confetti from 'canvas-confetti';

import { DEFAULT_PROFILE, DEFAULT_REWARDS, WIDGET_REGISTRY, DEFAULT_LAYOUT } from './utils/constants.js';
import { calculateBMI, calculateTrend, calculateOracle, getBMIRanges } from './utils/analytics.js';
import * as Supa from './store/supabase.js';
import { settingsMixin } from './store/settings.js';
import { trainingMixin } from './features/training.js';
import { galleryMixin, getPendingPhotoBlob } from './features/gallery.js';
import { rewardsMixin } from './features/rewards.js';
import { layoutMixin } from './features/layout.js';

// Modal templates (loaded as raw HTML via Vite)
import bmiDetailModal from '../templates/modals/bmi-detail.html?raw';
import settingsModal from '../templates/modals/settings.html?raw';
import trainingModal from '../templates/modals/training.html?raw';
import profileModal from '../templates/modals/profile.html?raw';
import milestonesModal from '../templates/modals/milestones.html?raw';
import weightEntryModal from '../templates/modals/weight-entry.html?raw';
import lootboxModal from '../templates/modals/lootbox.html?raw';
import galleryLightboxModal from '../templates/modals/gallery-lightbox.html?raw';
import confirmModal from '../templates/modals/confirm.html?raw';
import toastComponent from '../templates/modals/toast.html?raw';

Chart.register(...registerables);
window.confetti = confetti;

// Inject modal templates into the DOM before Alpine initializes
const modalsContainer = document.getElementById('modals');
if (modalsContainer) {
    modalsContainer.innerHTML = [
        bmiDetailModal,
        settingsModal,
        trainingModal,
        profileModal,
        milestonesModal,
        weightEntryModal,
        lootboxModal,
        galleryLightboxModal,
        confirmModal,
        toastComponent
    ].join('\n');
}

function app() {
    let chartInstance = null;

    return {
        // --- BASE STATE ---
        startWeight: DEFAULT_PROFILE.startWeight,
        goalWeight: DEFAULT_PROFILE.goalWeight,
        goalDate: null,
        userHeight: DEFAULT_PROFILE.userHeight,
        userAge: DEFAULT_PROFILE.userAge,
        rewards: [...DEFAULT_REWARDS],

        history: [],
        chartFilter: '1M',

        // UI State
        appLoaded: false,
        modalOpen: false,
        lootboxOpen: false,
        unlockedReward: null,
        toast: { show: false, message: '', undoAction: null },
        _toastTimeout: null,
        confirmModal: { show: false, title: '', message: '', onConfirm: null, confirmLabel: null },

        // Pull-to-refresh
        _ptr: { active: false, startY: 0, currentY: 0, pulling: false, refreshing: false },

        // Inputs & Display
        inputWeight: null,
        inputDate: new Date().toISOString().split('T')[0],
        displayWeight: 0,
        displayBmi: 0,
        displayProgress: 0,
        displayLost: 0,
        _animFrames: {},
        _saving: false,
        quickLogWeight: null,

        // --- MIXINS ---
        ...settingsMixin(),
        ...trainingMixin(),
        ...galleryMixin(),
        ...rewardsMixin(),
        ...layoutMixin(),

        // --- INIT ---
        async initApp() {
            try {
                const [settings, rewards, trainingPlan, layout, weightEntries, photoDates] =
                    await Promise.all([
                        Supa.getSettings().catch(() => null),
                        Supa.getRewards().catch(() => []),
                        Supa.getTrainingPlan().catch(() => null),
                        Supa.getLayout().catch(() => null),
                        Supa.getWeightEntries().catch(() => []),
                        Supa.getAllPhotoDates().catch(() => [])
                    ]);

                // Apply settings
                if (settings) {
                    this.startWeight = settings.start_weight != null ? Number(settings.start_weight) : DEFAULT_PROFILE.startWeight;
                    this.goalWeight = settings.goal_weight != null ? Number(settings.goal_weight) : DEFAULT_PROFILE.goalWeight;
                    this.goalDate = settings.goal_date || null;
                    this.userHeight = settings.user_height != null ? parseInt(settings.user_height) : DEFAULT_PROFILE.userHeight;
                    this.userAge = settings.user_age != null ? parseInt(settings.user_age) : DEFAULT_PROFILE.userAge;
                }

                // Apply rewards
                this.rewards = (rewards && rewards.length > 0) ? rewards : [];

                // Apply training plan
                if (trainingPlan) {
                    this.trainingPlan = trainingPlan;
                }

                // Apply layout
                if (layout && layout.left && layout.right) {
                    const allInLayout = [...layout.left, ...layout.right];
                    const allWidgets = Object.keys(WIDGET_REGISTRY);
                    allWidgets.forEach(w => {
                        if (!allInLayout.includes(w)) {
                            const def = DEFAULT_LAYOUT.right.includes(w) ? 'right' : 'left';
                            layout[def].push(w);
                        }
                    });
                    layout.left = layout.left.filter(w => WIDGET_REGISTRY[w]);
                    layout.right = layout.right.filter(w => WIDGET_REGISTRY[w]);
                    this.widgetLayout = layout;
                }

                // Apply weight entries
                this.history = (weightEntries && weightEntries.length > 0) ? weightEntries : [];
                this.history.sort((a, b) => a.date.localeCompare(b.date));

                // Apply photo dates
                this.photoDates = (photoDates || []).sort();

            } catch (e) {
                console.error('Failed to initialize app:', e);
            }

            this.$nextTick(() => {
                this.renderChart();
                this.refreshAnimations();
                this.appLoaded = true;
                this.initPullToRefresh();
            });

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').catch(() => {});
            }
        },

        // --- PULL TO REFRESH ---
        initPullToRefresh() {
            const ptrEl = document.getElementById('ptr-indicator');
            if (!ptrEl) return;

            const THRESHOLD = 80;
            const MAX_PULL = 130;

            const getScrollTop = () =>
                Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop, 0);

            const isAnyModalOpen = () =>
                this.modalOpen || this.settingsOpen || this.profileOpen ||
                this.trainingOpen || this.milestonesOpen || this.bmiDetailOpen ||
                this.lootboxOpen || this.editMode;

            document.addEventListener('touchstart', (e) => {
                if (getScrollTop() > 5 || isAnyModalOpen() || this._ptr.refreshing) return;
                this._ptr.startY = e.touches[0].clientY;
                this._ptr.active = true;
                this._ptr.pulling = false;
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                if (!this._ptr.active || this._ptr.refreshing) return;
                const currentY = e.touches[0].clientY;
                const diff = currentY - this._ptr.startY;

                if (diff < 0 || getScrollTop() > 5) {
                    this._ptr.active = false;
                    ptrEl.style.transform = 'translateY(-100%)';
                    ptrEl.style.opacity = '0';
                    return;
                }

                // Prevent iOS bounce/rubber-band when pulling down at top
                if (diff > 10) {
                    e.preventDefault();
                }

                this._ptr.pulling = true;
                const pull = Math.min(diff, MAX_PULL);
                const progress = Math.min(pull / THRESHOLD, 1);
                this._ptr.currentY = pull;

                ptrEl.style.transform = `translateY(${pull - 60}px)`;
                ptrEl.style.opacity = String(progress);

                const icon = ptrEl.querySelector('.ptr-icon');
                if (icon) {
                    icon.style.transform = `rotate(${progress * 180}deg)`;
                    if (progress >= 1) {
                        icon.classList.add('ptr-ready');
                    } else {
                        icon.classList.remove('ptr-ready');
                    }
                }
            }, { passive: false });

            document.addEventListener('touchend', () => {
                if (!this._ptr.active || !this._ptr.pulling) {
                    this._ptr.active = false;
                    return;
                }

                const pull = this._ptr.currentY;
                this._ptr.active = false;
                this._ptr.pulling = false;

                if (pull >= THRESHOLD && !this._ptr.refreshing) {
                    this._ptr.refreshing = true;
                    ptrEl.style.transform = 'translateY(20px)';
                    ptrEl.classList.add('ptr-refreshing');

                    this.refreshDashboard().finally(() => {
                        setTimeout(() => {
                            ptrEl.style.transform = 'translateY(-100%)';
                            ptrEl.style.opacity = '0';
                            ptrEl.classList.remove('ptr-refreshing');
                            this._ptr.refreshing = false;
                        }, 400);
                    });
                } else {
                    ptrEl.style.transform = 'translateY(-100%)';
                    ptrEl.style.opacity = '0';
                }

                this._ptr.currentY = 0;
            }, { passive: true });
        },

        async refreshDashboard() {
            try {
                const [settings, rewards, trainingPlan, weightEntries, photoDates] =
                    await Promise.all([
                        Supa.getSettings().catch(() => null),
                        Supa.getRewards().catch(() => []),
                        Supa.getTrainingPlan().catch(() => null),
                        Supa.getWeightEntries().catch(() => []),
                        Supa.getAllPhotoDates().catch(() => [])
                    ]);

                if (settings) {
                    this.startWeight = settings.start_weight != null ? Number(settings.start_weight) : DEFAULT_PROFILE.startWeight;
                    this.goalWeight = settings.goal_weight != null ? Number(settings.goal_weight) : DEFAULT_PROFILE.goalWeight;
                    this.goalDate = settings.goal_date || null;
                    this.userHeight = settings.user_height != null ? parseInt(settings.user_height) : DEFAULT_PROFILE.userHeight;
                    this.userAge = settings.user_age != null ? parseInt(settings.user_age) : DEFAULT_PROFILE.userAge;
                }
                this.rewards = (rewards && rewards.length > 0) ? rewards : [];
                if (trainingPlan) this.trainingPlan = trainingPlan;
                this.history = (weightEntries && weightEntries.length > 0) ? weightEntries : [];
                this.history.sort((a, b) => a.date.localeCompare(b.date));
                this.photoDates = (photoDates || []).sort();

                this.$nextTick(() => {
                    this.updateChart();
                    this.refreshAnimations();
                    if (this.galleryLoaded) this.refreshGallery();
                });

                this.showToast('Dashboard aktualisiert');
            } catch (e) {
                console.error('Failed to refresh dashboard:', e);
                this.showToast('Fehler beim Aktualisieren');
            }
        },

        // --- DATA MANIPULATION ---
        openModal() {
            this.inputWeight = this.currentWeight;
            this.inputDate = new Date().toISOString().split('T')[0];
            this.modalOpen = true;
            setTimeout(() => document.getElementById('weightInput')?.focus(), 100);
        },
        closeModal() { this.modalOpen = false; },

        async addEntry() {
            if (this._saving) return;
            const w = parseFloat(String(this.inputWeight).replace(',', '.'));
            if (!w || isNaN(w)) return;

            this._saving = true;
            const oldW = this.currentWeight;
            const photoBlob = getPendingPhotoBlob();
            const entryDate = this.inputDate;

            // Clean up preview URL before closing
            if (this.photoPreview) URL.revokeObjectURL(this.photoPreview);
            this.closeModal();
            this.photoPreview = null;
            this.inputWeight = null;

            // Optimistic UI update
            this.history = this.history.filter(h => h.date !== entryDate);
            this.history.push({ date: entryDate, weight: w });
            this.history.sort((a, b) => a.date.localeCompare(b.date));

            try {
                await Supa.upsertWeightEntry(entryDate, w);
            } catch (e) {
                console.error('Failed to save entry:', e);
                this.showToast('Fehler beim Speichern');
            }

            this.$nextTick(() => {
                this.updateChart();
                this.refreshAnimations();
                this.checkUnlocks(oldW, w);
            });

            if (photoBlob) {
                try {
                    await Supa.savePhoto(entryDate, photoBlob);
                    if (!this.photoDates.includes(entryDate)) {
                        this.photoDates.push(entryDate);
                        this.photoDates.sort();
                    }
                    if (this.galleryLoaded) this.refreshGallery();
                } catch (e) {
                    console.error('Failed to save photo:', e);
                    this.showToast('Foto konnte nicht gespeichert werden');
                }
            }
            this._saving = false;
        },

        get todayWeight() {
            const today = new Date().toISOString().split('T')[0];
            const entry = this.history.find(h => h.date === today);
            return entry ? entry.weight : null;
        },

        get quickLogDisplay() {
            if (this.quickLogWeight !== null) return this.quickLogWeight;
            return this.todayWeight !== null ? this.todayWeight : this.currentWeight;
        },

        quickLogStep(delta) {
            const base = this.quickLogDisplay;
            if (!base || base === 0) return;
            this.quickLogWeight = Math.round((base + delta) * 10) / 10;
        },

        async quickLogSave() {
            const w = this.quickLogDisplay;
            if (!w || w === 0 || this._saving) return;
            const entryDate = new Date().toISOString().split('T')[0];

            this._saving = true;
            const oldW = this.currentWeight;

            this.history = this.history.filter(h => h.date !== entryDate);
            this.history.push({ date: entryDate, weight: w });
            this.history.sort((a, b) => a.date.localeCompare(b.date));

            try {
                await Supa.upsertWeightEntry(entryDate, w);
            } catch (e) {
                console.error('Failed to save quick entry:', e);
                this.showToast('Fehler beim Speichern');
            }

            this.$nextTick(() => {
                this.updateChart();
                this.refreshAnimations();
                this.checkUnlocks(oldW, w);
                this._saving = false;
            });

            this.quickLogWeight = null;
            this.showToast(w.toFixed(1) + ' kg gespeichert');
        },

        deleteEntry(index) {
            const logEntry = this.logs[index];
            if (!logEntry) return;

            const removed = { date: logEntry.date, weight: logEntry.weight };
            this.history = this.history.filter(h => h.date !== removed.date);
            const hadPhoto = this.photoDates.includes(removed.date);

            Supa.deleteWeightEntry(removed.date).catch(e => console.error('Failed to delete entry:', e));

            try { this.updateChart(); } catch (e) {}
            this.refreshAnimations();

            if (hadPhoto) {
                Supa.deletePhoto(removed.date).then(() => {
                    this.photoDates = this.photoDates.filter(d => d !== removed.date);
                    if (this.galleryLoaded) this.refreshGallery();
                }).catch(e => console.error('Failed to delete photo:', e));
            }

            this.showToast('Eintrag gelöscht', () => {
                this.history.push(removed);
                this.history.sort((a, b) => a.date.localeCompare(b.date));
                Supa.upsertWeightEntry(removed.date, removed.weight).catch(e => console.error('Failed to restore entry:', e));
                this.updateChart();
                this.refreshAnimations();
            });
        },

        clearAllEntries() {
            this.confirmModal = {
                show: true,
                title: 'Alle Einträge löschen',
                message: 'Alle ' + this.history.length + ' Gewichtseinträge und Fotos löschen?',
                onConfirm: async () => {
                    this.history = [];
                    this.photoDates = [];
                    this.galleryPhotos = [];
                    this.galleryLoaded = false;
                    try {
                        await Promise.all([
                            Supa.clearAllWeightEntries(),
                            Supa.clearAllPhotos()
                        ]);
                    } catch (e) {
                        console.error('Failed to clear entries:', e);
                    }
                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage('CLEAR_CACHE');
                    }
                    this.updateChart();
                    this.refreshAnimations();
                    this.showToast('Alle Einträge gelöscht');
                }
            };
        },

        resetData() {
            this.confirmModal = {
                show: true,
                title: 'Kompletter Reset',
                message: 'Alle Daten inklusive Einstellungen, Training und Fotos löschen?',
                onConfirm: async () => {
                    try {
                        await Promise.all([
                            Supa.clearAllWeightEntries(),
                            Supa.saveSettings({
                                startWeight: 0,
                                goalWeight: 0,
                                goalDate: null,
                                userHeight: 0,
                                userAge: 0
                            }),
                            Supa.saveRewards([]),
                            Supa.saveTrainingPlan(Array.from({ length: 7 }, () => [])),
                            Supa.saveLayout(DEFAULT_LAYOUT),
                            Supa.clearAllPhotos()
                        ]);
                    } catch (e) {
                        console.error('Failed to reset data:', e);
                    }

                    // Clear service worker cache so stale data doesn't come back on reload
                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage('CLEAR_CACHE');
                    }

                    // Reset local state without reload to avoid seed data creation
                    this.history = [];
                    this.startWeight = 0;
                    this.goalWeight = 0;
                    this.goalDate = null;
                    this.userHeight = 0;
                    this.userAge = 0;
                    this.rewards = [];
                    this.trainingPlan = Array.from({ length: 7 }, () => []);
                    this.photoDates = [];
                    this.galleryPhotos = [];
                    this.galleryLoaded = false;
                    this.widgetLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));

                    this.settingsOpen = false;
                    this.updateChart();
                    this.refreshAnimations();
                    this.showToast('Alle Daten gelöscht');
                }
            };
        },

        // --- COMPUTED / HELPERS ---
        get logs() {
            return [...this.history].reverse();
        },

        get currentWeight() {
            if (this.history.length === 0) return this.startWeight;
            return this.history[this.history.length - 1].weight;
        },

        get bmi() {
            return calculateBMI(this.currentWeight, this.userHeight);
        },

        get bmiRanges() {
            return getBMIRanges(this.userHeight);
        },

        get trend() {
            return calculateTrend(this.history);
        },

        get globalProgress() {
            const total = this.startWeight - this.goalWeight;
            if (this.startWeight === 0 && this.goalWeight === 0) return 0;
            if (Math.abs(total) < 0.1) return 100;
            const done = this.startWeight - this.currentWeight;
            const pct = (done / total) * 100;
            return Math.round(Math.min(Math.max(pct, 0), 100));
        },

        get oracle() {
            return calculateOracle(this.history, this.currentWeight, this.goalWeight);
        },

        get streakDays() {
            if (this.history.length === 0) return 0;
            const uniqueDates = [...new Set(this.history.map(h => h.date))].sort();
            const today = new Date().toISOString().split('T')[0];
            const lastLog = uniqueDates[uniqueDates.length - 1];
            const diffHours = (new Date(today) - new Date(lastLog)) / (1000 * 3600);
            if (diffHours > 48) return 0;
            let streak = 1;
            for (let i = uniqueDates.length - 1; i > 0; i--) {
                const curr = new Date(uniqueDates[i]);
                const prev = new Date(uniqueDates[i - 1]);
                const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
                if (diffDays <= 1.5) streak++; else break;
            }
            return streak;
        },

        get nextReward() {
            return this.rewards.find(r => r.target < this.currentWeight) || null;
        },

        get filteredHistory() {
            if (this.chartFilter === 'ALL') return this.history;
            const now = new Date();
            const cutoff = new Date();
            if (this.chartFilter === '1M') cutoff.setDate(now.getDate() - 30);
            else if (this.chartFilter === '3M') cutoff.setMonth(now.getMonth() - 3);
            return this.history.filter(h => new Date(h.date) >= cutoff);
        },

        get weeklyTrend() {
            const now = new Date();
            const thisMonday = new Date(now);
            thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            thisMonday.setHours(0, 0, 0, 0);
            const lastMonday = new Date(thisMonday);
            lastMonday.setDate(lastMonday.getDate() - 7);
            const thisWeekEntries = this.history.filter(h => new Date(h.date) >= thisMonday);
            const lastWeekEntries = this.history.filter(h => {
                const d = new Date(h.date);
                return d >= lastMonday && d < thisMonday;
            });
            const avg = arr => arr.length ? arr.reduce((s, e) => s + e.weight, 0) / arr.length : null;
            const thisWeekAvg = avg(thisWeekEntries);
            const lastWeekAvg = avg(lastWeekEntries);
            return {
                thisWeek: thisWeekAvg,
                lastWeek: lastWeekAvg,
                change: (thisWeekAvg !== null && lastWeekAvg !== null) ? thisWeekAvg - lastWeekAvg : null
            };
        },

        getLogDelta(index) {
            const logs = this.logs;
            if (index >= logs.length - 1) return null;
            if (!logs[index] || !logs[index + 1]) return null;
            return logs[index].weight - logs[index + 1].weight;
        },

        getWeightForDate(date) {
            const entry = this.history.find(h => h.date === date);
            return entry ? entry.weight.toFixed(1) + ' kg' : '';
        },

        // --- ESCAPE KEY HANDLER (centralized) ---
        handleEscape() {
            if (this.confirmModal.show) { this.cancelConfirm(); return; }
            if (this.lootboxOpen) { this.closeLootbox(); return; }
            if (this.galleryLightbox.open) { this.closeGalleryLightbox(); return; }
            if (this.bmiDetailOpen) { this.closeBmiDetail(); return; }
            if (this.modalOpen) { this.closeModal(); return; }
            if (this.profileOpen) { this.closeProfile(); return; }
            if (this.milestonesOpen) { this.closeMilestones(); return; }
            if (this.settingsOpen) { this.closeSettings(); return; }
            if (this.trainingOpen) { this.closeTraining(); return; }
        },

        // --- ANIMATIONS & UI UTILS ---
        showToast(message, undoFn) {
            clearTimeout(this._toastTimeout);
            this.toast = { show: true, message, undoAction: undoFn || null };
            this._toastTimeout = setTimeout(() => { this.toast.show = false; }, 5000);
        },
        undoToast() {
            if (this.toast.undoAction) this.toast.undoAction();
            clearTimeout(this._toastTimeout);
            this.toast.show = false;
        },
        confirmAction() {
            if (!this.confirmModal.show) return;
            const callback = this.confirmModal.onConfirm;
            this.confirmModal.show = false;
            this.confirmModal.onConfirm = null;
            if (callback) callback();
        },
        cancelConfirm() {
            if (!this.confirmModal.show) return;
            this.confirmModal.show = false;
        },

        trapFocus(event, container) {
            const focusable = container.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        },

        animateTo(key, target, duration = 600) {
            if (this._animFrames[key]) cancelAnimationFrame(this._animFrames[key]);
            const start = this[key];
            const diff = target - start;
            if (Math.abs(diff) < 0.01) { this[key] = target; return; }
            const startTime = performance.now();
            const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const step = (now) => {
                const elapsed = Math.min((now - startTime) / duration, 1);
                this[key] = start + diff * ease(elapsed);
                if (elapsed < 1) { this._animFrames[key] = requestAnimationFrame(step); }
            };
            this._animFrames[key] = requestAnimationFrame(step);
        },

        refreshAnimations() {
            const h = this.userHeight / 100;
            const safeBmi = h > 0 ? parseFloat((this.currentWeight / (h * h)).toFixed(1)) : 0;
            this.animateTo('displayWeight', this.currentWeight, 800);
            this.animateTo('displayBmi', safeBmi, 600);
            this.animateTo('displayProgress', parseFloat(this.globalProgress), 1000);
            this.animateTo('displayLost', this.startWeight - this.currentWeight, 700);
        },

        // --- CHARTING ---
        computeMovingAverage(values, windowSize) {
            return values.map((_, i) => {
                const start = Math.max(0, i - windowSize + 1);
                const slice = values.slice(start, i + 1);
                return slice.reduce((a, b) => a + b, 0) / slice.length;
            });
        },

        setChartFilter(filter) {
            this.chartFilter = filter;
            this.updateChart();
        },

        getRawChartData() {
            return JSON.parse(JSON.stringify(this.filteredHistory));
        },

        buildGoalLineData(data) {
            if (!this.goalDate || !this.goalWeight || data.length === 0) return null;

            const goalDate = new Date(this.goalDate);
            const startDate = new Date(data[0].date);
            const endDate = new Date(data[data.length - 1].date);
            const goalWeight = this.goalWeight;
            const startWeight = this.startWeight;

            const goalLineData = data.map(entry => {
                const entryDate = new Date(entry.date);
                const totalDays = (goalDate - startDate) / (1000 * 60 * 60 * 24);
                if (totalDays <= 0) return null;
                const elapsedDays = (entryDate - startDate) / (1000 * 60 * 60 * 24);
                const progress = Math.min(elapsedDays / totalDays, 1);
                return startWeight + (goalWeight - startWeight) * progress;
            });

            if (goalDate > endDate) {
                const totalDays = (goalDate - startDate) / (1000 * 60 * 60 * 24);
                const lastDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
                const lastProgress = Math.min(lastDays / totalDays, 1);
                goalLineData[goalLineData.length - 1] = startWeight + (goalWeight - startWeight) * lastProgress;
            }

            return goalLineData;
        },

        renderChart() {
            const ctx = document.getElementById('mainChart');
            if (!ctx) return;
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

            const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            Chart.defaults.font.family = 'JetBrains Mono';
            Chart.defaults.color = '#8b8b94';

            const data = this.getRawChartData();
            const weights = data.map(h => h.weight);
            const movingAvg = this.computeMovingAverage(weights, 7);
            const goalLineData = this.buildGoalLineData(data);

            const datasets = [{
                label: 'Weight',
                data: weights,
                borderColor: '#fff',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHitRadius: 20
            }, {
                label: '7-Day Avg',
                data: movingAvg,
                borderColor: 'rgba(129, 140, 248, 0.5)',
                borderWidth: 1.5,
                borderDash: [4, 4],
                fill: false,
                pointRadius: 0
            }];

            if (goalLineData) {
                datasets.push({
                    label: 'Ziel-Linie',
                    data: goalLineData,
                    borderColor: 'rgba(16, 185, 129, 0.45)',
                    borderWidth: 1.5,
                    borderDash: [8, 4],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                });
            }

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(h => new Date(h.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })),
                    datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
                        y: { grid: { color: 'rgba(255,255,255,0.03)' }, border: { display: false } }
                    }
                }
            });
        },

        updateChart() {
            if (chartInstance) {
                requestAnimationFrame(() => {
                    try {
                        const data = this.getRawChartData();
                        const weights = data.map(h => h.weight);
                        if (!chartInstance) return;
                        chartInstance.data.labels = data.map(h => new Date(h.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }));
                        chartInstance.data.datasets[0].data = weights;
                        if (chartInstance.data.datasets[1]) {
                            chartInstance.data.datasets[1].data = this.computeMovingAverage(weights, 7);
                        }
                        const goalLineData = this.buildGoalLineData(data);
                        const goalDatasetIdx = chartInstance.data.datasets.findIndex(d => d.label === 'Ziel-Linie');
                        if (goalLineData) {
                            if (goalDatasetIdx >= 0) {
                                chartInstance.data.datasets[goalDatasetIdx].data = goalLineData;
                            } else {
                                chartInstance.data.datasets.push({
                                    label: 'Ziel-Linie',
                                    data: goalLineData,
                                    borderColor: 'rgba(16, 185, 129, 0.45)',
                                    borderWidth: 1.5,
                                    borderDash: [8, 4],
                                    fill: false,
                                    pointRadius: 0,
                                    pointHoverRadius: 0
                                });
                            }
                        } else if (goalDatasetIdx >= 0) {
                            chartInstance.data.datasets.splice(goalDatasetIdx, 1);
                        }
                        chartInstance.update('none');
                    } catch (e) {
                        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
                        this.renderChart();
                    }
                });
            } else {
                 this.renderChart();
            }
        }
    };
}

// Global verfügbar machen für Alpine
window.app = app;

// Alpine starten
Alpine.start();
