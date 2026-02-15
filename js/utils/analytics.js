import { getISOWeekKey } from './formatting.js';

export function calculateBMI(weight, height) {
    const h = height / 100;
    if (h <= 0) return { value: 0, label: "-", color: "bg-gray-500" };

    const val = (weight / (h * h)).toFixed(1);
    let label = "Normalgewicht";
    let color = "bg-emerald-500";
    if (val >= 25) { label = "Übergewicht"; color = "bg-yellow-500"; }
    if (val >= 30) { label = "Adipositas"; color = "bg-rose-500"; }
    if (val < 18.5) { label = "Untergewicht"; color = "bg-blue-500"; }
    return { value: val, label, color };
}

export function getBMIRanges(height) {
    const h = height / 100;
    if (h <= 0) return [];
    const hh = h * h;
    return [
        { label: 'Untergewicht', bmi: '< 18.5', min: null, max: (18.5 * hh).toFixed(1), color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30' },
        { label: 'Normalgewicht', bmi: '18.5 – 24.9', min: (18.5 * hh).toFixed(1), max: (25 * hh).toFixed(1), color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30' },
        { label: 'Übergewicht', bmi: '25 – 29.9', min: (25 * hh).toFixed(1), max: (30 * hh).toFixed(1), color: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30' },
        { label: 'Adipositas', bmi: '≥ 30', min: (30 * hh).toFixed(1), max: null, color: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/30' },
    ];
}

export function calculateTrend(history) {
    if (history.length < 2) return { value: 0, isLoss: false };
    const current = history[history.length - 1].weight;
    const prev = history[history.length - 2].weight;
    const diff = current - prev;
    return { value: diff, isLoss: diff < 0 };
}

export function calculateOracle(history, currentWeight, goalWeight) {
    if (history.length < 5) return { valid: false };

    const now = new Date();
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(now.getDate() - 56);

    const recentData = history.filter(h => new Date(h.date) >= eightWeeksAgo);
    if (recentData.length < 5) return { valid: false };

    const weeks = {};
    recentData.forEach(h => {
        const weekKey = getISOWeekKey(h.date);
        if (!weeks[weekKey]) weeks[weekKey] = [];
        weeks[weekKey].push(h.weight);
    });

    const weeklyAvgs = Object.entries(weeks)
        .map(([key, weights]) => ({
            week: key,
            avg: weights.reduce((a, b) => a + b, 0) / weights.length,
            count: weights.length
        }))
        .sort((a, b) => a.week.localeCompare(b.week));

    if (weeklyAvgs.length < 2) return { valid: false };

    const alpha = 0.3;
    let ewma = weeklyAvgs[0].avg;
    weeklyAvgs.forEach(w => { ewma = alpha * w.avg + (1 - alpha) * ewma; });

    let weightedSlopeSum = 0;
    let weightSum = 0;
    for (let i = 1; i < weeklyAvgs.length; i++) {
        const diff = weeklyAvgs[i].avg - weeklyAvgs[i - 1].avg;
        const recencyWeight = Math.pow(2, i);
        weightedSlopeSum += diff * recencyWeight;
        weightSum += recencyWeight;
    }
    const weeklySlope = weightedSlopeSum / weightSum;

    const recentWeeks = weeklyAvgs.slice(-3);
    const recentRange = recentWeeks.length >= 2
        ? Math.max(...recentWeeks.map(w => w.avg)) - Math.min(...recentWeeks.map(w => w.avg))
        : 999;
    const isPlateau = recentWeeks.length >= 2 && recentRange < 0.3;

    const plateauTips = [
        'Refeed Day einplanen – ein Tag mit mehr Kalorien kann den Stoffwechsel ankurbeln',
        'Trainingsintensität erhöhen oder Trainingsart wechseln',
        'Schlaf und Stress prüfen – beides beeinflusst das Gewicht stark',
        'Wassereinlagerungen? Salzkonsum und Zyklus beachten',
        'Kaloriendefizit überprüfen – der Körper passt sich an',
        'Mehr Protein kann helfen, die Muskelmasse zu erhalten'
    ];
    const tipIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % plateauTips.length;

    if (weeklySlope >= -0.05) {
        return {
            valid: true,
            date: null,
            rate: weeklySlope.toFixed(2),
            weeklyAvg: ewma.toFixed(1),
            isPlateau,
            plateauTip: isPlateau ? plateauTips[tipIndex] : null,
            confidence: 'low',
            noProgress: true
        };
    }

    const kgRemaining = currentWeight - goalWeight;
    const weeksToGoal = kgRemaining / Math.abs(weeklySlope);
    const goalDate = new Date();
    goalDate.setDate(now.getDate() + weeksToGoal * 7);

    const avgDeviation = weeklyAvgs.length > 1
        ? weeklyAvgs.slice(1).reduce((sum, w, i) => {
            const predicted = weeklyAvgs[i].avg + weeklySlope;
            return sum + Math.abs(w.avg - predicted);
        }, 0) / (weeklyAvgs.length - 1)
        : 999;

    let confidence = 'high';
    if (avgDeviation > 0.5) confidence = 'medium';
    if (avgDeviation > 1.0 || weeklyAvgs.length < 3) confidence = 'low';

    return {
        valid: true,
        date: goalDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
        rate: weeklySlope.toFixed(2),
        weeklyAvg: ewma.toFixed(1),
        isPlateau,
        plateauTip: isPlateau ? plateauTips[tipIndex] : null,
        confidence,
        noProgress: false
    };
}