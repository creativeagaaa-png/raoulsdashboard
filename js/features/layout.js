import { WIDGET_REGISTRY, DEFAULT_LAYOUT } from '../utils/constants.js';
import * as Supa from '../store/supabase.js';

export const layoutMixin = () => ({
    WIDGET_REGISTRY,
    editMode: false,
    widgetLayout: JSON.parse(JSON.stringify(DEFAULT_LAYOUT)),
    dragState: {
        widgetId: null,
        sourceCol: null,
        sourceIndex: null,
        overCol: null,
        overIndex: null
    },

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
        this.showToast('Layout zurückgesetzt');
    },

    toggleEditMode() {
        this.editMode = !this.editMode;
        if (!this.editMode) {
            this.saveLayout();
        }
    },

    onDragStart(event, widgetId, col, index) {
        this.dragState = { widgetId, sourceCol: col, sourceIndex: index, overCol: null, overIndex: null };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', widgetId);
        event.target.style.opacity = '0.4';
    },

    onDragEnd(event) {
        event.target.style.opacity = '1';
        this.dragState = { widgetId: null, sourceCol: null, sourceIndex: null, overCol: null, overIndex: null };
    },

    onDragOver(event, col, index) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        this.dragState.overCol = col;
        this.dragState.overIndex = index;
    },

    onDrop(event, col, index) {
        event.preventDefault();
        const { widgetId, sourceCol, sourceIndex } = this.dragState;
        if (!widgetId) return;

        this.widgetLayout[sourceCol].splice(sourceIndex, 1);
        let targetIndex = index;
        if (sourceCol === col && sourceIndex < index) targetIndex--;
        this.widgetLayout[col].splice(targetIndex, 0, widgetId);
        this.saveLayout();

        if (widgetId === 'analytics') {
            this.$nextTick(() => {
                this.renderChart();
            });
        }

        this.dragState = { widgetId: null, sourceCol: null, sourceIndex: null, overCol: null, overIndex: null };
    },

    onDropAtEnd(event, col) {
        event.preventDefault();
        const { widgetId, sourceCol, sourceIndex } = this.dragState;
        if (!widgetId) return;

        this.widgetLayout[sourceCol].splice(sourceIndex, 1);
        this.widgetLayout[col].push(widgetId);
        this.saveLayout();

        if (widgetId === 'analytics') {
            this.$nextTick(() => {
                this.renderChart();
            });
        }

        this.dragState = { widgetId: null, sourceCol: null, sourceIndex: null, overCol: null, overIndex: null };
    }
});
