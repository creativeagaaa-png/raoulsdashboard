const SQUARE_SIZE = 4;
const GRID_GAP = 6;
const FLICKER_CHANCE = 0.3;
const MAX_OPACITY = 0.3;

function toRGBA(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d');
  if (!ctx) return 'rgba(0,0,0,';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r},${g},${b},`;
}

export const DottedSurface = {
  init() {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const isDark = !mq.matches;

    let colorBase = toRGBA(isDark ? 'rgb(255,255,255)' : 'rgb(0,0,0)');

    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-dotted-surface', '');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return { destroy() { canvas.remove(); } };

    let cols = 0;
    let rows = 0;
    let squares = new Float32Array(0);
    let dpr = window.devicePixelRatio || 1;
    let destroyed = false;
    let rafId = null;

    function setupGrid() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      cols = Math.ceil(w / (SQUARE_SIZE + GRID_GAP));
      rows = Math.ceil(h / (SQUARE_SIZE + GRID_GAP));
      squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * MAX_OPACITY;
      }
    }

    function updateSquares(dt) {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < FLICKER_CHANCE * dt) {
          squares[i] = Math.random() * MAX_OPACITY;
        }
      }
    }

    function drawGrid() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const opacity = squares[i * rows + j];
          ctx.fillStyle = `${colorBase}${opacity})`;
          ctx.fillRect(
            i * (SQUARE_SIZE + GRID_GAP) * dpr,
            j * (SQUARE_SIZE + GRID_GAP) * dpr,
            SQUARE_SIZE * dpr,
            SQUARE_SIZE * dpr
          );
        }
      }
    }

    setupGrid();

    let lastTime = 0;
    function animate(time) {
      if (destroyed) return;
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;

      const dt = lastTime ? (time - lastTime) / 1000 : 0.016;
      lastTime = time;

      updateSquares(dt);
      drawGrid();
    }

    rafId = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(setupGrid);
    resizeObserver.observe(document.documentElement);

    function onTheme(e) {
      colorBase = toRGBA(e.matches ? 'rgb(0,0,0)' : 'rgb(255,255,255)');
    }
    mq.addEventListener('change', onTheme);

    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        mq.removeEventListener('change', onTheme);
        canvas.remove();
      },
    };
  },
};
