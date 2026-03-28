import * as Supa from '../store/supabase.js';

const OUTPUT_SIZE = 512;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const JPEG_QUALITY = 0.85;

export const avatarCropMixin = () => ({
    cropOpen: false,
    cropImage: null,
    cropZoom: 1,
    cropMinZoom: 0.5,
    cropOffsetX: 0,
    cropOffsetY: 0,
    cropProcessing: false,
    _cropCanvas: null,
    _cropCtx: null,
    _cropRafId: null,
    _cropPointerDown: false,
    _cropLastPointerX: 0,
    _cropLastPointerY: 0,
    _cropPinchDist: 0,
    _cropCircleRadius: 0,
    _cropResolve: null,

    openCropEditor(file) {
        return new Promise((resolve) => {
            this._cropResolve = resolve;
            const img = new Image();
            img.onload = () => {
                this.cropImage = img;
                this.cropOpen = true;
                this.$nextTick(() => this._initCropCanvas());
            };
            img.onerror = () => {
                this.showToast('Bild konnte nicht geladen werden');
                URL.revokeObjectURL(img.src);
                resolve(null);
            };
            img.src = URL.createObjectURL(file);
        });
    },

    _initCropCanvas() {
        const canvas = this.$refs.cropCanvas;
        if (!canvas) return;

        this._cropCanvas = canvas;
        this._cropCtx = canvas.getContext('2d');

        const container = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const w = container.clientWidth;
        const h = container.clientHeight;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        this._cropCtx.scale(dpr, dpr);

        this._cropCircleRadius = Math.min(w, h) * 0.42;

        // Calculate min zoom so image fills circle
        const img = this.cropImage;
        const minSide = Math.min(img.naturalWidth, img.naturalHeight);
        const circleDiameter = this._cropCircleRadius * 2;
        this.cropMinZoom = Math.max(MIN_ZOOM, circleDiameter / minSide);
        this.cropZoom = this.cropMinZoom;
        this.cropOffsetX = 0;
        this.cropOffsetY = 0;

        this._drawCropFrame();
    },

    _drawCropFrame() {
        const ctx = this._cropCtx;
        const canvas = this._cropCanvas;
        if (!ctx || !canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const cx = w / 2;
        const cy = h / 2;
        const r = this._cropCircleRadius;
        const img = this.cropImage;

        ctx.clearRect(0, 0, w, h);

        // Draw image centered + offset + zoom
        if (img) {
            const iw = img.naturalWidth * this.cropZoom;
            const ih = img.naturalHeight * this.cropZoom;
            const ix = cx - iw / 2 + this.cropOffsetX;
            const iy = cy - ih / 2 + this.cropOffsetY;
            ctx.drawImage(img, ix, iy, iw, ih);
        }

        // Dark overlay with circle cutout
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
        ctx.fill('evenodd');
        ctx.restore();

        // Circle border
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        this._cropRafId = requestAnimationFrame(() => this._drawCropFrame());
    },

    _clampCropOffset() {
        const canvas = this._cropCanvas;
        if (!canvas || !this.cropImage) return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const r = this._cropCircleRadius;
        const img = this.cropImage;
        const iw = img.naturalWidth * this.cropZoom;
        const ih = img.naturalHeight * this.cropZoom;

        // Image must cover the circle in all directions
        const maxOffX = Math.max(0, iw / 2 - r);
        const maxOffY = Math.max(0, ih / 2 - r);
        this.cropOffsetX = Math.max(-maxOffX, Math.min(maxOffX, this.cropOffsetX));
        this.cropOffsetY = Math.max(-maxOffY, Math.min(maxOffY, this.cropOffsetY));
    },

    onCropPointerDown(e) {
        if (e.pointerType === 'touch' && e.isPrimary === false) return;
        this._cropPointerDown = true;
        this._cropLastPointerX = e.clientX;
        this._cropLastPointerY = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
    },

    onCropPointerMove(e) {
        if (!this._cropPointerDown) return;
        const dx = e.clientX - this._cropLastPointerX;
        const dy = e.clientY - this._cropLastPointerY;
        this._cropLastPointerX = e.clientX;
        this._cropLastPointerY = e.clientY;
        this.cropOffsetX += dx;
        this.cropOffsetY += dy;
        this._clampCropOffset();
    },

    onCropPointerUp(e) {
        this._cropPointerDown = false;
    },

    onCropTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this._cropPinchDist = Math.hypot(dx, dy);
        }
    },

    onCropTouchMove(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (this._cropPinchDist > 0) {
                const scale = dist / this._cropPinchDist;
                const newZoom = Math.max(this.cropMinZoom, Math.min(MAX_ZOOM, this.cropZoom * scale));
                this.cropZoom = newZoom;
                this._clampCropOffset();
            }
            this._cropPinchDist = dist;
        }
    },

    onCropTouchEnd(e) {
        this._cropPinchDist = 0;
    },

    onCropWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newZoom = Math.max(this.cropMinZoom, Math.min(MAX_ZOOM, this.cropZoom * delta));
        this.cropZoom = newZoom;
        this._clampCropOffset();
    },

    updateCropZoom(val) {
        this.cropZoom = Math.max(this.cropMinZoom, Math.min(MAX_ZOOM, parseFloat(val)));
        this._clampCropOffset();
    },

    async applyCrop() {
        if (this.cropProcessing) return;
        this.cropProcessing = true;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;
            const ctx = canvas.getContext('2d');

            const previewCanvas = this._cropCanvas;
            const dpr = window.devicePixelRatio || 1;
            const pw = previewCanvas.width / dpr;
            const ph = previewCanvas.height / dpr;
            const pcx = pw / 2;
            const pcy = ph / 2;
            const r = this._cropCircleRadius;
            const img = this.cropImage;

            // Map the visible circle area to the output canvas
            const iw = img.naturalWidth * this.cropZoom;
            const ih = img.naturalHeight * this.cropZoom;
            const imgX = pcx - iw / 2 + this.cropOffsetX;
            const imgY = pcy - ih / 2 + this.cropOffsetY;

            // Circle top-left in preview coords
            const circleLeft = pcx - r;
            const circleTop = pcy - r;

            // Source rect in original image pixels
            const sx = (circleLeft - imgX) / this.cropZoom;
            const sy = (circleTop - imgY) / this.cropZoom;
            const sw = (r * 2) / this.cropZoom;
            const sh = (r * 2) / this.cropZoom;

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

            const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY));

            // Upload via existing flow
            this.avatarUploading = true;
            const url = await Supa.uploadAvatar(blob);
            this.avatarUrl = url;
            this.showToast('Profilbild gespeichert');

            this._closeCropEditor();
            if (this._cropResolve) this._cropResolve(url);
        } catch (e) {
            console.error('Avatar crop failed:', e);
            this.showToast('Profilbild konnte nicht gespeichert werden');
        } finally {
            this.cropProcessing = false;
            this.avatarUploading = false;
        }
    },

    cancelCrop() {
        this._closeCropEditor();
        if (this._cropResolve) this._cropResolve(null);
    },

    _closeCropEditor() {
        if (this._cropRafId) {
            cancelAnimationFrame(this._cropRafId);
            this._cropRafId = null;
        }
        if (this.cropImage) {
            URL.revokeObjectURL(this.cropImage.src);
            this.cropImage = null;
        }
        this.cropOpen = false;
        this._cropCanvas = null;
        this._cropCtx = null;
    }
});
