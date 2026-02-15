import * as Supa from '../store/supabase.js';
import { compressImage } from '../utils/image.js';

// Store blob outside Alpine's reactive proxy to keep it as a native Blob
let _pendingPhotoBlob = null;

export function getPendingPhotoBlob() {
    const blob = _pendingPhotoBlob;
    _pendingPhotoBlob = null;
    return blob;
}

export const galleryMixin = () => ({
    photoDates: [],
    photoPreview: null,

    // Progress Pics Modal
    progressPicsOpen: false,
    progressPicsPhotos: [],
    progressPicsLoading: false,
    progressPicsLoaded: false,
    progressPicsPreview: [],

    // Comparison slider
    progressPics: {
        beforeDate: null,
        afterDate: null,
        beforePhoto: null,
        afterPhoto: null,
        sliderPosition: 50,
        isDragging: false,
        _selectMode: 'before'
    },

    async handlePhotoUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const blob = await compressImage(file);
            _pendingPhotoBlob = blob;
            this.photoPreview = URL.createObjectURL(blob);
        } catch (e) {
            console.error('Failed to compress image:', e);
            this.showToast('Foto konnte nicht geladen werden');
        }
    },

    removePhotoPreview() {
        if (this.photoPreview) URL.revokeObjectURL(this.photoPreview);
        this.photoPreview = null;
        _pendingPhotoBlob = null;
        const input = document.querySelector('#photoFileInput');
        if (input) input.value = '';
    },

    async loadPreviewThumbnails() {
        if (this.photoDates.length === 0) return;
        const recent = this.photoDates.slice(-3).reverse();
        try {
            const previews = await Promise.all(
                recent.map(async (date) => {
                    const url = await Supa.getPhotoUrl(date);
                    return { date, photo: url };
                })
            );
            this.progressPicsPreview = previews;
        } catch (e) {
            console.error('Failed to load preview thumbnails:', e);
        }
    },

    // Open the full-screen progress pics modal
    async openProgressPics() {
        this.progressPicsOpen = true;
        if (!this.progressPicsLoaded) {
            await this.loadProgressPicsPhotos();
        }
    },

    closeProgressPics() {
        this.progressPicsOpen = false;
    },

    async loadProgressPicsPhotos() {
        if (this.progressPicsLoading || this.photoDates.length === 0) return;
        this.progressPicsLoading = true;
        try {
            const photos = await Promise.all(
                this.photoDates.map(async (date) => {
                    const url = await Supa.getPhotoUrl(date);
                    const entry = this.history.find(h => h.date === date);
                    return { date, photo: url, weight: entry ? entry.weight : null };
                })
            );
            this.progressPicsPhotos = photos.reverse();
            this.progressPicsLoaded = true;

            // Auto-select first and last for comparison if we have 2+
            if (photos.length >= 2 && !this.progressPics.beforeDate) {
                this.selectForCompare(this.progressPicsPhotos[this.progressPicsPhotos.length - 1], 'before');
                this.selectForCompare(this.progressPicsPhotos[0], 'after');
            }
        } catch (e) {
            console.error('Failed to load progress pics:', e);
        } finally {
            this.progressPicsLoading = false;
        }
    },

    async refreshProgressPicsPhotos() {
        this.progressPicsLoaded = false;
        this.progressPicsPhotos = [];
        await this.loadProgressPicsPhotos();
    },

    selectForCompare(item, slot) {
        if (slot === 'before') {
            this.progressPics.beforeDate = item.date;
            this.progressPics.beforePhoto = item.photo;
        } else {
            this.progressPics.afterDate = item.date;
            this.progressPics.afterPhoto = item.photo;
        }
        this.progressPics.sliderPosition = 50;
    },

    isSelectedForCompare(date) {
        return date === this.progressPics.beforeDate || date === this.progressPics.afterDate;
    },

    getCompareLabel(date) {
        if (date === this.progressPics.beforeDate) return 'Vorher';
        if (date === this.progressPics.afterDate) return 'Nachher';
        return null;
    },

    formatPhotoDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' });
    },

    startSliderDrag(event) {
        this.progressPics.isDragging = true;
        this.handleSliderDrag(event, event.currentTarget);
    },

    handleSliderDrag(event, containerEl) {
        if (!this.progressPics.isDragging) return;
        const rect = containerEl.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const pct = ((clientX - rect.left) / rect.width) * 100;
        this.progressPics.sliderPosition = Math.max(2, Math.min(98, pct));
    },

    stopSliderDrag() {
        this.progressPics.isDragging = false;
    }
});
