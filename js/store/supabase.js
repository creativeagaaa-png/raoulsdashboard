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
    return (data || []).map(r => ({
        target: Number(r.target),
        title: r.title,
        icon: r.icon
    }));
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
            icon: r.icon || 'ph-star',
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
        plan[row.day_index].push({
            name: row.name,
            sets: row.sets,
            reps: row.reps,
            note: row.note
        });
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
            rows.push({
                day_index: day,
                exercise_order: i,
                name: exercises[i].name,
                sets: exercises[i].sets || 0,
                reps: exercises[i].reps || '',
                note: exercises[i].note || ''
            });
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

export async function savePhoto(date, base64String) {
    // Convert base64 data URL to Blob
    const parts = base64String.split(',');
    const byteString = atob(parts[1]);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });

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
