import React, { useRef, useEffect } from 'react';

import { scale_image } from '../../pkg/index.js';
import { createTinyIcon, createPixelArt } from '../utils/imageUtils.js';

import { styles } from '../styles.js';

export function VisualDemo() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    canvas.width = 1200;
    canvas.height = 800;

    ctx.fillStyle = '#1a1a25';
    ctx.fillRect(0, 0, 1200, 800);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';

    // ============ Icon upscaling (16x16 → 256x256) ============
    const iconSize = 16;
    const iconUpscale = 256;
    const icon = createTinyIcon(iconSize);

    // Original (tiny)
    ctx.fillText('Original 16x16', 30, 30);
    ctx.drawImage(icon, 30, 45, iconSize, iconSize);

    // Browser upscale
    // ctx.imageSmoothingEnabled = true;
    // ctx.imageSmoothingQuality = 'high';
    ctx.fillText('Browser upscale (16→256)', 30, 100);
    ctx.drawImage(icon, 30, 120, iconUpscale, iconUpscale);

    // Lanczos upscale
    const scaledIconData = scale_image(icon, iconUpscale, iconUpscale);
    ctx.fillText('Lanczos upscale (16→256)', 320, 100);
    ctx.putImageData(scaledIconData, 320, 120);

    icon.close();

    // ============ Pixel art upscaling (8x8 → 200x200) ============
    const pixelArtSize = 8;
    const pixelArtUpscale = 200;
    const pixelArt = createPixelArt(pixelArtSize);

    // Original (tiny)
    ctx.fillText('Original 8x8', 650, 30);
    ctx.drawImage(pixelArt, 650, 45, pixelArtSize, pixelArtSize);

    // Browser upscale
    // ctx.imageSmoothingEnabled = true;
    // ctx.imageSmoothingQuality = 'high';
    ctx.fillText('Browser (blurry)', 650, 100);
    ctx.drawImage(pixelArt, 650, 120, pixelArtUpscale, pixelArtUpscale);

    // Lanczos upscale
    const scaledPixelArtData = scale_image(pixelArt, pixelArtUpscale, pixelArtUpscale);
    ctx.fillText('Lanczos (sharper edges)', 880, 100);
    ctx.putImageData(scaledPixelArtData, 880, 120);

    // Nearest neighbor
    ctx.fillText('Nearest neighbor (pixelated)', 650, 360);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pixelArt, 650, 380, pixelArtUpscale, pixelArtUpscale);
    ctx.imageSmoothingEnabled = true;

    pixelArt.close();

    // Labels
    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('← Look at the triangle edges and circle smoothness', 30, 400);
    ctx.fillText('← Compare edge sharpness on the smiley', 650, 600);
  }, []);

  return (
    <div style={styles.demoContainer}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: '100%',
          borderRadius: '8px',
        }}
      />
    </div>
  );
}
