import { ACTIVITY_LEVELS, CALORIE_CONSTANTS, TRAINING_BURN_PER_MIN_PER_KG, SPORT_BURN_PER_MIN_PER_KG } from '../utils/constants.js';

export const caloriesMixin = () => ({
    calorieData: {
        bmr: 0,
        tdee: 0,
        trainingBurn: 0,     // kcal/day from training plan (averaged over week)
        sportBurn: 0,        // kcal/day from other sports (averaged over week)
        adjustment: 0,
        target: 0,
        isClamped: false,
        mode: 'maintenance',
        isReady: false       // false until user has set all required fields
    },

    // ── BMR: Mifflin-St Jeor ────────────────────────
    calculateBMR(weight, height, age, gender) {
        if (!weight || !height || !age || !gender) return 0;
        if (gender === 'male') {
            return 10 * weight + 6.25 * height - 5 * age - 5;
        }
        return 10 * weight + 6.25 * height - 5 * age - 161;
    },

    // ── TDEE: BMR × Activity Factor (NEAT only, no exercise) ──
    calculateTDEE(bmr, activityLevel) {
        const level = ACTIVITY_LEVELS[activityLevel] || ACTIVITY_LEVELS.moderately_active;
        return bmr * level.factor;
    },

    get7DayAverageWeight() {
        if (this.history.length === 0) return this.startWeight || 0;
        const sorted = [...this.history].sort((a, b) => a.date.localeCompare(b.date));
        const last7 = sorted.slice(-7);
        return last7.reduce((sum, e) => sum + e.weight, 0) / last7.length;
    },

    // ── Training burn: estimate weekly kcal from training plan ──
    _estimateWeeklyTrainingBurn(weight) {
        if (!this.trainingPlan || !weight) return 0;

        let totalWeeklyKcal = 0;

        for (let day = 0; day < 7; day++) {
            const exercises = this.trainingPlan[day];
            if (!exercises || exercises.length === 0) continue;

            for (const ex of exercises) {
                let minutes = 0;
                let burnRate = TRAINING_BURN_PER_MIN_PER_KG.strength;

                if (ex.type === 'strength') {
                    // Estimate: ~3 min per set (including rest)
                    const sets = ex.sets ?? 3;
                    minutes = sets * 3;
                    burnRate = TRAINING_BURN_PER_MIN_PER_KG.strength;
                } else if (ex.type === 'cardio') {
                    minutes = parseInt(ex.duration) || 10;
                    // Check if it's warmup/cooldown by name
                    if (ex.name && ex.name.toLowerCase().includes('aufwaerm')) {
                        burnRate = TRAINING_BURN_PER_MIN_PER_KG.warmup;
                    } else if (ex.name && (ex.name.toLowerCase().includes('cooldown') || ex.name.toLowerCase().includes('stretch'))) {
                        burnRate = TRAINING_BURN_PER_MIN_PER_KG.cooldown;
                    } else {
                        burnRate = TRAINING_BURN_PER_MIN_PER_KG.cardio;
                    }
                } else if (ex.type === 'distance') {
                    minutes = parseInt(ex.duration) || 15;
                    burnRate = TRAINING_BURN_PER_MIN_PER_KG.distance;
                } else if (ex.type === 'circuit') {
                    const rounds = ex.rounds || 3;
                    minutes = rounds * 5;
                    burnRate = TRAINING_BURN_PER_MIN_PER_KG.cardio;
                }

                totalWeeklyKcal += minutes * burnRate * weight;
            }
        }

        return totalWeeklyKcal;
    },

    // ── Sport burn: estimate from generator answers or saved sport data ──
    _estimateWeeklySportBurn(weight) {
        if (!weight) return 0;

        // Use saved sport data if available
        const sportName = this._savedSportName || '';
        const sportDays = this._savedSportDays || [];

        if (!sportName || sportDays.length === 0) return 0;

        // Find burn rate for sport
        const s = sportName.toLowerCase();
        let burnRate = SPORT_BURN_PER_MIN_PER_KG.default;
        for (const [key, rate] of Object.entries(SPORT_BURN_PER_MIN_PER_KG)) {
            if (key !== 'default' && s.includes(key)) {
                burnRate = rate;
                break;
            }
        }

        // Estimate 60 min per session as default
        const minutesPerSession = 60;
        return sportDays.length * minutesPerSession * burnRate * weight;
    },

    // ── Main calculation ────────────────────────────
    calculateCalorieTarget() {
        const weight = this.get7DayAverageWeight();
        const height = this.userHeight;
        const age = this.userAge;
        const gender = this.gender;

        // Check all required fields
        if (!gender || !height || !age || !weight) {
            this.calorieData = { ...this.calorieData, isReady: false };
            return;
        }

        const bmr = this.calculateBMR(weight, height, age, gender);
        const tdee = this.calculateTDEE(bmr, this.activityLevel);

        // Training burn (averaged to daily)
        const weeklyTrainingKcal = this._estimateWeeklyTrainingBurn(weight);
        const trainingBurn = Math.round(weeklyTrainingKcal / 7);

        // Sport burn (averaged to daily)
        const weeklySportKcal = this._estimateWeeklySportBurn(weight);
        const sportBurn = Math.round(weeklySportKcal / 7);

        // Total expenditure = TDEE + training + sport
        const totalExpenditure = tdee + trainingBurn + sportBurn;

        // Goal adjustment
        const rate = this.weeklyGoalRate || 0;
        const adjustment = rate * (CALORIE_CONSTANTS.KCAL_PER_KG_FAT / 7);

        let target = Math.round(totalExpenditure + adjustment);
        let isClamped = false;

        const minCal = gender === 'female'
            ? CALORIE_CONSTANTS.MIN_CALORIES_FEMALE
            : CALORIE_CONSTANTS.MIN_CALORIES_MALE;

        if (target < minCal) {
            target = minCal;
            isClamped = true;
        }

        let mode = 'maintenance';
        if (rate < 0) mode = 'deficit';
        else if (rate > 0) mode = 'surplus';

        this.calorieData = {
            bmr,
            tdee,
            trainingBurn,
            sportBurn,
            adjustment: Math.round(adjustment),
            target,
            isClamped,
            mode,
            isReady: true
        };
    },

    recalculateCalories() {
        // Only calculate if user has explicitly set required profile fields
        if (!this.gender || !this.userHeight || !this.userAge) {
            this.calorieData = { ...this.calorieData, isReady: false };
            return;
        }
        // Also require activity level to be consciously chosen
        // (activityLevel always has a default, so we check if profile was completed)
        if (!this._caloriesUnlocked) {
            this.calorieData = { ...this.calorieData, isReady: false };
            return;
        }
        this.calculateCalorieTarget();
    },

    // Called when user saves profile — this "unlocks" calorie calculation
    unlockCalories() {
        this._caloriesUnlocked = true;
    },

    getWeeklyComparison() {
        const now = new Date();
        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        thisMonday.setHours(0, 0, 0, 0);
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(lastMonday.getDate() - 7);

        const thisWeek = this.history.filter(h => new Date(h.date) >= thisMonday);
        const lastWeek = this.history.filter(h => {
            const d = new Date(h.date);
            return d >= lastMonday && d < thisMonday;
        });

        const avg = arr => arr.length ? arr.reduce((s, e) => s + e.weight, 0) / arr.length : null;
        const thisAvg = avg(thisWeek);
        const lastAvg = avg(lastWeek);

        return {
            planned: this.weeklyGoalRate || 0,
            actual: (thisAvg !== null && lastAvg !== null) ? Math.round((thisAvg - lastAvg) * 10) / 10 : null,
            thisWeekAvg: thisAvg,
            lastWeekAvg: lastAvg
        };
    },

    getProjectedGoalDate() {
        const rate = parseFloat(this.weeklyGoalRate) || 0;
        if (rate === 0) return null;

        const currentWeight = this.get7DayAverageWeight();
        const diff = this.goalWeight - currentWeight;

        if ((rate < 0 && diff >= 0) || (rate > 0 && diff <= 0)) return null;

        const weeksNeeded = Math.abs(diff / rate);
        const daysNeeded = Math.round(weeksNeeded * 7);
        const projected = new Date();
        projected.setDate(projected.getDate() + daysNeeded);
        return projected.toISOString().split('T')[0];
    }
});
