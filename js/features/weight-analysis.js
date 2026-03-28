import { getLocalDateString } from '../utils/formatting.js';
import { isItemDone, isItemMissed, isItemNotDone } from '../utils/checkin-helpers.js';

const HABIT_KEYWORDS = {
    high: ['calories', 'kalorien', 'essen', 'ernährung', 'food', 'training', 'workout', 'sport', 'exercise', 'auto_calories'],
    medium: ['water', 'wasser', 'trinken', 'drink', 'sleep', 'schlaf'],
    low: ['steps', 'schritte', 'walk', 'bewegung']
};

function classifyHabitItem(item) {
    const text = (item.key + ' ' + item.label).toLowerCase();
    for (const keyword of HABIT_KEYWORDS.high) {
        if (text.includes(keyword)) return 1;
    }
    for (const keyword of HABIT_KEYWORDS.medium) {
        if (text.includes(keyword)) return 2;
    }
    for (const keyword of HABIT_KEYWORDS.low) {
        if (text.includes(keyword)) return 3;
    }
    return 3;
}

export const weightAnalysisMixin = () => ({
    getDailyAnalysis() {
        // Find the two most recent consecutive weight entries
        const sorted = [...this.history].sort((a, b) => b.date.localeCompare(a.date));
        if (sorted.length < 2) return null;

        const newerEntry = sorted[0];
        const olderEntry = sorted[1];

        // Check they are at most 2 days apart to keep analysis relevant
        const daysDiff = Math.round((new Date(newerEntry.date) - new Date(olderEntry.date)) / 86400000);
        if (daysDiff > 2) return null;

        const analysisDate = olderEntry.date; // habits from this day explain the weight change
        const yesterdayCheckin = this.checkinHistory.find(c => c.date === analysisDate);
        const activeItems = this.getCheckinItems ? this.getCheckinItems() : (this.checklistItems || []);
        if (activeItems.length === 0) return null;

        const diff = +(newerEntry.weight - olderEntry.weight).toFixed(2);
        const absDiff = Math.abs(diff);

        const mode = this.calorieData ? this.calorieData.mode : 'deficit';
        let direction;
        if (absDiff < 0.1) {
            direction = 'neutral';
        } else if (mode === 'deficit') {
            direction = diff < 0 ? 'good' : 'bad';
        } else if (mode === 'surplus') {
            direction = diff > 0 ? 'good' : 'bad';
        } else {
            direction = absDiff < 0.3 ? 'neutral' : 'bad';
        }

        // Analyze yesterday's habits
        let missedItems = [];
        let allDone = true;
        if (yesterdayCheckin && yesterdayCheckin.items) {
            const activeKeys = new Set(activeItems.map(i => i.key));
            for (const item of yesterdayCheckin.items) {
                if (!activeKeys.has(item.key)) continue;
                if (isItemNotDone(item)) {
                    missedItems.push({
                        key: item.key,
                        label: item.label,
                        status: item.status || 'none',
                        reason: item.reason || null,
                        priority: classifyHabitItem(item)
                    });
                    allDone = false;
                }
            }
            missedItems.sort((a, b) => a.priority - b.priority);
            missedItems = missedItems.slice(0, 3);
        } else {
            return {
                diff, absDiff, direction,
                hasCheckinData: false,
                missedItems: [], allDone: false,
                message: '',
                analysisDate,
                newerDate: newerEntry.date,
                newerWeight: newerEntry.weight,
                olderWeight: olderEntry.weight
            };
        }

        // Collect all habit info for smart analysis
        const doneItems = yesterdayCheckin.items
            .filter(isItemDone)
            .map(i => ({ ...i, priority: classifyHabitItem(i) }))
            .sort((a, b) => a.priority - b.priority);

        // Categorize habits
        const calorieItem = missedItems.find(i => classifyHabitItem(i) === 1 && (i.key + ' ' + i.label).toLowerCase().match(/calori|kalori|essen|ernährung|auto_calories/));
        const trainingItem = missedItems.find(i => (i.key + ' ' + i.label).toLowerCase().match(/training|workout|sport|exercise/));
        const waterItem = missedItems.find(i => (i.key + ' ' + i.label).toLowerCase().match(/water|wasser|trinken|drink|getrunken/));
        const sleepItem = missedItems.find(i => (i.key + ' ' + i.label).toLowerCase().match(/sleep|schlaf/));

        const calorieDone = doneItems.some(i => (i.key + ' ' + i.label).toLowerCase().match(/calori|kalori|essen|ernährung|auto_calories/));
        const trainingDone = doneItems.some(i => (i.key + ' ' + i.label).toLowerCase().match(/training|workout|sport|exercise/));
        const waterDone = doneItems.some(i => (i.key + ' ' + i.label).toLowerCase().match(/water|wasser|trinken|drink|getrunken/));
        const sleepDone = doneItems.some(i => (i.key + ' ' + i.label).toLowerCase().match(/sleep|schlaf/));

        // Build intelligent analysis text
        let message;
        const diffText = (diff > 0 ? '+' : '') + diff.toFixed(1) + ' kg';

        if (direction === 'neutral') {
            if (allDone) {
                message = 'Dein Gewicht ist stabil geblieben. Da du gestern alle Gewohnheiten eingehalten hast, zeigt das eine gute Balance zwischen Kalorienaufnahme und Verbrauch.';
            } else {
                message = 'Trotz ' + missedItems.length + ' nicht erledigter Gewohnheit' + (missedItems.length > 1 ? 'en' : '') + ' ist dein Gewicht stabil geblieben. Kurzfristige Schwankungen hängen auch von Wasserhaushalt und Verdauung ab.';
            }
        } else if (direction === 'bad') {
            const reasons = [];
            if (calorieItem) {
                reasons.push(calorieItem.reason ? 'du dein Kalorienziel nicht eingehalten hast (' + calorieItem.reason.replace(/\.$/, '') + ')' : 'du dein Kalorienziel nicht eingehalten hast');
            }
            if (trainingItem) {
                reasons.push(trainingItem.reason ? 'kein Training stattfand (' + trainingItem.reason.replace(/\.$/, '') + ')' : 'kein Training stattfand');
            }
            if (sleepItem) {
                reasons.push('du zu wenig geschlafen hast — Schlafmangel erhöht Cortisol und kann zu Wassereinlagerungen führen');
            }
            if (waterItem) {
                reasons.push('du zu wenig getrunken hast — paradoxerweise speichert der Körper mehr Wasser bei Dehydration');
            }

            if (reasons.length > 0) {
                message = 'Dein Gewicht ist um ' + absDiff.toFixed(1) + ' kg gestiegen. Das liegt wahrscheinlich daran, dass ' + reasons.join(' und ') + '.';
            } else if (allDone) {
                message = 'Dein Gewicht ist um ' + absDiff.toFixed(1) + ' kg gestiegen, obwohl du gestern alle Gewohnheiten eingehalten hast. Schwankungen von bis zu ±0,5 kg sind völlig normal und hängen oft mit Wasserhaushalt, Verdauung oder Salzkonsum zusammen — kein Grund zur Sorge.';
            } else {
                const missedLabels = missedItems.slice(0, 2).map(i => i.reason ? i.label + ' (' + i.reason.replace(/\.$/, '') + ')' : i.label);
                message = 'Dein Gewicht ist um ' + absDiff.toFixed(1) + ' kg gestiegen. Gestern ' + (missedItems.length === 1 ? 'wurde' : 'wurden') + ' ' + missedLabels.join(' und ') + ' nicht erledigt, was dazu beigetragen haben könnte.';
            }
        } else {
            // direction === 'good'
            const positives = [];
            if (calorieDone) positives.push('dein Kalorienziel eingehalten');
            if (trainingDone) positives.push('trainiert');
            if (sleepDone) positives.push('ausreichend geschlafen');
            if (waterDone) positives.push('genug getrunken');

            if (allDone && positives.length > 0) {
                message = 'Dein Gewicht ist um ' + absDiff.toFixed(1) + ' kg gesunken. Das ist das Ergebnis deiner Disziplin — du hast gestern ' + positives.join(', ') + '. Weiter so!';
            } else if (positives.length > 0) {
                const missedWithReasons = missedItems.filter(i => i.reason).slice(0, 1);
                let extra = '';
                if (missedWithReasons.length > 0) {
                    extra = ' Obwohl ' + missedWithReasons[0].label + ' nicht geklappt hat (' + missedWithReasons[0].reason.replace(/\.$/, '') + '), hast du ';
                } else {
                    extra = ' Du hast ';
                }
                message = 'Dein Gewicht ist um ' + absDiff.toFixed(1) + ' kg gesunken — gute Richtung!' + extra + positives.join(' und ') + ', und das zeigt Wirkung.';
            } else {
                message = 'Dein Gewicht ist um ' + absDiff.toFixed(1) + ' kg gesunken. Auch wenn tägliche Schwankungen normal sind, geht der Trend in die richtige Richtung. Bleib dran!';
            }
        }

        return {
            diff, absDiff, direction,
            hasCheckinData: true,
            missedItems, allDone,
            message,
            analysisDate,
            newerDate: newerEntry.date,
            newerWeight: newerEntry.weight,
            olderWeight: olderEntry.weight
        };
    },

    getWeeklyHabitCompliance() {
        const activeItems = this.getCheckinItems ? this.getCheckinItems() : (this.checklistItems || []);
        if (activeItems.length === 0) return [];

        const today = new Date();
        const dates = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dates.push(getLocalDateString(d));
        }

        return activeItems.map(item => {
            let daysExisted = 0;
            let daysDone = 0;
            let daysMissed = 0;
            const reasons = [];

            for (const date of dates) {
                const entry = this.checkinHistory.find(c => c.date === date);
                if (!entry) continue;
                const found = entry.items.find(i => i.key === item.key);
                if (!found) continue;
                daysExisted++;
                if (isItemDone(found)) daysDone++;
                if (isItemMissed(found)) {
                    daysMissed++;
                    if (found.reason) reasons.push(found.reason);
                }
            }

            return {
                key: item.key,
                label: item.label,
                daysDone,
                daysMissed,
                daysExisted,
                reasons,
                rate: daysExisted > 0 ? Math.round((daysDone / daysExisted) * 100) : 0,
                priority: classifyHabitItem(item)
            };
        }).filter(i => i.daysExisted > 0).sort((a, b) => a.priority - b.priority);
    }
});
