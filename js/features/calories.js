import { ACTIVITY_LEVELS, CALORIE_CONSTANTS } from '../utils/constants.js';

export const caloriesMixin = () => ({
    calorieData: {
        bmr: 0,
        tdee: 0,
        adjustment: 0,
        target: 0,
        isClamped: false,
        mode: 'maintenance'
    },

    calculateBMR(weight, height, age, gender) {
        if (!weight || !height || !age || !gender) return 0;
        if (gender === 'male') {
            return 10 * weight + 6.25 * height - 5 * age - 5;
        }
        return 10 * weight + 6.25 * height - 5 * age - 161;
    },

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

    calculateCalorieTarget() {
        const weight = this.get7DayAverageWeight();
        const height = this.userHeight;
        const age = this.userAge;
        const gender = this.gender;

        const bmr = this.calculateBMR(weight, height, age, gender);
        const tdee = this.calculateTDEE(bmr, this.activityLevel);
        const rate = this.weeklyGoalRate || 0;
        const adjustment = rate * (CALORIE_CONSTANTS.KCAL_PER_KG_FAT / 7);

        let target = Math.round(tdee + adjustment);
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

        this.calorieData = { bmr, tdee, adjustment: Math.round(adjustment), target, isClamped, mode };
    },

    recalculateCalories() {
        if (this.gender && this.userHeight && this.userAge) {
            this.calculateCalorieTarget();
        }
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
        const rate = this.weeklyGoalRate;
        if (!rate || rate === 0) return null;

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
