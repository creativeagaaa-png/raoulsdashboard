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

        const exercises = todayPlan.map(ex => {
            const type = ex.type || 'strength';
            if (type === 'strength') {
                return {
                    name: ex.name,
                    type,
                    planned_sets: parseInt(ex.sets) || 3,
                    planned_reps: ex.reps || '',
                    note: ex.note || '',
                    sets: Array.from({ length: parseInt(ex.sets) || 3 }, () => ({
                        weight: 0,
                        reps: 0,
                        done: false
                    }))
                };
            } else if (type === 'cardio') {
                return {
                    name: ex.name,
                    type,
                    planned_duration: ex.duration || '',
                    note: ex.note || '',
                    duration: '',
                    done: false
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
                    done: false
                };
            }
        });

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
