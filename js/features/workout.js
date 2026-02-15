import { getTodayWeekdayIndex } from '../utils/formatting.js';
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

    // --- Start Workout ---
    startWorkout() {
        const dayIdx = getTodayWeekdayIndex();
        const todayPlan = this.trainingPlan[dayIdx] || [];
        if (todayPlan.length === 0) return;

        const exercises = todayPlan.map(ex => ({
            name: ex.name,
            planned_sets: parseInt(ex.sets) || 3,
            planned_reps: ex.reps || '',
            note: ex.note || '',
            sets: Array.from({ length: parseInt(ex.sets) || 3 }, () => ({
                weight: 0,
                reps: 0,
                done: false
            }))
        }));

        this.workoutSession = {
            date: new Date().toISOString().split('T')[0],
            dayIndex: dayIdx,
            startedAt: new Date().toISOString(),
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

    // --- Workout Timer Display ---
    get workoutDuration() {
        const s = this._workoutElapsed;
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    },

    // --- Workout Completion ---
    get workoutCompletionPercent() {
        if (!this.workoutSession) return 0;
        const allSets = this.workoutSession.exercises.flatMap(e => e.sets);
        if (allSets.length === 0) return 0;
        const done = allSets.filter(s => s.done).length;
        return Math.round((done / allSets.length) * 100);
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
            await Supa.saveWorkoutLog(session);
            this.workoutHistory.unshift(session);
        } catch (e) {
            console.error('Failed to save workout:', e);
            this.showToast('Fehler beim Speichern des Workouts');
        }

        // Check for PRs
        if (typeof this.checkPersonalRecords === 'function') {
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
    }
});
