import { getTodayWeekdayIndex } from '../utils/formatting.js';
import { WEEKDAYS } from '../utils/constants.js';
import * as Supa from '../store/supabase.js';

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

    // --- Exercise Selection State ---
    workoutPickerOpen: false,
    workoutPickerExercises: [],
    workoutTrackingEnabled: true,

    // --- Comparison State ---
    workoutComparisonOpen: false,
    workoutComparisonData: null,

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
                return {
                    name: ex.name,
                    type,
                    planned_sets: parseInt(ex.sets) || 3,
                    planned_reps: ex.reps || '',
                    note: ex.note || '',
                    sets: tracking ? Array.from({ length: parseInt(ex.sets) || 3 }, () => ({
                        weight: 0,
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
                        duration: ce.duration || ''
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
        this._startWorkoutTimer();
    },

    _startWorkoutTimer() {
        if (this._workoutTimerInterval) clearInterval(this._workoutTimerInterval);
        this._workoutTimerInterval = setInterval(() => {
            this._workoutElapsed++;
        }, 1000);
    },

    // --- Toggle Set Done ---
    toggleSet(exIdx, setIdx) {
        if (!this.workoutSession) return;
        const set = this.workoutSession.exercises[exIdx].sets[setIdx];
        set.done = !set.done;
        if (set.done && typeof this.startRestTimer === 'function') {
            this.startRestTimer();
        }
    },

    // --- Toggle Circuit Round Done ---
    toggleCircuitRound(exIdx, roundIdx) {
        if (!this.workoutSession) return;
        const round = this.workoutSession.exercises[exIdx].rounds[roundIdx];
        round.done = !round.done;
    },

    // --- Toggle Cardio/Distance Exercise Done ---
    toggleExerciseDone(exIdx) {
        if (!this.workoutSession) return;
        const ex = this.workoutSession.exercises[exIdx];
        ex.done = !ex.done;
    },

    // --- Add Extra Set ---
    addWorkoutSet(exIdx) {
        if (!this.workoutSession) return;
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
            await Supa.saveWorkoutLog(session);
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

        this.workoutSession = null;
        this.workoutActive = false;
        this.workoutOpen = false;
        this._workoutElapsed = 0;
        if (typeof this.clearRestTimer === 'function') this.clearRestTimer();
        this.showToast('Workout gespeichert! 💪');
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
                if (typeof this.clearRestTimer === 'function') this.clearRestTimer();
            }
        };
    },

    closeWorkout() {
        if (this.workoutActive) {
            this.workoutOpen = false;
        } else {
            this.workoutOpen = false;
        }
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
            comparisons
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
    }
});
