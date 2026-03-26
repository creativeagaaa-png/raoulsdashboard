import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('./supabase.js', () => ({
    saveSettings: vi.fn().mockResolvedValue(undefined)
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
        expect(m.showToast).toHaveBeenCalledWith('Fehler: Bitte Größe und Gewicht korrekt ausfüllen');
    });

    it('rejects profile with zero height', async () => {
        const m = createMixin();
        m.profileForm = { startWeight: 80, goalWeight: 70, goalDate: '', userHeight: 0, userAge: 30 };
        await m.applyProfile();
        expect(m.showToast).toHaveBeenCalledWith('Fehler: Bitte Größe und Gewicht korrekt ausfüllen');
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

