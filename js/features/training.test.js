import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../store/supabase.js', () => ({
    saveTrainingPlan: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../utils/formatting.js', () => ({
    getTodayWeekdayIndex: vi.fn(() => 0)
}));

vi.mock('../utils/constants.js', () => ({
    WEEKDAYS: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
    WEEKDAY_SHORT: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
}));

const { trainingMixin } = await import('./training.js');

function createMixin(overrides = {}) {
    return {
        ...trainingMixin(),
        confirmModal: { show: false },
        showToast: vi.fn(),
        $nextTick: vi.fn(fn => fn()),
        updateChart: vi.fn(),
        refreshAnimations: vi.fn(),
        ...overrides
    };
}

describe('openTraining', () => {
    it('sets trainingOpen to true and creates deep copy of plan', () => {
        const m = createMixin();
        m.trainingPlan = [[{ name: 'Bench Press', type: 'strength' }], [], [], [], [], [], []];
        m.openTraining();
        expect(m.trainingOpen).toBe(true);
        expect(m.trainingForm[0]).toEqual([{ name: 'Bench Press', type: 'strength' }]);
        // Should be a deep copy
        m.trainingForm[0][0].name = 'Modified';
        expect(m.trainingPlan[0][0].name).toBe('Bench Press');
    });

    it('resets dirty state and add form', () => {
        const m = createMixin();
        m.trainingDirty = true;
        m.trainingShowAddForm = true;
        m.openTraining();
        expect(m.trainingDirty).toBe(false);
        expect(m.trainingShowAddForm).toBe(false);
    });
});

describe('closeTraining', () => {
    it('closes immediately when not dirty', () => {
        const m = createMixin();
        m.trainingOpen = true;
        m.trainingDirty = false;
        m.closeTraining();
        expect(m.trainingOpen).toBe(false);
    });

    it('shows confirm modal when dirty', () => {
        const m = createMixin();
        m.trainingOpen = true;
        m.trainingDirty = true;
        m.closeTraining();
        expect(m.confirmModal.show).toBe(true);
        expect(m.trainingOpen).toBe(true); // still open
    });

    it('closes when forced even if dirty', () => {
        const m = createMixin();
        m.trainingOpen = true;
        m.trainingDirty = true;
        m.closeTraining(true);
        expect(m.trainingOpen).toBe(false);
    });
});

describe('addExercise', () => {
    it('does nothing when name is empty', () => {
        const m = createMixin();
        m.trainingNewExercise = { name: '', sets: '3', reps: '10', weight: '80', note: '', type: 'strength', rounds: '', circuitExercises: [] };
        m.trainingSelectedDay = 0;
        m.addExercise();
        expect(m.trainingForm[0]).toHaveLength(0);
    });

    it('does nothing when name is whitespace only', () => {
        const m = createMixin();
        m.trainingNewExercise = { name: '   ', sets: '3', reps: '10', weight: '80', note: '', type: 'strength', rounds: '', circuitExercises: [] };
        m.trainingSelectedDay = 0;
        m.addExercise();
        expect(m.trainingForm[0]).toHaveLength(0);
    });

    it('adds a strength exercise correctly', () => {
        const m = createMixin();
        m.trainingNewExercise = { name: 'Bench Press', sets: '4', reps: '8', weight: '80', note: 'heavy', type: 'strength', rounds: '', circuitExercises: [] };
        m.trainingSelectedDay = 0;
        m.addExercise();
        expect(m.trainingForm[0]).toHaveLength(1);
        expect(m.trainingForm[0][0]).toEqual({
            name: 'Bench Press',
            type: 'strength',
            sets: 4,
            reps: '8',
            weight: 80,
            note: 'heavy'
        });
        expect(m.trainingDirty).toBe(true);
    });

    it('adds a cardio exercise correctly', () => {
        const m = createMixin();
        m.trainingNewExercise = { name: 'Laufen', sets: '', reps: '30 min', weight: '', note: '', type: 'cardio', rounds: '', circuitExercises: [] };
        m.trainingSelectedDay = 2;
        m.addExercise();
        expect(m.trainingForm[2][0]).toEqual({
            name: 'Laufen',
            type: 'cardio',
            duration: '30 min',
            note: ''
        });
    });

    it('adds a distance exercise correctly', () => {
        const m = createMixin();
        m.trainingNewExercise = { name: 'Laufen', sets: '5', reps: '25 min', weight: '', note: '', type: 'distance', rounds: '', circuitExercises: [] };
        m.trainingSelectedDay = 0;
        m.addExercise();
        expect(m.trainingForm[0][0]).toEqual({
            name: 'Laufen',
            type: 'distance',
            distance: '5',
            duration: '25 min',
            note: ''
        });
    });

    it('adds a circuit exercise correctly', () => {
        const m = createMixin();
        m.trainingNewExercise = {
            name: 'Full Body',
            sets: '',
            reps: '',
            weight: '',
            note: 'intense',
            type: 'circuit',
            rounds: '4',
            circuitExercises: [
                { name: 'Push-ups', reps: '15', duration: '', weight: '' },
                { name: '', reps: '', duration: '', weight: '' } // empty one should be filtered
            ]
        };
        m.trainingSelectedDay = 0;
        m.addExercise();
        expect(m.trainingForm[0][0].type).toBe('circuit');
        expect(m.trainingForm[0][0].rounds).toBe(4);
        expect(m.trainingForm[0][0].circuitExercises).toHaveLength(1);
        expect(m.trainingForm[0][0].circuitExercises[0].name).toBe('Push-ups');
    });

    it('resets the new exercise form after adding', () => {
        const m = createMixin();
        m.trainingNewExercise = { name: 'Bench Press', sets: '3', reps: '10', weight: '80', note: '', type: 'strength', rounds: '', circuitExercises: [] };
        m.trainingSelectedDay = 0;
        m.addExercise();
        expect(m.trainingNewExercise.name).toBe('');
        expect(m.trainingNewExercise.type).toBe('strength');
    });
});

describe('removeExercise', () => {
    it('removes exercise at given index', () => {
        const m = createMixin();
        m.trainingForm[0] = [
            { name: 'A', type: 'strength' },
            { name: 'B', type: 'strength' },
            { name: 'C', type: 'strength' }
        ];
        m.removeExercise(0, 1);
        expect(m.trainingForm[0]).toHaveLength(2);
        expect(m.trainingForm[0].map(e => e.name)).toEqual(['A', 'C']);
        expect(m.trainingDirty).toBe(true);
    });
});

describe('moveExercise', () => {
    it('moves exercise up', () => {
        const m = createMixin();
        m.trainingForm[0] = [
            { name: 'A', type: 'strength' },
            { name: 'B', type: 'strength' },
            { name: 'C', type: 'strength' }
        ];
        m.moveExercise(0, 1, -1);
        expect(m.trainingForm[0].map(e => e.name)).toEqual(['B', 'A', 'C']);
        expect(m.trainingDirty).toBe(true);
    });

    it('moves exercise down', () => {
        const m = createMixin();
        m.trainingForm[0] = [
            { name: 'A', type: 'strength' },
            { name: 'B', type: 'strength' },
            { name: 'C', type: 'strength' }
        ];
        m.moveExercise(0, 1, 1);
        expect(m.trainingForm[0].map(e => e.name)).toEqual(['A', 'C', 'B']);
    });

    it('does nothing when moving first element up', () => {
        const m = createMixin();
        m.trainingForm[0] = [
            { name: 'A', type: 'strength' },
            { name: 'B', type: 'strength' }
        ];
        m.trainingDirty = false;
        m.moveExercise(0, 0, -1);
        expect(m.trainingForm[0].map(e => e.name)).toEqual(['A', 'B']);
        expect(m.trainingDirty).toBe(false);
    });

    it('does nothing when moving last element down', () => {
        const m = createMixin();
        m.trainingForm[0] = [
            { name: 'A', type: 'strength' },
            { name: 'B', type: 'strength' }
        ];
        m.trainingDirty = false;
        m.moveExercise(0, 1, 1);
        expect(m.trainingForm[0].map(e => e.name)).toEqual(['A', 'B']);
        expect(m.trainingDirty).toBe(false);
    });
});

describe('applyTraining', () => {
    it('saves plan and closes modal', async () => {
        const m = createMixin();
        m.trainingForm = [[{ name: 'Bench', type: 'strength', sets: 3, reps: '10', weight: 80, note: '' }], [], [], [], [], [], []];
        m.trainingDirty = true;
        m.trainingOpen = true;
        await m.applyTraining();
        expect(m.trainingPlan[0][0].name).toBe('Bench');
        expect(m.trainingDirty).toBe(false);
        expect(m.trainingOpen).toBe(false);
        expect(m.showToast).toHaveBeenCalledWith('Trainingsplan gespeichert');
    });
});

describe('addCircuitExerciseField', () => {
    it('adds empty circuit exercise', () => {
        const m = createMixin();
        m.trainingNewExercise.circuitExercises = [{ name: 'A', reps: '', duration: '', weight: '' }];
        m.addCircuitExerciseField();
        expect(m.trainingNewExercise.circuitExercises).toHaveLength(2);
    });
});

describe('removeCircuitExerciseField', () => {
    it('removes circuit exercise at index', () => {
        const m = createMixin();
        m.trainingNewExercise.circuitExercises = [
            { name: 'A', reps: '', duration: '', weight: '' },
            { name: 'B', reps: '', duration: '', weight: '' }
        ];
        m.removeCircuitExerciseField(0);
        expect(m.trainingNewExercise.circuitExercises).toHaveLength(1);
        expect(m.trainingNewExercise.circuitExercises[0].name).toBe('B');
    });

    it('does not remove when only one exercise exists', () => {
        const m = createMixin();
        m.trainingNewExercise.circuitExercises = [{ name: 'A', reps: '', duration: '', weight: '' }];
        m.removeCircuitExerciseField(0);
        expect(m.trainingNewExercise.circuitExercises).toHaveLength(1);
    });
});

describe('markTrainingDirty', () => {
    it('sets trainingDirty to true', () => {
        const m = createMixin();
        m.trainingDirty = false;
        m.markTrainingDirty();
        expect(m.trainingDirty).toBe(true);
    });
});
