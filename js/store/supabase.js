import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://liuekokgchfzatodsaxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdWVrb2tnY2hmemF0b2RzYXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzI1MTAsImV4cCI6MjA4Njc0ODUxMH0.3CBZnoZCZiUKNRdVF0GewDxNHpJVdYsYPMswRld3vz8';
const PHOTO_BUCKET = 'progress-pics';

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Weight Entries ──────────────────────────────────────

export async function getWeightEntries() {
    const { data, error } = await db
        .from('weight_entries')
        .select('date, weight')
        .order('date', { ascending: true });
    if (error) throw error;
    return (data || []).map(e => ({ date: e.date, weight: Number(e.weight) }));
}

export async function upsertWeightEntry(date, weight) {
    const { error } = await db
        .from('weight_entries')
        .upsert({ date, weight }, { onConflict: 'date' });
    if (error) throw error;
}

export async function deleteWeightEntry(date) {
    const { error } = await db
        .from('weight_entries')
        .delete()
        .eq('date', date);
    if (error) throw error;
}

export async function clearAllWeightEntries() {
    const { error } = await db
        .from('weight_entries')
        .delete()
        .gte('id', 0);
    if (error) throw error;
}

// ── Settings (single-row, id=1) ─────────────────────────

export async function getSettings() {
    const { data, error } = await db
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function saveSettings(profile) {
    const row = {
        id: 1,
        start_weight: profile.startWeight,
        goal_weight: profile.goalWeight,
        user_height: profile.userHeight,
        user_age: profile.userAge
    };
    if (profile.goalDate !== undefined) {
        row.goal_date = profile.goalDate || null;
    }
    const { error } = await db
        .from('settings')
        .upsert(row);
    if (error) throw error;
}

// ── Rewards / Milestones ────────────────────────────────

export async function getRewards() {
    const { data, error } = await db
        .from('rewards')
        .select('*')
        .order('target', { ascending: false });
    if (error) throw error;
    const LEGACY_ICON_MAP = {
        'ph-star': '⭐', 'ph-trophy': '🏆', 'ph-heart': '❤️', 'ph-flag': '🏁',
        'ph-cake': '🎂', 'ph-confetti': '🎉', 'ph-crown': '👑', 'ph-fire': '🔥',
        'ph-lightning': '⚡', 'ph-medal': '🏅', 'ph-target': '🎯', 'ph-sparkle': '✨'
    };
    return (data || []).map(r => {
        let icon = r.icon || '⭐';
        if (icon.startsWith('ph-')) icon = LEGACY_ICON_MAP[icon] || '⭐';
        return { target: Number(r.target), title: r.title, icon };
    });
}

export async function saveRewards(rewards) {
    const { error: delErr } = await db
        .from('rewards')
        .delete()
        .gte('id', 0);
    if (delErr) throw delErr;

    if (rewards.length > 0) {
        const rows = rewards.map((r, i) => ({
            target: r.target,
            title: r.title,
            icon: r.icon || '⭐',
            sort_order: i
        }));
        const { error: insErr } = await db
            .from('rewards')
            .insert(rows);
        if (insErr) throw insErr;
    }
}

// ── Training Plan ───────────────────────────────────────

export async function getTrainingPlan() {
    const { data, error } = await db
        .from('training_plan')
        .select('*')
        .order('day_index')
        .order('exercise_order');
    if (error) throw error;

    const plan = Array.from({ length: 7 }, () => []);
    for (const row of (data || [])) {
        const type = row.type || 'strength';
        const ex = { name: row.name, type, note: row.note || '' };
        if (type === 'strength') {
            ex.sets = row.sets;
            // reps field may contain weight: "10|22.5"
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
            // Circuit note is stored separately after a delimiter
            if (ex.note && ex.note.startsWith('__cn__:')) {
                ex.note = ex.note.slice(7);
            }
        }
        plan[row.day_index].push(ex);
    }
    return plan;
}

export async function saveTrainingPlan(plan) {
    const { error: delErr } = await db
        .from('training_plan')
        .delete()
        .gte('id', 0);
    if (delErr) throw delErr;

    const rows = [];
    for (let day = 0; day < 7; day++) {
        const exercises = plan[day] || [];
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            const type = ex.type || 'strength';
            const row = {
                day_index: day,
                exercise_order: i,
                name: ex.name,
                type,
                note: ex.note || ''
            };
            if (type === 'strength') {
                row.sets = ex.sets || 0;
                // Encode weight into reps field: "10|22.5"
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

    if (rows.length > 0) {
        const { error: insErr } = await db
            .from('training_plan')
            .insert(rows);
        if (insErr) throw insErr;
    }
}

// ── Widget Layout ───────────────────────────────────────

export async function getLayout() {
    const { data, error } = await db
        .from('widget_layout')
        .select('*')
        .order('sort_order');
    if (error) throw error;

    if (!data || data.length === 0) return null;

    const layout = { left: [], right: [] };
    for (const row of data) {
        if (layout[row.column_name]) {
            layout[row.column_name].push(row.widget_id);
        }
    }
    return layout;
}

export async function saveLayout(widgetLayout) {
    const { error: delErr } = await db
        .from('widget_layout')
        .delete()
        .gte('id', 0);
    if (delErr) throw delErr;

    const rows = [];
    for (const col of ['left', 'right']) {
        const widgets = widgetLayout[col] || [];
        for (let i = 0; i < widgets.length; i++) {
            rows.push({
                widget_id: widgets[i],
                column_name: col,
                sort_order: i
            });
        }
    }

    if (rows.length > 0) {
        const { error: insErr } = await db
            .from('widget_layout')
            .insert(rows);
        if (insErr) throw insErr;
    }
}

// ── Photo Storage ───────────────────────────────────────

export async function savePhoto(date, blob) {
    const path = `${date}.jpg`;
    const { error } = await db.storage
        .from(PHOTO_BUCKET)
        .upload(path, blob, {
            contentType: 'image/jpeg',
            upsert: true
        });
    if (error) throw error;
}

export async function getPhotoUrl(date) {
    const path = `${date}.jpg`;
    const { data, error } = await db.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(path, 86400); // 24 hour expiry
    if (error) throw error;
    return data.signedUrl;
}

export async function deletePhoto(date) {
    const path = `${date}.jpg`;
    const { error } = await db.storage
        .from(PHOTO_BUCKET)
        .remove([path]);
    if (error) throw error;
}

export async function getAllPhotoDates() {
    const { data, error } = await db.storage
        .from(PHOTO_BUCKET)
        .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    return (data || [])
        .filter(f => f.name.endsWith('.jpg'))
        .map(f => f.name.replace('.jpg', ''));
}

export async function clearAllPhotos() {
    const dates = await getAllPhotoDates();
    if (dates.length === 0) return;
    const paths = dates.map(d => `${d}.jpg`);
    const { error } = await db.storage
        .from(PHOTO_BUCKET)
        .remove(paths);
    if (error) throw error;
}

// ── Workout Logs ────────────────────────────────────────

export async function getWorkoutLogs() {
    const { data, error } = await db
        .from('workout_logs')
        .select('*')
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
    const row = {
        date: session.date,
        day_index: session.dayIndex,
        started_at: session.startedAt,
        finished_at: session.finishedAt,
        duration_seconds: session.durationSeconds,
        exercises: session.exercises
    };
    const { data, error } = await db
        .from('workout_logs')
        .insert(row)
        .select('id')
        .single();
    if (error) throw error;
    return data ? data.id : null;
}

export async function deleteWorkoutLog(id) {
    const { error } = await db
        .from('workout_logs')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function clearAllWorkoutLogs() {
    const { error } = await db
        .from('workout_logs')
        .delete()
        .gte('id', 0);
    if (error) throw error;
}

// ── Personal Records ────────────────────────────────────

export async function getPersonalRecords() {
    const { data, error } = await db
        .from('personal_records')
        .select('*')
        .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => ({
        id: r.id,
        exercise_name: r.exercise_name,
        weight: Number(r.weight),
        reps: r.reps,
        date: r.date
    }));
}

export async function savePersonalRecord(pr) {
    const { error } = await db
        .from('personal_records')
        .insert({
            exercise_name: pr.exercise_name,
            weight: pr.weight,
            reps: pr.reps,
            date: pr.date
        });
    if (error) throw error;
}

export async function clearAllPersonalRecords() {
    const { error } = await db
        .from('personal_records')
        .delete()
        .gte('id', 0);
    if (error) throw error;
}

// ── Step Entries ────────────────────────────────────────

export async function getTodaySteps() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await db
        .from('step_entries')
        .select('steps')
        .eq('date', today)
        .maybeSingle();
    if (error) throw error;
    return data ? Number(data.steps) : 0;
}

export async function upsertStepEntry(date, steps) {
    const { error } = await db
        .from('step_entries')
        .upsert({ date, steps }, { onConflict: 'date' });
    if (error) throw error;
}

export async function getStepHistory() {
    const { data, error } = await db
        .from('step_entries')
        .select('date, steps')
        .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(e => ({ date: e.date, steps: Number(e.steps) }));
}
