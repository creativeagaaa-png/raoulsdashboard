export function compressImage(file, maxWidth = 600, quality = 0.7) {
    return new Promise((resolve, reject) => {
        // Create object URL instead of base64 data URL (more memory-efficient for large files)
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            // Limit total pixel count for iOS canvas limits
            const maxPixels = 4096 * 4096;
            if (w * h > maxPixels) {
                const scale = Math.sqrt(maxPixels / (w * h));
                w = Math.floor(w * scale);
                h = Math.floor(h * scale);
            }
            if (w > maxWidth) {
                h = Math.round(h * (maxWidth / w));
                w = maxWidth;
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image could not be loaded'));
        };
        img.src = url;
    });
}