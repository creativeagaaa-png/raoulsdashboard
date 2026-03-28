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
    const fields = {
        start_weight: profile.startWeight,
        goal_weight: profile.goalWeight,
        user_height: profile.userHeight,
        user_age: profile.userAge
    };
    if (profile.goalDate !== undefined) {
        fields.goal_date = profile.goalDate || null;
    }
    if (profile.gender !== undefined) {
        fields.gender = profile.gender;
    }
    if (profile.activityLevel !== undefined) {
        fields.activity_level = profile.activityLevel;
    }
    if (profile.weeklyGoalRate !== undefined) {
        fields.weekly_goal_rate = profile.weeklyGoalRate;
    }
    if (profile.checklistItems !== undefined) {
        fields.checklist_items = profile.checklistItems;
    }
    if (profile.displayName !== undefined) {
        fields.display_name = profile.displayName;
    }

    // Strategy: UPDATE-first — never relies on the id sequence.
    // 1) Try UPDATE (works for existing users, no PK generation)
    const { data: updated, error: updateErr } = await requireDb()
        .from('settings')
        .update(fields)
        .eq('user_id', userId)
        .select('id');

    if (updateErr) throw updateErr;
    if (updated && updated.length > 0) return; // Row existed → updated → done

    // 2) No existing row — new user. Try INSERT.
    const row = { user_id: userId, ...fields };
    const { error: insertErr } = await requireDb()
        .from('settings')
        .insert(row);

    if (!insertErr) return; // INSERT succeeded → done

    // 3) INSERT failed (broken id sequence or race condition).
    //    Check if row was created by a concurrent request, then UPDATE.
    const { data: nowExists } = await requireDb()
        .from('settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (nowExists) {
        const { error: retryErr } = await requireDb()
            .from('settings')
            .update(fields)
            .eq('user_id', userId);
        if (retryErr) throw retryErr;
        return;
    }

    // 4) Row still doesn't exist and INSERT failed — id sequence is broken.
    //    Last resort: call RPC to create row server-side, bypassing the sequence.
    //    If RPC doesn't exist, throw with clear instructions.
    try {
        const { error: rpcErr } = await requireDb().rpc('upsert_user_settings', {
            p_user_id: userId,
            p_start_weight: fields.start_weight,
            p_goal_weight: fields.goal_weight,
            p_user_height: fields.user_height,
            p_user_age: fields.user_age,
            p_goal_date: fields.goal_date || null,
            p_gender: fields.gender || null,
            p_activity_level: fields.activity_level || 'moderately_active',
            p_weekly_goal_rate: fields.weekly_goal_rate ?? 0,
            p_checklist_items: fields.checklist_items || null,
            p_display_name: fields.display_name || null
        });
        if (rpcErr) throw rpcErr;
    } catch (rpcError) {
        // RPC not available — throw the original INSERT error with context
        throw new Error(
            'Profil konnte nicht erstellt werden. ' +
            'Bitte führe die SQL-Migration "supabase-fix-settings-pkey.sql" aus. ' +
            'Original: ' + (insertErr.message || insertErr.code)
        );
    }
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

// ── Push Subscriptions ─────────────────────────────────

export async function getPushSubscription() {
    const userId = await requireUserId();
    const { data, error } = await requireDb()
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function savePushSubscription(subscription, reminderTime) {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('push_subscriptions')
        .upsert({
            user_id: userId,
            subscription,
            reminder_time: reminderTime,
            enabled: true
        }, { onConflict: 'user_id' });
    if (error) throw error;
}

export async function deletePushSubscription() {
    const userId = await requireUserId();
    const { error } = await requireDb()
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);
    if (error) throw error;
}

// ── Avatar / Profilbild ──────────────────────────────

export async function uploadAvatar(file) {
    const userId = await requireUserId();
    const ext = file.name.split('.').pop().toLowerCase();
    const filePath = `${userId}/avatar.${ext}`;

    // Alte Avatare loeschen (falls Dateiendung gewechselt)
    const { data: existing } = await requireDb().storage
        .from('avatars')
        .list(userId);
    if (existing && existing.length > 0) {
        const toDelete = existing.map(f => `${userId}/${f.name}`);
        await requireDb().storage.from('avatars').remove(toDelete);
    }

    // Neues Bild hochladen
    const { error: uploadErr } = await requireDb().storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });
    if (uploadErr) throw uploadErr;

    // Public URL generieren
    const { data: urlData } = requireDb().storage
        .from('avatars')
        .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

    // URL in Settings speichern
    await requireDb()
        .from('settings')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

    return avatarUrl;
}

export async function deleteAvatar() {
    const userId = await requireUserId();

    // Dateien im User-Ordner loeschen
    const { data: existing } = await requireDb().storage
        .from('avatars')
        .list(userId);
    if (existing && existing.length > 0) {
        const toDelete = existing.map(f => `${userId}/${f.name}`);
        await requireDb().storage.from('avatars').remove(toDelete);
    }

    // URL aus Settings entfernen
    await requireDb()
        .from('settings')
        .update({ avatar_url: null })
        .eq('user_id', userId);
}
