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
    trainingNewExercise: { name: '', sets: '', reps: '', note: '', type: 'strength' },

    async saveTrainingPlan() {
        try {
            await Supa.saveTrainingPlan(this.trainingPlan);
        } catch (e) {
            console.error('Failed to save training plan:', e);
            this.showToast('Fehler beim Speichern des Trainingsplans');
        }
    },

    get todayTraining() {
        const idx = getTodayWeekdayIndex();
        return this.trainingPlan[idx] || [];
    },

    get todayWeekday() {
        return WEEKDAYS[getTodayWeekdayIndex()];
    },

    get isRestDay() {
        return this.todayTraining.length === 0;
    },

    getTodayWeekdayIndex,

    openTraining() {
        this.trainingSelectedDay = getTodayWeekdayIndex();
        this.trainingForm = JSON.parse(JSON.stringify(this.trainingPlan));
        this.trainingDirty = false;
        this.trainingNewExercise = { name: '', sets: '', reps: '', note: '', type: 'strength' };
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
        } else if (type === 'cardio') {
            entry.duration = String(ex.reps).trim() || '';
        } else if (type === 'distance') {
            entry.distance = String(ex.sets).trim() || '';
            entry.duration = String(ex.reps).trim() || '';
        }
        this.trainingForm[this.trainingSelectedDay].push(entry);
        this.trainingNewExercise = { name: '', sets: '', reps: '', note: '', type: 'strength' };
        this.trainingDirty = true;
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
