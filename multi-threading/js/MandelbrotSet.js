import { resize } from './utils.js';
import { mandelbrot_set, mandelbrot_set_parallel } from '../pkg/multi_threading.js';

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

  draw() {
    console.time('mandelbrot_single_threaded_js');

    const width = this.canvas.width;
    const height = this.canvas.height;
    const img = this.ctx.createImageData(width, height);
    const data = img.data;

    // View window in the complex plane (classic starting view)
    // real in [-2.5, 1], imag in [-1, 1] adjusted by aspect
    const centerX = -0.75;
    const centerY = 0.0;
    const scale = 3.2; // smaller => more zoomed in

    const aspect = width / height;
    const halfWidth = (scale * aspect) / 2;
    const halfHeight = scale / 2;

    const maxIterations = 500;
    const palette = this.generatePalette(maxIterations);

    let p = 0;
    for (let py = 0; py < height; py++) {
      const cy = centerY + (py / (height - 1)) * (2 * halfHeight) - halfHeight;

      for (let px = 0; px < width; px++) {
        const cx = centerX + (px / (width - 1)) * (2 * halfWidth) - halfWidth;

        const iterations = this.mandelbrotEscape(cx, cy, maxIterations);

        /**
         * A coloring rule based on how fast it “escapes” (gets large).
         * Simple rule: Inside -> black; Outside -> gradient by escape iterations.
         */
        if (iterations === maxIterations) {
          data[p++] = 0;
          data[p++] = 0;
          data[p++] = 0;
          data[p++] = 255;
        } else {
          // Smooth-ish grayscale (quick and decent)
          data[p++] = palette[iterations][0];
          data[p++] = palette[iterations][1];
          data[p++] = palette[iterations][2];
          data[p++] = 255;
        }
      }
    }
    console.timeEnd('mandelbrot_single_threaded_js');

    this.ctx.putImageData(img, 0, 0);
  }

  drawWithWasm() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    console.time('mandelbrot_single_threaded_wasm');
    const bytes = mandelbrot_set(width, height);
    console.timeEnd('mandelbrot_single_threaded_wasm');

    const data = new Uint8ClampedArray(bytes);
    this.ctx.putImageData(new ImageData(data, width, height), 0, 0);
  }

  drawWithWasmParallel() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    console.time('mandelbrot_parallel_wasm');
    const bytes = mandelbrot_set_parallel(width, height, 500);
    console.timeEnd('mandelbrot_parallel_wasm');

    const data = new Uint8ClampedArray(bytes);
    this.ctx.putImageData(new ImageData(data, width, height), 0, 0);
  }
}
