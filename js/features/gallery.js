import * as Supa from '../store/supabase.js';
import { compressImage } from '../utils/image.js';
import { formatGalleryDate } from '../utils/formatting.js';

export const galleryMixin = () => ({
    photoDates: [],
    photoPreview: null,
    galleryPhotos: [],
    galleryLoaded: false,
    galleryLoading: false,
    galleryLightbox: { open: false, photo: null, date: null, weight: null },

    // Progress Pics State
    progressPics: {
        beforeDate: null,
        afterDate: null,
        beforePhoto: null,
        afterPhoto: null,
        sliderPosition: 50,
        isDragging: false
    },

    formatGalleryDate,

    async handlePhotoUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            this.photoPreview = await compressImage(file);
        } catch (e) {
            console.error('Failed to compress image:', e);
            this.showToast('Foto konnte nicht geladen werden');
        }
    },

    removePhotoPreview() {
        this.photoPreview = null;
        const input = document.querySelector('#photoFileInput');
        if (input) input.value = '';
    },

    async loadGalleryPhotos() {
        if (this.galleryLoaded || this.galleryLoading) return;
        this.galleryLoading = true;
        try {
            const photos = [];
            for (const date of this.photoDates) {
                const url = Supa.getPhotoUrl(date);
                const entry = this.history.find(h => h.date === date);
                photos.push({ date, photo: url, weight: entry ? entry.weight : null });
            }
            this.galleryPhotos = photos.reverse();
            this.galleryLoaded = true;
        } catch (e) {
            console.error('Failed to load gallery photos:', e);
        } finally {
            this.galleryLoading = false;
        }
    },

    openGalleryLightbox(item) {
        this.galleryLightbox = { open: true, photo: item.photo, date: item.date, weight: item.weight };
    },

    closeGalleryLightbox() {
        this.galleryLightbox.open = false;
    },

    async refreshGallery() {
        this.galleryLoaded = false;
        this.galleryPhotos = [];
        await this.loadGalleryPhotos();
    },

    // Progress Pics specific methods
    async loadProgressPic(which, date) {
        if (!date) return;
        try {
            const url = Supa.getPhotoUrl(date);
            if (which === 'before') this.progressPics.beforePhoto = url;
            else this.progressPics.afterPhoto = url;
        } catch (e) {
            console.error('Failed to load progress pic:', e);
        }
    },

    async initProgressPics() {
        if (this.photoDates.length < 2) return;
        this.progressPics.beforeDate = this.photoDates[0];
        this.progressPics.afterDate = this.photoDates[this.photoDates.length - 1];
        await Promise.all([
            this.loadProgressPic('before', this.progressPics.beforeDate),
            this.loadProgressPic('after', this.progressPics.afterDate)
        ]);
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
