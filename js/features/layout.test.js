import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../store/supabase.js', () => ({
    saveLayout: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../utils/constants.js', () => ({
    WIDGET_REGISTRY: {
        'current-status': { label: 'Status' },
        'prediction': { label: 'Prediction' },
        'analytics': { label: 'Analytics' },
        'milestone': { label: 'Milestone' },
        'achievements': { label: 'Achievements' },
        'progress-pics': { label: 'Progress Pics' },
        'logs': { label: 'Logs' }
    },
    DEFAULT_LAYOUT: {
        left: ['current-status', 'prediction'],
        right: ['analytics', 'milestone', 'achievements', 'progress-pics', 'logs']
    }
}));

const { layoutMixin } = await import('./layout.js');

function createMixin(overrides = {}) {
    return {
        ...layoutMixin(),
        showToast: vi.fn(),
        renderChart: vi.fn(),
        $nextTick: vi.fn(fn => fn()),
        ...overrides
    };
}

describe('initial state', () => {
    it('has correct default layout', () => {
        const m = createMixin();
        expect(m.widgetLayout.left).toContain('current-status');
        expect(m.widgetLayout.right).toContain('analytics');
    });

    it('starts with editMode off', () => {
        const m = createMixin();
        expect(m.editMode).toBe(false);
    });

    it('dragState is empty initially', () => {
        const m = createMixin();
        expect(m.dragState.widgetId).toBeNull();
    });
});

describe('toggleEditMode', () => {
    it('toggles editMode on', () => {
        const m = createMixin();
        m.toggleEditMode();
        expect(m.editMode).toBe(true);
    });

    it('saves layout when toggling off', async () => {
        const Supa = await import('../store/supabase.js');
        const m = createMixin();
        m.editMode = true;
        m.toggleEditMode();
        expect(m.editMode).toBe(false);
        expect(Supa.saveLayout).toHaveBeenCalled();
    });
});

describe('resetLayout', () => {
    it('resets to default layout', async () => {
        const m = createMixin();
        m.widgetLayout = { left: ['logs'], right: ['analytics'] };
        await m.resetLayout();
        expect(m.widgetLayout.left).toEqual(['current-status', 'prediction']);
        expect(m.showToast).toHaveBeenCalledWith('Layout zurückgesetzt');
    });
});

describe('onDragStart', () => {
    it('sets drag state correctly', () => {
        const m = createMixin();
        const event = {
            dataTransfer: { effectAllowed: '', setData: vi.fn() },
            target: { style: {} }
        };
        m.onDragStart(event, 'analytics', 'right', 0);
        expect(m.dragState.widgetId).toBe('analytics');
        expect(m.dragState.sourceCol).toBe('right');
        expect(m.dragState.sourceIndex).toBe(0);
        expect(event.target.style.opacity).toBe('0.4');
    });
});

describe('onDragEnd', () => {
    it('resets opacity and drag state', () => {
        const m = createMixin();
        const event = { target: { style: { opacity: '0.4' } } };
        m.onDragEnd(event);
        expect(event.target.style.opacity).toBe('1');
        expect(m.dragState.widgetId).toBeNull();
    });
});

describe('onDragOver', () => {
    it('updates overCol and overIndex', () => {
        const m = createMixin();
        const event = { preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } };
        m.onDragOver(event, 'left', 1);
        expect(m.dragState.overCol).toBe('left');
        expect(m.dragState.overIndex).toBe(1);
        expect(event.preventDefault).toHaveBeenCalled();
    });
});

describe('onDrop', () => {
    it('moves widget within same column', () => {
        const m = createMixin();
        m.widgetLayout = { left: ['a', 'b', 'c'], right: [] };
        m.dragState = { widgetId: 'a', sourceCol: 'left', sourceIndex: 0, overCol: null, overIndex: null };
        const event = { preventDefault: vi.fn() };
        m.onDrop(event, 'left', 2);
        // 'a' removed from 0, then inserted at 2-1=1
        expect(m.widgetLayout.left).toEqual(['b', 'a', 'c']);
    });

    it('moves widget between columns', () => {
        const m = createMixin();
        m.widgetLayout = { left: ['a', 'b'], right: ['c'] };
        m.dragState = { widgetId: 'a', sourceCol: 'left', sourceIndex: 0, overCol: null, overIndex: null };
        const event = { preventDefault: vi.fn() };
        m.onDrop(event, 'right', 0);
        expect(m.widgetLayout.left).toEqual(['b']);
        expect(m.widgetLayout.right).toEqual(['a', 'c']);
    });

    it('does nothing when widgetId is null', () => {
        const m = createMixin();
        m.widgetLayout = { left: ['a'], right: ['b'] };
        m.dragState = { widgetId: null, sourceCol: null, sourceIndex: null, overCol: null, overIndex: null };
        const event = { preventDefault: vi.fn() };
        m.onDrop(event, 'right', 0);
        expect(m.widgetLayout.left).toEqual(['a']);
    });

    it('re-renders chart when analytics widget is moved', () => {
        const m = createMixin();
        m.widgetLayout = { left: ['analytics'], right: ['b'] };
        m.dragState = { widgetId: 'analytics', sourceCol: 'left', sourceIndex: 0, overCol: null, overIndex: null };
        const event = { preventDefault: vi.fn() };
        m.onDrop(event, 'right', 0);
        expect(m.renderChart).toHaveBeenCalled();
    });
});

describe('onDropAtEnd', () => {
    it('appends widget to end of column', () => {
        const m = createMixin();
        m.widgetLayout = { left: ['a', 'b'], right: ['c'] };
        m.dragState = { widgetId: 'a', sourceCol: 'left', sourceIndex: 0, overCol: null, overIndex: null };
        const event = { preventDefault: vi.fn() };
        m.onDropAtEnd(event, 'right');
        expect(m.widgetLayout.left).toEqual(['b']);
        expect(m.widgetLayout.right).toEqual(['c', 'a']);
    });

    it('does nothing when widgetId is null', () => {
        const m = createMixin();
        m.widgetLayout = { left: ['a'], right: [] };
        m.dragState = { widgetId: null, sourceCol: null, sourceIndex: null, overCol: null, overIndex: null };
        const event = { preventDefault: vi.fn() };
        m.onDropAtEnd(event, 'right');
        expect(m.widgetLayout.left).toEqual(['a']);
    });
});
