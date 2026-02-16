import { getTodayWeekdayIndex } from '../utils/formatting.js';
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

    // --- Comparison State ---
    workoutComparisonOpen: false,
    workoutComparisonData: null,
    _lastFinishedWorkout: null,

    // --- History Filter State ---
    workoutHistoryFilter: '',

    // --- Open Exercise Picker (replaces direct startWorkout) ---
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
            // Legacy direct start (fallback)
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
            date: new Date().toISOString().split('T')[0],
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
    },

    // --- Toggle Cardio/Distance Exercise Done ---
    toggleExerciseDone(exIdx) {
        if (!this.workoutSession) return;
        const ex = this.workoutSession.exercises[exIdx];
        ex.done = !ex.done;
        hapticMedium();
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
    },

    // NOTE: workoutDuration, workoutCompletionPercent are defined as getters
    // in main.js to preserve reactivity (spread destroys getters).

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
            this.showToast('Fehler beim Speichern des Workouts');
        }

        // Check for PRs only if tracking was enabled
        if (session.tracked !== false && typeof this.checkPersonalRecords === 'function') {
            await this.checkPersonalRecords(session);
        }

        this._lastFinishedWorkout = session;
        this.workoutSession = null;
        this.workoutActive = false;
        this.workoutOpen = false;
        this._workoutElapsed = 0;
        this._workoutStartTimestamp = null;
        if (typeof this.clearRestTimer === 'function') this.clearRestTimer();
        hapticSuccess();
        if (typeof this.updateThemeColor === 'function') this.updateThemeColor();
        this.showToast('Workout gespeichert! 💪');
    },

    showPostWorkoutComparison() {
        if (!this._lastFinishedWorkout) return;
        this.openWorkoutComparison(this._lastFinishedWorkout);
        this._lastFinishedWorkout = null;
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

    // NOTE: filteredWorkoutHistory, workoutHistoryExerciseNames are defined as getters
    // in main.js to preserve reactivity (spread destroys getters).

    deleteWorkout(wIdx) {
        const workout = this.workoutHistory[wIdx];
        if (!workout) return;
        this.confirmModal = {
            show: true,
            title: 'Workout löschen',
            message: 'Dieses Workout unwiderruflich löschen?',
            confirmLabel: 'Löschen',
            onConfirm: async () => {
                const removed = this.workoutHistory.splice(wIdx, 1)[0];
                if (removed && removed.id) {
                    try {
                        await Supa.deleteWorkoutLog(removed.id);
                    } catch (e) {
                        console.error('Failed to delete workout:', e);
                        this.workoutHistory.splice(wIdx, 0, removed);
                        this.showToast('Fehler beim Löschen');
                        return;
                    }
                }
                this.showToast('Workout gelöscht');
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
                    console.error('Failed to clear workouts:', e);
                    this.showToast('Fehler beim Löschen');
                }
            }
        };
    },

    formatWorkoutDuration(seconds) {
        if (!seconds) return '0 Min';
        const mins = Math.floor(seconds / 60);
        return `${mins} Min`;
    },

    getWorkoutExerciseCount(workout) {
        return (workout.exercises || []).length;
    },

    getWorkoutSetsCompleted(workout) {
        return (workout.exercises || []).flatMap(e => e.sets || []).filter(s => s.done).length;
    },

    // --- Comparison: find last workout for same exercises ---
    getLastWorkoutForExercise(exerciseName) {
        if (!this.workoutHistory || this.workoutHistory.length === 0) return null;
        for (const workout of this.workoutHistory) {
            if (workout.tracked === false) continue;
            const ex = (workout.exercises || []).find(
                e => e.name.toLowerCase() === exerciseName.toLowerCase() && e.tracked !== false
            );
            if (ex) return { exercise: ex, date: workout.date };
        }
        return null;
    },

    openWorkoutComparison(workout) {
        if (!workout || !workout.exercises) return;

        // Find the previous workout on the same day-type for duration comparison
        let previousWorkout = null;
        for (const w of this.workoutHistory) {
            if (w.date === workout.date && w.startedAt === workout.startedAt) continue;
            if (w.tracked === false) continue;
            previousWorkout = w;
            break;
        }

        const comparisons = workout.exercises
            .filter(ex => ex.tracked !== false)
            .map(ex => {
                // Find the previous workout with the same exercise (excluding this one)
                let previous = null;
                for (const w of this.workoutHistory) {
                    if (w.date === workout.date && w.startedAt === workout.startedAt) continue;
                    if (w.tracked === false) continue;
                    const prevEx = (w.exercises || []).find(
                        e => e.name.toLowerCase() === ex.name.toLowerCase() && e.tracked !== false
                    );
                    if (prevEx) {
                        previous = { exercise: prevEx, date: w.date };
                        break;
                    }
                }
                return {
                    name: ex.name,
                    type: ex.type || 'strength',
                    current: ex,
                    currentDate: workout.date,
                    previous: previous ? previous.exercise : null,
                    previousDate: previous ? previous.date : null
                };
            });

        this.workoutComparisonData = {
            workout,
            comparisons,
            previousWorkoutDuration: previousWorkout ? previousWorkout.durationSeconds : null,
            previousWorkoutDate: previousWorkout ? previousWorkout.date : null
        };
        this.workoutComparisonOpen = true;
    },

    closeWorkoutComparison() {
        this.workoutComparisonOpen = false;
        this.workoutComparisonData = null;
    },

    // Helper: get max weight for a strength exercise
    getExerciseMaxWeight(ex) {
        if (!ex || !ex.sets) return 0;
        const doneWeights = ex.sets.filter(s => s.done && s.weight > 0).map(s => s.weight);
        return doneWeights.length > 0 ? Math.max(...doneWeights) : 0;
    },

    // Helper: get total volume (weight x reps) for a strength exercise
    getExerciseVolume(ex) {
        if (!ex || !ex.sets) return 0;
        return ex.sets.filter(s => s.done).reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
    },

    // Helper: format comparison delta
    formatDelta(current, previous) {
        if (previous === 0 || !previous) return current > 0 ? '+' + current : '–';
        const diff = current - previous;
        if (diff === 0) return '±0';
        return (diff > 0 ? '+' : '') + diff.toFixed(1);
    },

    // Helper: parse duration string (e.g. "25 min", "1:30:00", "45") to minutes
    parseDurationMinutes(str) {
        if (!str) return 0;
        str = String(str).trim();
        // "HH:MM:SS" or "MM:SS"
        if (str.includes(':')) {
            const parts = str.split(':').map(Number);
            if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
            if (parts.length === 2) return parts[0] + parts[1] / 60;
        }
        // "25 min" or just "25"
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    },

    // Helper: parse distance string to number
    parseDistance(str) {
        if (!str) return 0;
        const num = parseFloat(String(str).replace(',', '.'));
        return isNaN(num) ? 0 : num;
    },

    // Helper: get completed rounds count for circuit
    getCircuitRoundsCompleted(ex) {
        if (!ex || !ex.rounds) return 0;
        return ex.rounds.filter(r => r.done).length;
    },

    // Helper: get total rounds for circuit
    getCircuitRoundsTotal(ex) {
        if (!ex || !ex.rounds) return 0;
        return ex.rounds.length;
    },

    // Helper: format duration seconds to "X Min"
    formatDurationCompare(seconds) {
        if (!seconds) return '–';
        const mins = Math.floor(seconds / 60);
        return mins + ' Min';
    }
});
