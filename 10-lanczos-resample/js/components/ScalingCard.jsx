import React, { useState, useRef, useEffect, useCallback } from 'react';

import { drawTestImage } from '../utils/imageUtils.js';
import { measureTime } from '../utils/scalingUtils.js';

import { styles } from '../styles.js';

export function ScalingCard({ id, title, subtitle, color, scaleFn, initialSize }) {
  const canvasRef = useRef(null);
  const [info, setInfo] = useState('Ready');
  const [size, setSize] = useState({ width: initialSize, height: initialSize });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = initialSize;
      canvas.height = initialSize;
      drawTestImage(
        canvas.getContext('2d', { willReadFrequently: true }),
        initialSize,
        initialSize,
      );
    }
  }, [initialSize]);

  const handleScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const time = measureTime(() => scaleFn(canvas)).toFixed(1);
    setSize({ width: canvas.width, height: canvas.height });
    setInfo(`${canvas.width}x${canvas.height} | ⏱️ ${time}ms`);
  }, [scaleFn]);

  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = initialSize;
    canvas.height = initialSize;
    drawTestImage(canvas.getContext('2d', { willReadFrequently: true }), initialSize, initialSize);
    setSize({ width: initialSize, height: initialSize });
    setInfo('Ready');
  }, [initialSize]);

  return (
    <div style={styles.card}>
      <h3 style={{ ...styles.cardTitle, color }}>{title}</h3>
      <p style={styles.cardSubtitle}>{subtitle}</p>
      <canvas ref={canvasRef} style={{ ...styles.canvas, border: `2px solid ${color}` }} />
      <div style={styles.buttonGroup}>
        <button
          onClick={handleScale}
          style={{ ...styles.button, background: color, color: '#fff' }}>
          Scale 2×
        </button>
        <button
          onClick={handleReset}
          style={{ ...styles.button, background: '#333', color: '#fff' }}>
          ↺ Reset
        </button>
      </div>
      <p style={styles.info}>{info}</p>
    </div>
  );
}
