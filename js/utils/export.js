export function exportWeightCSV(history) {
    if (!history || history.length === 0) return;

    const header = 'Datum,Gewicht (kg)';
    const rows = history.map(e => `${e.date},${e.weight}`);
    const csv = [header, ...rows].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);

    const a = document.createElement('a');
    a.href = url;
    a.download = `traction-gewicht-${today}.csv`;
    a.click();

    URL.revokeObjectURL(url);
}
