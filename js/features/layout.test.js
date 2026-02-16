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
    it('has correct default layout with left widgets', () => {
        const m = createMixin();
        expect(m.widgetLayout.left).toEqual(['current-status', 'prediction']);
    });

    it('has correct default layout with right widgets', () => {
        const m = createMixin();
        expect(m.widgetLayout.right).toEqual(['analytics', 'milestone', 'achievements', 'progress-pics', 'logs']);
    });
});

describe('resetLayout', () => {
    it('resets to default layout and shows toast', async () => {
        const Supa = await import('../store/supabase.js');
        const m = createMixin();
        
        // Modify the layout
        m.widgetLayout = { left: ['logs'], right: ['analytics'] };
        
        // Reset it
        await m.resetLayout();
        
        // Should be back to default
        expect(m.widgetLayout.left).toEqual(['current-status', 'prediction']);
        expect(m.widgetLayout.right).toEqual(['analytics', 'milestone', 'achievements', 'progress-pics', 'logs']);
        
        // Should show toast
        expect(m.showToast).toHaveBeenCalledWith('Layout reset');
        
        // Should save the layout
        expect(Supa.saveLayout).toHaveBeenCalled();
        
        // Should render chart
        expect(m.renderChart).toHaveBeenCalled();
    });
});

describe('saveLayout', () => {
    it('calls Supa.saveLayout with current widgetLayout', async () => {
        const Supa = await import('../store/supabase.js');
        const m = createMixin();
        
        // Clear any previous calls
        vi.clearAllMocks();
        
        await m.saveLayout();
        
        expect(Supa.saveLayout).toHaveBeenCalledWith(m.widgetLayout);
    });

    it('handles errors gracefully', async () => {
        const Supa = await import('../store/supabase.js');
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Mock saveLayout to reject
        Supa.saveLayout.mockRejectedValueOnce(new Error('Network error'));
        
        const m = createMixin();
        
        // Should not throw
        await expect(m.saveLayout()).resolves.not.toThrow();
        
        // Should log error
        expect(consoleError).toHaveBeenCalledWith('Failed to save layout:', expect.any(Error));
        
        consoleError.mockRestore();
    });
});
