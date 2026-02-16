/**
 * Haptic feedback utility for iOS PWA.
 *
 * Uses navigator.vibrate where available and falls back to a silent no-op.
 * Patterns are kept short so they feel like native iOS taptic feedback.
 */

function vibrate(pattern) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(pattern); } catch (_) { /* silent */ }
    }
}

/** Light tap – button press, toggle, quick-log step */
export function hapticLight() {
    vibrate(10);
}

/** Medium tap – set done, entry saved, modal open */
export function hapticMedium() {
    vibrate(20);
}

/** Success – weight logged, workout finished, milestone unlocked */
export function hapticSuccess() {
    vibrate([15, 50, 15]);
}

/** Warning – delete confirmation, cancel workout */
export function hapticWarning() {
    vibrate([30, 40, 30]);
}

/** Error – save failed, validation error */
export function hapticError() {
    vibrate([50, 30, 50, 30, 50]);
}

/** Heavy – PR celebration, reward lootbox */
export function hapticHeavy() {
    vibrate([20, 40, 20, 40, 30]);
}

/** Selection change – swipe threshold reached, filter change */
export function hapticSelection() {
    vibrate(8);
}
