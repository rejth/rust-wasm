import { useState, useEffect, useRef } from 'react';

import { renderTexture } from './image/renderImage.js';
// import { renderRect } from './rect/renderRect.js';
import initWasmModule from '../pkg/webgl_playground.js';

export function App() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initWasmModule().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const gl = canvasRef.current.getContext('webgl2');
    if (!gl) return;

    const image = new Image();
    image.src = '../static/flamingo.jpg';

    image.onload = () => {
      console.log('Image loaded');
      renderTexture(gl, image);
    };

    // renderRect(gl);
  }, [ready]);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return <canvas ref={canvasRef} id="canvas" />;
}
