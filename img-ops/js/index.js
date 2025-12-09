import init, { scale_image } from '../pkg/index.js';

/**
 * Create a tiny "icon" with sharp edges - perfect for showing Lanczos advantage
 * This simulates a low-resolution icon/logo that needs upscaling
 */
function createTinyIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  // White geometric shapes
  ctx.fillStyle = '#fff';

  // Triangle
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

/**
 * Create pixel art style image (1-bit sharp pixels)
 */
function createPixelArt(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Define a simple smiley face in pixel art (8x8 grid mapped to size)
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

async function run() {
  // Initialize the WASM module
  await init();

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  // Simple setup without DPR complexity for clear comparison
  canvas.width = 1200;
  canvas.height = 800;
  canvas.style.width = '1200px';
  canvas.style.height = '800px';

  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, 1200, 800);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';

  // ============ TEST 1: Tiny icon upscaled 16x ============
  const iconSize = 16; // Tiny 16x16 icon
  const iconUpscale = 256; // Upscale to 256x256

  const icon = createTinyIcon(iconSize);

  // Show original at 1:1 (tiny)
  ctx.fillText('Original 16x16', 30, 30);
  ctx.drawImage(icon, 30, 45, iconSize, iconSize);

  // Browser upscale (will be blurry)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillText('Browser upscale (16→256)', 30, 100);
  ctx.drawImage(icon, 30, 120, iconUpscale, iconUpscale);

  // Lanczos upscale (should be sharper)
  const scaledIcon = await scale_image(icon, iconUpscale, iconUpscale);
  ctx.fillText('Lanczos upscale (16→256)', 320, 100);
  ctx.drawImage(scaledIcon, 320, 120, iconUpscale, iconUpscale);

  // Release GPU resources
  icon.close();
  scaledIcon.close();

  // ============ TEST 2: Pixel art upscaled ============
  const pixelArtSize = 8; // 8x8 pixel art
  const pixelArtUpscale = 200; // Upscale to 200x200

  const pixelArt = createPixelArt(pixelArtSize);

  ctx.fillText('Original 8x8', 650, 30);
  ctx.drawImage(pixelArt, 650, 45, pixelArtSize, pixelArtSize);

  // Browser upscale (will be blurry)
  ctx.fillText('Browser (blurry)', 650, 100);
  ctx.drawImage(pixelArt, 650, 120, pixelArtUpscale, pixelArtUpscale);

  // Lanczos upscale (should be sharper)
  const scaledPixelArt = await scale_image(pixelArt, pixelArtUpscale, pixelArtUpscale);
  ctx.fillText('Lanczos (sharper edges)', 880, 100);
  ctx.drawImage(scaledPixelArt, 880, 120, pixelArtUpscale, pixelArtUpscale);

  // ============ TEST 3: Nearest neighbor comparison ============
  ctx.fillText('Nearest neighbor (pixelated)', 650, 360);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixelArt, 650, 380, pixelArtUpscale, pixelArtUpscale);
  ctx.imageSmoothingEnabled = true;

  // Release GPU resources
  pixelArt.close();
  scaledPixelArt.close();

  // Labels
  ctx.font = '14px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('← Look at the triangle edges and circle smoothness', 30, 400);
  ctx.fillText('← Compare edge sharpness on the smiley', 650, 600);
}

run().catch(console.error);
