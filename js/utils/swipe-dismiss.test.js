import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSwipeDismiss } from './swipe-dismiss.js';

function createMockAlpine() {
    const directives = {};
    return {
        directive(name, handler) {
            directives[name] = handler;
        },
        _directives: directives
    };
}

function createTouchEvent(type, clientY) {
    return {
        type,
        touches: [{ clientY }],
        preventDefault: vi.fn()
    };
}

describe('Swipe Dismiss Directive', () => {
    let Alpine;

    beforeEach(() => {
        Alpine = createMockAlpine();
        registerSwipeDismiss(Alpine);
    });

    it('registers a swipe-dismiss directive', () => {
        expect(Alpine._directives['swipe-dismiss']).toBeDefined();
        expect(typeof Alpine._directives['swipe-dismiss']).toBe('function');
    });

    it('attaches touch event listeners to the element', () => {
        const el = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            getBoundingClientRect: () => ({ top: 0 }),
            style: {}
        };
        const cleanupFns = [];
        const context = {
            evaluate: vi.fn(),
            cleanup: (fn) => cleanupFns.push(fn)
        };

        Alpine._directives['swipe-dismiss'](el, { expression: 'close()' }, context);

        expect(el.addEventListener).toHaveBeenCalledTimes(3);
        const callNames = el.addEventListener.mock.calls.map(c => c[0]);
        expect(callNames).toContain('touchstart');
        expect(callNames).toContain('touchmove');
        expect(callNames).toContain('touchend');
    });

    it('cleanup removes event listeners', () => {
        const el = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            getBoundingClientRect: () => ({ top: 0 }),
            style: {}
        };
        const cleanupFns = [];
        const context = {
            evaluate: vi.fn(),
            cleanup: (fn) => cleanupFns.push(fn)
        };

        Alpine._directives['swipe-dismiss'](el, { expression: 'close()' }, context);
        expect(cleanupFns.length).toBe(1);

        cleanupFns[0]();
        expect(el.removeEventListener).toHaveBeenCalledTimes(3);
    });
});
