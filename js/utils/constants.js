export const DEFAULT_PROFILE = {
    startWeight: 0,
    goalWeight: 0,
    userHeight: 0,
    userAge: 0,
    gender: null,
    activityLevel: 'moderately_active',
    weeklyGoalRate: 0,
    checklistItems: [
        { key: 'training', label: 'Training absolviert' },
        { key: 'steps', label: 'Schritte-Ziel erreicht' },
        { key: 'calories', label: 'Kalorien im Ziel' },
        { key: 'water', label: 'Genug getrunken' },
        { key: 'sleep', label: '7+ Stunden Schlaf' }
    ]
};

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const ACTIVITY_LEVELS = {
    sedentary:         { factor: 1.2,   label: 'Sitzend',      description: 'Wenig oder keine Bewegung' },
    lightly_active:    { factor: 1.375, label: 'Leicht aktiv',  description: 'Sport 1-3×/Woche' },
    moderately_active: { factor: 1.55,  label: 'Mäßig aktiv',   description: 'Sport 3-5×/Woche' },
    very_active:       { factor: 1.725, label: 'Sehr aktiv',    description: 'Sport 6-7×/Woche' },
    extra_active:      { factor: 1.9,   label: 'Extrem aktiv',  description: 'Sehr intensiv, körperliche Arbeit' }
};

// ── German Labels ─────────────────────────────────
export const EQUIPMENT_LABELS = {
    barbell: 'Langhantel',
    dumbbell: 'Kurzhantel',
    machine: 'Maschine',
    cable: 'Kabelzug',
    bodyweight: 'Koerpergewicht',
    band: 'Widerstandsband'
};

export const MUSCLE_LABELS = {
    chest: 'Brust',
    back: 'Ruecken',
    shoulders: 'Schultern',
    front_delts: 'Vordere Schulter',
    side_delts: 'Seitliche Schulter',
    rear_delts: 'Hintere Schulter',
    biceps: 'Bizeps',
    triceps: 'Trizeps',
    quadriceps: 'Oberschenkel (vorne)',
    hamstrings: 'Oberschenkel (hinten)',
    glutes: 'Gesaess',
    calves: 'Waden',
    abs: 'Bauch',
    forearms: 'Unterarme',
    traps: 'Nacken/Trapez',
    lower_back: 'Unterer Ruecken'
};

// ── Injury Regions (Chips) ─────────────────────────
export const INJURY_REGIONS = [
    { id: 'schulter', label: 'Schulter' },
    { id: 'knie', label: 'Knie' },
    { id: 'ruecken', label: 'Ruecken' },
    { id: 'handgelenk', label: 'Handgelenk' },
    { id: 'nacken', label: 'Nacken' },
    { id: 'hufte', label: 'Huefte' },
    { id: 'ellbogen', label: 'Ellbogen' }
];

export const INJURY_KEYWORD_MAP = {
    schulter: ['schulter', 'rotatorenmanschette', 'deltoid'],
    knie: ['knie', 'meniskus', 'kreuzband', 'patella'],
    ruecken: ['ruecken', 'bandscheibe', 'lower_back', 'wirbel', 'ischias', 'lumbal'],
    handgelenk: ['handgelenk', 'hand', 'carpaltunnel'],
    nacken: ['nacken', 'hws', 'cervical'],
    hufte: ['hufte', 'huefte', 'leiste', 'adduktor'],
    ellbogen: ['ellbogen', 'tennisarm', 'golferarm']
};

// ── Muscle Focus Groups ────────────────────────────
export const UPPER_MUSCLES = ['chest', 'back', 'shoulders', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'traps', 'forearms'];
export const LOWER_MUSCLES = ['quadriceps', 'hamstrings', 'glutes', 'calves'];
export const CORE_MUSCLES = ['abs', 'lower_back'];

export const CALORIE_CONSTANTS = {
    KCAL_PER_KG_FAT: 7700,
    MIN_CALORIES_MALE: 1500,
    MIN_CALORIES_FEMALE: 1200,
    MAX_WEEKLY_LOSS: -1.0,
    MAX_WEEKLY_GAIN: 1.0
};

// ── Exercise / Sport Calorie Burn (kcal per minute per kg body weight) ──
// MET-based: kcal/min/kg = MET * 3.5 / 200
// Source: Compendium of Physical Activities
export const TRAINING_BURN_PER_MIN_PER_KG = {
    strength: 0.055,      // ~MET 3.5 (weight training, moderate)
    cardio: 0.105,        // ~MET 6.0 (general cardio)
    distance: 0.12,       // ~MET 7.0 (running/rowing)
    warmup: 0.05,         // ~MET 3.0 (light movement)
    cooldown: 0.03        // ~MET 2.0 (stretching)
};

export const SPORT_BURN_PER_MIN_PER_KG = {
    fussball: 0.12,       // MET 7.0
    basketball: 0.11,     // MET 6.5
    tennis: 0.10,         // MET 6.0
    schwimmen: 0.13,      // MET 7.5 (moderate)
    radfahren: 0.11,      // MET 6.5
    laufen: 0.15,         // MET 8.5
    yoga: 0.04,           // MET 2.5
    boxen: 0.16,          // MET 9.0
    mma: 0.16,            // MET 9.0
    kampfsport: 0.16,     // MET 9.0
    kickboxen: 0.16,      // MET 9.0
    volleyball: 0.07,     // MET 4.0
    handball: 0.12,       // MET 7.0
    tanzen: 0.08,         // MET 5.0
    klettern: 0.11,       // MET 6.5
    bouldern: 0.11,       // MET 6.5
    wandern: 0.09,        // MET 5.5
    rudern: 0.12,         // MET 7.0
    hockey: 0.11,         // MET 6.5
    ski: 0.10,            // MET 6.0
    default: 0.09         // MET 5.0 (general sport)
};
