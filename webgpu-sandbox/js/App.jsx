import { useState, useEffect, useRef } from 'react';

import init from '../pkg/webgpu_sandbox.js';

export function App() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    init().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
  }, [ready]);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return <canvas ref={canvasRef} id="canvas" />;
}
