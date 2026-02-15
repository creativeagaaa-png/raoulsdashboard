import * as Supa from '../store/supabase.js';

export const recordsMixin = () => ({
    personalRecords: [],
    prCelebration: null,
    prCelebrationOpen: false,

    async loadPersonalRecords() {
        try {
            this.personalRecords = await Supa.getPersonalRecords();
        } catch (e) {
            console.error('Failed to load PRs:', e);
        }
    },

    getPR(exerciseName) {
        const prs = this.personalRecords.filter(
            r => r.exercise_name.toLowerCase() === exerciseName.toLowerCase()
        );
        if (prs.length === 0) return null;
        return prs.reduce((best, r) => r.weight > best.weight ? r : best, prs[0]);
    },

    isPR(exerciseName, weight) {
        if (!weight || weight <= 0) return false;
        const currentBest = this.getPR(exerciseName);
        return !currentBest || weight > currentBest.weight;
    },

    async checkPersonalRecords(session) {
        const newPRs = [];

        for (const exercise of session.exercises) {
            const completedSets = exercise.sets.filter(s => s.done && s.weight > 0);
            if (completedSets.length === 0) continue;

            const maxWeight = Math.max(...completedSets.map(s => s.weight));
            const bestSet = completedSets.find(s => s.weight === maxWeight);
            const currentBest = this.getPR(exercise.name);

            if (!currentBest || maxWeight > currentBest.weight) {
                const pr = {
                    exercise_name: exercise.name,
                    weight: maxWeight,
                    reps: bestSet.reps || 1,
                    date: session.date
                };
                newPRs.push({
                    ...pr,
                    previousBest: currentBest ? currentBest.weight : null
                });

                try {
                    await Supa.savePersonalRecord(pr);
                } catch (e) {
                    console.error('Failed to save PR:', e);
                }
            }
        }

        if (newPRs.length > 0) {
            await this.loadPersonalRecords();
            const biggestPR = newPRs.reduce((a, b) => a.weight > b.weight ? a : b);
            this.prCelebration = biggestPR;
            this.prCelebrationOpen = true;
            setTimeout(() => this.triggerPRConfetti(), 300);
        }
    },

    triggerPRConfetti() {
        if (typeof confetti !== 'function') return;
        try {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500', '#FF8C00', '#FFFFFF']
            });
        } catch (e) {
            console.error('PR Confetti error:', e);
        }
    },

    closePRCelebration() {
        this.prCelebrationOpen = false;
        this.prCelebration = null;
    },

    getRecentPRs(limit = 5) {
        return [...this.personalRecords]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, limit);
    }
});
