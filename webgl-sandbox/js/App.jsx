import { useState, useEffect, useRef } from 'react';

import initWasmModule from '../pkg/webgl_playground.js';

import { RenderImage } from './image/RenderImage.js';
import { Effects } from './image/Effects.jsx';

export function App() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [effects, setEffects] = useState([]);

  useEffect(() => {
    initWasmModule().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !ready) return;

    const gl = canvasRef.current.getContext('webgl2');
    if (!gl) return;

    const image = new Image();
    image.src = '../static/flamingo.jpg';

    image.onload = () => {
      const renderer = new RenderImage(gl, image);
      const effects = Object.keys(renderer.kernels).map((name) => ({ name, on: false }));

      renderer.drawImage(effects);
      setEffects(effects);
    };
  }, [ready]);

  if (!ready) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app-container">
      <canvas ref={canvasRef} id="canvas" />
      <Effects effects={effects} />
    </div>
  );
}
