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
  WebGLRenderer: vi.fn(function() { return mockRenderer; }),
  Scene: vi.fn(function() { return mockScene; }),
  PerspectiveCamera: vi.fn(function() { return mockCamera; }),
  BufferGeometry: vi.fn(function() { return mockGeometry; }),
  BufferAttribute: vi.fn(function(arr, itemSize) { return { array: arr, itemSize }; }),
  PointsMaterial: vi.fn(function() { return mockMaterial; }),
  Points: vi.fn(function() { return mockPoints; }),
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
