import { WIDGET_REGISTRY, DEFAULT_LAYOUT } from '../utils/constants.js';
import * as Supa from '../store/supabase.js';

export const layoutMixin = () => ({
    WIDGET_REGISTRY,
    widgetLayout: JSON.parse(JSON.stringify(DEFAULT_LAYOUT)),

    async saveLayout() {
        try {
            await Supa.saveLayout(this.widgetLayout);
        } catch (e) {
            console.error('Failed to save layout:', e);
        }
    },

    async resetLayout() {
        this.widgetLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
        await this.saveLayout();
        this.$nextTick(() => {
            this.renderChart();
        });
        this.showToast('Layout reset');
    }
});
