// js/data/split-templates.js

export const REPS_SCHEMES = {
    muscle:  { sets: 4, reps: '8-12',  restNote: '60-90s Pause' },
    fat_loss:   { sets: 3, reps: '12-15', restNote: '30-60s Pause' },
    endurance:  { sets: 3, reps: '15-20', restNote: '30s Pause' },
    general:    { sets: 3, reps: '10-12', restNote: '60s Pause' }
};

export const splitTemplates = [
    // ── 2 TAGE ──────────────────────────────────────
    {
        id: 'full-body-2',
        name: 'Ganzkoerper 2x',
        daysPerWeek: 2,
        suitableFor: ['beginner'],
        goals: ['muscle', 'general', 'fat_loss'],
        structure: [
            {
                label: 'Ganzkoerper A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Ganzkoerper B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            }
        ]
    },

    // ── 3 TAGE ──────────────────────────────────────
    {
        id: 'full-body-3',
        name: 'Ganzkoerper 3x',
        daysPerWeek: 3,
        suitableFor: ['beginner'],
        goals: ['muscle', 'general', 'fat_loss'],
        structure: [
            {
                label: 'Ganzkoerper A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Ganzkoerper B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'chest', compound: 0, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Ganzkoerper C',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 0, isolation: 1 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            }
        ]
    },
    {
        id: 'ppl-3',
        name: 'Push/Pull/Legs 3x',
        daysPerWeek: 3,
        suitableFor: ['intermediate', 'advanced'],
        goals: ['muscle', 'general'],
        structure: [
            {
                label: 'Push',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Pull',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 },
                    { muscle: 'traps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Legs',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            }
        ]
    },
    {
        id: 'calisthenics-3',
        name: 'Calisthenics 3x',
        daysPerWeek: 3,
        suitableFor: ['beginner', 'intermediate'],
        goals: ['muscle', 'general', 'endurance'],
        equipmentFilter: ['bodyweight', 'band'],
        structure: [
            {
                label: 'Oberkörper Push',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 1, isolation: 0 },
                    { muscle: 'triceps', compound: 1, isolation: 0 },
                    { muscle: 'abs', compound: 0, isolation: 2 }
                ]
            },
            {
                label: 'Oberkörper Pull',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 1, isolation: 0 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 2, isolation: 0 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            }
        ]
    },

    // ── 4 TAGE ──────────────────────────────────────
    {
        id: 'upper-lower-4',
        name: 'Oberkörper/Unterkörper 4x',
        daysPerWeek: 4,
        suitableFor: ['intermediate', 'advanced'],
        goals: ['muscle', 'general', 'fat_loss'],
        structure: [
            {
                label: 'Oberkörper A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper A',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 1 },
                    { muscle: 'glutes', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Oberkörper B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper B',
                muscleTargets: [
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 2 }
                ]
            }
        ]
    },
    {
        id: 'push-pull-4',
        name: 'Push/Pull 4x',
        daysPerWeek: 4,
        suitableFor: ['intermediate'],
        goals: ['muscle', 'general'],
        structure: [
            {
                label: 'Push A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 },
                    { muscle: 'quadriceps', compound: 1, isolation: 0 }
                ]
            },
            {
                label: 'Pull A',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 }
                ]
            },
            {
                label: 'Push B',
                muscleTargets: [
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'triceps', compound: 0, isolation: 1 },
                    { muscle: 'quadriceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Pull B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'traps', compound: 0, isolation: 1 },
                    { muscle: 'hamstrings', compound: 0, isolation: 1 },
                    { muscle: 'glutes', compound: 0, isolation: 1 }
                ]
            }
        ]
    },
    {
        id: 'cardio-focus-4',
        name: 'Kraft + Ausdauer 4x',
        daysPerWeek: 4,
        suitableFor: ['beginner', 'intermediate'],
        goals: ['endurance', 'fat_loss', 'general'],
        addCardioToEachDay: true,
        structure: [
            {
                label: 'Oberkörper + Cardio',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper + Cardio',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Oberkörper + Cardio',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'chest', compound: 0, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper + Cardio',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'hamstrings', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 2 }
                ]
            }
        ]
    },

    // ── 5 TAGE ──────────────────────────────────────
    {
        id: 'bro-split-5',
        name: 'Bro-Split 5x',
        daysPerWeek: 5,
        suitableFor: ['intermediate', 'advanced'],
        goals: ['muscle'],
        structure: [
            {
                label: 'Brust',
                muscleTargets: [
                    { muscle: 'chest', compound: 2, isolation: 2 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Rücken',
                muscleTargets: [
                    { muscle: 'back', compound: 2, isolation: 2 },
                    { muscle: 'lower_back', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Schultern',
                muscleTargets: [
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'side_delts', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 },
                    { muscle: 'traps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Beine',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 2, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Arme',
                muscleTargets: [
                    { muscle: 'biceps', compound: 0, isolation: 3 },
                    { muscle: 'triceps', compound: 0, isolation: 3 }
                ]
            }
        ]
    },
    {
        id: 'ppl-upper-lower-5',
        name: 'PPL + Oberkörper/Unterkörper 5x',
        daysPerWeek: 5,
        suitableFor: ['intermediate', 'advanced'],
        goals: ['muscle', 'general'],
        structure: [
            {
                label: 'Push',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Pull',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Legs',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 0, isolation: 1 },
                    { muscle: 'calves', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Oberkörper',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 0 },
                    { muscle: 'back', compound: 1, isolation: 0 },
                    { muscle: 'shoulders', compound: 0, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Unterkörper',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 1, isolation: 0 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'abs', compound: 0, isolation: 2 }
                ]
            }
        ]
    },

    // ── 6 TAGE ──────────────────────────────────────
    {
        id: 'ppl-6',
        name: 'Push/Pull/Legs 6x',
        daysPerWeek: 6,
        suitableFor: ['advanced'],
        goals: ['muscle'],
        structure: [
            {
                label: 'Push A',
                muscleTargets: [
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 2 }
                ]
            },
            {
                label: 'Pull A',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 2 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Legs A',
                muscleTargets: [
                    { muscle: 'quadriceps', compound: 2, isolation: 1 },
                    { muscle: 'hamstrings', compound: 1, isolation: 0 },
                    { muscle: 'calves', compound: 0, isolation: 1 },
                    { muscle: 'abs', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Push B',
                muscleTargets: [
                    { muscle: 'shoulders', compound: 1, isolation: 1 },
                    { muscle: 'chest', compound: 1, isolation: 1 },
                    { muscle: 'triceps', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Pull B',
                muscleTargets: [
                    { muscle: 'back', compound: 1, isolation: 1 },
                    { muscle: 'biceps', compound: 0, isolation: 1 },
                    { muscle: 'traps', compound: 0, isolation: 1 },
                    { muscle: 'rear_delts', compound: 0, isolation: 1 }
                ]
            },
            {
                label: 'Legs B',
                muscleTargets: [
                    { muscle: 'hamstrings', compound: 1, isolation: 1 },
                    { muscle: 'quadriceps', compound: 1, isolation: 1 },
                    { muscle: 'glutes', compound: 1, isolation: 0 },
                    { muscle: 'calves', compound: 0, isolation: 1 }
                ]
            }
        ]
    }
];
