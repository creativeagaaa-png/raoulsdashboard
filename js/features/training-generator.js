// js/features/training-generator.js

import { WEEKDAYS, WEEKDAY_SHORT, EQUIPMENT_LABELS, MUSCLE_LABELS, INJURY_REGIONS, INJURY_KEYWORD_MAP, UPPER_MUSCLES, LOWER_MUSCLES, CORE_MUSCLES } from '../utils/constants.js';
import { getTodayWeekdayIndex } from '../utils/formatting.js';
import { exercises, EQUIPMENT_MAP, MUSCLE_GROUPS } from '../data/exercises.js';
import { splitTemplates, REPS_SCHEMES } from '../data/split-templates.js';
import { WEEKLY_VOLUME_BUDGET, TRAINING_LEVELS, TRAINING_LEVEL_LABELS, EQUIPMENT_COMPATIBILITY_THRESHOLD, EQUIPMENT_SCORE_BONUS, EQUIPMENT_SCORE_EXCLUDE_BELOW, EQUIPMENT_SCORE_PENALTY, PERIODIZATION, SPORT_MUSCLE_LOAD, SPORT_RECOVERY_REDUCTION, WARMUP_BY_MUSCLE, MAX_WARMUP_ELEMENTS, WARMUP_FALLBACK } from '../data/training-constants.js';

// ── Physiologische Leitplanken ──────────────────────────
// Alle Limits als benannte Konstanten mit sportwissenschaftlicher Begruendung.
const PHYSIO_CONSTRAINTS = {
    // Volumen pro Muskelgruppe pro Session
    // Schoenfeld et al. (2017): 10-20 Sets/Woche optimal → max 6-10/Session
    MAX_SETS_PER_MUSCLE_PER_SESSION: 10,
    MIN_SETS_PER_MUSCLE_PER_SESSION: 2,
    MAX_SETS_SMALL_MUSCLE: 6,
    SMALL_MUSCLES: ['biceps', 'triceps', 'calves', 'forearms', 'rear_delts', 'side_delts', 'front_delts'],

    // Satzpausen skaliert nach Intensitaet (Sekunden, fuer Zeitberechnung)
    // Kraemer & Ratamess (2004): rest period ranges by training goal
    REST_SECONDS_BY_GOAL: {
        strength: 150,  // 2-3 min → Mittelwert 150s
        muscle:   75,   // 60-90s → Mittelwert 75s
        fat_loss: 45,   // 30-60s → Mittelwert 45s
        endurance: 30,  // 30s
        general:  60    // 60s
    },
    REST_BY_GOAL: {
        strength: '2-3 min Pause',
        muscle:   '60-90s Pause',
        fat_loss: '30-60s Pause',
        endurance:'30s Pause',
        general:  '60s Pause'
    },

    // Geschaetzte Wiederholungsdauer pro Satz (Sekunden)
    // Basierend auf Time-Under-Tension: ~3-4s pro Rep
    WORK_SECONDS_PER_SET: {
        compound: 40,   // ~10 reps × 4s = 40s
        isolation: 35   // ~12 reps × 3s = 36s
    },

    // Ermuedungs-Management
    FATIGUE_REDUCTION_AFTER_EXERCISE: 6,
    MAX_EXERCISES_PER_SESSION: 10,

    // Duration Sanity
    MAX_CARDIO_DURATION_MINUTES: 20,
    MIN_SESSION_MINUTES: 20,
    MAX_SESSION_MINUTES: 120,
    WARMUP_MINUTES: { 30: 5, 45: 5, 60: 8, 90: 10 },
    COOLDOWN_MINUTES: 5,

    // Set-Limits pro Uebung
    MAX_SETS_PER_EXERCISE: 5,
    MIN_SETS_PER_EXERCISE: 2,

    // Duplikat-Schutz
    MAX_SAME_MOVEMENT_PATTERN: 1,

    // Constraint 4: Minimale Erholungszeit fuer gleiche Muskelgruppe bei hoher Intensitaet
    // ACSM Guidelines: 48h Erholung fuer gleiche Muskelgruppe bei hoher Intensitaet
    MIN_RECOVERY_DAYS_HIGH_INTENSITY: 2
};

// Shared helper: geschaetzte Zeit einer einzelnen Uebung in Minuten
// Constraint 2: Beruecksichtigt Satzpausen nach Trainingsziel fuer korrekte Zeitbudgets
function _exerciseTimeEstimate(ex, goal) {
    if (ex.type === 'strength') {
        const sets = ex.sets || 3;
        // _compound may be deleted after formatting — fallback to movementPattern
        const isCompound = ex._compound === true ||
            (ex._compound === undefined && ex._movementPattern && ex._movementPattern !== 'isolation');
        const workSec = isCompound
            ? PHYSIO_CONSTRAINTS.WORK_SECONDS_PER_SET.compound
            : PHYSIO_CONSTRAINTS.WORK_SECONDS_PER_SET.isolation;
        // Rest only between sets (sets-1 rest periods)
        const restSec = PHYSIO_CONSTRAINTS.REST_SECONDS_BY_GOAL[goal || 'general'] || 60;
        const totalSec = sets * workSec + Math.max(0, sets - 1) * restSec;
        return totalSec / 60;
    }
    if (ex.type === 'cardio' || ex.type === 'distance') {
        return parseInt(ex.duration) || 10;
    }
    return 5;
}

export const trainingGeneratorMixin = () => ({
    generatorOpen: false,
    generatorStep: 0,
    generatorAnswers: {
        selectedDays: [],
        equipment: null,
        goals: [],
        muscleFocus: null,
        hasOtherSports: false,
        otherSports: '',
        otherSportsDays: [],
        sessionDuration: null,
        injuryRegions: [],
        injuryText: '',
        hasInjuries: false,
        avoidedEquipment: [],
        preferredEquipment: [],
        exercisePreferences: '',
        trainingLevel: null
    },
    generatedPlan: null,
    generatorLoading: false,
    showTrainingSelection: false,
    swapOptions: null,
    swapTarget: null,
    generatorMeta: null,
    previewEditTarget: null,

    // ── Constants for template ────────────────────────
    EQUIPMENT_LABELS,
    MUSCLE_LABELS,
    INJURY_REGIONS,

    getSportIcon(sportName) {
        if (!sportName) return 'ph-heartbeat';
        const s = sportName.toLowerCase();
        if (s.includes('fussball') || s.includes('fußball') || s.includes('soccer')) return 'ph-soccer-ball';
        if (s.includes('basketball')) return 'ph-basketball';
        if (s.includes('tennis') || s.includes('badminton') || s.includes('squash')) return 'ph-tennis-ball';
        if (s.includes('schwimm')) return 'ph-swimming-pool';
        if (s.includes('rad') || s.includes('cycling') || s.includes('bike') || s.includes('fahrrad')) return 'ph-bicycle';
        if (s.includes('lauf') || s.includes('jogg') || s.includes('running') || s.includes('sprint')) return 'ph-person-simple-run';
        if (s.includes('yoga') || s.includes('pilates')) return 'ph-flower-lotus';
        if (s.includes('box') || s.includes('kickbox') || s.includes('mma') || s.includes('kampf')) return 'ph-hand-fist';
        if (s.includes('volleyball')) return 'ph-volleyball';
        if (s.includes('handball')) return 'ph-hand-grabbing';
        if (s.includes('golf')) return 'ph-golf';
        if (s.includes('tanz') || s.includes('dance')) return 'ph-music-notes';
        if (s.includes('kletter') || s.includes('boulder')) return 'ph-mountains';
        if (s.includes('ski') || s.includes('snowboard')) return 'ph-snowflake';
        if (s.includes('wander') || s.includes('hik')) return 'ph-boot';
        if (s.includes('ruder') || s.includes('rowing') || s.includes('kajak') || s.includes('kanu')) return 'ph-waves';
        if (s.includes('hockey') || s.includes('eishockey')) return 'ph-hockey';
        return 'ph-heartbeat';
    },

    // ── Computed ──────────────────────────────────────
    generatorDaysPerWeek() {
        return this.generatorAnswers.selectedDays.length;
    },

    generatorFreeDays() {
        return this.generatorAnswers.selectedDays.slice().sort((a, b) => a - b);
    },

    generatorWeeklyMuscleStats() {
        if (!this.generatedPlan) return {};
        const stats = {};
        for (const day of this.generatedPlan) {
            for (const ex of day) {
                if (ex.type !== 'strength' || !ex._muscles) continue;
                for (const m of ex._muscles) {
                    stats[m] = (stats[m] || 0) + (ex.sets || 3);
                }
            }
        }
        return stats;
    },

    generatorSummaryLabels() {
        const a = this.generatorAnswers;
        const equipLabels = { full_gym: 'Fitnessstudio', home_gym: 'Home-Gym', bodyweight: 'Bodyweight' };
        const goalLabels = { muscle: 'Muskelaufbau', fat_loss: 'Fettabbau', endurance: 'Ausdauer', general: 'Allg. Fitness' };
        const focusLabels = { upper: 'Nur Oberkoerper', lower: 'Nur Unterkoerper', balanced: 'Ausgewogen' };
        const durationLabels = { 30: '30 Minuten', 45: '45 Minuten', 60: '60 Minuten', 90: '90+ Minuten' };

        const dayNames = a.selectedDays.slice().sort((a, b) => a - b).map(d => WEEKDAY_SHORT[d]).join(', ');
        const sportDayNames = a.otherSportsDays.slice().sort((a, b) => a - b).map(d => WEEKDAY_SHORT[d]).join(', ');

        let otherSportsLabel = 'Nein';
        if (a.hasOtherSports) {
            const parts = [a.otherSports || 'Ja'];
            if (sportDayNames) parts.push(sportDayNames);
            otherSportsLabel = parts.join(' — ');
        }

        return {
            days: dayNames || '–',
            daysCount: a.selectedDays.length,
            equipment: equipLabels[a.equipment] || '–',
            goals: a.goals.map(g => goalLabels[g] || g).join(', ') || '–',
            focus: focusLabels[a.muscleFocus] || '–',
            otherSports: otherSportsLabel,
            duration: durationLabels[a.sessionDuration] || '–',
            injuries: a.hasInjuries ? [...a.injuryRegions.map(r => { const reg = INJURY_REGIONS.find(ir => ir.id === r); return reg ? reg.label : r; }), a.injuryText].filter(Boolean).join(', ') : 'Keine',
            avoidedEquip: a.avoidedEquipment.map(e => EQUIPMENT_LABELS[e] || e).join(', ') || '–',
            preferredEquip: a.preferredEquipment.map(e => EQUIPMENT_LABELS[e] || e).join(', ') || '–'
        };
    },

    // ── Open / Close ─────────────────────────────────
    openTrainingSelection() {
        this.showTrainingSelection = true;
        this.generatorOpen = false;
        this.generatorStep = 0;
        this.generatedPlan = null;
        this.generatorMeta = null;
        this.swapOptions = null;
        this.swapTarget = null;
        this.previewEditTarget = null;
    },

    closeTrainingSelection() {
        this.showTrainingSelection = false;
        this.generatorOpen = false;
    },

    selectManualTraining() {
        this.showTrainingSelection = false;
        this.openTraining();
    },

    selectGeneratorTraining() {
        const hasExistingPlan = this.trainingPlan.some(day => day.length > 0);
        if (hasExistingPlan) {
            this.confirmModal = {
                show: true,
                title: 'Plan ersetzen?',
                message: 'Dein bestehender Trainingsplan wird durch den neuen ersetzt.',
                confirmLabel: 'Weiter',
                onConfirm: () => { this._startGenerator(); }
            };
            return;
        }
        this._startGenerator();
    },

    _startGenerator() {
        this.showTrainingSelection = false;
        this.generatorOpen = true;
        this.generatorStep = 1;
        this.generatorAnswers = {
            selectedDays: [],
            equipment: null,
            goals: [],
            muscleFocus: null,
            hasOtherSports: false,
            otherSports: '',
            otherSportsDays: [],
            sessionDuration: null,
            injuryRegions: [],
            injuryText: '',
            hasInjuries: false,
            avoidedEquipment: [],
            preferredEquipment: [],
            exercisePreferences: ''
        };
        this.generatedPlan = null;
        this.generatorMeta = null;
        this.previewEditTarget = null;
    },

    closeGenerator() {
        this.generatorOpen = false;
        this.generatorStep = 0;
    },

    backToSelection() {
        this.generatorOpen = false;
        this.generatorStep = 0;
        this.showTrainingSelection = true;
    },

    // ── Navigation ───────────────────────────────────
    generatorPrevStep() {
        if (this.generatorStep > 1) this.generatorStep--;
    },

    generatorNextStep() {
        const a = this.generatorAnswers;
        // Validation per step
        if (this.generatorStep === 1 && a.selectedDays.length === 0) return;
        if (this.generatorStep === 2 && !a.equipment) return;
        if (this.generatorStep === 3 && a.goals.length === 0) return;
        if (this.generatorStep === 4 && !a.muscleFocus) return;
        if (this.generatorStep === 6 && !a.sessionDuration) return;

        if (this.generatorStep < 9) {
            this.generatorStep++;
        }
    },

    // ── Toggles ──────────────────────────────────────
    toggleGoal(goal) {
        const idx = this.generatorAnswers.goals.indexOf(goal);
        if (idx === -1) this.generatorAnswers.goals.push(goal);
        else this.generatorAnswers.goals.splice(idx, 1);
    },

    toggleTrainingDay(dayIndex) {
        const idx = this.generatorAnswers.selectedDays.indexOf(dayIndex);
        if (idx === -1) this.generatorAnswers.selectedDays.push(dayIndex);
        else this.generatorAnswers.selectedDays.splice(idx, 1);
    },

    toggleInjuryRegion(regionId) {
        const idx = this.generatorAnswers.injuryRegions.indexOf(regionId);
        if (idx === -1) this.generatorAnswers.injuryRegions.push(regionId);
        else this.generatorAnswers.injuryRegions.splice(idx, 1);
    },

    toggleOtherSportDay(dayIndex) {
        const idx = this.generatorAnswers.otherSportsDays.indexOf(dayIndex);
        if (idx === -1) this.generatorAnswers.otherSportsDays.push(dayIndex);
        else this.generatorAnswers.otherSportsDays.splice(idx, 1);
    },

    toggleEquipmentPref(eqType, list) {
        const arr = this.generatorAnswers[list];
        const idx = arr.indexOf(eqType);
        if (idx === -1) {
            arr.push(eqType);
            // Remove from opposite list
            const opposite = list === 'preferredEquipment' ? 'avoidedEquipment' : 'preferredEquipment';
            const oppIdx = this.generatorAnswers[opposite].indexOf(eqType);
            if (oppIdx !== -1) this.generatorAnswers[opposite].splice(oppIdx, 1);
        } else {
            arr.splice(idx, 1);
        }
    },

    // ── Plan Generation ──────────────────────────────
    async generatePlan() {
        if (!this.generatorAnswers) return;
        this.generatorLoading = true;
        await new Promise(r => setTimeout(r, 400));

        try {
            const result = this._buildPlan();
            await this._enrichWithHistory(result.plan);
            this.generatedPlan = result.plan;
            this.generatorMeta = result.meta;
            this.generatorStep = 10; // Preview
        } catch (e) {
            console.error('Plan generation failed:', e);
            this.showToast('Fehler bei der Plan-Erstellung. Bitte versuche es erneut.');
        } finally {
            this.generatorLoading = false;
        }
    },

    _buildPlan() {
        const a = this.generatorAnswers;
        const daysPerWeek = a.selectedDays.length;

        // Defensive: falls keine Goals gesetzt, Fallback auf 'general'
        if (!a.goals || a.goals.length === 0) {
            a.goals = ['general'];
        }

        // 1. Template waehlen (level aus Wizard oder Fallback)
        const level = a.trainingLevel || 'intermediate';
        const allowedEquipment = EQUIPMENT_MAP[a.equipment] || EQUIPMENT_MAP.full_gym;
        const template = this._selectTemplate(a, level, daysPerWeek, allowedEquipment);

        // 2. Muscle Focus anwenden
        const adjustedTemplate = this._applyMuscleFocus(template, a.muscleFocus);

        // 3. Verfuegbare Uebungen filtern
        const effectiveEquipment = adjustedTemplate.equipmentFilter || allowedEquipment;

        // Alle Injury-Keywords sammeln (Chips + Freitext)
        const injuryKeywords = [];
        for (const region of a.injuryRegions) {
            if (INJURY_KEYWORD_MAP[region]) {
                injuryKeywords.push(...INJURY_KEYWORD_MAP[region]);
            }
        }
        if (a.injuryText) {
            injuryKeywords.push(...a.injuryText.toLowerCase().split(/[\s,]+/).filter(Boolean));
        }

        let available = exercises.filter(ex => {
            if (ex.equipment && !effectiveEquipment.includes(ex.equipment)) return false;
            // Injury filter
            if (a.hasInjuries && injuryKeywords.length > 0) {
                if (ex.avoidWhenInjured && ex.avoidWhenInjured.some(kw => injuryKeywords.includes(kw))) return false;
            }
            // Equipment avoid filter
            if (a.avoidedEquipment.length > 0 && a.avoidedEquipment.includes(ex.equipment)) return false;
            return true;
        });

        // Preferred equipment boost
        if (a.preferredEquipment.length > 0) {
            available = available.map(ex => {
                if (a.preferredEquipment.includes(ex.equipment)) {
                    return { ...ex, priority: Math.min(5, (ex.priority ?? 3) + 1) };
                }
                return ex;
            });
        }

        // Exercise name preference boost (from free text)
        if (a.exercisePreferences) {
            const prefText = a.exercisePreferences.toLowerCase();
            available = available.map(ex => {
                if (prefText.includes(ex.name.toLowerCase())) {
                    return { ...ex, priority: Math.min(5, (ex.priority ?? 3) + 2) };
                }
                return ex;
            });
        }

        // 4. Training days
        const trainingDayIndices = a.selectedDays.slice().sort((a, b) => a - b);

        // 5. Rep-Schema — mixed for multi-goals
        const primaryGoal = a.goals[0] || 'general';
        const secondaryGoal = a.goals.length > 1 ? a.goals[1] : null;
        const primaryScheme = REPS_SCHEMES[primaryGoal] || REPS_SCHEMES.general;
        const secondaryScheme = secondaryGoal ? (REPS_SCHEMES[secondaryGoal] || null) : null;

        // 6. Plan bauen
        const plan = Array.from({ length: 7 }, () => []);
        const usedExerciseIds = new Set();
        const usedCardioIds = new Set();

        // Constraint 4: Recovery-Tracking — verfolge an welchen Tagen welche Muskelgruppen
        // hoch-intensiv trainiert wurden. Gleiche Muskelgruppe braucht min. 48h Erholung (2 Tage).
        // weeklyMuscleSchedule[dayIndex] = Set von Muskelgruppen mit hoher Intensitaet
        const weeklyMuscleSchedule = {};

        // Estimated time per day for meta
        const dayMetas = [];

        // Issue 1: Weekly Volume Budget — beschraenkt Gesamt-Sets pro Muskel pro Woche
        const weeklyBudget = this._createWeeklyVolumeBudget(level);
        const weeklyUsed = {};

        // Issue 5: Other Sports Recovery — reduziere Budget fuer belastete Muskeln
        if (a.hasOtherSports && a.otherSportsDays.length > 0) {
            const sportLoad = this._sportMuscleLoad(a.otherSports);
            const reducedMuscles = new Set();

            for (const sportDayIdx of a.otherSportsDays) {
                for (const trainDayIdx of trainingDayIndices) {
                    const gap = Math.abs(trainDayIdx - sportDayIdx);
                    const wrapGap = Math.min(gap, 7 - gap);
                    if (wrapGap <= 1) {
                        for (const [muscle, load] of Object.entries(sportLoad)) {
                            if (load >= 0.5 && !reducedMuscles.has(muscle)) {
                                weeklyBudget[muscle] = Math.round(
                                    (weeklyBudget[muscle] || 0) * (1 - SPORT_RECOVERY_REDUCTION * load)
                                );
                                reducedMuscles.add(muscle);
                            }
                        }
                    }
                }
            }
        }

        for (let i = 0; i < adjustedTemplate.structure.length; i++) {
            const dayDef = adjustedTemplate.structure[i];
            const dayIndex = trainingDayIndices[i];
            if (dayIndex === undefined) break;

            const dayExercises = [];
            const dayUsedPatterns = new Set();
            const daySetsPerMuscle = {};
            // Reserve 2 slots for warmup + cooldown
            const maxStrengthExercises = PHYSIO_CONSTRAINTS.MAX_EXERCISES_PER_SESSION - 2;
            let strengthCount = 0;

            // Warm-up
            const warmupMin = PHYSIO_CONSTRAINTS.WARMUP_MINUTES[a.sessionDuration] || 5;
            dayExercises.push({
                name: 'Aufwaermen',
                type: 'cardio',
                duration: warmupMin + ' min',
                note: this._generateWarmupNote(dayDef.muscleTargets),
                _isWarmup: true
            });

            for (const target of dayDef.muscleTargets) {
                if (strengthCount >= maxStrengthExercises) break;

                const equipmentUsedForMuscle = [];

                const compounds = this._pickExercises(
                    available, target.muscle, true, target.compound, usedExerciseIds, equipmentUsedForMuscle, dayUsedPatterns
                );
                compounds.forEach(ex => { if (ex.equipment) equipmentUsedForMuscle.push(ex.equipment); });

                for (const ex of compounds) {
                    if (strengthCount >= maxStrengthExercises) break;
                    const formatted = this._formatExercise(ex, primaryScheme, primaryGoal, true);

                    // Volume cap check — session + weekly budget
                    const muscles = formatted._muscles || [];
                    let blocked = false;
                    for (const m of muscles) {
                        const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(m);
                        const sessionCap = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                        const sessionRemaining = sessionCap - (daySetsPerMuscle[m] || 0);
                        const weeklyRemaining = this._remainingWeeklyBudget(m, weeklyBudget, weeklyUsed);
                        const effectiveRemaining = Math.min(sessionRemaining, weeklyRemaining);
                        if (effectiveRemaining < PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE) {
                            blocked = true;
                            break;
                        }
                    }
                    if (blocked) continue;

                    // Cap sets if needed for any muscle
                    let cappedSets = formatted.sets || 3;
                    for (const m of muscles) {
                        const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(m);
                        const sessionCap = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                        const sessionRemaining = sessionCap - (daySetsPerMuscle[m] || 0);
                        const weeklyRemaining = this._remainingWeeklyBudget(m, weeklyBudget, weeklyUsed);
                        cappedSets = Math.min(cappedSets, sessionRemaining, weeklyRemaining);
                    }
                    cappedSets = Math.max(cappedSets, PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE);
                    formatted.sets = cappedSets;

                    // Track volume (session + weekly)
                    for (const m of muscles) {
                        daySetsPerMuscle[m] = (daySetsPerMuscle[m] || 0) + cappedSets;
                        weeklyUsed[m] = (weeklyUsed[m] || 0) + cappedSets;
                    }

                    dayExercises.push(formatted);
                    strengthCount++;
                }

                if (strengthCount >= maxStrengthExercises) continue;

                const isolations = this._pickExercises(
                    available, target.muscle, false, target.isolation, usedExerciseIds, equipmentUsedForMuscle, dayUsedPatterns
                );
                const isoScheme = secondaryScheme || primaryScheme;

                for (const ex of isolations) {
                    if (strengthCount >= maxStrengthExercises) break;
                    const formatted = this._formatExercise(ex, isoScheme, secondaryGoal || primaryGoal, false);

                    // Volume cap check — session + weekly budget
                    const muscles = formatted._muscles || [];
                    let blocked = false;
                    for (const m of muscles) {
                        const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(m);
                        const sessionCap = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                        const sessionRemaining = sessionCap - (daySetsPerMuscle[m] || 0);
                        const weeklyRemaining = this._remainingWeeklyBudget(m, weeklyBudget, weeklyUsed);
                        const effectiveRemaining = Math.min(sessionRemaining, weeklyRemaining);
                        if (effectiveRemaining < PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE) {
                            blocked = true;
                            break;
                        }
                    }
                    if (blocked) continue;

                    // Cap sets if needed for any muscle
                    let cappedSets = formatted.sets || 3;
                    for (const m of muscles) {
                        const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(m);
                        const sessionCap = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                        const sessionRemaining = sessionCap - (daySetsPerMuscle[m] || 0);
                        const weeklyRemaining = this._remainingWeeklyBudget(m, weeklyBudget, weeklyUsed);
                        cappedSets = Math.min(cappedSets, sessionRemaining, weeklyRemaining);
                    }
                    cappedSets = Math.max(cappedSets, PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE);
                    formatted.sets = cappedSets;

                    // Track volume (session + weekly)
                    for (const m of muscles) {
                        daySetsPerMuscle[m] = (daySetsPerMuscle[m] || 0) + cappedSets;
                        weeklyUsed[m] = (weeklyUsed[m] || 0) + cappedSets;
                    }

                    dayExercises.push(formatted);
                    strengthCount++;
                }
            }

            // Cardio (separate tracking, allow repeats across days)
            if (adjustedTemplate.addCardioToEachDay || a.goals.includes('fat_loss') || a.goals.includes('endurance')) {
                const cardioEx = this._pickCardioExercise(available, effectiveEquipment, usedCardioIds, a);
                if (cardioEx) dayExercises.push(cardioEx);
            }

            // Cooldown
            dayExercises.push({
                name: 'Cooldown / Stretching',
                type: 'cardio',
                duration: PHYSIO_CONSTRAINTS.COOLDOWN_MINUTES + ' min',
                note: 'Statisches Dehnen der beanspruchten Muskelgruppen',
                _isCooldown: true
            });

            // Time adjustment (exclude warmup/cooldown from adjustment)
            const adjustableExercises = dayExercises.filter(ex => !ex._isWarmup && !ex._isCooldown);
            const adjustableMinutes = a.sessionDuration - warmupMin - PHYSIO_CONSTRAINTS.COOLDOWN_MINUTES;
            this._adjustForDuration(adjustableExercises, adjustableMinutes, primaryGoal);

            // Sync back: remove exercises that _adjustForDuration spliced out
            const adjustableSet = new Set(adjustableExercises);
            for (let k = dayExercises.length - 1; k >= 0; k--) {
                const ex = dayExercises[k];
                if (!ex._isWarmup && !ex._isCooldown && (ex.type === 'strength' || ex.type === 'cardio' || ex.type === 'distance')) {
                    if (!adjustableSet.has(ex)) {
                        dayExercises.splice(k, 1);
                    }
                }
            }

            // Post-adjustment: re-enforce volume caps (duration boost may have pushed sets over)
            for (const ex of dayExercises) {
                if (ex.type !== 'strength' || !ex._muscles) continue;
                for (const m of ex._muscles) {
                    const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(m);
                    const cap = isSmall ? PHYSIO_CONSTRAINTS.MAX_SETS_SMALL_MUSCLE : PHYSIO_CONSTRAINTS.MAX_SETS_PER_MUSCLE_PER_SESSION;
                    // Recalculate total for this muscle in this day
                    let total = 0;
                    for (const other of dayExercises) {
                        if (other.type !== 'strength' || !other._muscles) continue;
                        if (other._muscles.includes(m)) total += (other.sets || 0);
                    }
                    if (total > cap) {
                        const excess = total - cap;
                        ex.sets = Math.max(PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE, (ex.sets || 3) - excess);
                    }
                }
            }
            // Remove exercises that got capped below minimum, but keep at least 2 strength exercises
            const currentStrength = dayExercises.filter(e => e.type === 'strength').length;
            let removedStrength = 0;
            for (let k = dayExercises.length - 1; k >= 0; k--) {
                if (dayExercises[k].type === 'strength' && (dayExercises[k].sets || 0) < PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE) {
                    if (currentStrength - removedStrength <= 2) break;
                    dayExercises.splice(k, 1);
                    removedStrength++;
                }
            }

            // Post-sort: compounds before isolations, then reassemble
            const warmup = dayExercises.filter(ex => ex._isWarmup);
            const cooldown = dayExercises.filter(ex => ex._isCooldown);
            const cardioEntries = dayExercises.filter(ex => !ex._isWarmup && !ex._isCooldown && (ex.type === 'cardio' || ex.type === 'distance'));
            const strengthEntries = dayExercises.filter(ex => ex.type === 'strength');
            const compoundEntries = strengthEntries.filter(ex => ex._compound);
            const isolationEntries = strengthEntries.filter(ex => !ex._compound);
            const sorted = [...warmup, ...compoundEntries, ...isolationEntries, ...cardioEntries, ...cooldown];
            dayExercises.length = 0;
            dayExercises.push(...sorted);

            // Estimated time
            const estimatedTime = this._estimateTime(dayExercises, primaryGoal);

            // Superset pairing for short sessions (≤30 min)
            if (a.sessionDuration <= 30) {
                this._applySupersets(dayExercises);
            }

            // Progressive overload note
            for (const ex of dayExercises) {
                if (ex.type === 'strength' && !ex.note) {
                    ex.note = primaryScheme.restNote;
                }
            }

            // Remove internal flags but keep _muscles for heatmap
            dayExercises.forEach(ex => {
                delete ex._compound;
                delete ex._isWarmup;
                delete ex._isCooldown;
            });

            plan[dayIndex] = dayExercises;
            dayMetas.push({ dayIndex, label: dayDef.label, estimatedTime });

            // Constraint 4: Record welche Muskeln an diesem Tag trainiert wurden
            // Wird fuer Recovery-Check bei nachfolgenden Tagen verwendet
            const dayMuscles = new Set();
            for (const ex of dayExercises) {
                if (ex.type === 'strength' && ex._muscles) {
                    for (const m of ex._muscles) dayMuscles.add(m);
                }
            }
            weeklyMuscleSchedule[dayIndex] = dayMuscles;
        }

        // Add other sports days to plan + Recovery-Integration (Issue 5)
        if (a.hasOtherSports && a.otherSportsDays.length > 0) {
            const sportName = a.otherSports || 'Andere Sportart';
            const sportLoad = this._sportMuscleLoad(a.otherSports);
            for (const dayIdx of a.otherSportsDays) {
                if (!plan[dayIdx]) plan[dayIdx] = [];
                if (plan[dayIdx].length === 0) {
                    plan[dayIdx].push({
                        name: sportName,
                        type: 'cardio',
                        duration: '',
                        note: '',
                        _isOtherSport: true
                    });
                    dayMetas.push({ dayIndex: dayIdx, label: sportName, estimatedTime: 0, isOtherSport: true });
                }
                // Issue 5: Sport-Muskeln in Recovery-Tracking eintragen
                const sportMuscles = new Set(Object.keys(sportLoad).filter(m => sportLoad[m] >= 0.5));
                if (sportMuscles.size > 0) {
                    weeklyMuscleSchedule[dayIdx] = weeklyMuscleSchedule[dayIdx]
                        ? new Set([...weeklyMuscleSchedule[dayIdx], ...sportMuscles])
                        : sportMuscles;
                }
            }
        }

        // Constraint 4: Recovery-Validierung — wenn gleiche Muskelgruppe an aufeinanderfolgenden
        // Tagen mit hoher Intensitaet trainiert wird, reduziere Volumen am zweiten Tag
        // (ACSM: min. 48h Erholung bei >6 Sets pro Muskelgruppe)
        const sortedDayIndices = Object.keys(weeklyMuscleSchedule).map(Number).sort((a, b) => a - b);
        for (let d = 1; d < sortedDayIndices.length; d++) {
            const prevDayIdx = sortedDayIndices[d - 1];
            const currDayIdx = sortedDayIndices[d];
            const dayGap = currDayIdx - prevDayIdx;
            // Nur pruefen wenn aufeinanderfolgende Tage (gap=1)
            if (dayGap > 1) continue;
            const prevMuscles = weeklyMuscleSchedule[prevDayIdx] || new Set();
            const currDayExercises = plan[currDayIdx];
            if (!currDayExercises) continue;

            for (const ex of currDayExercises) {
                if (ex.type !== 'strength' || !ex._muscles) continue;
                const overlap = ex._muscles.filter(m => prevMuscles.has(m) && !CORE_MUSCLES.includes(m));
                if (overlap.length > 0 && (ex.sets || 3) > PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE) {
                    // Reduziere Saetze auf Minimum — Erholungsprinzip
                    ex.sets = PHYSIO_CONSTRAINTS.MIN_SETS_PER_EXERCISE;
                    if (!ex.note || ex.note === primaryScheme.restNote) {
                        ex.note = primaryScheme.restNote + ' (reduziert — Erholung)';
                    }
                }
            }
        }

        // Constraint 2: Finale Zeitbudget-Validierung
        // Sicherstellen, dass kein Tag die Session-Dauer massiv ueberschreitet
        for (const dayIdx of trainingDayIndices) {
            const dayExercises = plan[dayIdx];
            if (!dayExercises || dayExercises.length === 0) continue;
            const totalTime = this._estimateTime(dayExercises, primaryGoal);
            if (totalTime > a.sessionDuration * 1.2) {
                // Entferne ueberschuessige Isolations-Uebungen vom Ende
                for (let k = dayExercises.length - 1; k >= 0; k--) {
                    if (this._estimateTime(dayExercises, primaryGoal) <= a.sessionDuration * 1.1) break;
                    const ex = dayExercises[k];
                    // _compound ist bereits geloescht, nutze movementPattern als Indikator:
                    // Isolations-Uebungen haben movementPattern === 'isolation'
                    const isIsolation = !ex._movementPattern || ex._movementPattern === 'isolation';
                    if (ex.type === 'strength' && isIsolation && !ex._isMobility) {
                        dayExercises.splice(k, 1);
                    }
                }
            }
        }

        // Issue 1: Finale Weekly-Volume-Validierung — nach allen Post-Adjustments
        // Stellt sicher, dass kein Muskel das Wochen-Budget ueberschreitet
        const finalWeeklyUsed = {};
        for (const dayIdx of trainingDayIndices) {
            const dayExercises = plan[dayIdx];
            if (!dayExercises) continue;
            for (const ex of dayExercises) {
                if (ex.type !== 'strength' || !ex._muscles) continue;
                for (const m of ex._muscles) {
                    const budget = weeklyBudget[m] || 0;
                    const used = finalWeeklyUsed[m] || 0;
                    const remaining = budget - used;
                    if (remaining < (ex.sets || 0)) {
                        ex.sets = Math.max(0, remaining);
                    }
                    finalWeeklyUsed[m] = (finalWeeklyUsed[m] || 0) + (ex.sets || 0);
                }
            }
        }

        // Issue 4: Periodisierung
        const periodization = this._generatePeriodizationNotes();

        const meta = {
            templateName: adjustedTemplate.name,
            templateId: adjustedTemplate.id,
            restNote: primaryScheme.restNote,
            level,
            dayMetas,
            periodization
        };

        return { plan, meta };
    },

    _selectTemplate(answers, level, daysPerWeek, allowedEquipment) {
        const scoreTemplate = (t) => {
            let score = 0;
            if (t.daysPerWeek === daysPerWeek) score += 10;
            if (t.suitableFor.includes(level)) score += 5;
            for (const g of answers.goals) {
                if (t.goals.includes(g)) score += 3;
            }
            // Equipment-Kompatibilitaet
            if (allowedEquipment) {
                const eqScore = this._templateEquipmentScore(t, allowedEquipment);
                if (eqScore < EQUIPMENT_SCORE_EXCLUDE_BELOW) return -Infinity;
                if (eqScore >= EQUIPMENT_COMPATIBILITY_THRESHOLD) score += EQUIPMENT_SCORE_BONUS;
                else score += EQUIPMENT_SCORE_PENALTY;
            }
            return score;
        };

        let candidates = splitTemplates.filter(t => {
            if (t.daysPerWeek !== daysPerWeek) return false;
            if (!t.suitableFor.includes(level)) return false;
            if (!t.goals.some(g => answers.goals.includes(g))) return false;
            return true;
        });

        if (candidates.length === 0) {
            candidates = splitTemplates.filter(t =>
                t.daysPerWeek === daysPerWeek && t.suitableFor.includes(level)
            );
        }

        if (candidates.length === 0) {
            candidates = splitTemplates.filter(t => t.daysPerWeek === daysPerWeek);
        }

        if (candidates.length === 0) {
            const sorted = [...splitTemplates].sort((a, b) =>
                Math.abs(a.daysPerWeek - daysPerWeek) - Math.abs(b.daysPerWeek - daysPerWeek)
            );
            if (sorted.length === 0) {
                throw new Error('No split templates available');
            }
            candidates = [sorted[0]];
        }

        let bestScore = -1;
        let bestTemplate = candidates[0];
        for (const t of candidates) {
            const s = scoreTemplate(t);
            if (s > bestScore) {
                bestScore = s;
                bestTemplate = t;
            }
        }
        return bestTemplate;
    },

    /**
     * Berechnet Equipment-Kompatibilitaets-Score fuer ein Template.
     * Prueft wie viele der benoetigten Uebungen mit dem verfuegbaren Equipment machbar sind.
     * @param {Object} template - Split-Template mit structure[].muscleTargets
     * @param {string[]} allowedEquipment - Erlaubte Equipment-Typen
     * @returns {number} Score 0-1 (1 = alle Uebungen machbar)
     */
    _templateEquipmentScore(template, allowedEquipment) {
        let totalNeeded = 0;
        let totalFulfilled = 0;

        for (const day of template.structure) {
            for (const target of day.muscleTargets) {
                const needed = (target.compound || 0) + (target.isolation || 0);
                if (needed === 0) continue;

                const availableForMuscle = exercises.filter(ex => {
                    if (ex.type !== 'strength') return false;
                    if (ex.equipment && !allowedEquipment.includes(ex.equipment)) return false;
                    return ex.primaryMuscle === target.muscle;
                });

                const compoundAvailable = availableForMuscle.filter(ex => ex.compound).length;
                const isolationAvailable = availableForMuscle.filter(ex => !ex.compound).length;

                const compoundFulfilled = Math.min(target.compound || 0, compoundAvailable);
                const isolationFulfilled = Math.min(target.isolation || 0, isolationAvailable);

                totalNeeded += needed;
                totalFulfilled += compoundFulfilled + isolationFulfilled;
            }
        }

        return totalNeeded === 0 ? 1 : totalFulfilled / totalNeeded;
    },

    /**
     * Erstellt woechentliches Volumen-Budget pro Muskelgruppe basierend auf Trainings-Level.
     * @param {string} level - 'beginner' | 'intermediate' | 'advanced'
     * @returns {Object} Map: { muscle: maxSetsPerWeek }
     */
    _createWeeklyVolumeBudget(level) {
        const maxSets = level === 'beginner' ? WEEKLY_VOLUME_BUDGET.BEGINNER_MAX
            : level === 'advanced' ? WEEKLY_VOLUME_BUDGET.ADVANCED_MAX
            : WEEKLY_VOLUME_BUDGET.INTERMEDIATE_MAX;

        const budget = {};
        for (const muscle of MUSCLE_GROUPS) {
            const isSmall = PHYSIO_CONSTRAINTS.SMALL_MUSCLES.includes(muscle);
            budget[muscle] = isSmall ? Math.round(maxSets * WEEKLY_VOLUME_BUDGET.SMALL_MUSCLE_FACTOR) : maxSets;
        }
        return budget;
    },

    /**
     * Berechnet verbleibendes woechentliches Budget fuer eine Muskelgruppe.
     * @param {string} muscle - Muskelgruppen-ID
     * @param {Object} weeklyBudget - Budget-Map aus _createWeeklyVolumeBudget
     * @param {Object} weeklyUsed - Bisher verbrauchte Sets pro Muskel
     * @returns {number} Verbleibende Sets
     */
    _remainingWeeklyBudget(muscle, weeklyBudget, weeklyUsed) {
        return Math.max(0, (weeklyBudget[muscle] || 0) - (weeklyUsed[muscle] || 0));
    },

    /**
     * Ermittelt Muskelbelastungs-Profil fuer eine Sportart.
     * Matched den Sport-Namen fuzzy gegen SPORT_MUSCLE_LOAD Keys.
     * @param {string} sportName - Name der Sportart (z.B. "Fussball", "Swimming")
     * @returns {Object} Map: { muscle: loadFactor 0-1 } oder {} bei unbekanntem Sport
     */
    _sportMuscleLoad(sportName) {
        if (!sportName) return {};
        const normalized = sportName.toLowerCase();
        for (const [key, profile] of Object.entries(SPORT_MUSCLE_LOAD)) {
            if (normalized.includes(key)) return { ...profile };
        }
        return {};
    },

    /**
     * Generiert Periodisierungs-Hinweise fuer den Mesozyklus (4 Wochen).
     * @returns {Object} { mesocycleWeeks, weeklyNotes, deloadReminder }
     */
    _generatePeriodizationNotes() {
        return {
            mesocycleWeeks: PERIODIZATION.MESOCYCLE_WEEKS,
            weeklyNotes: [...PERIODIZATION.WEEKLY_NOTES],
            deloadReminder: 'Nach 3 Wochen Training: Deload-Woche einlegen (50% Volumen, gleiches Gewicht)'
        };
    },

    /**
     * Generiert muskelspezifische Warmup-Note basierend auf den Muskelzielen des Tages.
     * Priorisiert Compound-Muskeln und begrenzt auf MAX_WARMUP_ELEMENTS.
     * @param {Array} muscleTargets - Array aus { muscle, compound, isolation }
     * @returns {string} Warmup-Beschreibung
     */
    _generateWarmupNote(muscleTargets) {
        if (!muscleTargets || muscleTargets.length === 0) return WARMUP_FALLBACK;

        // Sortiere: Compound-Muskeln zuerst (compound > 0)
        const sorted = [...muscleTargets].sort((a, b) => (b.compound || 0) - (a.compound || 0));

        const seen = new Set();
        const elements = [];
        for (const target of sorted) {
            if (elements.length >= MAX_WARMUP_ELEMENTS) break;
            const warmup = WARMUP_BY_MUSCLE[target.muscle];
            if (warmup && !seen.has(warmup)) {
                seen.add(warmup);
                elements.push(warmup);
            }
        }

        return elements.length > 0 ? elements.join(', ') : WARMUP_FALLBACK;
    },

    _applyMuscleFocus(template, focus) {
        if (!focus || focus === 'balanced') return template;

        const modified = JSON.parse(JSON.stringify(template));

        // Constraint 4: Fuer high-frequency (5+ Tage) + Fokus-Modus verwenden wir
        // intelligente Rotation statt identischer Tage.
        // Push/Pull-Rotation oder Heavy/Light-Periodisierung verteilt den
        // Trainingsstress und verhindert Ueberbelastung (Rhea et al. 2003).
        const UPPER_PUSH = ['chest', 'shoulders', 'front_delts', 'side_delts', 'triceps'];
        const UPPER_PULL = ['back', 'rear_delts', 'biceps', 'traps', 'forearms'];
        const LOWER_ANTERIOR = ['quadriceps', 'calves'];
        const LOWER_POSTERIOR = ['hamstrings', 'glutes'];

        // Constraint 1: Rotation-Templates fuer Focus-Modus
        // Statt alle Tage identisch zu machen, rotieren wir Push/Pull (upper)
        // bzw. Anterior/Posterior (lower) fuer bessere Erholung
        const upperRotation = [
            // Push-fokussiert
            [
                { muscle: 'chest', compound: 1, isolation: 1 },
                { muscle: 'shoulders', compound: 1, isolation: 0 },
                { muscle: 'triceps', compound: 0, isolation: 1 },
                { muscle: 'front_delts', compound: 0, isolation: 1 },
                { muscle: 'abs', compound: 0, isolation: 1 }
            ],
            // Pull-fokussiert
            [
                { muscle: 'back', compound: 1, isolation: 1 },
                { muscle: 'biceps', compound: 0, isolation: 1 },
                { muscle: 'rear_delts', compound: 0, isolation: 1 },
                { muscle: 'traps', compound: 0, isolation: 1 },
                { muscle: 'abs', compound: 0, isolation: 1 }
            ],
            // Schultern / Hypertrophie (leichter Tag)
            [
                { muscle: 'shoulders', compound: 1, isolation: 1 },
                { muscle: 'side_delts', compound: 0, isolation: 1 },
                { muscle: 'rear_delts', compound: 0, isolation: 1 },
                { muscle: 'chest', compound: 0, isolation: 1 },
                { muscle: 'back', compound: 0, isolation: 1 },
                { muscle: 'abs', compound: 0, isolation: 1 }
            ]
        ];
        const lowerRotation = [
            // Quad-dominant (Anterior)
            [
                { muscle: 'quadriceps', compound: 1, isolation: 1 },
                { muscle: 'glutes', compound: 1, isolation: 0 },
                { muscle: 'calves', compound: 0, isolation: 1 },
                { muscle: 'abs', compound: 0, isolation: 1 }
            ],
            // Hip-dominant (Posterior)
            [
                { muscle: 'hamstrings', compound: 1, isolation: 1 },
                { muscle: 'glutes', compound: 1, isolation: 1 },
                { muscle: 'lower_back', compound: 0, isolation: 1 },
                { muscle: 'abs', compound: 0, isolation: 1 }
            ],
            // Mixed / Hypertrophie (leichter Tag)
            [
                { muscle: 'quadriceps', compound: 1, isolation: 0 },
                { muscle: 'hamstrings', compound: 0, isolation: 1 },
                { muscle: 'glutes', compound: 0, isolation: 1 },
                { muscle: 'calves', compound: 0, isolation: 1 },
                { muscle: 'abs', compound: 0, isolation: 2 }
            ]
        ];

        const daysCount = modified.structure.length;

        for (let dayIdx = 0; dayIdx < modified.structure.length; dayIdx++) {
            const day = modified.structure[dayIdx];
            if (focus === 'upper') {
                // Remove all lower body muscles
                day.muscleTargets = day.muscleTargets.filter(t => !LOWER_MUSCLES.includes(t.muscle));

                // Constraint 1 + 4: Wenn Tag leer ist (z.B. Legs-Tag nach Upper-Filter),
                // ersetze durch rotierenden Upper-Split statt leeren Tag
                if (day.muscleTargets.length === 0 || day.muscleTargets.every(t => CORE_MUSCLES.includes(t.muscle))) {
                    const rotationIdx = dayIdx % upperRotation.length;
                    day.muscleTargets = JSON.parse(JSON.stringify(upperRotation[rotationIdx]));
                    day.label = ['Push', 'Pull', 'Schultern'][rotationIdx] + ' (Rotation)';
                } else {
                    // Boost upper body isolation
                    for (const target of day.muscleTargets) {
                        if (UPPER_MUSCLES.includes(target.muscle)) {
                            target.isolation = Math.max(target.isolation, 1);
                        }
                    }
                }
            } else if (focus === 'lower') {
                // Remove all upper body muscles
                day.muscleTargets = day.muscleTargets.filter(t => !UPPER_MUSCLES.includes(t.muscle));

                // Constraint 1 + 4: Wenn Tag leer ist (z.B. Push-Tag nach Lower-Filter),
                // ersetze durch rotierenden Lower-Split
                if (day.muscleTargets.length === 0 || day.muscleTargets.every(t => CORE_MUSCLES.includes(t.muscle))) {
                    const rotationIdx = dayIdx % lowerRotation.length;
                    day.muscleTargets = JSON.parse(JSON.stringify(lowerRotation[rotationIdx]));
                    day.label = ['Quad-dominant', 'Hip-dominant', 'Beine Mix'][rotationIdx] + ' (Rotation)';
                } else {
                    // Boost lower body isolation
                    for (const target of day.muscleTargets) {
                        if (LOWER_MUSCLES.includes(target.muscle)) {
                            target.isolation = Math.max(target.isolation, 1);
                        }
                    }
                }
            }
            // Keep core muscles in both cases
        }

        return modified;
    },

    // Superset pairing: group opposing muscles for time efficiency
    _applySupersets(dayExercises) {
        const OPPOSING = {
            chest: ['back', 'rear_delts'],
            back: ['chest', 'front_delts'],
            biceps: ['triceps'],
            triceps: ['biceps'],
            quadriceps: ['hamstrings'],
            hamstrings: ['quadriceps'],
            front_delts: ['rear_delts', 'back'],
            rear_delts: ['front_delts', 'chest']
        };

        const strengthExercises = dayExercises.filter(ex => ex.type === 'strength' && !ex._supersetGroup);
        let groupId = 1;
        const paired = new Set();

        for (let i = 0; i < strengthExercises.length; i++) {
            if (paired.has(i)) continue;
            const exA = strengthExercises[i];
            const muscleA = exA._primaryMuscle;
            const opposites = OPPOSING[muscleA] || [];

            for (let j = i + 1; j < strengthExercises.length; j++) {
                if (paired.has(j)) continue;
                const exB = strengthExercises[j];
                if (opposites.includes(exB._primaryMuscle)) {
                    exA._supersetGroup = groupId;
                    exB._supersetGroup = groupId;
                    exA.note = 'Supersatz ' + groupId + 'A — minimale Pause zwischen A und B';
                    exB.note = 'Supersatz ' + groupId + 'B — 60-90s Pause nach B';
                    paired.add(i);
                    paired.add(j);
                    groupId++;
                    break;
                }
            }
        }
    },

    _fisherYatesShuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    _pickExercises(available, muscle, isCompound, count, usedIds, usedEquipmentForMuscle = null, usedPatterns = null) {
        if (count <= 0) return [];

        let candidates = available.filter(ex =>
            ex.primaryMuscle === muscle &&
            ex.compound === isCompound &&
            ex.type === 'strength' &&
            !usedIds.has(ex.id)
        );

        // Fallback 1: try muscleGroups.includes if primaryMuscle match returned 0
        if (candidates.length === 0) {
            candidates = available.filter(ex =>
                ex.muscleGroups.includes(muscle) &&
                ex.compound === isCompound &&
                ex.type === 'strength' &&
                !usedIds.has(ex.id)
            );
        }

        // Constraint 3: Fallback 2 — wenn Equipment-Restriktionen dazu fuehren, dass
        // keine Uebungen verfuegbar sind, suche Uebungen der gleichen Muskelgruppe
        // unabhaengig von compound/isolation (lieber falsche Uebungskategorie als gar keine)
        if (candidates.length === 0) {
            candidates = available.filter(ex =>
                (ex.primaryMuscle === muscle || ex.muscleGroups.includes(muscle)) &&
                ex.type === 'strength' &&
                !usedIds.has(ex.id)
            );
        }

        // Constraint 3: Fallback 3 — wenn auch das 0 ergibt, erlaube bereits benutzte Uebungen
        // (besser eine wiederholte Uebung als eine leere Session)
        if (candidates.length === 0) {
            candidates = available.filter(ex =>
                (ex.primaryMuscle === muscle || ex.muscleGroups.includes(muscle)) &&
                ex.type === 'strength'
            );
        }

        // Movement pattern dedup: filter out candidates whose pattern is already used
        if (usedPatterns && isCompound) {
            const filtered = candidates.filter(ex => {
                const pattern = ex.movementPattern || 'isolation';
                return pattern === 'isolation' || !usedPatterns.has(pattern);
            });
            if (filtered.length > 0) candidates = filtered;
        }

        const byPriority = {};
        for (const ex of candidates) {
            const p = ex.priority ?? 3;
            if (!byPriority[p]) byPriority[p] = [];
            byPriority[p].push(ex);
        }
        const priorityLevels = Object.keys(byPriority).map(Number).sort((a, b) => b - a);
        let sorted = [];
        for (const p of priorityLevels) {
            sorted.push(...this._fisherYatesShuffle(byPriority[p]));
        }

        const picked = [];
        const pickedEquipment = usedEquipmentForMuscle ? new Set(usedEquipmentForMuscle) : new Set();

        for (const ex of sorted) {
            if (picked.length >= count) break;
            if (pickedEquipment.has(ex.equipment) && sorted.some(e =>
                !pickedEquipment.has(e.equipment) && !picked.includes(e)
            )) {
                continue;
            }
            picked.push(ex);
            pickedEquipment.add(ex.equipment);
        }

        if (picked.length < count) {
            for (const ex of sorted) {
                if (picked.length >= count) break;
                if (!picked.includes(ex)) picked.push(ex);
            }
        }

        picked.forEach(ex => {
            usedIds.add(ex.id);
            if (usedPatterns && ex.compound) {
                const pattern = ex.movementPattern || 'isolation';
                if (pattern !== 'isolation') usedPatterns.add(pattern);
            }
        });
        return picked;
    },

    _formatExercise(ex, scheme, goal, isCompound) {
        const entry = {
            name: ex.name,
            type: ex.type || 'strength',
            note: '',
            _muscles: ex.muscleGroups || [ex.primaryMuscle],
            _primaryMuscle: ex.primaryMuscle,
            _equipment: ex.equipment,
            _exerciseId: ex.id,
            _movementPattern: ex.movementPattern || 'isolation'
        };

        if (entry.type === 'strength') {
            entry._compound = ex.compound === true;
            // Zeitbasierte Uebungen (Plank, L-Sit, etc.) behalten ihre defaultReps
            const isTimeBased = ex.defaultReps && /\d+s/.test(ex.defaultReps);
            if (isTimeBased) {
                entry.sets = Math.min(scheme.sets, ex.defaultSets || 3);
                entry.reps = ex.defaultReps;
            } else {
                entry.sets = scheme.sets;
                entry.reps = scheme.reps;
            }
            entry.weight = ex.defaultWeight || 0;
        } else if (entry.type === 'cardio') {
            entry.duration = ex.defaultDuration || '20 min';
        } else if (entry.type === 'distance') {
            entry.distance = ex.defaultDistance || '';
            entry.duration = ex.defaultDuration || '';
        }

        return entry;
    },

    _pickCardioExercise(available, allowedEquipment, usedCardioIds, answers) {
        let cardioCandidates = available.filter(ex =>
            (ex.type === 'cardio' || ex.type === 'distance') &&
            !ex.warmupOnly &&
            !usedCardioIds.has(ex.id)
        );

        // If all used, allow repeats (but still exclude warmup-only)
        if (cardioCandidates.length === 0) {
            cardioCandidates = available.filter(ex =>
                (ex.type === 'cardio' || ex.type === 'distance') && !ex.warmupOnly
            );
        }

        if (cardioCandidates.length === 0) return null;

        const picked = cardioCandidates[Math.floor(Math.random() * cardioCandidates.length)];
        usedCardioIds.add(picked.id);

        const durations = { 30: '10 min', 45: '15 min', 60: '20 min', 90: '20 min' };
        const sessionDuration = parseInt(durations[answers.sessionDuration] || '15 min') || 15;
        const exerciseDefault = parseInt(picked.defaultDuration) || sessionDuration;
        // Nie laenger als die Uebung selbst vorgibt UND nie laenger als das Cardio-Cap
        const cappedMins = Math.min(sessionDuration, exerciseDefault, PHYSIO_CONSTRAINTS.MAX_CARDIO_DURATION_MINUTES);
        const duration = cappedMins + ' min';

        if (picked.type === 'cardio') {
            return { name: picked.name, type: 'cardio', duration, note: '', _muscles: [], _exerciseId: picked.id };
        }
        return {
            name: picked.name, type: 'distance',
            distance: picked.defaultDistance || '', duration, note: '',
            _muscles: [], _exerciseId: picked.id
        };
    },

    _estimateTime(dayExercises, goal) {
        return dayExercises.reduce((sum, ex) => sum + _exerciseTimeEstimate(ex, goal), 0);
    },

    // Constraint 2: Zeitbudget-basierte Anpassung
    // targetMinutes = sessionDuration - warmup - cooldown (reiner Trainingsanteil)
    // Verwendet goal-spezifische Satzpausen fuer realistische Zeitschaetzung
    _adjustForDuration(dayExercises, targetMinutes, goal) {
        if (!targetMinutes) return;

        let estimated = dayExercises.reduce((sum, ex) => sum + _exerciseTimeEstimate(ex, goal), 0);

        // Too long — remove isolation exercises from the end, but keep at least 2 strength exercises
        const MIN_STRENGTH_EXERCISES = 2;
        const strengthCount = () => dayExercises.filter(e => e.type === 'strength').length;
        if (estimated > targetMinutes * 1.15 && strengthCount() > MIN_STRENGTH_EXERCISES) {
            for (let i = dayExercises.length - 1; i >= 0; i--) {
                if (estimated <= targetMinutes * 1.05) break;
                if (strengthCount() <= MIN_STRENGTH_EXERCISES) break;
                if (dayExercises[i].type === 'strength' && !dayExercises[i]._compound) {
                    const removedTime = _exerciseTimeEstimate(dayExercises[i], goal);
                    dayExercises.splice(i, 1);
                    estimated -= removedTime;
                }
            }
        }

        // Too short — Constraint 1+2: Mehrere Strategien zum Fuellen:
        // 1. Saetze erhoehen (bis MAX)
        // 2. Mobility/Filler-Uebungen injizieren fuer verbleibende Zeit
        estimated = dayExercises.reduce((sum, ex) => sum + _exerciseTimeEstimate(ex, goal), 0);
        if (estimated < targetMinutes * 0.8 && dayExercises.length > 0) {
            const MAX_SETS = PHYSIO_CONSTRAINTS.MAX_SETS_PER_EXERCISE;

            // Phase 1: Saetze erhoehen — verteile gleichmaessig ueber alle Uebungen
            // (statt nur eine Uebung zu boosten, was Dysbalancen erzeugt)
            let boostRounds = 0;
            const maxBoostRounds = dayExercises.filter(e => e.type === 'strength').length;
            while (dayExercises.reduce((s, e) => s + _exerciseTimeEstimate(e, goal), 0) < targetMinutes * 0.8
                   && boostRounds < maxBoostRounds) {
                let boosted = false;
                // Round-Robin: jede Uebung erhaelt nacheinander +1 Satz
                for (const ex of dayExercises) {
                    if (ex.type !== 'strength') continue;
                    if ((ex.sets || 3) < MAX_SETS) {
                        ex.sets = (ex.sets || 3) + 1;
                        boosted = true;
                        break;
                    }
                }
                if (!boosted) break;
                boostRounds++;
            }

            // Phase 2: Constraint 1 — Wenn immer noch zu kurz (z.B. Bodyweight + Upper + 90min),
            // injiziere Mobility/Dehnungs-Bloecke als sichere Fueller
            // Physiologisch sinnvoll: aktive Erholung foerdert Durchblutung und Beweglichkeit
            estimated = dayExercises.reduce((sum, ex) => sum + _exerciseTimeEstimate(ex, goal), 0);
            const deficit = targetMinutes - estimated;
            if (deficit > 5) {
                // Erhoehte Satzpause als "aktive Erholung" markieren
                const fillerMinutes = Math.min(deficit, 15); // max 15 min Filler
                dayExercises.push({
                    name: 'Mobility & aktive Erholung',
                    type: 'cardio',
                    duration: Math.round(fillerMinutes) + ' min',
                    note: 'Dynamisches Stretching, Foam Rolling, Atemarbeit — foerdert Regeneration ohne Ermuedung',
                    _isMobility: true
                });

                // Wenn immer noch >10min Defizit, zusaetzlichen Stretching-Block
                const remainingDeficit = deficit - fillerMinutes;
                if (remainingDeficit > 5) {
                    const stretchMinutes = Math.min(remainingDeficit, 10);
                    dayExercises.push({
                        name: 'Gezieltes Stretching',
                        type: 'cardio',
                        duration: Math.round(stretchMinutes) + ' min',
                        note: 'Statisches Dehnen der trainierten Muskelgruppen — verbessert ROM und Erholung',
                        _isMobility: true
                    });
                }
            }
        }
    },

    async _enrichWithHistory(plan) {
        if (!this.workoutLogs?.length) return;

        const lastWeights = {};
        for (const log of this.workoutLogs) {
            for (const ex of (log.exercises || [])) {
                if (ex.name && ex.weight && !lastWeights[ex.name]) {
                    lastWeights[ex.name] = ex.weight;
                }
            }
        }

        // Normalize for fuzzy matching
        const normalize = (name) => name.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
        const normalizedWeights = {};
        for (const [name, weight] of Object.entries(lastWeights)) {
            normalizedWeights[normalize(name)] = weight;
            normalizedWeights[name] = weight;
        }

        for (const day of plan) {
            for (const ex of day) {
                if (ex.type === 'strength') {
                    // Exact match first
                    if (lastWeights[ex.name]) {
                        ex.weight = lastWeights[ex.name];
                    } else {
                        // Fuzzy match
                        const norm = normalize(ex.name);
                        if (normalizedWeights[norm]) {
                            ex.weight = normalizedWeights[norm];
                        }
                    }
                }
            }
        }
    },

    // ── Exercise Swap ────────────────────────────────
    openSwapOptions(dayIndex, exIndex) {
        const exercise = this.generatedPlan[dayIndex][exIndex];
        if (!exercise || exercise.type !== 'strength') return;

        const original = exercises.find(e => e.name === exercise.name);
        if (!original) return;

        const allowedEquipment = EQUIPMENT_MAP[this.generatorAnswers.equipment] || EQUIPMENT_MAP.full_gym;
        const usedNames = new Set();
        for (const day of this.generatedPlan) {
            for (const ex of day) usedNames.add(ex.name);
        }

        const alternatives = exercises.filter(ex =>
            ex.primaryMuscle === original.primaryMuscle &&
            ex.type === 'strength' &&
            ex.id !== original.id &&
            !usedNames.has(ex.name) &&
            allowedEquipment.includes(ex.equipment) &&
            !this.generatorAnswers.avoidedEquipment.includes(ex.equipment)
        )
        .sort((a, b) => (b.priority ?? 3) - (a.priority ?? 3))
        .slice(0, 5);

        if (alternatives.length === 0) {
            this.showToast('Keine Alternative verfuegbar');
            return;
        }

        this.swapTarget = { dayIndex, exIndex };
        this.swapOptions = alternatives;
    },

    confirmSwap(alternativeId) {
        if (!this.swapTarget) return;
        const alt = exercises.find(e => e.id === alternativeId);
        if (!alt) return;

        const { dayIndex, exIndex } = this.swapTarget;
        const primaryGoal = this.generatorAnswers.goals[0] || 'general';
        const secondaryGoal = this.generatorAnswers.goals.length > 1 ? this.generatorAnswers.goals[1] : null;
        const primaryScheme = REPS_SCHEMES[primaryGoal] || REPS_SCHEMES.general;
        const secondaryScheme = secondaryGoal ? (REPS_SCHEMES[secondaryGoal] || null) : null;
        // Compounds verwenden primaeres Schema, Isolations das sekundaere (oder primaere)
        const scheme = alt.compound ? primaryScheme : (secondaryScheme || primaryScheme);
        const formatted = this._formatExercise(alt, scheme, primaryGoal, alt.compound);
        delete formatted._compound;

        this.generatedPlan[dayIndex].splice(exIndex, 1, formatted);
        this.swapOptions = null;
        this.swapTarget = null;
    },

    closeSwapOptions() {
        this.swapOptions = null;
        this.swapTarget = null;
    },

    // ── Exercise Delete (Preview) ────────────────────
    removePreviewExercise(dayIndex, exIndex) {
        if (!this.generatedPlan || !this.generatedPlan[dayIndex]) return;
        this.generatedPlan[dayIndex].splice(exIndex, 1);
    },

    // ── Inline Edit (Preview) ────────────────────────
    openPreviewEdit(dayIndex, exIndex) {
        const ex = this.generatedPlan[dayIndex][exIndex];
        if (!ex || ex.type !== 'strength') return;
        this.previewEditTarget = {
            dayIndex, exIndex,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight
        };
    },

    applyPreviewEdit() {
        if (!this.previewEditTarget) return;
        const { dayIndex, exIndex, sets, reps, weight } = this.previewEditTarget;
        const ex = this.generatedPlan[dayIndex][exIndex];
        if (ex) {
            ex.sets = parseInt(sets) || ex.sets;
            ex.reps = reps || ex.reps;
            ex.weight = parseFloat(weight) || 0;
        }
        this.previewEditTarget = null;
    },

    cancelPreviewEdit() {
        this.previewEditTarget = null;
    },

    // ── Apply Plan ───────────────────────────────────
    async applyGeneratedPlan() {
        if (!this.generatedPlan) return;
        // Deep clone and strip internal metadata
        const clean = JSON.parse(JSON.stringify(this.generatedPlan));
        for (const day of clean) {
            for (const ex of day) {
                delete ex._muscles;
                delete ex._primaryMuscle;
                delete ex._equipment;
                delete ex._exerciseId;
                delete ex._isOtherSport;
                delete ex._supersetGroup;
                delete ex._movementPattern;
            }
        }
        this.trainingPlan = clean;
        await this.saveTrainingPlan();

        // Save sport data for calorie calculation
        const a = this.generatorAnswers;
        if (a.hasOtherSports && a.otherSports) {
            this._savedSportName = a.otherSports;
            this._savedSportDays = [...a.otherSportsDays];
        } else {
            this._savedSportName = '';
            this._savedSportDays = [];
        }
        // Persist sport data in settings
        await this.saveSettings();

        // Recalculate calories with new training plan + sport data
        if (this.recalculateCalories) this.recalculateCalories();

        this.generatorOpen = false;
        this.generatedPlan = null;
        this.generatorMeta = null;
        this.showToast('Trainingsplan uebernommen!');
    },

    regeneratePlan() {
        this.generatedPlan = null;
        this.generatorMeta = null;
        this.swapOptions = null;
        this.swapTarget = null;
        this.previewEditTarget = null;
        this.generatePlan();
    },

    switchToManualEdit() {
        if (!this.generatedPlan) return;
        const clean = JSON.parse(JSON.stringify(this.generatedPlan));
        for (const day of clean) {
            for (const ex of day) {
                delete ex._muscles;
                delete ex._primaryMuscle;
                delete ex._equipment;
                delete ex._exerciseId;
                delete ex._isOtherSport;
                delete ex._supersetGroup;
                delete ex._movementPattern;
            }
        }
        this.trainingPlan = clean;
        this.generatorOpen = false;
        this.generatedPlan = null;
        this.generatorMeta = null;
        this.openTraining();
    }
});
