export const DEFAULT_PROFILE = {
    startWeight: 0,
    goalWeight: 0,
    userHeight: 0,
    userAge: 0
};

export const DEFAULT_REWARDS = [];

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const STEPS_GOAL = 10000;

export const WIDGET_REGISTRY = {
    'current-status': { label: 'Status' },
    'steps': { label: 'Schritte' },
    'prediction': { label: 'Prediction' },
    'analytics': { label: 'Analytics' },
    'milestone': { label: 'Milestone' },
    'achievements': { label: 'Achievements' },
    'progress-pics': { label: 'Progress Pics' },
    'logs': { label: 'Logs' }
};

export const TRAINING_WIDGET_REGISTRY = {
    'workouts': { label: 'Workouts' },
    'training-stats': { label: 'Statistiken' },
    'personal-records': { label: 'Records' }
};

export const DEFAULT_LAYOUT = {
    left: ['current-status', 'steps', 'prediction'],
    right: ['analytics', 'milestone', 'achievements', 'progress-pics', 'logs']
};

export const DEFAULT_TRAINING_LAYOUT = {
    left: ['workouts'],
    right: ['training-stats', 'personal-records']
};
