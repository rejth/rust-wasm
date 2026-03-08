import type { ColorLike } from './types';

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return needResize;
}

/** Parse color to RGBA Float32Array [r,g,b,a] in 0-1 range */
export function parseColorToRGBA(color: ColorLike): Float32Array {
  if (Array.isArray(color)) {
    const [r = 1, g = 1, b = 1, a = 1] = color;
    return new Float32Array([r, g, b, a]);
  }
  if (typeof color !== 'string') {
    return new Float32Array([1, 1, 1, 1]);
  }

  const hex = color.replace(/^#/, '');
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return new Float32Array([r, g, b, 1]);
  }
  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = parseInt(hex.slice(6, 8), 16) / 255;
    return new Float32Array([r, g, b, a]);
  }

  return new Float32Array([1, 1, 1, 1]);
}
