const VAPOR_DURATION = 1500;
const WAIT_DURATION = 500;

export const VaporizeText = {
  play(canvas, text, onComplete) {
    const isDark = !window.matchMedia('(prefers-color-scheme: light)').matches;
    const W = window.innerWidth;
    const H = window.innerHeight;

    canvas.width = W;
    canvas.height = H;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:20;pointer-events:none;';

    const ctx = canvas.getContext('2d');

    // Render text off-screen to sample particle positions
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const octx = offscreen.getContext('2d');

    const fontSize = W <= 375 ? 44 : 52;
    octx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    octx.fillStyle = isDark ? '#ffffff' : '#000000';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText(text, W / 2, H / 2);

    const imageData = octx.getImageData(0, 0, W, H);
    const particles = [];
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const i = (y * W + x) * 4;
        if (imageData.data[i + 3] > 128) {
          particles.push({
            x,
            y,
            vx: (Math.random() - 0.3) * 3,
            vy: (Math.random() - 0.7) * 3,
            alpha: 1,
            // Particles on the left vaporize first (left-to-right direction)
            delay: (x / W) * VAPOR_DURATION * 0.7,
          });
        }
      }
    }

    let rafId = null;
    let waitTimeoutId = null;
    let startTime = null;
    let completed = false;
    let destroyed = false;

    function render(timestamp) {
      if (destroyed) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx.clearRect(0, 0, W, H);

      let anyVisible = false;
      const color = isDark ? '#ffffff' : '#000000';

      for (const p of particles) {
        if (elapsed < p.delay) {
          // Particle not yet vaporizing — render at original position
          ctx.globalAlpha = 1;
          ctx.fillStyle = color;
          ctx.fillRect(p.x, p.y, 2, 2);
          anyVisible = true;
          continue;
        }

        const localElapsed = elapsed - p.delay;
        const progress = Math.min(localElapsed / (VAPOR_DURATION * 0.3), 1);
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = 1 - progress;

        if (p.alpha > 0.01) {
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = color;
          ctx.fillRect(p.x, p.y, 2, 2);
          anyVisible = true;
        }
      }

      ctx.globalAlpha = 1;

      // Handles empty-particle case (e.g. font not loaded) — gracefully fires onComplete
      if (!anyVisible && !completed) {
        completed = true;
        waitTimeoutId = setTimeout(() => {
          if (!destroyed) onComplete();
        }, WAIT_DURATION);
        return;
      }

      if (!completed) {
        rafId = requestAnimationFrame(render);
      }
    }

    rafId = requestAnimationFrame(render);

    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(rafId);
        clearTimeout(waitTimeoutId);
        ctx.clearRect(0, 0, W, H);
      },
    };
  },
};
