import { getTodayWeekdayIndex, getLocalDateString } from '../utils/formatting.js';
import { WEEKDAYS } from '../utils/constants.js';
import * as Supa from '../store/supabase.js';
import { hapticMedium, hapticSuccess, hapticWarning, hapticLight } from '../utils/haptics.js';

export const workoutMixin = () => ({
    // --- Workout Session State ---
    workoutOpen: false,
    workoutActive: false,
    workoutSession: null,
    workoutHistory: [],
    workoutHistoryOpen: false,
    workoutHistoryLoaded: false,
    _workoutTimerInterval: null,
    _workoutElapsed: 0,
    _workoutStartTimestamp: null,

    // --- Exercise Selection State ---
    workoutPickerOpen: false,
    workoutPickerExercises: [],
    workoutTrackingEnabled: true,

    // --- History Filter State ---
    workoutHistoryFilter: '',

    // --- LocalStorage Persistence ---
    _persistWorkout() {
        if (!this.workoutSession) return;
        try {
            localStorage.setItem('active_workout', JSON.stringify({
                session: this.workoutSession,
                startTimestamp: this._workoutStartTimestamp
            }));
        } catch (e) { /* quota exceeded or private browsing */ }
    },

    _clearWorkoutStorage() {
        try { localStorage.removeItem('active_workout'); } catch (e) {}
    },

    restoreWorkoutFromStorage() {
        try {
            const raw = localStorage.getItem('active_workout');
            if (!raw) return;
            const { session, startTimestamp } = JSON.parse(raw);
            if (!session || !startTimestamp) { this._clearWorkoutStorage(); return; }
            this.workoutSession = session;
            this.workoutActive = true;
            this._workoutStartTimestamp = startTimestamp;
            this._workoutElapsed = Math.floor((Date.now() - startTimestamp) / 1000);
            this._startWorkoutTimer();
            if (typeof this.updateThemeColor === 'function') this.updateThemeColor();
        } catch (e) {
            this._clearWorkoutStorage();
        }
    },

    // --- Open Exercise Picker ---
    openWorkoutPicker() {
        const dayIdx = getTodayWeekdayIndex();
        const todayPlan = this.trainingPlan[dayIdx] || [];
        if (todayPlan.length === 0) return;

        this.workoutPickerExercises = todayPlan.map((ex, i) => ({
            ...JSON.parse(JSON.stringify(ex)),
            selected: true,
            index: i
        }));
        this.workoutTrackingEnabled = true;
        this.workoutPickerOpen = true;
    },

    closeWorkoutPicker() {
        this.workoutPickerOpen = false;
    },

    togglePickerExercise(idx) {
        this.workoutPickerExercises[idx].selected = !this.workoutPickerExercises[idx].selected;
    },

    selectAllPickerExercises() {
        const allSelected = this.workoutPickerExercises.every(e => e.selected);
        this.workoutPickerExercises.forEach(e => e.selected = !allSelected);
    },

    // --- Start Workout (from picker selection) ---
    startWorkout(fromPicker = false) {
        const dayIdx = getTodayWeekdayIndex();

        let selectedPlan;
        if (fromPicker) {
            selectedPlan = this.workoutPickerExercises.filter(e => e.selected);
            if (selectedPlan.length === 0) return;
            this.workoutPickerOpen = false;
        } else {
            const todayPlan = this.trainingPlan[dayIdx] || [];
            if (todayPlan.length === 0) return;
            selectedPlan = todayPlan;
        }

        const tracking = fromPicker ? this.workoutTrackingEnabled : true;

        const exercises = selectedPlan.map(ex => {
            const type = ex.type || 'strength';
            if (type === 'strength') {
                const defaultWeight = parseFloat(ex.weight) || 0;
                return {
                    name: ex.name,
                    type,
                    planned_sets: parseInt(ex.sets) || 3,
                    planned_reps: ex.reps || '',
                    planned_weight: defaultWeight,
                    note: ex.note || '',
                    sets: tracking ? Array.from({ length: parseInt(ex.sets) || 3 }, () => ({
                        weight: defaultWeight,
                        reps: 0,
                        done: false
                    })) : [],
                    tracked: tracking
                };
            } else if (type === 'cardio') {
                return {
                    name: ex.name,
                    type,
                    planned_duration: ex.duration || '',
                    note: ex.note || '',
                    duration: '',
                    done: false,
                    tracked: tracking
                };
            } else if (type === 'circuit') {
                return {
                    name: ex.name,
                    type,
                    planned_rounds: parseInt(ex.rounds) || 3,
                    circuitExercises: (ex.circuitExercises || []).map(ce => ({
                        name: ce.name || '',
                        reps: ce.reps || '',
                        duration: ce.duration || '',
                        weight: parseFloat(ce.weight) || 0
                    })),
                    note: ex.note || '',
                    rounds: tracking ? Array.from({ length: parseInt(ex.rounds) || 3 }, () => ({
                        done: false
                    })) : [],
                    done: false,
                    tracked: tracking
                };
            } else {
                return {
                    name: ex.name,
                    type,
                    planned_distance: ex.distance || '',
                    planned_duration: ex.duration || '',
                    note: ex.note || '',
                    distance: '',
                    duration: '',
                    done: false,
                    tracked: tracking
                };
            }
        });

        this.workoutSession = {
            date: getLocalDateString(),
            dayIndex: dayIdx,
            startedAt: new Date().toISOString(),
            tracked: tracking,
            exercises
        };
        this.workoutActive = true;
        this.workoutOpen = true;
        this._workoutElapsed = 0;
        this._workoutStartTimestamp = Date.now();
        this._startWorkoutTimer();
        this._persistWorkout();
        if (typeof this.updateThemeColor === 'function') this.updateThemeColor();
    },

    _startWorkoutTimer() {
        if (this._workoutTimerInterval) clearInterval(this._workoutTimerInterval);
        this._workoutTimerInterval = setInterval(() => {
            if (this._workoutStartTimestamp) {
                this._workoutElapsed = Math.floor((Date.now() - this._workoutStartTimestamp) / 1000);
            }
        }, 1000);
    },

    // --- Toggle Set Done ---
    toggleSet(exIdx, setIdx) {
        if (!this.workoutSession) return;
        const set = this.workoutSession.exercises[exIdx].sets[setIdx];
        set.done = !set.done;
        hapticMedium();
        this._persistWorkout();
        if (set.done && typeof this.startRestTimer === 'function') {
            this.startRestTimer();
        }
    },

    // --- Toggle Circuit Round Done ---
    toggleCircuitRound(exIdx, roundIdx) {
        if (!this.workoutSession) return;
        const round = this.workoutSession.exercises[exIdx].rounds[roundIdx];
        round.done = !round.done;
        hapticMedium();
        this._persistWorkout();
    },

    // --- Toggle Cardio/Distance Exercise Done ---
    toggleExerciseDone(exIdx) {
        if (!this.workoutSession) return;
        const ex = this.workoutSession.exercises[exIdx];
        ex.done = !ex.done;
        hapticMedium();
        this._persistWorkout();
    },

    // --- Add Extra Set ---
    addWorkoutSet(exIdx) {
        if (!this.workoutSession) return;
        hapticLight();
        const ex = this.workoutSession.exercises[exIdx];
        const lastSet = ex.sets[ex.sets.length - 1];
        ex.sets.push({
            weight: lastSet ? lastSet.weight : 0,
            reps: lastSet ? lastSet.reps : 0,
            done: false
        });
        this._persistWorkout();
    },

    // --- Complete Workout ---
    async finishWorkout() {
        if (!this.workoutSession) return;

        if (this._workoutTimerInterval) {
            clearInterval(this._workoutTimerInterval);
            this._workoutTimerInterval = null;
        }

        const session = {
            ...this.workoutSession,
            finishedAt: new Date().toISOString(),
            durationSeconds: this._workoutElapsed
        };

        try {
            const savedId = await Supa.saveWorkoutLog(session);
            if (savedId) session.id = savedId;
            this.workoutHistory.unshift(session);
            this.workoutHistoryLoaded = true;
        } catch (e) {
            console.error('Failed to save workout:', e);
            this.showToast('Workout konnte nicht gespeichert werden');
        }

        this.workoutSession = null;
        this.workoutActive = false;
        this.workoutOpen = false;
        this._workoutElapsed = 0;
        this._workoutStartTimestamp = null;
        this._clearWorkoutStorage();
        if (typeof this.clearRestTimer === 'function') this.clearRestTimer();
        hapticSuccess();
        if (typeof this.updateThemeColor === 'function') this.updateThemeColor();
        this.showToast('Workout gespeichert!');
    },

    // --- Cancel Workout ---
    cancelWorkout() {
        this.confirmModal = {
            show: true,
            title: 'Workout abbrechen',
            message: 'Workout ohne Speichern beenden?',
            confirmLabel: 'Abbrechen',
            onConfirm: () => {
                if (this._workoutTimerInterval) {
                    clearInterval(this._workoutTimerInterval);
                    this._workoutTimerInterval = null;
                }
                this.workoutSession = null;
                this.workoutActive = false;
                this.workoutOpen = false;
                this._workoutElapsed = 0;
                this._workoutStartTimestamp = null;
                this._clearWorkoutStorage();
                if (typeof this.clearRestTimer === 'function') this.clearRestTimer();
                if (typeof this.updateThemeColor === 'function') this.updateThemeColor();
            }
        };
    },

    closeWorkout() {
        this.workoutOpen = false;
    },

    resumeWorkout() {
        if (this.workoutActive && this.workoutSession) {
            this.workoutOpen = true;
        }
    },

    // --- History ---
    async loadWorkoutHistory() {
        if (this.workoutHistoryLoaded) return;
        try {
            this.workoutHistory = await Supa.getWorkoutLogs();
            this.workoutHistoryLoaded = true;
        } catch (e) {
            console.error('Failed to load workout history:', e);
        }
    },

    openWorkoutHistory() {
        this.workoutHistoryOpen = true;
        this.loadWorkoutHistory();
    },

    closeWorkoutHistory() {
        this.workoutHistoryOpen = false;
        this.workoutHistoryFilter = '';
    },

    deleteWorkout(wIdx) {
        const workout = this.workoutHistory[wIdx];
        if (!workout) return;
        this.confirmModal = {
            show: true,
            title: 'Workout löschen',
            message: 'Dieses Workout unwiderruflich löschen?',
            confirmLabel: 'Löschen',
            onConfirm: async () => {
                try {
                    if (workout.id) {
                        await Supa.deleteWorkoutLog(workout.id);
                    }
                    // Erst nach API-Erfolg aus UI entfernen
                    const idx = this.workoutHistory.indexOf(workout);
                    if (idx !== -1) this.workoutHistory.splice(idx, 1);
                    this.showToast('Workout gelöscht');
                } catch (e) {
                    console.error('Workout löschen fehlgeschlagen:', e);
                    this.showToast('Löschen fehlgeschlagen');
                }
            }
        };
    },

    clearAllWorkouts() {
        if (this.workoutHistory.length === 0) return;
        this.confirmModal = {
            show: true,
            title: 'Alle Workouts löschen',
            message: 'Alle ' + this.workoutHistory.length + ' Workouts unwiderruflich löschen?',
            confirmLabel: 'Alle löschen',
            onConfirm: async () => {
                try {
                    await Supa.clearAllWorkoutLogs();
                    this.workoutHistory = [];
                    this.showToast('Alle Workouts gelöscht');
                } catch (e) {
                    console.error('Alle Workouts löschen fehlgeschlagen:', e);
                    this.showToast('Löschen fehlgeschlagen');
                }
            }
        };
    },

    formatWorkoutDuration(seconds) {
        if (!seconds || seconds < 0) return '0 Min';
        const mins = Math.floor(seconds / 60);
        return `${mins} Min`;
    },

    getWorkoutExerciseCount(workout) {
        return (workout.exercises || []).length;
    },

    getWorkoutSetsCompleted(workout) {
        return (workout.exercises || []).flatMap(e => e.sets || []).filter(s => s.done).length;
    },

    // Helper: get max weight for a strength exercise
    getExerciseMaxWeight(ex) {
        if (!ex || !ex.sets) return 0;
        let max = 0;
        for (const s of ex.sets) {
            if (s.done && s.weight > max) max = s.weight;
        }
        return max;
    },

    // Helper: get total volume (weight x reps) for a strength exercise
    getExerciseVolume(ex) {
        if (!ex || !ex.sets) return 0;
        return ex.sets.filter(s => s.done).reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
    }
});
