import { useState, useEffect, useRef } from 'react';

import initWasmModule from '../pkg/webgpu_sandbox.js';
import { RenderManager } from './simulation/RenderManager.js';

export function App() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initWasmModule().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    (async () => {
      const renderManager = new RenderManager();
      await renderManager.run(canvasRef.current);
    })();
  }, [ready]);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-container">
      <canvas ref={canvasRef} id="canvas" />
    </div>
  );
}
