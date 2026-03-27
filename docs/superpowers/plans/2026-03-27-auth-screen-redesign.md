# Auth-Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the TrAction login/registration screen with a premium wordmark, Three.js animated dot-wave background, and a canvas-based vaporize animation that plays after successful authentication.

**Architecture:** Two isolated Vanilla JS modules (`js/fx/dotted-surface.js`, `js/fx/vaporize-text.js`) with clean `init/destroy` APIs are imported into `main.js` and wired into the Alpine.js data object. A new `authAnimationPending` state flag delays `loadAppData()` until the vaporize animation completes. The auth.html template is fully redesigned while keeping all Alpine bindings and Supabase logic intact.

**Tech Stack:** Alpine.js 3.15.8, Three.js (new), Canvas API (native), Vitest, Vite, Tailwind CSS 4, Plus Jakarta Sans (already loaded)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `js/fx/dotted-surface.js` | Three.js dot-wave — `DottedSurface.init()` / `destroy()` |
| Create | `js/fx/dotted-surface.test.js` | Unit tests for DottedSurface API |
| Create | `js/fx/vaporize-text.js` | Canvas vaporize — `VaporizeText.play(canvas, text, onComplete)` |
| Create | `js/fx/vaporize-text.test.js` | Unit tests for VaporizeText API |
| Modify | `js/main.js` | Add imports, state flags, lifecycle methods, animation hook, mock mode |
| Modify | `templates/modals/auth.html` | Full HTML redesign — wordmark, canvas refs, x-init watcher |
| Modify | `css/styles.css` | Auth card styles, wordmark styles, responsive, light mode |
| Modify | `package.json` | Add `three` dependency |

---

## Task 1: Install Three.js

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Three.js**

```bash
cd /Users/raoulagachi/Codes/AGAsDashboard
npm install three
```

Expected output: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Verify install**

```bash
node -e "import('three').then(m => console.log('Three.js OK:', Object.keys(m).length, 'exports'))"
```

Expected: `Three.js OK: [number] exports`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: Three.js als Dependency hinzugefügt"
```

---

## Task 2: DottedSurface Module (TDD)

**Files:**
- Create: `js/fx/dotted-surface.test.js`
- Create: `js/fx/dotted-surface.js`

- [ ] **Step 1: Create the test file**

Create `js/fx/dotted-surface.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Three.js — WebGL is not available in jsdom
const mockMaterial = {
  color: { setHex: vi.fn() },
  opacity: 0.15,
  dispose: vi.fn(),
};
const mockPositions = new Float32Array(40 * 60 * 3);
const mockGeometry = {
  setAttribute: vi.fn(),
  attributes: { position: { array: mockPositions, needsUpdate: false } },
  dispose: vi.fn(),
};
const mockRenderer = {
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
};
const mockScene = { add: vi.fn() };
const mockCamera = {
  position: { set: vi.fn() },
  lookAt: vi.fn(),
  aspect: 1,
  updateProjectionMatrix: vi.fn(),
};
const mockPoints = { geometry: mockGeometry };

vi.mock('three', () => ({
  WebGLRenderer: vi.fn(() => mockRenderer),
  Scene: vi.fn(() => mockScene),
  PerspectiveCamera: vi.fn(() => mockCamera),
  BufferGeometry: vi.fn(() => mockGeometry),
  BufferAttribute: vi.fn((arr, itemSize) => ({ array: arr, itemSize })),
  PointsMaterial: vi.fn(() => mockMaterial),
  Points: vi.fn(() => mockPoints),
}));

import { DottedSurface } from './dotted-surface.js';

describe('DottedSurface', () => {
  let surface;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      setTimeout(cb, 16);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(vi.fn());
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
  });

  afterEach(() => {
    if (surface) surface.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
    // clean up any appended canvas elements
    document.querySelectorAll('canvas[data-dotted-surface]').forEach(el => el.remove());
  });

  it('init() returns an object with a destroy() method', () => {
    surface = DottedSurface.init();
    expect(surface).toBeDefined();
    expect(typeof surface.destroy).toBe('function');
  });

  it('init() appends a canvas to document.body', () => {
    surface = DottedSurface.init();
    const canvas = document.querySelector('canvas[data-dotted-surface]');
    expect(canvas).not.toBeNull();
  });

  it('init() sets canvas to fixed full-screen positioning', () => {
    surface = DottedSurface.init();
    const canvas = document.querySelector('canvas[data-dotted-surface]');
    expect(canvas.style.position).toBe('fixed');
    expect(canvas.style.pointerEvents).toBe('none');
    expect(canvas.style.zIndex).toBe('0');
  });

  it('destroy() calls cancelAnimationFrame', () => {
    surface = DottedSurface.init();
    surface.destroy();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    surface = null;
  });

  it('destroy() removes the canvas from the DOM', () => {
    surface = DottedSurface.init();
    surface.destroy();
    surface = null;
    const canvas = document.querySelector('canvas[data-dotted-surface]');
    expect(canvas).toBeNull();
  });

  it('destroy() calls renderer.dispose() and geometry.dispose()', () => {
    surface = DottedSurface.init();
    surface.destroy();
    surface = null;
    expect(mockRenderer.dispose).toHaveBeenCalled();
    expect(mockGeometry.dispose).toHaveBeenCalled();
    expect(mockMaterial.dispose).toHaveBeenCalled();
  });

  it('calling destroy() twice does not throw', () => {
    surface = DottedSurface.init();
    expect(() => {
      surface.destroy();
      surface.destroy();
    }).not.toThrow();
    surface = null;
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
npm test -- js/fx/dotted-surface.test.js
```

Expected: FAIL — `Cannot find module './dotted-surface.js'`

- [ ] **Step 3: Create `js/fx/dotted-surface.js`**

```bash
mkdir -p /Users/raoulagachi/Codes/AGAsDashboard/js/fx
```

Create `js/fx/dotted-surface.js`:

```js
import * as THREE from 'three';

const AMOUNTX = 40;
const AMOUNTY = 60;
const SEPARATION = 150;

export const DottedSurface = {
  init() {
    const isDark = !window.matchMedia('(prefers-color-scheme: light)').matches;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-dotted-surface', '');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;width:100%;height:100%;';
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    camera.position.set(0, 800, 0);
    camera.lookAt(0, 0, 0);

    const numParticles = AMOUNTX * AMOUNTY;
    const positions = new Float32Array(numParticles * 3);
    let idx = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[idx]     = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        positions[idx + 1] = 0;
        positions[idx + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
        idx += 3;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 4,
      color: isDark ? 0xffffff : 0x000000,
      transparent: true,
      opacity: isDark ? 0.15 : 0.1,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let count = 0;
    let rafId = null;
    let destroyed = false;

    function animate() {
      if (destroyed) return;
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;

      const pos = particles.geometry.attributes.position.array;
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          pos[i + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;
          i += 3;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      count += 0.05;
      renderer.render(scene, camera);
    }

    animate();

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(document.documentElement);

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    function onTheme(e) {
      material.color.setHex(e.matches ? 0x000000 : 0xffffff);
      material.opacity = e.matches ? 0.1 : 0.15;
    }
    mq.addEventListener('change', onTheme);

    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        mq.removeEventListener('change', onTheme);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        canvas.remove();
      },
    };
  },
};
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
npm test -- js/fx/dotted-surface.test.js
```

Expected: All tests PASS — `7 passed`

- [ ] **Step 5: Commit**

```bash
git add js/fx/dotted-surface.js js/fx/dotted-surface.test.js
git commit -m "feat: DottedSurface Three.js Modul mit Tests"
```

---

## Task 3: VaporizeText Module (TDD)

**Files:**
- Create: `js/fx/vaporize-text.test.js`
- Create: `js/fx/vaporize-text.js`

- [ ] **Step 1: Create the test file**

Create `js/fx/vaporize-text.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VaporizeText } from './vaporize-text.js';

function makeMockCanvas() {
  const mockCtx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    fillText: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: (() => {
        // Simulate a few lit pixels in the center so particles are created
        const data = new Uint8ClampedArray(100 * 100 * 4);
        // Set some pixels as "white text" (alpha > 128)
        for (let i = 0; i < 20; i++) {
          data[i * 4 + 3] = 255;
        }
        return data;
      })(),
    })),
  };
  const canvas = {
    width: 100,
    height: 100,
    style: { cssText: '' },
    getContext: vi.fn(() => mockCtx),
  };
  return { canvas, mockCtx };
}

describe('VaporizeText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      setTimeout(cb, 16);
      return Math.floor(Math.random() * 1000);
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(vi.fn());
    Object.defineProperty(window, 'innerWidth', { value: 100, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 100, configurable: true });

    // Mock createElement so offscreen canvas also returns a mock ctx
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        return {
          width: 100,
          height: 100,
          style: { cssText: '' },
          getContext: vi.fn(() => ({
            fillStyle: '',
            font: '',
            textAlign: '',
            textBaseline: '',
            globalAlpha: 1,
            fillText: vi.fn(),
            fillRect: vi.fn(),
            clearRect: vi.fn(),
            getImageData: vi.fn(() => ({
              data: (() => {
                const d = new Uint8ClampedArray(100 * 100 * 4);
                for (let i = 0; i < 20; i++) d[i * 4 + 3] = 255;
                return d;
              })(),
            })),
          })),
        };
      }
      return origCreate(tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('play() calls onComplete after vaporizeDuration + waitDuration', async () => {
    const { canvas } = makeMockCanvas();
    const onComplete = vi.fn();

    VaporizeText.play(canvas, 'TrAction', onComplete);

    // Advance past vaporize (1500ms) + wait (500ms) = 2000ms
    await vi.advanceTimersByTimeAsync(2100);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('play() returns an object with a destroy() method', () => {
    const { canvas } = makeMockCanvas();
    const result = VaporizeText.play(canvas, 'TrAction', vi.fn());
    expect(result).toBeDefined();
    expect(typeof result.destroy).toBe('function');
  });

  it('destroy() cancels the animation frame', () => {
    const { canvas } = makeMockCanvas();
    const result = VaporizeText.play(canvas, 'TrAction', vi.fn());
    result.destroy();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('destroy() clears the canvas', () => {
    const { canvas, mockCtx } = makeMockCanvas();
    const result = VaporizeText.play(canvas, 'TrAction', vi.fn());
    result.destroy();
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
  });

  it('onComplete is not called more than once even if called redundantly', async () => {
    const { canvas } = makeMockCanvas();
    const onComplete = vi.fn();
    VaporizeText.play(canvas, 'TrAction', onComplete);
    await vi.advanceTimersByTimeAsync(5000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
npm test -- js/fx/vaporize-text.test.js
```

Expected: FAIL — `Cannot find module './vaporize-text.js'`

- [ ] **Step 3: Create `js/fx/vaporize-text.js`**

Create `js/fx/vaporize-text.js`:

```js
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

      if (!anyVisible && !completed) {
        completed = true;
        setTimeout(() => {
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
        ctx.clearRect(0, 0, W, H);
      },
    };
  },
};
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
npm test -- js/fx/vaporize-text.test.js
```

Expected: All tests PASS — `5 passed`

- [ ] **Step 5: Run all tests to ensure nothing broke**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/fx/vaporize-text.js js/fx/vaporize-text.test.js
git commit -m "feat: VaporizeText Canvas-Animations-Modul mit Tests"
```

---

## Task 4: main.js — State, Lifecycle und Mock-Mode

**Files:**
- Modify: `js/main.js` (lines 31–32, 77–86, 318–360, 589–603)

- [ ] **Step 1: Add imports at top of main.js (after existing imports, before line 34)**

In `js/main.js`, after line 32 (`import onboardingModal from ...`), add:

```js
import { DottedSurface } from './fx/dotted-surface.js';
import { VaporizeText } from './fx/vaporize-text.js';
```

- [ ] **Step 2: Add new state flags to Alpine data (after line 86 `authSuccess: ''`)**

In `js/main.js`, after `authSuccess: '',` (line 86), add:

```js
authAnimationPending: false,
dottedSurface: null,
```

- [ ] **Step 3: Add lifecycle and animation methods**

In `js/main.js`, find `handleLogout()` (line 389) and add these three methods **before** it:

```js
initDottedSurface() {
    if (this.dottedSurface) return;
    this.dottedSurface = DottedSurface.init();
},

destroyDottedSurface() {
    if (this.dottedSurface) {
        this.dottedSurface.destroy();
        this.dottedSurface = null;
    }
},

triggerVaporizeAnimation(canvas) {
    VaporizeText.play(canvas, 'TrAction', () => {
        this.authAnimationPending = false;
        this.loadAppData();
    });
},
```

- [ ] **Step 4: Wire DottedSurface to authUser lifecycle in initApp()**

In `js/main.js`, find `initApp()`. After `this.authReady = true;` (line 586), add:

```js
// DottedSurface: start when auth screen is visible, stop when user logs in
this.$watch('authUser', (newUser) => {
    if (!newUser) {
        this.$nextTick(() => this.initDottedSurface());
    } else {
        this.destroyDottedSurface();
    }
});
if (!this.authUser) {
    this.$nextTick(() => this.initDottedSurface());
}
```

- [ ] **Step 5: Intercept loadAppData() in onAuthStateChange**

In `js/main.js`, in `onAuthStateChange` callback (line 597), replace:

```js
this.loadAppData();
```

with:

```js
this.authAnimationPending = true;
```

The surrounding context should now look like:

```js
if (!wasLoggedIn && this.authUser) {
    this.authEmail = '';
    this.authPassword = '';
    this.authError = '';
    this.authAnimationPending = true;  // ← changed
}
```

- [ ] **Step 6: Add mock mode to handleLogin()**

In `js/main.js`, in `handleLogin()` (line 318), replace the try block:

```js
// Before (line 326-334):
this.authLoading = true;
try {
    await Supa.signIn(this.authEmail, this.authPassword);
} catch (e) {
    this.authError = e.message === 'Invalid login credentials'
        ? 'E-Mail oder Passwort falsch.'
        : (e.message || 'Anmeldung fehlgeschlagen.');
} finally {
    this.authLoading = false;
}
```

Replace with:

```js
this.authLoading = true;
const isMock = import.meta.env.DEV && new URLSearchParams(location.search).has('dev');
const isErrorMock = isMock && new URLSearchParams(location.search).has('error');
try {
    if (isMock) {
        await new Promise(r => setTimeout(r, 800));
        if (isErrorMock) throw new Error('Mock-Fehler: Ungültige Zugangsdaten.');
        this.authAnimationPending = true;
        return;
    }
    await Supa.signIn(this.authEmail, this.authPassword);
} catch (e) {
    this.authError = e.message === 'Invalid login credentials'
        ? 'E-Mail oder Passwort falsch.'
        : (e.message || 'Anmeldung fehlgeschlagen.');
} finally {
    this.authLoading = false;
}
```

- [ ] **Step 7: Add mock mode to handleRegister()**

In `js/main.js`, in `handleRegister()` (line 348), replace:

```js
this.authLoading = true;
try {
    const data = await Supa.signUp(this.authEmail, this.authPassword);
    if (data.user && !data.session) {
        this.authSuccess = 'Registrierung erfolgreich! Bitte bestätige deine E-Mail.';
        this.authMode = 'login';
    }
} catch (e) {
    this.authError = e.message || 'Registrierung fehlgeschlagen.';
} finally {
    this.authLoading = false;
}
```

Replace with:

```js
this.authLoading = true;
const isMock = import.meta.env.DEV && new URLSearchParams(location.search).has('dev');
const isErrorMock = isMock && new URLSearchParams(location.search).has('error');
try {
    if (isMock) {
        await new Promise(r => setTimeout(r, 800));
        if (isErrorMock) throw new Error('Mock-Fehler: Registrierung fehlgeschlagen.');
        this.authAnimationPending = true;
        return;
    }
    const data = await Supa.signUp(this.authEmail, this.authPassword);
    if (data.user && !data.session) {
        this.authSuccess = 'Registrierung erfolgreich! Bitte bestätige deine E-Mail.';
        this.authMode = 'login';
    }
} catch (e) {
    this.authError = e.message || 'Registrierung fehlgeschlagen.';
} finally {
    this.authLoading = false;
}
```

- [ ] **Step 8: Run all tests**

```bash
npm test
```

Expected: All tests PASS (main.js changes don't affect existing tests)

- [ ] **Step 9: Commit**

```bash
git add js/main.js
git commit -m "feat: Auth-Animation-Hooks und Dev-Mock-Mode in main.js"
```

---

## Task 5: auth.html Redesign

**Files:**
- Modify: `templates/modals/auth.html`

- [ ] **Step 1: Replace entire auth.html**

Replace the entire content of `templates/modals/auth.html` with:

```html
<!-- Auth Screen -->
<div class="auth-screen"
     x-show="!authReady || !authUser || authAnimationPending"
     x-cloak
     x-init="
       $watch('authAnimationPending', function(pending) {
         if (pending) triggerVaporizeAnimation($refs.vaporizeCanvas);
       })
     ">

    <!-- Layer 0: Dotted Surface background (managed by initDottedSurface in main.js) -->

    <!-- Layer 1: Auth Glass-Card -->
    <div class="auth-card-wrapper">
        <div class="auth-card">

            <!-- Wordmark -->
            <div class="auth-wordmark">
                <h1 class="auth-wordmark__title">
                    <span class="auth-wordmark__tr">Tr</span><span class="auth-wordmark__action">Action</span>
                </h1>
                <div class="auth-wordmark__divider"></div>
                <p class="auth-wordmark__tagline">TRAIN · TRACK · ACT</p>
            </div>

            <!-- Tab Toggle -->
            <div class="flex gap-1 bg-white/5 rounded-xl p-1">
                <button @click="authMode = 'login'"
                        class="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                        :class="authMode === 'login' ? 'bg-white/10 text-white' : 'text-muted'">
                    Anmelden
                </button>
                <button @click="authMode = 'register'"
                        class="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                        :class="authMode === 'register' ? 'bg-white/10 text-white' : 'text-muted'">
                    Registrieren
                </button>
            </div>

            <!-- Error Message -->
            <div x-show="authError" x-cloak
                 class="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-xs text-rose-400">
                <span x-text="authError"></span>
            </div>

            <!-- Success Message -->
            <div x-show="authSuccess" x-cloak
                 class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs text-emerald-400">
                <span x-text="authSuccess"></span>
            </div>

            <!-- Email -->
            <div>
                <label class="text-[10px] text-muted font-bold uppercase tracking-widest ml-1">E-Mail</label>
                <div class="mt-1 bg-black/20 rounded-xl px-4 py-3 flex items-center gap-3 border border-white/5 focus-within:border-white/20 transition-all">
                    <i class="ph ph-envelope text-muted"></i>
                    <input type="email" x-model="authEmail"
                           @keydown.enter="authMode === 'login' ? handleLogin() : handleRegister()"
                           class="bg-transparent border-none focus:outline-none text-white w-full text-sm"
                           placeholder="deine@email.de"
                           autocomplete="email">
                </div>
            </div>

            <!-- Password -->
            <div>
                <label class="text-[10px] text-muted font-bold uppercase tracking-widest ml-1">Passwort</label>
                <div class="mt-1 bg-black/20 rounded-xl px-4 py-3 flex items-center gap-3 border border-white/5 focus-within:border-white/20 transition-all">
                    <i class="ph ph-lock text-muted"></i>
                    <input :type="authShowPassword ? 'text' : 'password'" x-model="authPassword"
                           @keydown.enter="authMode === 'login' ? handleLogin() : handleRegister()"
                           class="bg-transparent border-none focus:outline-none text-white w-full text-sm"
                           placeholder="••••••••"
                           :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'">
                    <button @click="authShowPassword = !authShowPassword" class="text-muted hover:text-white transition-colors" type="button">
                        <i class="ph text-sm" :class="authShowPassword ? 'ph-eye-slash' : 'ph-eye'"></i>
                    </button>
                </div>
                <p x-show="authMode === 'register'" class="text-[10px] text-muted mt-1 ml-1">Mindestens 6 Zeichen</p>
            </div>

            <!-- Submit Button -->
            <button @click="authMode === 'login' ? handleLogin() : handleRegister()"
                    :disabled="authLoading"
                    class="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <i x-show="authLoading" class="ph ph-spinner animate-spin text-sm"></i>
                <span x-text="authLoading ? 'Laden...' : (authMode === 'login' ? 'Anmelden' : 'Registrieren')"></span>
            </button>

            <!-- Forgot Password -->
            <div x-show="authMode === 'login'" class="text-center">
                <button @click="handleResetPassword()" class="text-[11px] text-muted hover:text-white transition-colors">
                    Passwort vergessen?
                </button>
            </div>

            <!-- Social Login -->
            <div class="flex items-center gap-3 pt-1">
                <div class="flex-1 h-px bg-white/10"></div>
                <span class="text-[10px] text-muted font-bold uppercase tracking-widest">oder</span>
                <div class="flex-1 h-px bg-white/10"></div>
            </div>

            <div class="space-y-2.5">
                <button @click="handleSocialLogin('google')"
                        :disabled="authLoading"
                        class="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Mit Google fortfahren
                </button>
            </div>

        </div>
    </div>

    <!-- Layer 2: Vaporize canvas (active only during auth animation) -->
    <canvas x-ref="vaporizeCanvas"
            x-show="authAnimationPending"
            style="position:fixed;inset:0;z-index:20;pointer-events:none;"
            aria-hidden="true"></canvas>

</div>
```

- [ ] **Step 2: Start the dev server and verify the auth screen renders**

```bash
npm run dev
```

Open `http://localhost:5173` in browser. Expected: Auth screen visible, existing form layout intact (wordmark styled via next task's CSS).

- [ ] **Step 3: Commit**

```bash
git add templates/modals/auth.html
git commit -m "feat: auth.html Redesign — Wordmark, Glass-Card, Canvas-Refs"
```

---

## Task 6: CSS Styles

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Add auth screen styles to css/styles.css**

Append the following to the end of `css/styles.css`:

```css
/* ========================================
   AUTH SCREEN
   ======================================== */

.auth-screen {
    position: fixed;
    inset: 0;
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: var(--bg);
}

/* Glass Card Wrapper */
.auth-card-wrapper {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 360px;
}

/* Glass Card */
.auth-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

@media (min-width: 376px) {
    .auth-card {
        padding: 28px 24px;
    }
}

@media (min-width: 481px) {
    .auth-card {
        padding: 32px 28px;
    }
}

/* Light mode card */
@media (prefers-color-scheme: light) {
    .auth-screen {
        background: var(--bg);
    }
    .auth-card {
        background: rgba(0, 0, 0, 0.03);
        border-color: rgba(0, 0, 0, 0.08);
    }
}

/* ========================================
   WORDMARK
   ======================================== */

.auth-wordmark {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding-bottom: 4px;
}

.auth-wordmark__title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 44px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -2px;
    margin: 0;
}

@media (min-width: 376px) {
    .auth-wordmark__title {
        font-size: 52px;
    }
}

.auth-wordmark__tr {
    color: #555;
}

.auth-wordmark__action {
    color: #ffffff;
}

/* Light mode wordmark */
@media (prefers-color-scheme: light) {
    .auth-wordmark__tr {
        color: #aaa;
    }
    .auth-wordmark__action {
        color: #1a1a1a;
    }
}

.auth-wordmark__divider {
    width: 200px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
}

@media (prefers-color-scheme: light) {
    .auth-wordmark__divider {
        background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.15), transparent);
    }
}

.auth-wordmark__tagline {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: #4a4a4a;
    margin: 0;
}

@media (prefers-color-scheme: light) {
    .auth-wordmark__tagline {
        color: #999;
    }
}
```

- [ ] **Step 2: Check in browser at `http://localhost:5173`**

Expected:
- Auth screen full-screen with dark background
- TrAction wordmark: "Tr" in gray (#555), "Action" in white (#fff)
- Gradient divider line below wordmark
- "TRAIN · TRACK · ACT" tagline below divider
- Glass card visible with all form elements

- [ ] **Step 3: Check light mode**

In Chrome DevTools → Rendering → "Emulate CSS media feature prefers-color-scheme: light"

Expected: "Tr" becomes #aaa, "Action" becomes #1a1a1a (dark), tagline and divider adapt.

- [ ] **Step 4: Check mobile viewport (375px)**

In Chrome DevTools → set viewport to 375×667.

Expected: wordmark at 44px, card padding 20px 16px, no horizontal overflow.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css
git commit -m "feat: Auth-Screen CSS — Wordmark, Glass-Card, Responsive, Light Mode"
```

---

## Task 7: End-to-End Verification with Mock Mode

**Files:** None — manual browser testing only

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test Szenario 1 — DottedSurface + erfolgreicher Login**

Open `http://localhost:5173/?dev=true`

Expected:
- Auth screen visible
- Three.js dot-wave animates in the background (dots moving in sine-wave pattern, low opacity)
- Form is usable (dots don't block clicks — pointer-events: none)
- Enter any email + password, click "Anmelden"
- Loading spinner appears for ~800ms
- Vaporize animation plays: "TrAction" wordmark particles dissolve left-to-right over ~1.5s
- Brief pause (~0.5s)
- App loading screen appears (existing TrAction spinner)
- Loading screen disappears → Dashboard renders (with empty/mock data — this is expected)

- [ ] **Step 3: Test Szenario 2 — Fehler-State**

Open `http://localhost:5173/?dev=true&error=true`

Expected:
- Auth screen renders normally with DottedSurface
- Enter any email + password, click "Anmelden"
- Loading spinner for ~800ms
- Error message appears: "Mock-Fehler: Ungültige Zugangsdaten."
- No vaporize animation triggers
- DottedSurface continues running in background

- [ ] **Step 4: Test Szenario 3 — Mobile (375px)**

Open DevTools → set viewport to 375×667, then `http://localhost:5173/?dev=true`

Expected:
- No horizontal scroll
- Wordmark at 44px, readable
- Form fields and buttons full width and tappable
- Vaporize animation works at this viewport size

- [ ] **Step 5: Test Szenario 4 — Light Mode**

In DevTools → Rendering → prefers-color-scheme: light, then `http://localhost:5173/?dev=true`

Expected:
- DottedSurface dots are dark (not white) at lower opacity
- Wordmark "Tr" = #aaa, "Action" = #1a1a1a
- Vaporize animation uses dark particles

- [ ] **Step 6: Test Logout / re-login cycle**

After Szenario 1 completes and dashboard is visible, trigger logout if the mock-mode allows re-auth (the dashboard will be empty but functional).

Expected:
- Auth screen reappears
- DottedSurface re-initializes and runs again
- No console errors about "renderer already disposed" or WebGL context loss

- [ ] **Step 7: Check browser console for errors**

Open DevTools Console during all scenarios.

Expected: Zero errors. Warnings from Three.js about missing WebGL extensions are acceptable (these are non-fatal in some environments).

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: Auth-Screen Redesign vollständig implementiert

- DottedSurface Three.js Dot-Wave Hintergrund
- TrAction Wordmark (Plus Jakarta Sans 800, Split Contrast)
- VaporizeText Animation nach Auth-Success
- Dev Mock Mode (?dev=true) für Tests ohne Supabase
- Responsive Mobile-First, Light/Dark Mode"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Wordmark: Plus Jakarta Sans 800, 52px, Split Contrast, Divider, Tagline → Task 5 + 6
- [x] DottedSurface: Three.js, ~40×60 grid, pointer-events: none, dark/light → Task 2 + 4 + 6
- [x] VaporizeText: Canvas, left→right, 1500ms + 500ms, onComplete → loadAppData → Task 3 + 4
- [x] Isolated to auth.html + 2 new modules → Tasks 2, 3, 4, 5, 6
- [x] main.js minimal change: onAuthStateChange line 597 only → Task 4 Step 5
- [x] Mock mode: ?dev=true + ?dev=true&error=true → Task 4 Steps 6–7
- [x] Responsive: 375px / 376–480px / 481px+ → Task 6
- [x] Light mode → Task 6
- [x] Cleanup: cancelAnimationFrame + renderer.dispose() → DottedSurface.destroy(), VaporizeText.destroy() → Task 2 + 3
- [x] Auth logic untouched: handleLogin, handleRegister, handleSocialLogin, handleResetPassword → Task 4 (only adds mock guard + animationPending flag)

**All code provided:** Yes — no TBD, no placeholders, complete implementations in every step.

**Type consistency:**
- `DottedSurface.init()` returns `{ destroy() }` — used consistently across Task 2 and Task 4
- `VaporizeText.play(canvas, text, onComplete)` returns `{ destroy() }` — used consistently across Task 3 and Task 4
- `authAnimationPending: false` added in Task 4 Step 2, referenced in Task 5 (`x-show`, `x-init $watch`) and Task 4 Steps 5–7
- `dottedSurface: null` added in Task 4 Step 2, used in `initDottedSurface` / `destroyDottedSurface` in Task 4 Step 3
