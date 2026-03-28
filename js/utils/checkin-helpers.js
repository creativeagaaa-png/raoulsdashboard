export function isItemDone(item) {
    return item.status === 'done' || item.checked === true;
}

export function isItemMissed(item) {
    return item.status === 'missed';
}

export function isItemNotDone(item) {
    return item.status === 'missed' || item.status === 'none' || (!('status' in item) && !item.checked);
}
