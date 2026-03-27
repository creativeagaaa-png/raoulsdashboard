// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DottedSurface } from './dotted-surface.js';

describe('DottedSurface', () => {
  let surface;

  beforeEach(() => {
    // Mock canvas getContext to return a fake 2D context
    const fakeCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      getImageData: vi.fn().mockReturnValue({ data: [255, 255, 255, 255] }),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(fakeCtx);

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    global.ResizeObserver = vi.fn(function() {
      this.observe = vi.fn();
      this.disconnect = vi.fn();
    });

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

  it('calling destroy() twice does not throw', () => {
    surface = DottedSurface.init();
    expect(() => {
      surface.destroy();
      surface.destroy();
    }).not.toThrow();
    surface = null;
  });
});
