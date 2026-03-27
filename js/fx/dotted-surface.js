import * as THREE from 'three';

const AMOUNTX = 40;
const AMOUNTY = 60;
const SEPARATION = 150;

export const DottedSurface = {
  init() {
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
    const isDark = !mq.matches;

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
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(onResize)
      : { observe: () => {}, disconnect: () => {} };
    resizeObserver.observe(document.documentElement);

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
