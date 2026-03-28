// js/features/training-generator.js

import { WEEKDAYS, WEEKDAY_SHORT, EQUIPMENT_LABELS, MUSCLE_LABELS, INJURY_REGIONS, INJURY_KEYWORD_MAP, UPPER_MUSCLES, LOWER_MUSCLES, CORE_MUSCLES } from '../utils/constants.js';
import { getTodayWeekdayIndex } from '../utils/formatting.js';
import { exercises, EQUIPMENT_MAP } from '../data/exercises.js';
import { splitTemplates, REPS_SCHEMES } from '../data/split-templates.js';

export const trainingGeneratorMixin = () => ({
    generatorOpen: false,
    generatorStep: 0,
    generatorAnswers: {
        fitnessLevel: null,
        selectedDays: [],
        equipment: null,
        goals: [],
        muscleFocus: null,
        hasOtherSports: false,
        otherSports: '',
        sessionDuration: null,
        injuryRegions: [],
        injuryText: '',
        hasInjuries: false,
        avoidedEquipment: [],
        preferredEquipment: [],
        exercisePreferences: ''
    },
    generatedPlan: null,
    generatorLoading: false,
    showTrainingSelection: false,
    swapOptions: null,
    swapTarget: null,
    generatorMeta: null,
    previewEditTarget: null,
    _beginnerWarningShown: false,

    // ── Constants for template ────────────────────────
    EQUIPMENT_LABELS,
    MUSCLE_LABELS,
    INJURY_REGIONS,

    // ── Computed ──────────────────────────────────────
    get generatorDaysPerWeek() {
        return this.generatorAnswers.selectedDays.length;
    },

    get generatorFreeDays() {
        return this.generatorAnswers.selectedDays.slice().sort((a, b) => a - b);
    },

    get generatorWeeklyMuscleStats() {
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

    get generatorSummaryLabels() {
        const a = this.generatorAnswers;
        const levelLabels = { beginner: 'Anfaenger', intermediate: 'Fortgeschritten', advanced: 'Profi' };
        const equipLabels = { full_gym: 'Fitnessstudio', home_gym: 'Home-Gym', bodyweight: 'Bodyweight' };
        const goalLabels = { muscle: 'Muskelaufbau', fat_loss: 'Fettabbau', endurance: 'Ausdauer', general: 'Allg. Fitness' };
        const focusLabels = { upper: 'Oberkoerper-Schwerpunkt', lower: 'Unterkoerper-Schwerpunkt', balanced: 'Ausgewogen' };
        const durationLabels = { 30: '30 Minuten', 45: '45 Minuten', 60: '60 Minuten', 90: '90+ Minuten' };

        const dayNames = a.selectedDays.slice().sort((a, b) => a - b).map(d => WEEKDAY_SHORT[d]).join(', ');

        return {
            level: levelLabels[a.fitnessLevel] || '–',
            days: dayNames || '–',
            daysCount: a.selectedDays.length,
            equipment: equipLabels[a.equipment] || '–',
            goals: a.goals.map(g => goalLabels[g] || g).join(', ') || '–',
            focus: focusLabels[a.muscleFocus] || '–',
            otherSports: a.hasOtherSports ? (a.otherSports || 'Ja') : 'Nein',
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
            fitnessLevel: null,
            selectedDays: [],
            equipment: null,
            goals: [],
            muscleFocus: null,
            hasOtherSports: false,
            otherSports: '',
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
        this._beginnerWarningShown = false;
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
        if (this.generatorStep === 1 && !a.fitnessLevel) return;
        if (this.generatorStep === 2 && a.selectedDays.length === 0) return;
        if (this.generatorStep === 3 && !a.equipment) return;
        if (this.generatorStep === 4 && a.goals.length === 0) return;
        if (this.generatorStep === 5 && !a.muscleFocus) return;
        if (this.generatorStep === 7 && !a.sessionDuration) return;

        // Beginner warning at 5+ days
        if (this.generatorStep === 2 && a.fitnessLevel === 'beginner' && a.selectedDays.length >= 5) {
            if (!this._beginnerWarningShown) {
                this.showToast('Fuer Anfaenger empfehlen wir 2-4 Trainingstage pro Woche.');
                this._beginnerWarningShown = true;
            }
        }

        if (this.generatorStep < 10) {
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
        this.generatorLoading = true;
        await new Promise(r => setTimeout(r, 400));

        try {
            const result = this._buildPlan();
            await this._enrichWithHistory(result.plan);
            this.generatedPlan = result.plan;
            this.generatorMeta = result.meta;
            this.generatorStep = 11; // Preview
        } catch (e) {
            console.error('Plan generation failed:', e);
            this.showToast('Fehler bei der Plan-Erstellung. Bitte versuche es erneut.');
        } finally {
            this.generatorLoading = false;
        }
    },

    _buildPlan() {
        const a = this.generatorAnswers;
        const level = a.fitnessLevel || 'beginner';
        const daysPerWeek = a.selectedDays.length;

        // 1. Template waehlen
        const template = this._selectTemplate(a, level, daysPerWeek);

        // 2. Muscle Focus anwenden
        const adjustedTemplate = this._applyMuscleFocus(template, a.muscleFocus);

        // 3. Verfuegbare Uebungen filtern
        const allowedEquipment = adjustedTemplate.equipmentFilter || EQUIPMENT_MAP[a.equipment] || EQUIPMENT_MAP.full_gym;
        const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        const userLevel = difficultyOrder[level];

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
            if (ex.equipment && !allowedEquipment.includes(ex.equipment)) return false;
            if (difficultyOrder[ex.difficulty] > userLevel) return false;
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

        // Estimated time per day for meta
        const dayMetas = [];

        for (let i = 0; i < adjustedTemplate.structure.length; i++) {
            const dayDef = adjustedTemplate.structure[i];
            const dayIndex = trainingDayIndices[i];
            if (dayIndex === undefined) break;

            const dayExercises = [];

            // Warm-up
            dayExercises.push({
                name: 'Aufwaermen',
                type: 'cardio',
                duration: a.sessionDuration <= 30 ? '5 min' : '5-10 min',
                note: 'Leichtes Cardio + dynamisches Stretching',
                _isWarmup: true
            });

            for (const target of dayDef.muscleTargets) {
                const equipmentUsedForMuscle = [];

                const compounds = this._pickExercises(
                    available, target.muscle, true, target.compound, usedExerciseIds, equipmentUsedForMuscle
                );
                compounds.forEach(ex => { if (ex.equipment) equipmentUsedForMuscle.push(ex.equipment); });
                dayExercises.push(...compounds.map(ex => this._formatExercise(ex, primaryScheme, primaryGoal, true)));

                const isolations = this._pickExercises(
                    available, target.muscle, false, target.isolation, usedExerciseIds, equipmentUsedForMuscle
                );
                // Use secondary scheme for isolations if multi-goal
                const isoScheme = secondaryScheme || primaryScheme;
                dayExercises.push(...isolations.map(ex => this._formatExercise(ex, isoScheme, secondaryGoal || primaryGoal, false)));
            }

            // Cardio (separate tracking, allow repeats across days)
            if (adjustedTemplate.addCardioToEachDay || a.goals.includes('fat_loss') || a.goals.includes('endurance')) {
                const cardioEx = this._pickCardioExercise(available, allowedEquipment, usedCardioIds, a);
                if (cardioEx) dayExercises.push(cardioEx);
            }

            // Cooldown
            dayExercises.push({
                name: 'Cooldown / Stretching',
                type: 'cardio',
                duration: '5 min',
                note: 'Statisches Dehnen der beanspruchten Muskelgruppen',
                _isCooldown: true
            });

            // Time adjustment (exclude warmup/cooldown from adjustment)
            const adjustableExercises = dayExercises.filter(ex => !ex._isWarmup && !ex._isCooldown);
            this._adjustForDuration(adjustableExercises, a.sessionDuration);

            // Estimated time
            const estimatedTime = this._estimateTime(dayExercises);

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
        }

        const meta = {
            templateName: adjustedTemplate.name,
            templateId: adjustedTemplate.id,
            restNote: primaryScheme.restNote,
            dayMetas
        };

        return { plan, meta };
    },

    _selectTemplate(answers, level, daysPerWeek) {
        const scoreTemplate = (t) => {
            let score = 0;
            if (t.daysPerWeek === daysPerWeek) score += 10;
            if (t.suitableFor.includes(level)) score += 5;
            for (const g of answers.goals) {
                if (t.goals.includes(g)) score += 3;
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

    _applyMuscleFocus(template, focus) {
        if (!focus || focus === 'balanced') return template;

        const modified = JSON.parse(JSON.stringify(template));

        for (const day of modified.structure) {
            for (const target of day.muscleTargets) {
                if (focus === 'upper' && LOWER_MUSCLES.includes(target.muscle)) {
                    target.compound = Math.min(target.compound, 1);
                    target.isolation = 0;
                } else if (focus === 'upper' && UPPER_MUSCLES.includes(target.muscle)) {
                    target.isolation = Math.max(target.isolation, 1);
                } else if (focus === 'lower' && UPPER_MUSCLES.includes(target.muscle)) {
                    target.compound = Math.min(target.compound, 1);
                    target.isolation = 0;
                } else if (focus === 'lower' && LOWER_MUSCLES.includes(target.muscle)) {
                    target.isolation = Math.max(target.isolation, 1);
                }
            }
        }

        return modified;
    },

    _fisherYatesShuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    _pickExercises(available, muscle, isCompound, count, usedIds, usedEquipmentForMuscle = null) {
        if (count <= 0) return [];

        let candidates = available.filter(ex =>
            (ex.primaryMuscle === muscle || ex.muscleGroups.includes(muscle)) &&
            ex.compound === isCompound &&
            ex.type === 'strength' &&
            !usedIds.has(ex.id)
        );

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

        picked.forEach(ex => usedIds.add(ex.id));
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
            _exerciseId: ex.id
        };

        if (entry.type === 'strength') {
            entry.sets = scheme.sets;
            entry.reps = scheme.reps;
            entry.weight = ex.defaultWeight || 0;
            entry._compound = ex.compound === true;
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
            !usedCardioIds.has(ex.id)
        );

        // If all used, allow repeats
        if (cardioCandidates.length === 0) {
            cardioCandidates = available.filter(ex =>
                ex.type === 'cardio' || ex.type === 'distance'
            );
        }

        if (cardioCandidates.length === 0) return null;

        const picked = cardioCandidates[Math.floor(Math.random() * cardioCandidates.length)];
        usedCardioIds.add(picked.id);

        const durations = { 30: '10 min', 45: '15 min', 60: '20 min', 90: '25 min' };
        const duration = durations[answers.sessionDuration] || '15 min';

        if (picked.type === 'cardio') {
            return { name: picked.name, type: 'cardio', duration, note: '', _muscles: [], _exerciseId: picked.id };
        }
        return {
            name: picked.name, type: 'distance',
            distance: picked.defaultDistance || '', duration, note: '',
            _muscles: [], _exerciseId: picked.id
        };
    },

    _estimateTime(dayExercises) {
        return dayExercises.reduce((sum, ex) => {
            if (ex.type === 'strength') {
                const minsPerSet = ex._compound ? 4 : 3;
                return sum + (ex.sets || 3) * minsPerSet;
            }
            if (ex.type === 'cardio' || ex.type === 'distance') {
                return sum + (parseInt(ex.duration) || 10);
            }
            return sum + 5;
        }, 0);
    },

    _adjustForDuration(dayExercises, targetMinutes) {
        if (!targetMinutes) return;

        const estimateTime = (exList) => exList.reduce((sum, ex) => {
            if (ex.type === 'strength') {
                const minsPerSet = ex._compound ? 4 : 3;
                return sum + (ex.sets || 3) * minsPerSet;
            }
            if (ex.type === 'cardio' || ex.type === 'distance') {
                return sum + (parseInt(ex.duration) || 15);
            }
            return sum + 10;
        }, 0);

        let estimated = estimateTime(dayExercises);

        // Too long
        if (estimated > targetMinutes * 1.2 && dayExercises.length > 3) {
            for (let i = dayExercises.length - 1; i >= 0; i--) {
                if (estimated <= targetMinutes * 1.1) break;
                if (dayExercises[i].type === 'strength' && !dayExercises[i]._compound) {
                    const removedTime = (dayExercises[i].sets || 3) * 3;
                    dayExercises.splice(i, 1);
                    estimated -= removedTime;
                }
            }
        }

        // Too short
        if (estimated < targetMinutes * 0.8 && dayExercises.length > 0) {
            let boostRounds = 0;
            while (estimateTime(dayExercises) < targetMinutes * 0.8 && boostRounds < 2) {
                let boosted = false;
                for (let i = dayExercises.length - 1; i >= 0; i--) {
                    if (dayExercises[i].type === 'strength' && !dayExercises[i]._compound) {
                        dayExercises[i].sets = (dayExercises[i].sets || 3) + 1;
                        boosted = true;
                        break;
                    }
                }
                if (!boosted) {
                    for (let i = dayExercises.length - 1; i >= 0; i--) {
                        if (dayExercises[i].type === 'strength') {
                            dayExercises[i].sets = (dayExercises[i].sets || 3) + 1;
                            break;
                        }
                    }
                }
                boostRounds++;
            }
        }
    },

    async _enrichWithHistory(plan) {
        if (!this.workoutLogs || this.workoutLogs.length === 0) return;

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
        const scheme = REPS_SCHEMES[primaryGoal] || REPS_SCHEMES.general;
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
            }
        }
        this.trainingPlan = clean;
        await this.saveTrainingPlan();
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
            }
        }
        this.trainingPlan = clean;
        this.generatorOpen = false;
        this.generatedPlan = null;
        this.generatorMeta = null;
        this.openTraining();
    }
});
