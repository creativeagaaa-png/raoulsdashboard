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

export const CALORIE_CONSTANTS = {
    KCAL_PER_KG_FAT: 7700,
    MIN_CALORIES_MALE: 1500,
    MIN_CALORIES_FEMALE: 1200,
    MAX_WEEKLY_LOSS: -1.0,
    MAX_WEEKLY_GAIN: 1.0
};
