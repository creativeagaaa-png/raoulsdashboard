import { WEEKDAYS, WEEKDAY_SHORT } from '../utils/constants.js';
import { getTodayWeekdayIndex } from '../utils/formatting.js';
import * as Supa from '../store/supabase.js';

export const trainingMixin = () => ({
    WEEKDAYS,
    WEEKDAY_SHORT,
    trainingOpen: false,
    trainingSelectedDay: getTodayWeekdayIndex(),
    trainingPlan: WEEKDAYS.map(() => []),
    trainingForm: WEEKDAYS.map(() => []),
    trainingDirty: false,
    trainingShowAddForm: false,
    trainingNewExercise: { name: '', sets: '', reps: '', weight: '', note: '', type: 'strength', rounds: '', circuitExercises: [{ name: '', reps: '', duration: '', weight: '' }] },

    async saveTrainingPlan() {
        try {
            await Supa.saveTrainingPlan(this.trainingPlan);
        } catch (e) {
            console.error('Failed to save training plan:', e);
            this.showToast('Fehler beim Speichern des Trainingsplans');
        }
    },

    // NOTE: todayTraining, todayWeekday, isRestDay are defined as getters
    // in main.js to preserve reactivity (spread destroys getters).

    getTodayWeekdayIndex,

    openTraining() {
        this.trainingSelectedDay = getTodayWeekdayIndex();
        this.trainingForm = JSON.parse(JSON.stringify(this.trainingPlan));
        this.trainingDirty = false;
        this.trainingNewExercise = { name: '', sets: '', reps: '', weight: '', note: '', type: 'strength', rounds: '', circuitExercises: [{ name: '', reps: '', duration: '', weight: '' }] };
        this.trainingShowAddForm = false;
        this.trainingOpen = true;
    },

    closeTraining(force) {
        if (this.trainingDirty && !force) {
            this.confirmModal = {
                show: true,
                title: 'Ungespeicherte Änderungen',
                message: 'Änderungen am Trainingsplan verwerfen?',
                confirmLabel: 'Verwerfen',
                onConfirm: () => {
                    this.trainingOpen = false;
                }
            };
            return;
        }
        this.trainingOpen = false;
    },

    addExercise() {
        const ex = this.trainingNewExercise;
        if (!ex.name || String(ex.name).trim() === '') return;
        const type = ex.type || 'strength';
        const entry = {
            name: String(ex.name).trim(),
            type,
            note: String(ex.note).trim() || ''
        };
        if (type === 'strength') {
            entry.sets = parseInt(ex.sets) || 0;
            entry.reps = String(ex.reps).trim() || '';
            entry.weight = parseFloat(ex.weight) || 0;
        } else if (type === 'cardio') {
            entry.duration = String(ex.reps).trim() || '';
        } else if (type === 'distance') {
            entry.distance = String(ex.sets).trim() || '';
            entry.duration = String(ex.reps).trim() || '';
        } else if (type === 'circuit') {
            entry.rounds = parseInt(ex.rounds) || 3;
            entry.circuitExercises = (ex.circuitExercises || [])
                .filter(ce => ce.name && String(ce.name).trim() !== '')
                .map(ce => ({
                    name: String(ce.name).trim(),
                    reps: String(ce.reps || '').trim(),
                    duration: String(ce.duration || '').trim(),
                    weight: parseFloat(ce.weight) || 0
                }));
        }
        this.trainingForm[this.trainingSelectedDay].push(entry);
        this.trainingNewExercise = { name: '', sets: '', reps: '', weight: '', note: '', type: 'strength', rounds: '', circuitExercises: [{ name: '', reps: '', duration: '', weight: '' }] };
        this.trainingDirty = true;
    },

    addCircuitExerciseField() {
        this.trainingNewExercise.circuitExercises.push({ name: '', reps: '', duration: '', weight: '' });
    },

    removeCircuitExerciseField(idx) {
        if (this.trainingNewExercise.circuitExercises.length > 1) {
            this.trainingNewExercise.circuitExercises.splice(idx, 1);
        }
    },

    removeExercise(dayIndex, exIndex) {
        this.trainingForm[dayIndex].splice(exIndex, 1);
        this.trainingDirty = true;
    },

    moveExercise(dayIndex, exIndex, direction) {
        const list = this.trainingForm[dayIndex];
        const newIndex = exIndex + direction;
        if (newIndex < 0 || newIndex >= list.length) return;
        const [item] = list.splice(exIndex, 1);
        list.splice(newIndex, 0, item);
        this.trainingDirty = true;
    },

    async applyTraining() {
        this.trainingPlan = JSON.parse(JSON.stringify(this.trainingForm));
        await this.saveTrainingPlan();
        this.trainingDirty = false;
        this.trainingOpen = false;
        this.showToast('Trainingsplan gespeichert');
    },

    markTrainingDirty() {
        this.trainingDirty = true;
    }
});
