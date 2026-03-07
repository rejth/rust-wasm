import { useState, useEffect, useRef } from 'react';
import GUI from 'https://webgpufundamentals.org/3rdparty/muigui-0.x.module.js';

import init from '../pkg/webgpu_sandbox.js';
import { RenderManager } from './box/RenderManager.js';
import { useCanvasInputGuard } from './useCanvasInputGuard.js';

const gui = new GUI();

export function App() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useCanvasInputGuard();

  useEffect(() => {
    init().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current) return;

    (async () => {
      const canvas = canvasRef.current;
      const renderManager = new RenderManager(canvas);
      await renderManager.init();

      // Shape a geometry - 4 vertices in a square (in clip space)
      const vertices = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]; // 0-1 UV space; scale converts to pixels
      const indices = [0, 1, 2, 0, 2, 3];
      renderManager.setVertices(vertices);
      renderManager.setIndices(indices);

      // Add GUI controls for the render manager settings
      const radToDegOptions = { min: -360, max: 360, step: 1, converters: GUI.converters.radToDeg };
      gui.add(renderManager.settings, 'useOrthographic').name('use orthographic');
      gui.add(renderManager.settings, 'zoom', 0.1, 10).name('zoom (orthographic)');
      gui.add(renderManager.settings, 'orthographicHeight', 10, 3000).name('height (orthographic)');
      gui.add(renderManager.settings, 'fieldOfView', { min: 1, max: 179, converters: GUI.converters.radToDeg });
      gui.add(renderManager.settings.translation, '0', -1000, 1000).name('translation.x');
      gui.add(renderManager.settings.translation, '1', -1000, 1000).name('translation.y');
      gui.add(renderManager.settings.translation, '2', -2000, -1).name('translation.z');
      gui.add(renderManager.settings, 'rotation', radToDegOptions);
      gui.add(renderManager.settings.scale, '0', -800, 800).name('scale.x');
      gui.add(renderManager.settings.scale, '1', -800, 800).name('scale.y');
      gui.onChange(renderManager.redraw);

      // Render the geometry
      renderManager.run();
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
