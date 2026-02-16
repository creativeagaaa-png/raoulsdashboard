import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('./supabase.js', () => ({
    saveSettings: vi.fn().mockResolvedValue(undefined),
    saveRewards: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../utils/constants.js', () => ({
    DEFAULT_PROFILE: {
        startWeight: 0,
        goalWeight: 0,
        userHeight: 0,
        userAge: 0
    }
}));

const { settingsMixin } = await import('./settings.js');

function createMixin(overrides = {}) {
    return {
        ...settingsMixin(),
        startWeight: 80,
        goalWeight: 70,
        goalDate: null,
        userHeight: 180,
        userAge: 30,
        rewards: [],
        confirmModal: { show: false },
        showToast: vi.fn(),
        refreshAnimations: vi.fn(),
        updateChart: vi.fn(),
        $nextTick: vi.fn(fn => fn()),
        ...overrides
    };
}

describe('BMI Detail Modal', () => {
    it('opens bmi detail', () => {
        const m = createMixin();
        m.openBmiDetail();
        expect(m.bmiDetailOpen).toBe(true);
    });

    it('closes bmi detail', () => {
        const m = createMixin();
        m.bmiDetailOpen = true;
        m.closeBmiDetail();
        expect(m.bmiDetailOpen).toBe(false);
    });
});

describe('Settings Modal', () => {
    it('opens settings', () => {
        const m = createMixin();
        m.openSettings();
        expect(m.settingsOpen).toBe(true);
    });

    it('closes settings', () => {
        const m = createMixin();
        m.settingsOpen = true;
        m.closeSettings();
        expect(m.settingsOpen).toBe(false);
    });
});

describe('Profile Modal', () => {
    it('opens profile with current values', () => {
        const m = createMixin();
        m.openProfile();
        expect(m.profileOpen).toBe(true);
        expect(m.profileForm.startWeight).toBe(80);
        expect(m.profileForm.goalWeight).toBe(70);
        expect(m.profileDirty).toBe(false);
    });

    it('closes profile when not dirty', () => {
        const m = createMixin();
        m.profileOpen = true;
        m.profileDirty = false;
        m.closeProfile();
        expect(m.profileOpen).toBe(false);
    });

    it('shows confirm when dirty', () => {
        const m = createMixin();
        m.profileOpen = true;
        m.profileDirty = true;
        m.closeProfile();
        expect(m.confirmModal.show).toBe(true);
        expect(m.profileOpen).toBe(true); // still open
    });

    it('closes when forced even if dirty', () => {
        const m = createMixin();
        m.profileOpen = true;
        m.profileDirty = true;
        m.closeProfile(true);
        expect(m.profileOpen).toBe(false);
    });
});

describe('applyProfile', () => {
    it('applies valid profile and saves', async () => {
        const m = createMixin();
        m.profileForm = { startWeight: 85, goalWeight: 72, goalDate: '2025-12-31', userHeight: 180, userAge: 30 };
        m.profileDirty = true;
        m.profileOpen = true;
        await m.applyProfile();
        expect(m.startWeight).toBe(85);
        expect(m.goalWeight).toBe(72);
        expect(m.goalDate).toBe('2025-12-31');
        expect(m.profileDirty).toBe(false);
        expect(m.profileOpen).toBe(false);
    });

    it('rejects invalid profile (zero values)', async () => {
        const m = createMixin();
        m.profileForm = { startWeight: 0, goalWeight: 70, goalDate: '', userHeight: 180, userAge: 30 };
        await m.applyProfile();
        expect(m.showToast).toHaveBeenCalledWith('Error: Please fill in height and weight correctly');
    });

    it('rejects profile with zero height', async () => {
        const m = createMixin();
        m.profileForm = { startWeight: 80, goalWeight: 70, goalDate: '', userHeight: 0, userAge: 30 };
        await m.applyProfile();
        expect(m.showToast).toHaveBeenCalledWith('Error: Please fill in height and weight correctly');
    });

    it('handles string values with comma', async () => {
        const m = createMixin();
        m.profileForm = { startWeight: '80,5', goalWeight: '70,2', goalDate: '', userHeight: '180', userAge: '30' };
        await m.applyProfile();
        expect(m.startWeight).toBe(80.5);
        expect(m.goalWeight).toBe(70.2);
    });

    it('clears goalDate when empty', async () => {
        const m = createMixin();
        m.profileForm = { startWeight: 80, goalWeight: 70, goalDate: '', userHeight: 180, userAge: 30 };
        m.goalDate = '2025-06-01';
        await m.applyProfile();
        expect(m.goalDate).toBeNull();
    });
});

describe('markProfileDirty', () => {
    it('sets profileDirty to true', () => {
        const m = createMixin();
        m.profileDirty = false;
        m.markProfileDirty();
        expect(m.profileDirty).toBe(true);
    });
});

describe('Milestones Modal', () => {
    it('opens milestones with deep copy of rewards', () => {
        const m = createMixin({
            rewards: [{ target: 75, title: 'Test', icon: '⭐' }]
        });
        m.openMilestones();
        expect(m.milestonesOpen).toBe(true);
        expect(m.milestonesForm).toHaveLength(1);
        // Should be a deep copy
        m.milestonesForm[0].title = 'Modified';
        expect(m.rewards[0].title).toBe('Test');
    });

    it('closes milestones when not dirty', () => {
        const m = createMixin();
        m.milestonesOpen = true;
        m.milestonesDirty = false;
        m.closeMilestones();
        expect(m.milestonesOpen).toBe(false);
    });

    it('shows confirm when milestones dirty', () => {
        const m = createMixin();
        m.milestonesOpen = true;
        m.milestonesDirty = true;
        m.closeMilestones();
        expect(m.confirmModal.show).toBe(true);
    });

    it('closes when forced even if dirty', () => {
        const m = createMixin();
        m.milestonesOpen = true;
        m.milestonesDirty = true;
        m.closeMilestones(true);
        expect(m.milestonesOpen).toBe(false);
    });
});

describe('addMilestone', () => {
    it('does nothing when title is empty', () => {
        const m = createMixin();
        m.newMilestone = { title: '', target: '75', icon: '⭐' };
        m.addMilestone();
        expect(m.milestonesForm).toHaveLength(0);
    });

    it('does nothing when target is 0', () => {
        const m = createMixin();
        m.newMilestone = { title: 'Test', target: '0', icon: '⭐' };
        m.addMilestone();
        expect(m.milestonesForm).toHaveLength(0);
    });

    it('adds valid milestone', () => {
        const m = createMixin();
        m.newMilestone = { title: '75kg Ziel', target: '75', icon: '🏆' };
        m.addMilestone();
        expect(m.milestonesForm).toHaveLength(1);
        expect(m.milestonesForm[0]).toEqual({ target: 75, title: '75kg Ziel', icon: '🏆' });
        expect(m.milestonesDirty).toBe(true);
    });

    it('handles comma-separated target value', () => {
        const m = createMixin();
        m.newMilestone = { title: 'Test', target: '75,5', icon: '⭐' };
        m.addMilestone();
        expect(m.milestonesForm[0].target).toBe(75.5);
    });

    it('resets form after adding', () => {
        const m = createMixin();
        m.newMilestone = { title: 'Test', target: '75', icon: '🏆' };
        m.addMilestone();
        expect(m.newMilestone.title).toBe('');
        expect(m.newMilestone.icon).toBe('⭐');
    });
});

describe('removeMilestone', () => {
    it('removes milestone at index', () => {
        const m = createMixin();
        m.milestonesForm = [
            { target: 80, title: 'A', icon: '⭐' },
            { target: 75, title: 'B', icon: '🏆' }
        ];
        m.removeMilestone(0);
        expect(m.milestonesForm).toHaveLength(1);
        expect(m.milestonesForm[0].title).toBe('B');
        expect(m.milestonesDirty).toBe(true);
    });
});

describe('applyMilestones', () => {
    it('filters invalid milestones and sorts by target desc', async () => {
        const m = createMixin();
        m.milestonesForm = [
            { target: 70, title: 'Goal', icon: '🏆' },
            { target: 0, title: 'Invalid', icon: '⭐' },
            { target: 80, title: 'Start', icon: '⭐' },
            { target: 75, title: '', icon: '⭐' }
        ];
        m.milestonesOpen = true;
        m.milestonesDirty = true;
        await m.applyMilestones();
        expect(m.rewards).toHaveLength(2);
        expect(m.rewards[0].target).toBe(80);
        expect(m.rewards[1].target).toBe(70);
        expect(m.milestonesOpen).toBe(false);
        expect(m.milestonesDirty).toBe(false);
    });
});

describe('markMilestonesDirty', () => {
    it('sets milestonesDirty to true', () => {
        const m = createMixin();
        m.milestonesDirty = false;
        m.markMilestonesDirty();
        expect(m.milestonesDirty).toBe(true);
    });
});

describe('clearAllMilestones', () => {
    it('shows confirmation modal', () => {
        const m = createMixin({ rewards: [{ target: 75, title: 'Test', icon: '⭐' }] });
        m.clearAllMilestones();
        expect(m.confirmModal.show).toBe(true);
    });

    it('clears all rewards when confirmed', async () => {
        const m = createMixin({ rewards: [{ target: 75, title: 'Test', icon: '⭐' }] });
        m.clearAllMilestones();
        await m.confirmModal.onConfirm();
        expect(m.rewards).toEqual([]);
        expect(m.showToast).toHaveBeenCalledWith('All milestones deleted');
    });
});
