import { resize } from './utils.js';
import { mandelbrot_set, mandelbrot_set_parallel, generate } from '../pkg/multi_threading.js';

export class MandelbrotSet {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    this.resize();
  }

  resize() {
    resize(this.canvas);
  }

  generatePalette(maxIterations) {
    const palette = [];

    for (let i = 0; i < maxIterations; i++) {
      const h = Math.random() * 360;
      const s = 0.5;
      const l = 0.6;

      const [r, g, b] = this.hslToRgb(h, s, l);
      palette.push([r, g, b, 255]);
    }

    return palette;
  }

  hslToRgb(h, s, l) {
    h /= 360;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  mandelbrotEscape(cx, cy, maxIterations) {
    let x = 0;
    let y = 0;
    let iterations = 0;

    while (iterations < maxIterations) {
      const x2 = x * x - y * y + cx;
      const y2 = 2 * x * y + cy;
      x = x2;
      y = y2;

      if (x * x + y * y > 4) {
        break;
      }
      iterations++;
    }

    return iterations;
  }

  draw(maxIterations) {
    console.time('mandelbrot_js_single_thread');

    const width = this.canvas.width;
    const height = this.canvas.height;
    const img = this.ctx.createImageData(width, height);
    const data = img.data;

    const centerX = -0.75;
    const centerY = 0.0;
    const scale = 3.2; // smaller => more zoomed in

    const aspect = width / height;
    const halfWidth = (scale * aspect) / 2;
    const halfHeight = scale / 2;

    const palette = this.generatePalette(maxIterations);

    // Pre-compute constants for the inner loop
    const heightMinus1 = height - 1;
    const widthMinus1 = width - 1;
    const doubleHalfHeight = 2 * halfHeight;
    const doubleHalfWidth = 2 * halfWidth;

    for (let py = 0; py < height; py++) {
      const cy = centerY + (py / heightMinus1) * doubleHalfHeight - halfHeight;
      let p = py * width * 4;

      for (let px = 0; px < width; px++) {
        const cx = centerX + (px / widthMinus1) * doubleHalfWidth - halfWidth;

        const iterations = this.mandelbrotEscape(cx, cy, maxIterations);

        if (iterations === maxIterations) {
          data[p] = 0;
          data[p + 1] = 0;
          data[p + 2] = 0;
          data[p + 3] = 255;
        } else {
          // Cache color lookup to avoid multiple array accesses
          const color = palette[iterations];
          data[p] = color[0];
          data[p + 1] = color[1];
          data[p + 2] = color[2];
          data[p + 3] = 255;
        }
        p += 4;
      }
    }

    console.timeEnd('mandelbrot_js_single_thread');

    this.ctx.putImageData(img, 0, 0);
  }

  drawWithWasm(maxIterations) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    console.time('mandelbrot_wasm_single_thread');
    const bytes = mandelbrot_set(width, height, maxIterations);
    console.timeEnd('mandelbrot_wasm_single_thread');

    this.ctx.putImageData(new ImageData(bytes, width, height), 0, 0);
  }

  drawWithWasmParallel(maxIterations) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    console.time('mandelbrot_wasm_parallel');
    const bytes = mandelbrot_set_parallel(width, height, maxIterations);
    console.timeEnd('mandelbrot_wasm_parallel');

    this.ctx.putImageData(new ImageData(bytes, width, height), 0, 0);
  }
}
