// One-time script to seed training plan from PDF v3
// Run with: node seed-training.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://liuekokgchfzatodsaxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdWVrb2tnY2hmemF0b2RzYXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzI1MTAsImV4cCI6MjA4Njc0ODUxMH0.3CBZnoZCZiUKNRdVF0GewDxNHpJVdYsYPMswRld3vz8';

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Training Plan v3 from PDF
// Day indices: 0=Monday, 1=Tuesday, ..., 6=Sunday
const plan = [
    // MONDAY (0) — Beine + Bauch
    [
        { name: 'Beintraining-Video', type: 'cardio', duration: 'Komplett' },
        { name: 'Cossack Squats', type: 'strength', sets: 3, reps: '8/Seite', note: 'Hueftmobilitaet fuer Kicks/Guard' },
        { name: 'Explosive Squats', type: 'strength', sets: 3, reps: '8', note: 'Abspringen, weich landen!' },
        { name: 'Wadenheben (Treppenkante)', type: 'strength', sets: 3, reps: '20', note: 'Langsam! Exzentrisch betonen' },
        { name: 'Bauch-Video', type: 'cardio', duration: 'Komplett' },
    ],
    // TUESDAY (1) — Pull + Seilspringen
    [
        { name: 'Klimmzuege (Obergriff)', type: 'strength', sets: 4, reps: '6-10', note: '3s langsam ablassen' },
        { name: 'Klimmzuege (Untergriff/Chin-Up)', type: 'strength', sets: 3, reps: 'max', note: 'Bizeps + Zugkraft fuer Clinch' },
        { name: 'Australian Rows (Stange tief)', type: 'strength', sets: 4, reps: '12', note: 'Fuesse erhoeht = schwerer' },
        { name: 'Handtuch-Klimmzuege', type: 'strength', sets: 3, reps: '5-6', note: 'Handtuch ueber Stange = Griffkraft!' },
        { name: 'Dead Hang', type: 'strength', sets: 3, reps: 'max. Zeit', note: 'Griffkraft + Schultergesundheit' },
        { name: 'Seilspringen', type: 'cardio', duration: '10-15 Min.', note: '2 Min. locker / 1 Min. schnell (Wechsel)' },
    ],
    // WEDNESDAY (2) — MMA-Conditioning + Bauch
    [
        {
            name: 'MMA-Conditioning Zirkel',
            type: 'circuit',
            rounds: 5,
            circuitExercises: [
                { name: 'Sprawls', duration: '30s' },
                { name: 'Plank Shoulder Taps', duration: '30s' },
                { name: 'Mountain Climbers', duration: '30s' },
                { name: 'Bicycle Crunches', duration: '30s' },
                { name: 'Push-Up to Sprawl', duration: '30s' },
                { name: 'Plank Hip Dips', duration: '30s' },
            ],
            note: '5 Runden a 3 Min. 1 Min. Pause zwischen Runden'
        },
        { name: 'Bauch-Video', type: 'cardio', duration: 'Komplett' },
    ],
    // THURSDAY (3) — Beine + Mobility
    [
        { name: 'Beintraining-Video', type: 'cardio', duration: 'Komplett' },
        { name: 'Bulgarian Split Squats', type: 'strength', sets: 3, reps: '10/Seite', note: 'Stuhl/Bank als Erhoehung' },
        { name: 'Single-Leg RDL', type: 'strength', sets: 3, reps: '10/Seite', note: 'Hintere Kette + Balance' },
        { name: 'Wadendehnung (an der Wand)', type: 'strength', sets: 3, reps: '30s/Seite', note: 'Shin Splint Praevention!' },
        { name: '90/90 Hip Switches', type: 'strength', sets: 3, reps: '10/Seite', note: 'Hueftmobilitaet fuer Guards/Kicks' },
        { name: 'Deep Squat Hold', type: 'strength', sets: 3, reps: '45s', note: 'Sprunggelenk + Huefte oeffnen' },
        { name: 'Thoracic Rotation', type: 'strength', sets: 3, reps: '10/Seite', note: 'Brustwirbelsaeule = Schlagrotation' },
        { name: 'Pigeon Stretch', type: 'strength', sets: 2, reps: '60s/Seite', note: 'Hueftbeuger + Gesaess' },
        { name: 'Tibialis Raises', type: 'strength', sets: 3, reps: '15', note: 'Schienbeinmuskel staerken!' },
    ],
    // FRIDAY (4) — Push + Seilspringen
    [
        { name: 'Dips am Barren', type: 'strength', sets: 4, reps: '8-12', note: 'Brust, Trizeps, Schultern' },
        { name: 'Liegestuetz (Diamant)', type: 'strength', sets: 3, reps: '12-15', note: 'Trizeps-Fokus' },
        { name: 'Pike Push-Ups (Fuesse erhoeht)', type: 'strength', sets: 4, reps: '8-10', note: 'Schulterdruecken-Ersatz' },
        { name: 'Archer Push-Ups', type: 'strength', sets: 3, reps: '6/Seite', note: 'Einarmige Druckkraft' },
        { name: 'L-Sit Hold (Barren)', type: 'strength', sets: 4, reps: 'max. Zeit', note: 'Core + Hueftbeuger' },
        { name: 'Seilspringen', type: 'cardio', duration: '10-15 Min.', note: 'Moderat halten, morgen ist Lauf-Tag' },
    ],
    // SATURDAY (5) — Lauf + Bauch + Dehnen
    [
        { name: 'Laufen', type: 'cardio', duration: '25-35 Min.', note: 'Lockerer Dauerlauf, weicher Untergrund' },
        { name: 'Bauch-Video', type: 'cardio', duration: 'Komplett' },
        { name: 'Cool-Down Dehnen', type: 'cardio', duration: '10 Min.', note: 'Waden, Hueftbeuger, Hamstrings, Schienbein-Massage' },
    ],
    // SUNDAY (6) — Ruhetag
    []
];

async function seed() {
    console.log('Deleting existing training plan...');
    const { error: delErr } = await db.from('training_plan').delete().gte('id', 0);
    if (delErr) { console.error('Delete error:', delErr); return; }

    const rows = [];
    for (let day = 0; day < 7; day++) {
        const exercises = plan[day];
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
                const reps = ex.reps || '';
                const weight = parseFloat(ex.weight) || 0;
                row.reps = weight > 0 ? reps + '|' + weight : reps;
            } else if (type === 'cardio') {
                row.sets = 0;
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
        console.log(`Inserting ${rows.length} exercises...`);
        const { error: insErr } = await db.from('training_plan').insert(rows);
        if (insErr) { console.error('Insert error:', insErr); return; }
    }

    console.log('Training plan seeded successfully!');
    console.log('Days with exercises:', plan.filter(d => d.length > 0).length);
    console.log('Total exercises:', rows.length);
}

seed();
