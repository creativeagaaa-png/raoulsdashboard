export const DEFAULT_PROFILE = {
    startWeight: 0,
    goalWeight: 0,
    userHeight: 0,
    userAge: 0
};

export const DEFAULT_REWARDS = [];

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const WIDGET_REGISTRY = {
    'current-status': { label: 'Status' },
    'prediction': { label: 'Prediction' },
    'training': { label: 'Training' },
    'analytics': { label: 'Analytics' },
    'milestone': { label: 'Milestone' },
    'achievements': { label: 'Achievements' },
    'progress-pics': { label: 'Progress Pics' },
    'photo-gallery': { label: 'Foto Galerie' },
    'logs': { label: 'Logs' }
};

export const DEFAULT_LAYOUT = {
    left: ['current-status', 'prediction', 'training'],
    right: ['analytics', 'milestone', 'achievements', 'progress-pics', 'photo-gallery', 'logs']
};