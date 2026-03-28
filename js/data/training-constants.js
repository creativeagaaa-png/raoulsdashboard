// js/data/training-constants.js

// ── Issue 1: Woechentliches Volumen-Budget ──────────────────
// Schoenfeld et al. (2017): 10-20 Sets/Woche/Muskel optimal
export const WEEKLY_VOLUME_BUDGET = {
    OPTIMAL_MIN: 10,
    OPTIMAL_MAX: 20,
    BEGINNER_MAX: 12,
    INTERMEDIATE_MAX: 16,
    ADVANCED_MAX: 20,
    SMALL_MUSCLE_FACTOR: 0.6
};

// ── Issue 2: Trainings-Level ───────────────────────────────
export const TRAINING_LEVELS = ['beginner', 'intermediate', 'advanced'];

export const TRAINING_LEVEL_LABELS = {
    beginner:     'Anfaenger (0-12 Monate Trainingserfahrung)',
    intermediate: 'Fortgeschritten (1-3 Jahre)',
    advanced:     'Profi (3+ Jahre)'
};

// ── Issue 3: Equipment-Kompatibilitaet ──────────────────────
export const EQUIPMENT_COMPATIBILITY_THRESHOLD = 0.7;
export const EQUIPMENT_SCORE_BONUS = 8;
export const EQUIPMENT_SCORE_EXCLUDE_BELOW = 0.5;
export const EQUIPMENT_SCORE_PENALTY = -20;

// ── Issue 4: Periodisierung ────────────────────────────────
export const PERIODIZATION = {
    MESOCYCLE_WEEKS: 4,
    DELOAD_WEEK: 4,
    DELOAD_VOLUME_FACTOR: 0.5,
    WEEKLY_SET_INCREMENT: 1,
    WEEKLY_NOTES: [
        'Woche 1: Basisvolumen — Technik und Bewegungsqualitaet priorisieren',
        'Woche 2: +1 Satz pro Uebung — progressive Ueberlastung',
        'Woche 3: +1 Satz oder +2.5kg — Peak-Woche',
        'Woche 4: DELOAD — 50% Volumen, gleiches Gewicht, Erholung priorisieren'
    ]
};

// ── Issue 5: Sport → Muskelbelastungs-Profile ──────────────
// Werte 0-1: Anteil der maximalen Muskelbelastung durch die Sportart
export const SPORT_MUSCLE_LOAD = {
    fussball:    { quadriceps: 0.8, hamstrings: 0.7, calves: 0.6, glutes: 0.5 },
    soccer:      { quadriceps: 0.8, hamstrings: 0.7, calves: 0.6, glutes: 0.5 },
    schwimmen:   { back: 0.7, shoulders: 0.8, triceps: 0.5, abs: 0.4 },
    swimming:    { back: 0.7, shoulders: 0.8, triceps: 0.5, abs: 0.4 },
    radfahren:   { quadriceps: 0.9, hamstrings: 0.5, calves: 0.6 },
    cycling:     { quadriceps: 0.9, hamstrings: 0.5, calves: 0.6 },
    laufen:      { quadriceps: 0.6, hamstrings: 0.6, calves: 0.8, glutes: 0.4 },
    jogging:     { quadriceps: 0.6, hamstrings: 0.6, calves: 0.8, glutes: 0.4 },
    running:     { quadriceps: 0.6, hamstrings: 0.6, calves: 0.8, glutes: 0.4 },
    basketball:  { quadriceps: 0.7, calves: 0.7, shoulders: 0.4 },
    tennis:      { shoulders: 0.6, forearms: 0.5, calves: 0.5 },
    badminton:   { shoulders: 0.6, forearms: 0.5, calves: 0.5 },
    yoga:        { abs: 0.3, shoulders: 0.3 },
    pilates:     { abs: 0.4, lower_back: 0.3 },
    boxen:       { shoulders: 0.7, chest: 0.5, triceps: 0.5, abs: 0.5 },
    kickboxen:   { shoulders: 0.7, chest: 0.5, quadriceps: 0.6, calves: 0.5, abs: 0.5 },
    mma:         { shoulders: 0.7, chest: 0.5, quadriceps: 0.6, back: 0.5, abs: 0.5 },
    klettern:    { back: 0.8, biceps: 0.7, forearms: 0.9 },
    bouldern:    { back: 0.8, biceps: 0.7, forearms: 0.9 },
    handball:    { shoulders: 0.6, chest: 0.4, quadriceps: 0.5, calves: 0.5 },
    volleyball:  { shoulders: 0.6, calves: 0.6, quadriceps: 0.5 },
    tanzen:      { calves: 0.5, quadriceps: 0.4, abs: 0.3 },
    golf:        { lower_back: 0.4, abs: 0.3, forearms: 0.3 },
    rudern:      { back: 0.8, biceps: 0.6, shoulders: 0.5, abs: 0.4 }
};

export const SPORT_RECOVERY_REDUCTION = 0.4;

// ── Issue 6: Warmup nach Muskelgruppe ──────────────────────
export const WARMUP_BY_MUSCLE = {
    chest:       'Schulterrotation + leichte Liegestuetze',
    back:        'Cat-Cow + Band Pull-Aparts',
    shoulders:   'Schulterkreisen + Band Dislocates',
    front_delts: 'Schulterrotation + Frontheben ohne Gewicht',
    side_delts:  'Schulterkreisen + Seitheben ohne Gewicht',
    rear_delts:  'Band Pull-Aparts + Reverse Flys ohne Gewicht',
    quadriceps:  'Hueftmobilitaet + Kniebeugen ohne Gewicht',
    hamstrings:  'Beinpendel + Rumaenisches Kreuzheben ohne Gewicht',
    glutes:      'Hueftkreise + Glute Bridges',
    biceps:      'Armkreisen + leichte Curls',
    triceps:     'Armkreisen + Trizeps-Stretches',
    abs:         'Cat-Cow + Dead Bugs',
    calves:      'Wadenheben einbeinig + Fusskreise',
    forearms:    'Handgelenk-Rotation + Finger-Spreizen',
    traps:       'Nackenkreisen + Schulterheben ohne Gewicht',
    lower_back:  'Cat-Cow + Beckenneigung'
};

export const MAX_WARMUP_ELEMENTS = 4;
export const WARMUP_FALLBACK = 'Leichtes Cardio + dynamisches Stretching';
