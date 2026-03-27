/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock Supabase Client ────────────────────────────────────
// We mock the entire @supabase/supabase-js module to avoid hitting production

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

// Chain builder: each method returns itself so .from().select().eq().single() works
function createChain(overrides = {}) {
    const chain = {
        select: mockSelect.mockReturnThis(),
        insert: mockInsert.mockReturnThis(),
        update: mockUpdate.mockReturnThis(),
        upsert: mockUpsert.mockReturnThis(),
        delete: mockDelete.mockReturnThis(),
        eq: mockEq.mockReturnThis(),
        gte: mockGte.mockReturnThis(),
        lte: mockLte.mockReturnThis(),
        order: mockOrder.mockReturnThis(),
        limit: mockLimit.mockReturnThis(),
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        then: undefined // make it thenable when needed
    };
    Object.assign(chain, overrides);
    return chain;
}

const mockFrom = vi.fn();
const mockAuth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signInWithOAuth: vi.fn()
};

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: mockFrom,
        auth: mockAuth
    }))
}));

// Set env vars before importing the module
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Import the module under test
const Supa = await import('./supabase.js');

// Helper: mock a user session
function mockAuthUser(userId = 'test-user-uuid') {
    mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } }
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser();
});

// ── Auth Functions ──────────────────────────────────────────

describe('Auth: signUp', () => {
    it('calls supabase.auth.signUp and returns data', async () => {
        const mockData = { user: { id: 'new-user' }, session: null };
        mockAuth.signUp.mockResolvedValue({ data: mockData, error: null });

        const result = await Supa.signUp('test@example.com', 'password123');
        expect(mockAuth.signUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
        expect(result).toEqual(mockData);
    });

    it('throws on signup error', async () => {
        mockAuth.signUp.mockResolvedValue({
            data: null,
            error: { message: 'User already registered' }
        });

        await expect(Supa.signUp('test@example.com', 'pw'))
            .rejects.toEqual({ message: 'User already registered' });
    });
});

describe('Auth: signIn', () => {
    it('calls signInWithPassword and returns session data', async () => {
        const mockData = { user: { id: 'user-1' }, session: { access_token: 'tok' } };
        mockAuth.signInWithPassword.mockResolvedValue({ data: mockData, error: null });

        const result = await Supa.signIn('test@example.com', 'password');
        expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password'
        });
        expect(result).toEqual(mockData);
    });

    it('throws on invalid credentials', async () => {
        mockAuth.signInWithPassword.mockResolvedValue({
            data: null,
            error: { message: 'Invalid login credentials' }
        });

        await expect(Supa.signIn('test@example.com', 'wrong'))
            .rejects.toEqual({ message: 'Invalid login credentials' });
    });
});

describe('Auth: signOut', () => {
    it('calls supabase.auth.signOut', async () => {
        mockAuth.signOut.mockResolvedValue({ error: null });
        await Supa.signOut();
        expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('throws on signOut error', async () => {
        mockAuth.signOut.mockResolvedValue({ error: { message: 'Session expired' } });
        await expect(Supa.signOut()).rejects.toEqual({ message: 'Session expired' });
    });
});

describe('Auth: getSession', () => {
    it('returns active session', async () => {
        const mockSession = { user: { id: 'u1' }, access_token: 'tok' };
        mockAuth.getSession.mockResolvedValue({
            data: { session: mockSession },
            error: null
        });

        const result = await Supa.getSession();
        expect(result).toEqual(mockSession);
    });

    it('returns null when no session', async () => {
        mockAuth.getSession.mockResolvedValue({
            data: { session: null },
            error: null
        });

        const result = await Supa.getSession();
        expect(result).toBeNull();
    });
});

describe('Auth: onAuthStateChange', () => {
    it('registers callback and returns subscription', () => {
        const mockSubscription = { unsubscribe: vi.fn() };
        mockAuth.onAuthStateChange.mockReturnValue({
            data: { subscription: mockSubscription }
        });

        const callback = vi.fn();
        Supa.onAuthStateChange(callback);

        expect(mockAuth.onAuthStateChange).toHaveBeenCalled();
        // Simulate auth event
        const registeredCallback = mockAuth.onAuthStateChange.mock.calls[0][0];
        const mockSession = { user: { id: 'u1' } };
        registeredCallback('SIGNED_IN', mockSession);
        expect(callback).toHaveBeenCalledWith(mockSession);
    });
});

describe('Auth: resetPassword', () => {
    it('calls resetPasswordForEmail', async () => {
        mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
        await Supa.resetPassword('test@example.com');
        expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('throws on error', async () => {
        mockAuth.resetPasswordForEmail.mockResolvedValue({
            error: { message: 'Rate limit exceeded' }
        });
        await expect(Supa.resetPassword('test@example.com'))
            .rejects.toEqual({ message: 'Rate limit exceeded' });
    });
});

describe('Auth: signInWithProvider', () => {
    it('calls signInWithOAuth with redirect', async () => {
        mockAuth.signInWithOAuth.mockResolvedValue({ error: null });
        await Supa.signInWithProvider('google');
        expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
            provider: 'google',
            options: { redirectTo: expect.any(String) }
        });
    });
});

// ── Settings CRUD ───────────────────────────────────────────

describe('Settings: getSettings', () => {
    it('returns settings for authenticated user', async () => {
        const mockSettings = { user_id: 'test-user-uuid', start_weight: 80 };
        const chain = createChain();
        chain.single.mockResolvedValue({ data: mockSettings, error: null });
        mockFrom.mockReturnValue(chain);

        const result = await Supa.getSettings();
        expect(mockFrom).toHaveBeenCalledWith('settings');
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-uuid');
        expect(result).toEqual(mockSettings);
    });

    it('returns null for new user (PGRST116)', async () => {
        const chain = createChain();
        chain.single.mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' }
        });
        mockFrom.mockReturnValue(chain);

        const result = await Supa.getSettings();
        expect(result).toBeNull();
    });

    it('throws on unexpected error', async () => {
        const chain = createChain();
        chain.single.mockResolvedValue({
            data: null,
            error: { code: '42501', message: 'Permission denied' }
        });
        mockFrom.mockReturnValue(chain);

        await expect(Supa.getSettings()).rejects.toEqual({
            code: '42501',
            message: 'Permission denied'
        });
    });
});

describe('Settings: saveSettings (CRITICAL — settings_pkey fix)', () => {
    const profile = {
        displayName: 'Test User',
        startWeight: 80,
        goalWeight: 70,
        userHeight: 180,
        userAge: 30,
        gender: 'male',
        activityLevel: 'moderately_active',
        weeklyGoalRate: 0.5,
        checklistItems: [{ key: 'training', label: 'Training' }]
    };

    // Helper: build a properly chained mock for from('settings').select().eq().maybeSingle()
    function mockSelectChain(existingData) {
        return {
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: existingData, error: null })
                })
            })
        };
    }

    it('UPDATES existing settings row (no PK issue)', async () => {
        let callCount = 0;
        mockFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // SELECT check → existing row found
                return mockSelectChain({ id: 1 });
            }
            // UPDATE
            return {
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null })
                })
            };
        });

        await Supa.saveSettings(profile);
        expect(callCount).toBe(2); // select + update
    });

    it('INSERTS new settings row for new user', async () => {
        let callCount = 0;
        let insertedRow = null;
        mockFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return mockSelectChain(null); // no existing row
            }
            return {
                insert: vi.fn((row) => {
                    insertedRow = row;
                    return Promise.resolve({ error: null });
                })
            };
        });

        await Supa.saveSettings(profile);
        expect(callCount).toBe(2); // select + insert
        expect(insertedRow.user_id).toBe('test-user-uuid');
    });

    it('falls back to UPSERT when INSERT hits PK conflict (settings_pkey)', async () => {
        let callCount = 0;
        let upsertCalled = false;
        mockFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return mockSelectChain(null); // no existing row
            }
            if (callCount === 2) {
                // INSERT → fails with 23505 (PK collision)
                return {
                    insert: vi.fn(() => Promise.resolve({
                        error: { code: '23505', message: 'duplicate key value violates unique constraint "settings_pkey"' }
                    }))
                };
            }
            // UPSERT fallback
            return {
                upsert: vi.fn(() => {
                    upsertCalled = true;
                    return Promise.resolve({ error: null });
                })
            };
        });

        await Supa.saveSettings(profile);
        expect(callCount).toBe(3); // select + insert(fail) + upsert
        expect(upsertCalled).toBe(true);
    });

    it('throws on non-constraint INSERT errors', async () => {
        let callCount = 0;
        mockFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) return mockSelectChain(null);
            return {
                insert: vi.fn(() => Promise.resolve({
                    error: { code: '42501', message: 'RLS policy violation' }
                }))
            };
        });

        await expect(Supa.saveSettings(profile)).rejects.toEqual({
            code: '42501',
            message: 'RLS policy violation'
        });
    });

    it('includes all profile fields in saved row', async () => {
        let insertedRow = null;
        let callCount = 0;
        mockFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) return mockSelectChain(null);
            return {
                insert: vi.fn((row) => {
                    insertedRow = row;
                    return Promise.resolve({ error: null });
                })
            };
        });

        await Supa.saveSettings(profile);

        expect(insertedRow).toMatchObject({
            user_id: 'test-user-uuid',
            start_weight: 80,
            goal_weight: 70,
            user_height: 180,
            user_age: 30,
            gender: 'male',
            activity_level: 'moderately_active',
            weekly_goal_rate: 0.5,
            display_name: 'Test User'
        });
        expect(insertedRow.checklist_items).toEqual([{ key: 'training', label: 'Training' }]);
    });

    it('only includes defined optional fields', async () => {
        let insertedRow = null;
        let callCount = 0;
        mockFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) return mockSelectChain(null);
            return {
                insert: vi.fn((row) => {
                    insertedRow = row;
                    return Promise.resolve({ error: null });
                })
            };
        });

        await Supa.saveSettings({
            startWeight: 80,
            goalWeight: 70,
            userHeight: 180,
            userAge: 30
        });

        expect(insertedRow).not.toHaveProperty('gender');
        expect(insertedRow).not.toHaveProperty('goal_date');
        expect(insertedRow).not.toHaveProperty('activity_level');
        expect(insertedRow).not.toHaveProperty('weekly_goal_rate');
        expect(insertedRow).not.toHaveProperty('display_name');
        expect(insertedRow).not.toHaveProperty('checklist_items');
    });
});

// ── Weight Entries ──────────────────────────────────────────

describe('Weight Entries: getWeightEntries', () => {
    it('returns weight entries sorted by date', async () => {
        const mockEntries = [
            { date: '2026-03-01', weight: 80 },
            { date: '2026-03-02', weight: 79.5 }
        ];
        const chain = createChain();
        chain.order.mockReturnValue({
            then: (resolve) => resolve({ data: mockEntries, error: null })
        });
        // Make the chain resolve properly
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: mockEntries, error: null })
                })
            })
        });

        const result = await Supa.getWeightEntries();
        expect(result).toEqual([
            { date: '2026-03-01', weight: 80 },
            { date: '2026-03-02', weight: 79.5 }
        ]);
    });

    it('returns empty array when no entries', async () => {
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: null, error: null })
                })
            })
        });

        const result = await Supa.getWeightEntries();
        expect(result).toEqual([]);
    });

    it('converts weight strings to numbers', async () => {
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                        data: [{ date: '2026-03-01', weight: '80.5' }],
                        error: null
                    })
                })
            })
        });

        const result = await Supa.getWeightEntries();
        expect(result[0].weight).toBe(80.5);
        expect(typeof result[0].weight).toBe('number');
    });
});

describe('Weight Entries: upsertWeightEntry', () => {
    it('upserts with correct conflict key', async () => {
        let upsertArgs = null;
        mockFrom.mockReturnValue({
            upsert: vi.fn((row, opts) => {
                upsertArgs = { row, opts };
                return Promise.resolve({ error: null });
            })
        });

        await Supa.upsertWeightEntry('2026-03-27', 79.0);

        expect(upsertArgs.row).toEqual({
            date: '2026-03-27',
            weight: 79.0,
            user_id: 'test-user-uuid'
        });
        expect(upsertArgs.opts).toEqual({ onConflict: 'user_id,date' });
    });
});

describe('Weight Entries: deleteWeightEntry', () => {
    it('deletes entry for specific date and user', async () => {
        const mockEqDate = vi.fn().mockResolvedValue({ error: null });
        const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqDate });
        mockFrom.mockReturnValue({
            delete: vi.fn().mockReturnValue({ eq: mockEqUser })
        });

        await Supa.deleteWeightEntry('2026-03-27');

        expect(mockFrom).toHaveBeenCalledWith('weight_entries');
        expect(mockEqUser).toHaveBeenCalledWith('user_id', 'test-user-uuid');
        expect(mockEqDate).toHaveBeenCalledWith('date', '2026-03-27');
    });
});

// ── Daily Check-Ins ─────────────────────────────────────────

describe('Daily Check-Ins: getCheckins', () => {
    it('fetches checkins for date range', async () => {
        const mockData = [{ date: '2026-03-27', items: ['training'] }];
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                        lte: vi.fn().mockReturnValue({
                            order: vi.fn().mockResolvedValue({ data: mockData, error: null })
                        })
                    })
                })
            })
        });

        const result = await Supa.getCheckins('2026-03-01', '2026-03-31');
        expect(result).toEqual(mockData);
    });
});

describe('Daily Check-Ins: upsertCheckin', () => {
    it('upserts with composite conflict key', async () => {
        let upsertArgs = null;
        mockFrom.mockReturnValue({
            upsert: vi.fn((row, opts) => {
                upsertArgs = { row, opts };
                return Promise.resolve({ error: null });
            })
        });

        const items = [{ key: 'training', done: true }];
        await Supa.upsertCheckin('2026-03-27', items);

        expect(upsertArgs.row).toEqual({
            date: '2026-03-27',
            items,
            user_id: 'test-user-uuid'
        });
        expect(upsertArgs.opts).toEqual({ onConflict: 'user_id,date' });
    });
});

// ── Workout Logs ────────────────────────────────────────────

describe('Workout Logs: saveWorkoutLog', () => {
    it('inserts workout log and returns id', async () => {
        const mockSingleResult = { data: { id: 42 }, error: null };
        mockFrom.mockReturnValue({
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue(mockSingleResult)
                })
            })
        });

        const session = {
            date: '2026-03-27',
            dayIndex: 0,
            startedAt: '2026-03-27T10:00:00',
            finishedAt: '2026-03-27T11:00:00',
            durationSeconds: 3600,
            exercises: [{ name: 'Bench Press', sets: 3 }]
        };

        const id = await Supa.saveWorkoutLog(session);
        expect(id).toBe(42);
    });
});

describe('Workout Logs: getWorkoutLogs', () => {
    it('returns mapped workout logs', async () => {
        const mockData = [{
            id: 1,
            date: '2026-03-27',
            day_index: 0,
            started_at: '10:00',
            finished_at: '11:00',
            duration_seconds: 3600,
            exercises: [{ name: 'Squat' }]
        }];

        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue({ data: mockData, error: null })
                    })
                })
            })
        });

        const result = await Supa.getWorkoutLogs();
        expect(result[0]).toEqual({
            id: 1,
            date: '2026-03-27',
            dayIndex: 0,
            startedAt: '10:00',
            finishedAt: '11:00',
            durationSeconds: 3600,
            exercises: [{ name: 'Squat' }]
        });
    });
});

// ── Push Subscriptions ──────────────────────────────────────

describe('Push Subscriptions: savePushSubscription', () => {
    it('upserts push subscription with correct conflict', async () => {
        let upsertArgs = null;
        mockFrom.mockReturnValue({
            upsert: vi.fn((row, opts) => {
                upsertArgs = { row, opts };
                return Promise.resolve({ error: null });
            })
        });

        const sub = { endpoint: 'https://push.example.com', keys: {} };
        await Supa.savePushSubscription(sub, '20:00');

        expect(upsertArgs.row).toEqual({
            user_id: 'test-user-uuid',
            subscription: sub,
            reminder_time: '20:00',
            enabled: true
        });
        expect(upsertArgs.opts).toEqual({ onConflict: 'user_id' });
    });
});

// ── Auth Guard (requireUserId) ──────────────────────────────

describe('Auth Guard: operations fail when not authenticated', () => {
    it('throws when getUser returns no user', async () => {
        mockAuth.getUser.mockResolvedValue({ data: { user: null } });

        await expect(Supa.getSettings()).rejects.toThrow('Nicht angemeldet');
        await expect(Supa.getWeightEntries()).rejects.toThrow('Nicht angemeldet');
        await expect(Supa.saveSettings({ startWeight: 80, goalWeight: 70, userHeight: 180, userAge: 30 }))
            .rejects.toThrow('Nicht angemeldet');
    });
});
