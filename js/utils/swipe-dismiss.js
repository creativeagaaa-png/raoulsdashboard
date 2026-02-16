/**
 * Swipe-down-to-dismiss for bottom-sheet modals.
 *
 * Usage: Add `x-swipe-dismiss="closeFn"` on the modal content panel.
 * Requires the grab-handle div as first child for visual affordance.
 *
 * This registers a custom Alpine directive that tracks vertical touch
 * gestures on the modal header area and dismisses when swiped down
 * past a threshold or with sufficient velocity.
 */

const DISMISS_THRESHOLD = 120;  // px to drag before auto-dismiss
const VELOCITY_THRESHOLD = 0.5; // px/ms — fast flick dismisses even short drag

export function registerSwipeDismiss(Alpine) {
    Alpine.directive('swipe-dismiss', (el, { expression }, { evaluate, cleanup }) => {
        let startY = 0;
        let currentY = 0;
        let startTime = 0;
        let dragging = false;

        function onTouchStart(e) {
            // Only allow swipe from the top 80px of the modal (header/handle area)
            const rect = el.getBoundingClientRect();
            const touchY = e.touches[0].clientY - rect.top;
            if (touchY > 80) return;

            startY = e.touches[0].clientY;
            currentY = startY;
            startTime = Date.now();
            dragging = false;
        }

        function onTouchMove(e) {
            if (startY === 0) return;
            currentY = e.touches[0].clientY;
            const dy = currentY - startY;

            if (dy < 0) {
                // Swiping up — reset
                el.style.transform = '';
                el.style.opacity = '';
                return;
            }

            if (dy > 10) {
                dragging = true;
                e.preventDefault();
            }

            if (dragging) {
                const dampened = dy * 0.6; // rubber-band dampening
                el.style.transition = 'none';
                el.style.transform = `translateY(${dampened}px)`;
                el.style.opacity = String(Math.max(1 - dy / 400, 0.4));
            }
        }

        function onTouchEnd() {
            if (!dragging) {
                startY = 0;
                return;
            }

            const dy = currentY - startY;
            const elapsed = Date.now() - startTime;
            const velocity = dy / Math.max(elapsed, 1);

            el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s ease';

            if (dy > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
                // Dismiss
                el.style.transform = 'translateY(100%)';
                el.style.opacity = '0';
                setTimeout(() => {
                    evaluate(expression);
                    // Reset after close animation completes
                    requestAnimationFrame(() => {
                        el.style.transform = '';
                        el.style.opacity = '';
                        el.style.transition = '';
                    });
                }, 200);
            } else {
                // Snap back
                el.style.transform = '';
                el.style.opacity = '';
            }

            startY = 0;
            currentY = 0;
            dragging = false;
        }

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });

        cleanup(() => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        });
    });
}
