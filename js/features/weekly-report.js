import { getLocalDateString } from '../utils/formatting.js';

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 4);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatDateShort(date) {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function isItemDone(item) {
    return item.status === 'done' || item.checked === true;
}

const TRAINING_KEYWORDS = ['training', 'workout', 'sport', 'exercise'];
function isTrainingItem(item) {
    const text = (item.key + ' ' + item.label).toLowerCase();
    return TRAINING_KEYWORDS.some(kw => text.includes(kw));
}

export const weeklyReportMixin = () => ({
    reportWeekOffset: -1,
    reportCompareEnabled: false,
    reportCompareWeekOffset: null,

    getReportCurrentWeek() {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + this.reportWeekOffset * 7);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return {
            monday,
            sunday,
            weekNumber: getWeekNumber(monday),
            label: 'KW ' + getWeekNumber(monday) + ' (' + formatDateShort(monday) + '–' + formatDateShort(sunday) + ')'
        };
    },

    getReportAvailableWeeks() {
        const dates = [];
        if (this.history && this.history.length > 0) dates.push(new Date(this.history[0].date));
        if (this.checkinHistory && this.checkinHistory.length > 0) {
            const sorted = [...this.checkinHistory].sort((a, b) => a.date.localeCompare(b.date));
            if (sorted.length > 0) dates.push(new Date(sorted[0].date));
        }
        if (dates.length === 0) return 1;

        const earliest = new Date(Math.min(...dates));
        const today = new Date();
        const diffWeeks = Math.ceil((today - earliest) / (7 * 86400000));
        return Math.max(diffWeeks, 1);
    },

    reportHasCompletedWeek() {
        const dates = [];
        if (this.history && this.history.length > 0) dates.push(new Date(this.history[0].date));
        if (this.checkinHistory && this.checkinHistory.length > 0) {
            const sorted = [...this.checkinHistory].sort((a, b) => a.date.localeCompare(b.date));
            if (sorted.length > 0) dates.push(new Date(sorted[0].date));
        }
        if (dates.length === 0) return false;
        const earliest = new Date(Math.min(...dates));
        const lastMonday = getMonday(new Date());
        return earliest < lastMonday;
    },

    reportHasEnoughForCompare() {
        return this.getReportAvailableWeeks() >= 2;
    },

    reportPrevWeek() {
        if (Math.abs(this.reportWeekOffset - 1) < this.getReportAvailableWeeks()) {
            this.reportWeekOffset--;
        }
    },

    reportNextWeek() {
        const maxOffset = new Date().getDay() === 0 ? 0 : -1;
        if (this.reportWeekOffset < maxOffset) {
            this.reportWeekOffset++;
        }
    },

    getReportWeekData(weekOffset) {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + weekOffset * 7);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(getLocalDateString(d));
        }

        // Weight data
        const weights = (this.history || []).filter(e => dates.includes(e.date)).map(e => e.weight);
        const weightData = weights.length > 0 ? {
            avg: +(weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1),
            min: +Math.min(...weights).toFixed(1),
            max: +Math.max(...weights).toFixed(1),
            start: weights[0],
            end: weights[weights.length - 1],
            change: +(weights[weights.length - 1] - weights[0]).toFixed(1),
            count: weights.length
        } : null;

        // Habit data
        const activeItems = (this.getCheckinItems ? this.getCheckinItems() : (this.checklistItems || [])).filter(i => !isTrainingItem(i));
        const habitData = activeItems.map(item => {
            let daysDone = 0;
            let daysMissed = 0;
            let daysExisted = 0;
            const reasons = [];

            for (const date of dates) {
                const entry = (this.checkinHistory || []).find(c => c.date === date);
                if (!entry) continue;
                const found = entry.items.find(i => i.key === item.key);
                if (!found) continue;
                daysExisted++;
                if (isItemDone(found)) daysDone++;
                if (found.status === 'missed') {
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
                rate: daysExisted > 0 ? Math.round((daysDone / daysExisted) * 100) : 0
            };
        }).filter(i => i.daysExisted > 0);

        const totalDone = habitData.reduce((sum, h) => sum + h.daysDone, 0);
        const totalExisted = habitData.reduce((sum, h) => sum + h.daysExisted, 0);
        const overallRate = totalExisted > 0 ? Math.round((totalDone / totalExisted) * 100) : 0;

        return { weekOffset, dates, weightData, habitData, overallRate };
    },

    getReportData() {
        return this.getReportWeekData(this.reportWeekOffset);
    },

    getReportCompareData() {
        if (!this.reportCompareEnabled || this.reportCompareWeekOffset === null) return null;
        return this.getReportWeekData(this.reportCompareWeekOffset);
    },

    getReportCompareOptions() {
        const options = [];
        const maxWeeks = this.getReportAvailableWeeks();
        for (let i = -1; i >= -maxWeeks; i--) {
            if (i === this.reportWeekOffset) continue;
            const monday = getMonday(new Date());
            monday.setDate(monday.getDate() + i * 7);
            options.push({
                offset: i,
                label: 'KW ' + getWeekNumber(monday) + ' (' + formatDateShort(monday) + ')'
            });
        }
        return options;
    },

    generateReportSummary() {
        const data = this.getReportData();
        const week = this.getReportCurrentWeek();
        const sentences = [];

        // Weight analysis
        if (data.weightData) {
            const w = data.weightData;
            const mode = this.calorieData ? this.calorieData.mode : 'deficit';
            const isGood = (mode === 'deficit' && w.change <= 0) || (mode === 'surplus' && w.change >= 0);
            const absChange = Math.abs(w.change);

            if (absChange < 0.2) {
                sentences.push('In KW ' + week.weekNumber + ' ist dein Gewicht stabil geblieben (Ø ' + w.avg + ' kg). Das zeigt eine ausgewogene Kalorienbilanz.');
            } else if (isGood) {
                sentences.push('In KW ' + week.weekNumber + ' hast du ' + absChange.toFixed(1) + ' kg ' + (w.change < 0 ? 'abgenommen' : 'zugenommen') + ' (Ø ' + w.avg + ' kg). Das zeigt, dass dein Plan funktioniert.');
            } else {
                sentences.push('In KW ' + week.weekNumber + ' ist dein Gewicht um ' + absChange.toFixed(1) + ' kg ' + (w.change > 0 ? 'gestiegen' : 'gesunken') + ' (Ø ' + w.avg + ' kg).');
            }
        } else {
            sentences.push('In KW ' + week.weekNumber + ' wurden keine Gewichtsdaten eingetragen.');
        }

        // Habit analysis
        if (data.habitData.length > 0) {
            const rate = data.overallRate;
            const best = data.habitData.filter(h => h.rate >= 80).sort((a, b) => b.rate - a.rate);
            const weak = data.habitData.filter(h => h.rate < 60).sort((a, b) => a.rate - b.rate);
            const allReasons = data.habitData.flatMap(h => h.reasons.map(r => ({ label: h.label, reason: r })));

            // Overall assessment
            if (rate >= 80) {
                sentences.push('Deine Disziplin war stark — ' + rate + '% aller Gewohnheiten wurden erfüllt.');
            } else if (rate >= 50) {
                sentences.push('Insgesamt wurden ' + rate + '% deiner Gewohnheiten erfüllt — solide, aber mit Luft nach oben.');
            } else {
                sentences.push('Mit ' + rate + '% Erfüllung war es eine schwierige Woche für deine Gewohnheiten.');
            }

            // Best habits
            if (best.length > 0) {
                const bestNames = best.slice(0, 2).map(h => h.label);
                sentences.push(bestNames.join(' und ') + (best.length === 1 ? ' war' : ' waren') + ' deine stärkste' + (best.length === 1 ? '' : 'n') + ' Gewohnheit' + (best.length === 1 ? '' : 'en') + ' diese Woche.');
            }

            // Weak habits with reasons
            if (weak.length > 0) {
                const w = weak[0];
                let weakText = w.label + ' fiel dir am schwersten (' + w.daysDone + ' von ' + w.daysExisted + ' Tagen)';
                if (w.reasons.length > 0) {
                    // Find most common reason or just use first
                    const reasonCounts = {};
                    for (const r of w.reasons) {
                        const normalized = r.replace(/\.$/, '').toLowerCase();
                        reasonCounts[normalized] = (reasonCounts[normalized] || 0) + 1;
                    }
                    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
                    if (topReason[1] > 1) {
                        weakText += ' — am häufigsten wegen „' + w.reasons[0].replace(/\.$/, '') + '" (' + topReason[1] + 'x)';
                    } else {
                        weakText += ' — u.a. wegen „' + w.reasons[0].replace(/\.$/, '') + '"';
                    }
                }
                sentences.push(weakText + '.');

                // Additional reasons from other habits
                const otherReasons = allReasons.filter(r => r.label !== w.label).slice(0, 1);
                if (otherReasons.length > 0) {
                    sentences.push('Auch bei ' + otherReasons[0].label + ' gab es Schwierigkeiten: „' + otherReasons[0].reason.replace(/\.$/, '') + '".');
                }
            }

            // Connection between habits and weight
            if (data.weightData) {
                const w = data.weightData;
                const mode = this.calorieData ? this.calorieData.mode : 'deficit';
                const isGood = (mode === 'deficit' && w.change <= 0) || (mode === 'surplus' && w.change >= 0);

                const calorieHabit = data.habitData.find(h => (h.key + ' ' + h.label).toLowerCase().match(/calori|kalori|auto_calories/));
                const trainingHabit = data.habitData.find(h => (h.key + ' ' + h.label).toLowerCase().match(/training|workout|sport/));

                if (isGood && rate >= 70) {
                    sentences.push('Dein Gewichtsverlauf bestätigt, dass deine Gewohnheiten Wirkung zeigen — bleib dran!');
                } else if (!isGood && calorieHabit && calorieHabit.rate < 60) {
                    sentences.push('Der Zusammenhang zwischen deinem Kalorienziel (' + calorieHabit.daysDone + '/' + calorieHabit.daysExisted + ' Tage eingehalten) und der Gewichtsentwicklung ist deutlich. Fokussiere dich nächste Woche besonders darauf.');
                } else if (!isGood && rate < 50) {
                    sentences.push('Die niedrige Erfüllungsrate spiegelt sich in der Gewichtsentwicklung wider. Konzentriere dich nächste Woche auf 2–3 Kerngewohnheiten statt alle gleichzeitig.');
                }
            }
        }

        return sentences.join(' ');
    }
});
