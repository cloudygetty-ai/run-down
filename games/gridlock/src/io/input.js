/**
 * Pointer and keyboard handling.
 *
 * Two gestures matter: drag-to-build (roads are unusable without it) and
 * zoom-toward-cursor (panning to find the spot you were already pointing at is
 * the fastest way to make a builder feel cheap).
 */

import { clampCamera, pickTile } from '../render/iso.js';

export const attachInput = (canvas, cam, view, getState, handlers) => {
  let painting = false;
  let panning = false;
  let lastPan = { x: 0, y: 0 };
  let lastPainted = -1;

  const localPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { px: event.clientX - rect.left, py: event.clientY - rect.top };
  };

  const tileUnder = (event) => {
    const { px, py } = localPoint(event);
    return pickTile(px, py, cam, view, getState().grid);
  };

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    const tile = tileUnder(event);
    const wantsPan = event.button === 1 || event.button === 2 || !handlers.hasTool();

    if (wantsPan) {
      panning = true;
      lastPan = { x: event.clientX, y: event.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }
    painting = true;
    lastPainted = -1;
    if (tile) {
      lastPainted = tile.y * getState().grid.w + tile.x;
      handlers.onPaint(tile);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (panning) {
      cam.panX += (event.clientX - lastPan.x) / cam.zoom;
      cam.panY += (event.clientY - lastPan.y) / cam.zoom;
      lastPan = { x: event.clientX, y: event.clientY };
      clampCamera(cam, getState().grid);
      return;
    }
    const tile = tileUnder(event);
    handlers.onHover(tile);
    if (!painting || !tile) return;
    const key = tile.y * getState().grid.w + tile.x;
    if (key === lastPainted) return; // One action per tile per drag.
    lastPainted = key;
    handlers.onPaint(tile);
  });

  const endGesture = (event) => {
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    painting = false;
    panning = false;
    canvas.style.cursor = '';
  };
  canvas.addEventListener('pointerup', endGesture);
  canvas.addEventListener('pointercancel', endGesture);
  canvas.addEventListener('pointerleave', () => handlers.onHover(null));
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const { px, py } = localPoint(event);
    const z0 = cam.zoom;
    cam.zoom *= event.deltaY < 0 ? 1.12 : 1 / 1.12;
    clampCamera(cam, getState().grid);
    // Hold the world point under the cursor still:
    //   world = (p - centre)/zoom - pan  ⇒  pan' = pan + (p - centre)(1/z' - 1/z)
    const invDelta = 1 / cam.zoom - 1 / z0;
    cam.panX += (px - view.width / 2) * invDelta;
    cam.panY += (py - view.height / 2) * invDelta;
    clampCamera(cam, getState().grid);
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    handlers.onKey(event);
  });

  return {
    isPanning: () => panning,
    detach: () => canvas.replaceWith(canvas.cloneNode(true)),
  };
};
