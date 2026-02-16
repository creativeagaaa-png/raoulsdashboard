import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('../store/supabase.js', () => ({
    getPhotoUrl: vi.fn().mockResolvedValue('https://example.com/photo.jpg'),
    savePhoto: vi.fn().mockResolvedValue(undefined),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    getAllPhotoDates: vi.fn().mockResolvedValue([])
}));

// Mock image utility
vi.mock('../utils/image.js', () => ({
    compressImage: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/jpeg' }))
}));

const { galleryMixin, getPendingPhotoBlob } = await import('./gallery.js');

function createMixin(overrides = {}) {
    return {
        ...galleryMixin(),
        history: [],
        showToast: vi.fn(),
        ...overrides
    };
}

describe('getPendingPhotoBlob', () => {
    it('returns null when no blob is pending', () => {
        expect(getPendingPhotoBlob()).toBeNull();
    });
});

describe('formatPhotoDate', () => {
    it('returns empty string for null', () => {
        const m = createMixin();
        expect(m.formatPhotoDate(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        const m = createMixin();
        expect(m.formatPhotoDate(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        const m = createMixin();
        expect(m.formatPhotoDate('')).toBe('');
    });

    it('formats date in German locale', () => {
        const m = createMixin();
        const result = m.formatPhotoDate('2025-03-15');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });
});

describe('removePhotoPreview', () => {
    it('sets photoPreview to null', () => {
        const m = createMixin();
        // URL.revokeObjectURL may not exist in test env
        globalThis.URL = { ...(globalThis.URL || {}), revokeObjectURL: vi.fn() };
        // Mock document.querySelector for file input reset
        globalThis.document = { querySelector: vi.fn(() => null) };
        m.photoPreview = 'blob:something';
        m.removePhotoPreview();
        expect(m.photoPreview).toBeNull();
        delete globalThis.document;
    });
});

describe('openProgressPics', () => {
    it('opens progress pics modal', async () => {
        const m = createMixin();
        m.progressPicsLoaded = true;
        await m.openProgressPics();
        expect(m.progressPicsOpen).toBe(true);
    });
});

describe('closeProgressPics', () => {
    it('closes progress pics and resets lightbox', () => {
        const m = createMixin();
        m.progressPicsOpen = true;
        m.lightboxPhoto = 'some-url';
        m.closeProgressPics();
        expect(m.progressPicsOpen).toBe(false);
        expect(m.lightboxPhoto).toBeNull();
    });
});

describe('openLightbox', () => {
    it('sets lightbox data from item', () => {
        const m = createMixin();
        m.openLightbox({ photo: 'url', date: '2025-01-01', weight: 75.5 });
        expect(m.lightboxPhoto).toBe('url');
        expect(m.lightboxDate).toBe('2025-01-01');
        expect(m.lightboxWeight).toBe(75.5);
    });
});

describe('closeLightbox', () => {
    it('resets all lightbox state', () => {
        const m = createMixin();
        m.lightboxPhoto = 'url';
        m.lightboxDate = '2025-01-01';
        m.lightboxWeight = 75.5;
        m.closeLightbox();
        expect(m.lightboxPhoto).toBeNull();
        expect(m.lightboxDate).toBeNull();
        expect(m.lightboxWeight).toBeNull();
    });
});

describe('loadProgressPicsPhotos', () => {
    it('does nothing when already loading', async () => {
        const m = createMixin();
        m.progressPicsLoading = true;
        m.photoDates = ['2025-01-01'];
        await m.loadProgressPicsPhotos();
        expect(m.progressPicsLoaded).toBe(false);
    });

    it('does nothing when no photos exist', async () => {
        const m = createMixin();
        m.photoDates = [];
        await m.loadProgressPicsPhotos();
        expect(m.progressPicsLoaded).toBe(false);
    });

    it('loads photos for each date', async () => {
        const Supa = await import('../store/supabase.js');
        const m = createMixin({
            history: [
                { date: '2025-01-01', weight: 80 },
                { date: '2025-01-15', weight: 78 }
            ]
        });
        m.photoDates = ['2025-01-01', '2025-01-15'];
        await m.loadProgressPicsPhotos();
        expect(m.progressPicsLoaded).toBe(true);
        expect(m.progressPicsPhotos).toHaveLength(2);
        // Should be reversed (newest first)
        expect(m.progressPicsPhotos[0].date).toBe('2025-01-15');
    });
});

describe('refreshProgressPicsPhotos', () => {
    it('resets and reloads photos', async () => {
        const m = createMixin({ history: [{ date: '2025-01-01', weight: 80 }] });
        m.photoDates = ['2025-01-01'];
        m.progressPicsLoaded = true;
        m.progressPicsPhotos = [{ date: '2025-01-01', photo: 'old', weight: 80 }];
        await m.refreshProgressPicsPhotos();
        expect(m.progressPicsLoaded).toBe(true);
        expect(m.progressPicsPhotos).toHaveLength(1);
    });
});
