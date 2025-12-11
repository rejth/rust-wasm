import { drawTestImage } from './imageUtils.js';

// Browser native 2x scaling
export function browserScale2x(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = oldWidth;
  tempCanvas.height = oldHeight;
  tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

  canvas.width = oldWidth * 2;
  canvas.height = oldHeight * 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
}

export function measureTime(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

export function runBenchmark(fn, initialSize, targetSize) {
  const canvas = document.createElement('canvas');
  canvas.width = initialSize;
  canvas.height = initialSize;
  drawTestImage(canvas.getContext('2d', { willReadFrequently: true }), initialSize, initialSize);

  let totalTime = 0;
  let scales = 0;
  while (canvas.width < targetSize) {
    totalTime += measureTime(() => fn(canvas));
    scales++;
  }

  return { totalTime, scales };
}
