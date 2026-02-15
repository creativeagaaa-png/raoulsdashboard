export function getTodayWeekdayIndex() {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
}

export function getISOWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 4);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function formatGalleryDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}