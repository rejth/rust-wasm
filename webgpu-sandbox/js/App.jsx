import { useState, useEffect, useRef } from 'react';

import initWasmModule from '../pkg/webgpu_sandbox.js';

export function App() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initWasmModule().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
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
