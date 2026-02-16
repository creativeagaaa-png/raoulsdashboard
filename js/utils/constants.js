export const DEFAULT_PROFILE = {
    startWeight: 0,
    goalWeight: 0,
    userHeight: 0,
    userAge: 0
};

export const DEFAULT_REWARDS = [];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const STEPS_GOAL = 10000;

export const WIDGET_REGISTRY = {
    'current-status': { label: 'Status' },
    'steps': { label: 'Steps' },
    'prediction': { label: 'Prediction' },
    'analytics': { label: 'Analytics' },
    'milestone': { label: 'Milestone' },
    'achievements': { label: 'Achievements' },
    'progress-pics': { label: 'Progress Pics' },
    'logs': { label: 'Logs' }
};

export const TRAINING_WIDGET_REGISTRY = {
    'workouts': { label: 'Workouts' },
    'training-stats': { label: 'Statistics' },
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
