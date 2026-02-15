export function compressImage(file, maxWidth = 600, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                try {
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
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas toBlob failed'));
                                return;
                            }
                            resolve(blob);
                        },
                        'image/jpeg',
                        quality
                    );
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error('Image could not be loaded'));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('File could not be read'));
        reader.readAsDataURL(file);
    });
}