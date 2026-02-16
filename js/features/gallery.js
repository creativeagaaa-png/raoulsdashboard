import * as Supa from '../store/supabase.js';
import { compressImage } from '../utils/image.js';

// Store blob outside Alpine's reactive proxy to keep it as a native Blob
let _pendingPhotoBlob = null;

export function getPendingPhotoBlob() {
    const blob = _pendingPhotoBlob;
    _pendingPhotoBlob = null;
    return blob;
}

const PHOTOS_PER_PAGE = 6;

export const galleryMixin = () => ({
    photoDates: [],
    photoPreview: null,

    // Progress Pics Modal
    progressPicsOpen: false,
    progressPicsPhotos: [],
    progressPicsLoading: false,
    progressPicsLoaded: false,
    _photosLoadedCount: 0,

    // Lightbox
    lightboxPhoto: null,
    lightboxDate: null,
    lightboxWeight: null,

    async handlePhotoUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const blob = await compressImage(file);
            _pendingPhotoBlob = blob;
            this.photoPreview = URL.createObjectURL(blob);
        } catch (e) {
            console.error('Failed to compress image:', e);
            this.showToast('Failed to load photo');
        }
    },

    removePhotoPreview() {
        if (this.photoPreview) URL.revokeObjectURL(this.photoPreview);
        this.photoPreview = null;
        _pendingPhotoBlob = null;
        const input = document.querySelector('#photoFileInput');
        if (input) input.value = '';
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
        this.lightboxPhoto = null;
    },

    // NOTE: hasMorePhotos is defined as a getter in main.js to preserve reactivity.

    async loadProgressPicsPhotos() {
        if (this.progressPicsLoading || this.photoDates.length === 0) return;
        this.progressPicsLoading = true;
        try {
            const sorted = [...this.photoDates].sort().reverse();
            const batch = sorted.slice(0, PHOTOS_PER_PAGE);
            const photos = await Promise.all(
                batch.map(async (date) => {
                    const url = await Supa.getPhotoUrl(date);
                    const entry = this.history.find(h => h.date === date);
                    return { date, photo: url, weight: entry ? entry.weight : null };
                })
            );
            this.progressPicsPhotos = photos;
            this._photosLoadedCount = batch.length;
            this.progressPicsLoaded = true;
        } catch (e) {
            console.error('Failed to load progress pics:', e);
        } finally {
            this.progressPicsLoading = false;
        }
    },

    async loadMorePhotos() {
        if (this.progressPicsLoading || !this.hasMorePhotos) return;
        this.progressPicsLoading = true;
        try {
            const sorted = [...this.photoDates].sort().reverse();
            const start = this._photosLoadedCount;
            const batch = sorted.slice(start, start + PHOTOS_PER_PAGE);
            const photos = await Promise.all(
                batch.map(async (date) => {
                    const url = await Supa.getPhotoUrl(date);
                    const entry = this.history.find(h => h.date === date);
                    return { date, photo: url, weight: entry ? entry.weight : null };
                })
            );
            this.progressPicsPhotos.push(...photos);
            this._photosLoadedCount += batch.length;
        } catch (e) {
            console.error('Failed to load more photos:', e);
        } finally {
            this.progressPicsLoading = false;
        }
    },

    async refreshProgressPicsPhotos() {
        this.progressPicsLoaded = false;
        this.progressPicsPhotos = [];
        this._photosLoadedCount = 0;
        await this.loadProgressPicsPhotos();
    },

    openLightbox(item) {
        this.lightboxPhoto = item.photo;
        this.lightboxDate = item.date;
        this.lightboxWeight = item.weight;
    },

    closeLightbox() {
        this.lightboxPhoto = null;
        this.lightboxDate = null;
        this.lightboxWeight = null;
    },

    formatPhotoDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
    }
});
