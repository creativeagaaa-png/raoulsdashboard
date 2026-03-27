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
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      configurable: true,
      writable: true,
    });

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
