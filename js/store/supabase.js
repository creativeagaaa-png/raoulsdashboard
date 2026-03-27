import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables. Create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

let db = null;
try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error('Failed to initialize Supabase client:', e);
}

function requireDb() {
    if (!db) throw new Error('Supabase client not initialized — check your environment variables.');
    return db;
}

function getUserId() {
    const session = db?.supabaseUrl ? null : null; // placeholder
    // We'll get user_id from the current session
    return null;
}

// ── Auth ────────────────────────────────────────────────

export async function signUp(email, password) {
    const { data, error } = await requireDb().auth.signUp({ email, password });
    if (error) throw error;
    return data;
}

export async function signIn(email, password) {
    const { data, error } = await requireDb().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await requireDb().auth.signOut();
    if (error) throw error;
}

export async function getSession() {
    const { data, error } = await requireDb().auth.getSession();
    if (error) throw error;
    return data.session;
}

export function onAuthStateChange(callback) {
    return requireDb().auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
}

export async function resetPassword(email) {
    const { error } = await requireDb().auth.resetPasswordForEmail(email);
    if (error) throw error;
}

export async function signInWithProvider(provider) {
    const { error } = await requireDb().auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: window.location.origin
        }
    });
    if (error) throw error;
}

async function requireUserId() {
    const { data } = await requireDb().auth.getUser();
    if (!data?.user?.id) throw new Error('Nicht angemeldet');
    return data.user.id;
}

// ── Weight Entries ──────────────────────────────────────

export async function getWeightEntries() {
    const userId = await requireUserId();
    const { data, error } = await requireDb()
        .from('weight_entries')
        .select('date, weight')
        .eq('user_id', userId)
        .order('date', { ascending: true });
    if (error) throw error;
    return (data || []).map(e => ({ date: e.date, weight: Number(e.weight) }));
}

export async function upsertWeightEntry(date, weight) {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('weight_entries')
        .upsert({ date, weight, user_id: userId }, { onConflict: 'user_id,date' });
    if (error) throw error;
}

export async function deleteWeightEntry(date) {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('weight_entries')
        .delete()
        .eq('user_id', userId)
        .eq('date', date);
    if (error) throw error;
}

export async function clearAllWeightEntries() {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('weight_entries')
        .delete()
        .eq('user_id', userId);
    if (error) throw error;
}

// ── Settings (one row per user) ─────────────────────────

export async function getSettings() {
    const userId = await requireUserId();
    const { data, error } = await requireDb()
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function saveSettings(profile) {
    const userId = await requireUserId();
    const row = {
        user_id: userId,
        start_weight: profile.startWeight,
        goal_weight: profile.goalWeight,
        user_height: profile.userHeight,
        user_age: profile.userAge
    };
    if (profile.goalDate !== undefined) {
        row.goal_date = profile.goalDate || null;
    }
    if (profile.gender !== undefined) {
        row.gender = profile.gender;
    }
    if (profile.activityLevel !== undefined) {
        row.activity_level = profile.activityLevel;
    }
    if (profile.weeklyGoalRate !== undefined) {
        row.weekly_goal_rate = profile.weeklyGoalRate;
    }
    if (profile.checklistItems !== undefined) {
        row.checklist_items = profile.checklistItems;
    }
    if (profile.displayName !== undefined) {
        row.display_name = profile.displayName;
    }
    const { error } = await requireDb()
        .from('settings')
        .upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
}

// ── Training Plan ───────────────────────────────────────

export async function getTrainingPlan() {
    const userId = await requireUserId();
    const { data, error } = await requireDb()
        .from('training_plan')
        .select('*')
        .eq('user_id', userId)
        .order('day_index')
        .order('exercise_order');
    if (error) throw error;

    const plan = Array.from({ length: 7 }, () => []);
    for (const row of (data || [])) {
        const type = row.type || 'strength';
        const ex = { name: row.name, type, note: row.note || '' };
        if (type === 'strength') {
            ex.sets = row.sets;
            const repsStr = row.reps || '';
            if (repsStr.includes('|')) {
                const [r, w] = repsStr.split('|');
                ex.reps = r;
                ex.weight = parseFloat(w) || 0;
            } else {
                ex.reps = repsStr;
                ex.weight = 0;
            }
        } else if (type === 'cardio') {
            ex.duration = row.reps || '';
        } else if (type === 'distance') {
            ex.distance = row.sets ? String(row.sets) : '';
            ex.duration = row.reps || '';
        } else if (type === 'circuit') {
            ex.rounds = row.sets || 3;
            try {
                ex.circuitExercises = JSON.parse(row.reps || '[]');
            } catch { ex.circuitExercises = []; }
            if (ex.note && ex.note.startsWith('__cn__:')) {
                ex.note = ex.note.slice(7);
            }
        }
        plan[row.day_index].push(ex);
    }
    return plan;
}

export async function saveTrainingPlan(plan) {
    const userId = await requireUserId();
    const rows = [];
    for (let day = 0; day < 7; day++) {
        const exercises = plan[day] || [];
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            const type = ex.type || 'strength';
            const row = {
                user_id: userId,
                day_index: day,
                exercise_order: i,
                name: ex.name,
                type,
                note: ex.note || ''
            };
            if (type === 'strength') {
                row.sets = ex.sets || 0;
                const reps = ex.reps || '';
                const weight = parseFloat(ex.weight) || 0;
                row.reps = weight > 0 ? reps + '|' + weight : reps;
            } else if (type === 'cardio') {
                row.sets = 0;
                row.reps = ex.duration || '';
            } else if (type === 'distance') {
                row.sets = parseInt(ex.distance) || 0;
                row.reps = ex.duration || '';
            } else if (type === 'circuit') {
                row.sets = parseInt(ex.rounds) || 3;
                row.reps = JSON.stringify(ex.circuitExercises || []);
                row.note = '__cn__:' + (ex.note || '');
            }
            rows.push(row);
        }
    }

    // Delete old plan then insert new one
    const { error: delErr } = await requireDb()
        .from('training_plan')
        .delete()
        .eq('user_id', userId);
    if (delErr) throw delErr;

    if (rows.length > 0) {
        const { error: insErr } = await requireDb()
            .from('training_plan')
            .insert(rows);
        if (insErr) throw insErr;
    }
}

// ── Workout Logs ────────────────────────────────────────

export async function getWorkoutLogs() {
    const userId = await requireUserId();
    const { data, error } = await requireDb()
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50);
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        date: row.date,
        dayIndex: row.day_index,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        durationSeconds: row.duration_seconds,
        exercises: row.exercises || []
    }));
}

export async function saveWorkoutLog(session) {
    const userId = await requireUserId();
    const row = {
        user_id: userId,
        date: session.date,
        day_index: session.dayIndex,
        started_at: session.startedAt,
        finished_at: session.finishedAt,
        duration_seconds: session.durationSeconds,
        exercises: session.exercises
    };
    const { data, error } = await requireDb()
        .from('workout_logs')
        .insert(row)
        .select('id')
        .single();
    if (error) throw error;
    return data ? data.id : null;
}

export async function deleteWorkoutLog(id) {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('workout_logs')
        .delete()
        .eq('user_id', userId)
        .eq('id', id);
    if (error) throw error;
}

export async function clearAllWorkoutLogs() {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('workout_logs')
        .delete()
        .eq('user_id', userId);
    if (error) throw error;
}

// ── Daily Check-Ins ─────────────────────────────────────

export async function getCheckins(fromDate, toDate) {
    const userId = await requireUserId();
    const { data, error } = await requireDb()
        .from('daily_checkins')
        .select('date, items')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function upsertCheckin(date, items) {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('daily_checkins')
        .upsert({ date, items, user_id: userId }, { onConflict: 'user_id,date' });
    if (error) throw error;
}

export async function deleteCheckin(date) {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('daily_checkins')
        .delete()
        .eq('user_id', userId)
        .eq('date', date);
    if (error) throw error;
}

export async function clearAllCheckins() {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('daily_checkins')
        .delete()
        .eq('user_id', userId);
    if (error) throw error;
}
