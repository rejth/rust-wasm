import { useState, useEffect, useRef } from 'react';

import init, { initThreadPool } from '../pkg/multi_threading.js';
import { MandelbrotSet } from './MandelbrotSet.js';

export function App() {
  const canvasRef = useRef(null);
  const mandelbrotRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [numThreads, setNumThreads] = useState(0);
  const [timing, setTiming] = useState('Click one of the buttons to see the image & timings.');

  useEffect(() => {
    async function initialize() {
      await init();

      const threads = navigator.hardwareConcurrency || 4;
      await initThreadPool(threads);

      setNumThreads(threads);
      setReady(true);
    }

    initialize();
  }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    mandelbrotRef.current = new MandelbrotSet(canvasRef.current);
  }, [ready]);

  const handleSingleThreadJs = () => {
    if (!mandelbrotRef.current) return;

    const start = performance.now();
    mandelbrotRef.current.draw();
    const elapsed = performance.now() - start;

    setTiming(`Single-threaded JS: ${elapsed.toFixed(2)}ms`);
  };

  const handleSingleThreadWasm = () => {
    if (!mandelbrotRef.current) return;

    const start = performance.now();
    mandelbrotRef.current.drawWithWasm();
    const elapsed = performance.now() - start;

    setTiming(`Single-threaded Rust + WASM: ${elapsed.toFixed(2)}ms`);
  };

  const handleMultiThreadWasm = () => {
    if (!mandelbrotRef.current) return;

    const start = performance.now();
    mandelbrotRef.current.drawWithWasmParallel();
    const elapsed = performance.now() - start;

    setTiming(`Multi-threaded Rust + WASM (${numThreads} threads): ${elapsed.toFixed(2)}ms`);
  };

  if (!ready) {
    return <div className="loading">Loading</div>;
  }

  return (
    <div className="app-container">
      <div className="button-container">
        <button onClick={handleSingleThreadJs}>JS: Draw with a single thread</button>
        <button onClick={handleSingleThreadWasm}>WASM: Draw with a single thread</button>
        <button onClick={handleMultiThreadWasm}>WASM: Draw with all available threads ({numThreads})</button>
      </div>

      <p className="timing">{timing}</p>

      <div className="canvas-container">
        <canvas ref={canvasRef} id="canvas" width="700" height="700" />
      </div>
    </div>
  );
}
