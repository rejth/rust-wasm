// Image generation utilities

// Draw test pattern on canvas (for benchmarks)
export function drawTestImage(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#e94560');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height * 0.15);
  ctx.lineTo(width * 0.85, height * 0.7);
  ctx.lineTo(width * 0.15, height * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.85, width * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${width * 0.08}px Arial`;
  ctx.fillText('WASM', width * 0.05, height * 0.95);
}

// Create a tiny "icon" with sharp edges
export function createTinyIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  // White geometric shapes - triangle
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.15);
  ctx.lineTo(size * 0.85, size * 0.7);
  ctx.lineTo(size * 0.15, size * 0.7);
  ctx.closePath();
  ctx.fill();

  // Small circle
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.85, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  return canvas.transferToImageBitmap();
}

// Create pixel art style image (8x8 smiley face)
export function createPixelArt(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const pixels = [
    '00111100',
    '01000010',
    '10100101',
    '10000001',
    '10100101',
    '10011001',
    '01000010',
    '00111100',
  ];

  const cellSize = size / 8;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#FFD700';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (pixels[y][x] === '1') {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  return canvas.transferToImageBitmap();
}
