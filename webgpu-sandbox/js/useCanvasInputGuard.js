import { useEffect } from 'react';

/**
 * Prevents input events from being propagated to the canvas.
 *
 * Canvas camera UX may conflict with browser defaults:
 * 1. If we allow browser zoom/scroll on the same gesture, two-finger pan can scroll the page instead of moving the scene.
 * 2. Pinch can zoom the whole page (DOM/CSS scale), not the scene.
 * 3. Browser zoom + camera zoom can happen together, causing jitter and double zoom.
 * 4. Cursor/world mapping becomes unstable after page zoom changes device pixels and layout.
 * 5. We lose deterministic input behavior across devices/browsers.
 * 6. For a canvas-based app, canvas should own interaction while pointer is over it.
 * 7. Browser zoom/scroll is still fine outside the canvas area.
 */
export function useCanvasInputGuard() {
  useEffect(() => {
    let cleanup = null;
    let id = 0;

    const attach = () => {
      const canvas = document.querySelector('#root canvas');
      if (!canvas) {
        id = requestAnimationFrame(attach);
        return;
      }

      const isFromCanvas = (event) => {
        const target = event.target;
        if (target instanceof Node && (target === canvas || canvas.contains(target))) {
          return true;
        }
        if (typeof event.composedPath === 'function') {
          return event.composedPath().includes(canvas);
        }
        return false;
      };

      const blockCanvasEvent = (event) => {
        if (isFromCanvas(event)) {
          event.preventDefault();
        }
      };

      canvas.style.touchAction = 'none';
      canvas.addEventListener('wheel', blockCanvasEvent, { passive: false });
      canvas.addEventListener('gesturestart', blockCanvasEvent, { passive: false });
      canvas.addEventListener('gesturechange', blockCanvasEvent, { passive: false });
      canvas.addEventListener('gestureend', blockCanvasEvent, { passive: false });
      window.addEventListener('wheel', blockCanvasEvent, { passive: false, capture: true });
      window.addEventListener('gesturestart', blockCanvasEvent, { passive: false, capture: true });
      window.addEventListener('gesturechange', blockCanvasEvent, { passive: false, capture: true });
      window.addEventListener('gestureend', blockCanvasEvent, { passive: false, capture: true });

      cleanup = () => {
        canvas.removeEventListener('wheel', blockCanvasEvent);
        canvas.removeEventListener('gesturestart', blockCanvasEvent);
        canvas.removeEventListener('gesturechange', blockCanvasEvent);
        canvas.removeEventListener('gestureend', blockCanvasEvent);
        window.removeEventListener('wheel', blockCanvasEvent, { capture: true });
        window.removeEventListener('gesturestart', blockCanvasEvent, { capture: true });
        window.removeEventListener('gesturechange', blockCanvasEvent, { capture: true });
        window.removeEventListener('gestureend', blockCanvasEvent, { capture: true });
      };
    };

    attach();

    return () => {
      if (id) {
        cancelAnimationFrame(id);
      }
      cleanup?.();
    };
  }, []);
}
