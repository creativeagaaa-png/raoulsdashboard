// js/features/training-generator.js

import { WEEKDAYS, WEEKDAY_SHORT } from '../utils/constants.js';
import { getTodayWeekdayIndex } from '../utils/formatting.js';
import { exercises, EQUIPMENT_MAP } from '../data/exercises.js';
import { splitTemplates, REPS_SCHEMES } from '../data/split-templates.js';

export const trainingGeneratorMixin = () => ({
    generatorOpen: false,
    generatorStep: 0,
    generatorAnswers: {
        fitnessLevel: null,
        daysPerWeek: 3,
        equipment: null,
        goals: [],
        hasOtherSports: false,
        otherSports: '',
        otherSportsDays: [],
        sessionDuration: null,
        injuries: '',
        hasInjuries: false,
        exercisePreferences: ''
    },
    generatedPlan: null,
    generatorLoading: false,
    showTrainingSelection: false,
    swapOptions: null,
    swapTarget: null,

    openTrainingSelection() {
        this.showTrainingSelection = true;
        this.generatorOpen = false;
        this.generatorStep = 0;
        this.generatedPlan = null;
        this.swapOptions = null;
        this.swapTarget = null;
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
        // Warnung wenn Plan existiert
        const hasExistingPlan = this.trainingPlan.some(day => day.length > 0);
        if (hasExistingPlan) {
            this.confirmModal = {
                show: true,
                title: 'Plan ersetzen?',
                message: 'Dein bestehender Trainingsplan wird durch den neuen ersetzt.',
                confirmLabel: 'Weiter',
                onConfirm: () => {
                    this._startGenerator();
                }
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
            daysPerWeek: 3,
            equipment: null,
            goals: [],
            hasOtherSports: false,
            otherSports: '',
            otherSportsDays: [],
            sessionDuration: null,
            injuries: '',
            hasInjuries: false,
            exercisePreferences: ''
        };
        this.generatedPlan = null;
    },

    closeGenerator() {
        this.generatorOpen = false;
        this.generatorStep = 0;
    },

    generatorPrevStep() {
        if (this.generatorStep > 1) this.generatorStep--;
    },

    generatorNextStep() {
        // Validierung pro Step
        const a = this.generatorAnswers;
        if (this.generatorStep === 1 && !a.fitnessLevel) return;
        if (this.generatorStep === 3 && !a.equipment) return;
        if (this.generatorStep === 4 && a.goals.length === 0) return;
        if (this.generatorStep === 5 && a.hasOtherSports && a.otherSportsDays.length === 0) return;
        if (this.generatorStep === 6 && !a.sessionDuration) return;

        // Step 5 Validierung: genug freie Tage?
        if (this.generatorStep === 5 && a.hasOtherSports) {
            const freeDays = 7 - a.otherSportsDays.length;
            if (a.daysPerWeek > freeDays) {
                this.showToast(`Nicht genug freie Tage! ${a.otherSportsDays.length} Tage belegt, ${a.daysPerWeek} Trainingstage gewuenscht.`);
                return;
            }
        }

        if (this.generatorStep < 8) {
            this.generatorStep++;
        }
    },

    toggleGoal(goal) {
        const idx = this.generatorAnswers.goals.indexOf(goal);
        if (idx === -1) {
            this.generatorAnswers.goals.push(goal);
        } else {
            this.generatorAnswers.goals.splice(idx, 1);
        }
    },

    toggleOtherSportDay(dayIndex) {
        const idx = this.generatorAnswers.otherSportsDays.indexOf(dayIndex);
        if (idx === -1) {
            this.generatorAnswers.otherSportsDays.push(dayIndex);
        } else {
            this.generatorAnswers.otherSportsDays.splice(idx, 1);
        }
    },

    get generatorFreeDays() {
        if (!this.generatorAnswers.hasOtherSports) return [0, 1, 2, 3, 4, 5, 6];
        return [0, 1, 2, 3, 4, 5, 6].filter(d => !this.generatorAnswers.otherSportsDays.includes(d));
    },

    async generatePlan() {
        this.generatorLoading = true;
        // Kurze Verzoegerung fuer die Animation
        await new Promise(r => setTimeout(r, 400));

        try {
            const plan = this._buildPlan();
            await this._enrichWithHistory(plan);
            this.generatedPlan = plan;
            this.generatorStep = 9; // Vorschau
        } catch (e) {
            console.error('Plan generation failed:', e);
            this.showToast('Fehler bei der Plan-Erstellung. Bitte versuche es erneut.');
        } finally {
            this.generatorLoading = false;
        }
    },

    _buildPlan() {
        const a = this.generatorAnswers;
        const levelMap = { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' };
        const level = levelMap[a.fitnessLevel] || 'beginner';

        // 1. Template waehlen
        const template = this._selectTemplate(a, level);

        // 2. Verfuegbare Uebungen filtern
        const allowedEquipment = template.equipmentFilter || EQUIPMENT_MAP[a.equipment] || EQUIPMENT_MAP.full_gym;
        const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        const userLevel = difficultyOrder[level];

        let available = exercises.filter(ex => {
            // Equipment-Filter
            if (ex.equipment && !allowedEquipment.includes(ex.equipment)) return false;
            // Level-Filter: erlaube Uebungen bis zum User-Level
            if (difficultyOrder[ex.difficulty] > userLevel) return false;
            // Verletzungs-Filter
            if (a.injuries && a.hasInjuries) {
                const injuryText = a.injuries.toLowerCase();
                if (ex.avoidWhenInjured && ex.avoidWhenInjured.some(kw => injuryText.includes(kw))) return false;
            }
            return true;
        });

        // Praeferenz-Verarbeitung
        let preferredEquipment = null; // fuer Priority-Boost
        if (a.exercisePreferences) {
            const prefText = a.exercisePreferences.toLowerCase();

            // Negative Praeferenzen: Uebungen oder Equipment vermeiden
            const avoidKeywords = ['vermeiden', 'nicht', 'kein', 'ohne', 'keine'];
            if (avoidKeywords.some(kw => prefText.includes(kw))) {
                available = available.filter(ex => !prefText.includes(ex.name.toLowerCase()));
                // Equipment-Vermeidung pruefen
                const equipmentNames = {
                    'langhantel': 'barbell', 'barbell': 'barbell',
                    'kurzhantel': 'dumbbell', 'dumbbell': 'dumbbell', 'kurzhanteln': 'dumbbell',
                    'maschine': 'machine', 'machine': 'machine',
                    'kabel': 'cable', 'cable': 'cable',
                    'koerpergewicht': 'bodyweight', 'bodyweight': 'bodyweight',
                    'band': 'band', 'baender': 'band'
                };
                for (const [keyword, eqType] of Object.entries(equipmentNames)) {
                    if (prefText.includes(keyword) && avoidKeywords.some(kw => prefText.includes(kw))) {
                        available = available.filter(ex => ex.equipment !== eqType);
                    }
                }
            }

            // Positive Praeferenzen: Equipment boosten (priority um 1 erhoehen)
            const positiveKeywords = ['bevorzuge', 'mag', 'liebe', 'lieber', 'am liebsten', 'praeferiere', 'mit'];
            if (positiveKeywords.some(kw => prefText.includes(kw))) {
                const equipmentNames = {
                    'langhantel': 'barbell', 'barbell': 'barbell',
                    'kurzhantel': 'dumbbell', 'dumbbell': 'dumbbell', 'kurzhanteln': 'dumbbell',
                    'maschine': 'machine', 'machine': 'machine',
                    'kabel': 'cable', 'cable': 'cable',
                    'koerpergewicht': 'bodyweight', 'bodyweight': 'bodyweight',
                    'band': 'band', 'baender': 'band'
                };
                for (const [keyword, eqType] of Object.entries(equipmentNames)) {
                    if (prefText.includes(keyword)) {
                        preferredEquipment = eqType;
                        // Boost: Uebungen mit bevorzugtem Equipment bekommen Priority +1 (max 5)
                        available = available.map(ex => {
                            if (ex.equipment === eqType) {
                                return { ...ex, priority: Math.min(5, (ex.priority ?? 3) + 1) };
                            }
                            return ex;
                        });
                        break; // Nur ein Equipment-Boost pro Durchlauf
                    }
                }
                // Auch spezifische Uebungsnamen boosten
                available = available.map(ex => {
                    if (prefText.includes(ex.name.toLowerCase())) {
                        return { ...ex, priority: Math.min(5, (ex.priority ?? 3) + 2) };
                    }
                    return ex;
                });
            }
        }

        // 3. Freie Tage bestimmen
        const freeDays = this.generatorFreeDays;
        const trainingDayIndices = this._distributeTrainingDays(a.daysPerWeek, freeDays);

        // 4. Rep-Schema bestimmen
        const primaryGoal = a.goals[0] || 'general';
        const scheme = REPS_SCHEMES[primaryGoal] || REPS_SCHEMES.general;

        // 5. Plan aufbauen: Array[7], jeder Tag ein Array von Uebungen
        const plan = Array.from({ length: 7 }, () => []);
        const usedExerciseIds = new Set(); // Vermeidet Dopplungen ueber Tage

        for (let i = 0; i < template.structure.length; i++) {
            const dayDef = template.structure[i];
            const dayIndex = trainingDayIndices[i];
            if (dayIndex === undefined) break;

            const dayExercises = [];

            for (const target of dayDef.muscleTargets) {
                // Equipment-Tracking pro Muskelgruppe fuer Vielfalt innerhalb eines Tages
                const equipmentUsedForMuscle = [];

                // Compounds fuer diese Muskelgruppe
                const compounds = this._pickExercises(
                    available, target.muscle, true, target.compound, usedExerciseIds, equipmentUsedForMuscle
                );
                compounds.forEach(ex => { if (ex.equipment) equipmentUsedForMuscle.push(ex.equipment); });
                dayExercises.push(...compounds);

                // Isolationsuebungen fuer diese Muskelgruppe
                const isolations = this._pickExercises(
                    available, target.muscle, false, target.isolation, usedExerciseIds, equipmentUsedForMuscle
                );
                dayExercises.push(...isolations);
            }

            // In trainingPlan-Format konvertieren
            const formattedExercises = dayExercises.map(ex => this._formatExercise(ex, scheme, primaryGoal, a));

            // Cardio hinzufuegen wenn Fettabbau/Ausdauer oder Template es verlangt
            if (template.addCardioToEachDay || a.goals.includes('fat_loss') || a.goals.includes('endurance')) {
                const cardioEx = this._pickCardioExercise(available, allowedEquipment, usedExerciseIds, a);
                if (cardioEx) {
                    formattedExercises.push(cardioEx);
                }
            }

            // Zeitbudget pruefen und ggf. anpassen
            this._adjustForDuration(formattedExercises, a.sessionDuration);

            // Internes _compound-Flag entfernen (nur fuer Zeitschaetzung benoetigt)
            formattedExercises.forEach(ex => delete ex._compound);

            plan[dayIndex] = formattedExercises;
        }

        return plan;
    },

    _selectTemplate(answers, level) {
        // Score-basierte Auswahl: mehr Matches = hoehere Prioritaet
        const scoreTemplate = (t) => {
            let score = 0;
            // Tages-Uebereinstimmung ist Pflicht (wird spaeter als Fallback behandelt)
            if (t.daysPerWeek === answers.daysPerWeek) score += 10;
            // Level-Match gibt Bonus
            if (t.suitableFor.includes(level)) score += 5;
            // Jedes Ziel das matched gibt Punkte
            for (const g of answers.goals) {
                if (t.goals.includes(g)) score += 3;
            }
            return score;
        };

        let candidates = splitTemplates.filter(t => {
            if (t.daysPerWeek !== answers.daysPerWeek) return false;
            if (!t.suitableFor.includes(level)) return false;
            if (!t.goals.some(g => answers.goals.includes(g))) return false;
            return true;
        });

        // Fallback: nur nach Tagen und Level filtern
        if (candidates.length === 0) {
            candidates = splitTemplates.filter(t =>
                t.daysPerWeek === answers.daysPerWeek && t.suitableFor.includes(level)
            );
        }

        // Fallback: nur nach Tagen filtern
        if (candidates.length === 0) {
            candidates = splitTemplates.filter(t => t.daysPerWeek === answers.daysPerWeek);
        }

        // Fallback: naechstliegende Tagesanzahl
        if (candidates.length === 0) {
            const sorted = [...splitTemplates].sort((a, b) =>
                Math.abs(a.daysPerWeek - answers.daysPerWeek) - Math.abs(b.daysPerWeek - answers.daysPerWeek)
            );
            candidates = [sorted[0]];
        }

        // Score-basierte Auswahl — deterministisch, kein Zufall
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

    _distributeTrainingDays(count, freeDays) {
        if (count >= freeDays.length) return [...freeDays];

        // Gleichmaessig verteilen
        const result = [];
        const step = freeDays.length / count;
        for (let i = 0; i < count; i++) {
            result.push(freeDays[Math.floor(i * step)]);
        }
        return result;
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

        // Praeferenz-Boost: wenn Praeferenz-Text Equipment-Begriffe enthaelt, boost passende Uebungen
        // (wird ueber den answers-Kontext von _buildPlan gesetzt — hier via closure nicht direkt verfuegbar,
        //  daher wird preferredEquipment als optionaler Parameter nach usedIds erwartet)

        // Priority-basierte Sortierung (5 zuerst) mit leichter Fisher-Yates-Randomisierung innerhalb gleicher Priority
        // Erst nach Priority-Gruppe gruppieren, innerhalb jeder Gruppe shufflen
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

        // Equipment-Vielfalt: wenn bereits ein Equipment fuer diese Muskelgruppe gewaehlt wurde,
        // bevorzuge andere Equipment-Typen
        const picked = [];
        const pickedEquipment = usedEquipmentForMuscle ? new Set(usedEquipmentForMuscle) : new Set();

        for (const ex of sorted) {
            if (picked.length >= count) break;
            // Wenn wir noch Platz haben und Equipment-Vielfalt moeglich ist, bevorzuge anderes Equipment
            if (pickedEquipment.has(ex.equipment) && sorted.some(e =>
                !pickedEquipment.has(e.equipment) && !picked.includes(e)
            )) {
                continue; // Ueberspringe, bessere Option kommt noch
            }
            picked.push(ex);
            pickedEquipment.add(ex.equipment);
        }

        // Auffuellen falls nicht genug Uebungen nach Equipment-Filter
        if (picked.length < count) {
            for (const ex of sorted) {
                if (picked.length >= count) break;
                if (!picked.includes(ex)) {
                    picked.push(ex);
                }
            }
        }

        picked.forEach(ex => usedIds.add(ex.id));
        return picked;
    },

    _formatExercise(ex, scheme, primaryGoal, answers) {
        const entry = {
            name: ex.name,
            type: ex.type || 'strength',
            note: ''
        };

        if (entry.type === 'strength') {
            entry.sets = scheme.sets;
            // IMMER scheme.reps verwenden (zielbasiert: muscle 8-12, fat_loss 12-15, etc.)
            entry.reps = scheme.reps;
            entry.weight = ex.defaultWeight || 0;
            // Compound-Flag fuer Zeitschaetzung in _adjustForDuration
            entry._compound = ex.compound === true;
        } else if (entry.type === 'cardio') {
            entry.duration = ex.defaultDuration || '20 min';
        } else if (entry.type === 'distance') {
            entry.distance = ex.defaultDistance || '';
            entry.duration = ex.defaultDuration || '';
        }

        return entry;
    },

    _pickCardioExercise(available, allowedEquipment, usedIds, answers) {
        const cardioCandidates = available.filter(ex =>
            (ex.type === 'cardio' || ex.type === 'distance') &&
            !usedIds.has(ex.id)
        );

        if (cardioCandidates.length === 0) return null;

        const picked = cardioCandidates[Math.floor(Math.random() * cardioCandidates.length)];
        usedIds.add(picked.id);

        // Cardio-Dauer basierend auf Trainingszeit
        const durations = { 30: '10 min', 45: '15 min', 60: '20 min', 90: '25 min' };
        const duration = durations[answers.sessionDuration] || '15 min';

        if (picked.type === 'cardio') {
            return { name: picked.name, type: 'cardio', duration, note: '' };
        }
        return {
            name: picked.name, type: 'distance',
            distance: picked.defaultDistance || '', duration, note: ''
        };
    },

    _adjustForDuration(dayExercises, targetMinutes) {
        if (!targetMinutes) return;

        // Zeitschaetzung: Compounds ~4 Min/Satz (inkl. Pause), Isolations ~3 Min/Satz
        const estimateTime = (exList) => exList.reduce((sum, ex) => {
            if (ex.type === 'strength') {
                const minsPerSet = ex._compound ? 4 : 3;
                return sum + (ex.sets || 3) * minsPerSet;
            }
            if (ex.type === 'cardio' || ex.type === 'distance') {
                // parseInt ist korrekt fuer Strings wie "20 min" (stoppt bei Leerzeichen)
                return sum + (parseInt(ex.duration) || 15);
            }
            return sum + 10;
        }, 0);

        let estimated = estimateTime(dayExercises);

        // Zu lang: letzte Isolation(en) entfernen bis innerhalb des Budgets
        if (estimated > targetMinutes * 1.2 && dayExercises.length > 3) {
            for (let i = dayExercises.length - 1; i >= 0; i--) {
                if (estimated <= targetMinutes * 1.1) break;
                if (dayExercises[i].type === 'strength') {
                    const removedTime = (dayExercises[i].sets || 3) * (dayExercises[i]._compound ? 4 : 3);
                    dayExercises.splice(i, 1);
                    estimated -= removedTime;
                }
            }
        }

        // Zu kurz (< 80% der Zielzeit): Extra-Isolationssatz-Sets hinzufuegen
        // Wir erhoehen die Satz-Anzahl der letzten Isolation um 1, maximal 2x
        if (estimated < targetMinutes * 0.8 && dayExercises.length > 0) {
            let boostRounds = 0;
            while (estimateTime(dayExercises) < targetMinutes * 0.8 && boostRounds < 2) {
                // Suche Isolation-Uebung von hinten und erhoehere sets um 1
                let boosted = false;
                for (let i = dayExercises.length - 1; i >= 0; i--) {
                    if (dayExercises[i].type === 'strength' && !dayExercises[i]._compound) {
                        dayExercises[i].sets = (dayExercises[i].sets || 3) + 1;
                        boosted = true;
                        break;
                    }
                }
                // Falls keine Isolation gefunden: Compound-Satz erhoehen
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
        // Nutze bereits geladene workoutLogs
        if (!this.workoutLogs || this.workoutLogs.length === 0) return;

        const lastWeights = {};
        for (const log of this.workoutLogs) {
            for (const ex of (log.exercises || [])) {
                if (ex.name && ex.weight && !lastWeights[ex.name]) {
                    lastWeights[ex.name] = ex.weight;
                }
            }
        }

        for (const day of plan) {
            for (const ex of day) {
                if (ex.type === 'strength' && lastWeights[ex.name]) {
                    ex.weight = lastWeights[ex.name];
                }
            }
        }
    },

    // ── Uebung tauschen ─────────────────────────────
    openSwapOptions(dayIndex, exIndex) {
        const exercise = this.generatedPlan[dayIndex][exIndex];
        if (!exercise || exercise.type !== 'strength') return;

        // Finde die originale Uebung in der DB
        const original = exercises.find(e => e.name === exercise.name);
        if (!original) return;

        // Finde Alternativen (gleiche primaere Muskelgruppe + Equipment-Filter)
        const allowedEquipment = EQUIPMENT_MAP[this.generatorAnswers.equipment] || EQUIPMENT_MAP.full_gym;
        const usedNames = new Set();
        for (const day of this.generatedPlan) {
            for (const ex of day) {
                usedNames.add(ex.name);
            }
        }

        const alternatives = exercises.filter(ex =>
            ex.primaryMuscle === original.primaryMuscle &&
            ex.type === 'strength' &&
            ex.id !== original.id &&
            !usedNames.has(ex.name) &&
            allowedEquipment.includes(ex.equipment)
        )
        // Nach Priority DESC sortieren, dann ersten 3 nehmen
        .sort((a, b) => (b.priority ?? 3) - (a.priority ?? 3))
        .slice(0, 3);

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
        const formatted = this._formatExercise(alt, scheme, primaryGoal, this.generatorAnswers);

        // Internes _compound-Flag entfernen (nur fuer Zeitschaetzung benoetigt)
        delete formatted._compound;

        this.generatedPlan[dayIndex].splice(exIndex, 1, formatted);
        this.swapOptions = null;
        this.swapTarget = null;
    },

    closeSwapOptions() {
        this.swapOptions = null;
        this.swapTarget = null;
    },

    // ── Plan uebernehmen ─────────────────────────────
    async applyGeneratedPlan() {
        if (!this.generatedPlan) return;
        this.trainingPlan = JSON.parse(JSON.stringify(this.generatedPlan));
        await this.saveTrainingPlan();
        this.generatorOpen = false;
        this.generatedPlan = null;
        this.showToast('Trainingsplan uebernommen!');
    },

    regeneratePlan() {
        this.generatedPlan = null;
        this.swapOptions = null;
        this.swapTarget = null;
        this.generatePlan();
    },

    switchToManualEdit() {
        if (!this.generatedPlan) return;
        this.trainingPlan = JSON.parse(JSON.stringify(this.generatedPlan));
        this.generatorOpen = false;
        this.generatedPlan = null;
        this.openTraining();
    }
});
