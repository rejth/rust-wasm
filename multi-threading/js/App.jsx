import { useState, useEffect, useRef } from 'react';

import init, { initThreadPool } from '../pkg/multi_threading.js';
import { MandelbrotSet } from './MandelbrotSet.js';
import { RenderManager } from './RenderManager.js';

const MAX_ITERATIONS = 500;

export function App() {
  const cpuCanvasRef = useRef(null);
  const gpuCanvasRef = useRef(null);
  const mandelbrotRef = useRef(null);
  const renderManagerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [numThreads, setNumThreads] = useState(0);
  const [timing, setTiming] = useState('Click one of the buttons to see the image & timings.');
  const [activeCanvas, setActiveCanvas] = useState('cpu');

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
    if (!ready || !cpuCanvasRef.current || !gpuCanvasRef.current) return;

    mandelbrotRef.current = new MandelbrotSet(cpuCanvasRef.current);
    renderManagerRef.current = new RenderManager(gpuCanvasRef.current);

    (async () => {
      await renderManagerRef.current.init();
      await renderManagerRef.current.setupPipeline();
    })();
  }, [ready]);

  const handleSingleThreadJs = () => {
    if (!mandelbrotRef.current) return;
    setActiveCanvas('cpu');

    const start = performance.now();
    mandelbrotRef.current.draw(MAX_ITERATIONS);
    const elapsed = performance.now() - start;

    setTiming(`Single-threaded JS: ${elapsed.toFixed(2)}ms`);
  };

  const handleSingleThreadWasm = () => {
    if (!mandelbrotRef.current) return;
    setActiveCanvas('cpu');

    const start = performance.now();
    mandelbrotRef.current.drawWithWasm(MAX_ITERATIONS);
    const elapsed = performance.now() - start;

    setTiming(`Single-threaded Rust + WASM: ${elapsed.toFixed(2)}ms`);
  };

  const handleMultiThreadWasm = () => {
    if (!mandelbrotRef.current) return;
    setActiveCanvas('cpu');

    const start = performance.now();
    mandelbrotRef.current.drawWithWasmParallel(MAX_ITERATIONS);
    const elapsed = performance.now() - start;

    setTiming(`Multi-threaded Rust + WASM (${numThreads} threads): ${elapsed.toFixed(2)}ms`);
  };

  const handleGPU = async () => {
    if (!renderManagerRef.current) return;
    setActiveCanvas('gpu');

    const start = performance.now();
    await renderManagerRef.current.redraw(MAX_ITERATIONS);
    const elapsed = performance.now() - start;

    setTiming(`WebGPU: ${elapsed.toFixed(2)}ms`);
  };

  if (!ready) {
    return <div className="loading">Loading</div>;
  }

  return (
    <div className="app-container">
      <div className="button-container">
        <button onClick={handleSingleThreadJs}>JS: Single thread</button>
        <button onClick={handleSingleThreadWasm}>WebAssembly: Single thread</button>
        <button onClick={handleMultiThreadWasm}>WebAssembly: All available threads ({numThreads})</button>
        <button onClick={handleGPU}>WebGPU</button>
      </div>

      <p>Number of iterations: {MAX_ITERATIONS}</p>
      <p className="timing">{timing}</p>

      <div className="canvas-container">
        <canvas
          ref={cpuCanvasRef}
          id="cpu-canvas"
          className={`render-canvas ${activeCanvas === 'cpu' ? 'active' : ''}`}
          width="700"
          height="700"
        />
        <canvas
          ref={gpuCanvasRef}
          id="gpu-canvas"
          className={`render-canvas ${activeCanvas === 'gpu' ? 'active' : ''}`}
          width="700"
          height="700"
        />
      </div>
    </div>
  );
}
