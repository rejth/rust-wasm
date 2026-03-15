import { useState, useEffect, useRef } from 'react';
import GUI from 'https://webgpufundamentals.org/3rdparty/muigui-0.x.module.js';

import init from '../pkg/webgpu_sandbox.js';
import { RenderManager } from './box/RenderManager.js';
import { useCanvasInputGuard } from './useCanvasInputGuard.js';
import { OrbitCamera } from './box/OrbitCamera.js';
import { Vector3D } from './box/Vector3D.js';

const gui = new GUI();

export function App() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  const renderManagerRef = useRef<RenderManager | null>(null);
  const orbitCameraRef = useRef<OrbitCamera | null>(null);

  useCanvasInputGuard();

  useEffect(() => {
    init().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current) return;

    (async () => {
      const canvas = canvasRef.current!;
      const renderManager = new RenderManager(canvas);

      await renderManager.init();

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
      gui.add(renderManager.settings.scale, '0', -10, 10).name('scale.x');
      gui.add(renderManager.settings.scale, '1', -10, 10).name('scale.y');
      gui.onChange(renderManager.redraw);

      const orbitCamera = new OrbitCamera(canvas);

      orbitCamera.setParent(renderManager.root);
      orbitCamera.target = new Vector3D(0, 0, 0);
      orbitCamera.tilt = Math.PI;
      orbitCamera.radius = 300;

      renderManager.setCamera(orbitCamera);
      renderManager.buildCard();
      renderManager.run();

      renderManagerRef.current = renderManager;
      orbitCameraRef.current = orbitCamera;
    })();
  }, [ready]);

  if (!ready) {
    return <div>Loading...</div>;
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    orbitCameraRef.current?.handleDown(event.nativeEvent);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    orbitCameraRef.current?.handleMove(event.nativeEvent);
    renderManagerRef.current?.redraw();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    orbitCameraRef.current?.handleUp(event.nativeEvent);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    orbitCameraRef.current?.handleUp(event.nativeEvent);
  };

  const handleLostPointerCapture = (event: React.PointerEvent<HTMLCanvasElement>) => {
    orbitCameraRef.current?.handleUp(event.nativeEvent);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    orbitCameraRef.current?.handleDolly(event.nativeEvent);
    renderManagerRef.current?.redraw();
  };

  return (
    <div className="app-container">
      <canvas
        ref={canvasRef}
        id="canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onWheel={handleWheel}
      />
    </div>
  );
}
