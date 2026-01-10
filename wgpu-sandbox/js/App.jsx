import { useState, useEffect } from 'react';

import init, { run_web } from '../pkg/wgpu_sandbox.js';

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    init().then(() => {
      setReady(true);
      run_web();
    });
  }, []);

  return (
    <div className="app-container">
      <canvas id="canvas" />
      {!ready && <div className="loading">Loading...</div>}
    </div>
  );
}
