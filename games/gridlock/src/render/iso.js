/**
 * Isometric projection. Pure maths, no canvas — so the inverse mapping used by
 * the mouse can be unit-tested without a browser.
 */

export const TILE_W = 64;
export const TILE_H = 32;
/** Vertical pixels per unit of building height at zoom 1. */
export const LEVEL_H = 30;

export const createCamera = (grid) => ({
  // Centre the map under the viewport: tile (w/2, h/2) sits at screen centre.
  panX: 0,
  panY: -((grid.w + grid.h) * TILE_H) / 4,
  zoom: 1,
  minZoom: 0.45,
  maxZoom: 2.4,
});

/** Tile coordinates → unscaled world pixels (origin at tile 0,0 top corner). */
export const tileToWorld = (x, y) => ({
  wx: (x - y) * (TILE_W / 2),
  wy: (x + y) * (TILE_H / 2),
});

/** Tile coordinates → canvas pixels. */
export const tileToScreen = (x, y, cam, view) => {
  const { wx, wy } = tileToWorld(x, y);
  return {
    sx: view.width / 2 + (wx + cam.panX) * cam.zoom,
    sy: view.height / 2 + (wy + cam.panY) * cam.zoom,
  };
};

/** Canvas pixels → fractional tile coordinates. Inverse of tileToScreen. */
export const screenToTile = (sx, sy, cam, view) => {
  const wx = (sx - view.width / 2) / cam.zoom - cam.panX;
  const wy = (sy - view.height / 2) / cam.zoom - cam.panY;
  const hx = wx / (TILE_W / 2);
  const hy = wy / (TILE_H / 2);
  return { x: (hx + hy) / 2, y: (hy - hx) / 2 };
};

/**
 * Nearest tile under a screen point, or null when off-grid.
 * WHY round, not floor: tileToScreen puts tile centres on integer coordinates,
 * so the unit square around an integer maps exactly onto that tile's diamond.
 */
export const pickTile = (sx, sy, cam, view, grid) => {
  const { x, y } = screenToTile(sx, sy, cam, view);
  const tx = Math.round(x);
  const ty = Math.round(y);
  if (tx < 0 || ty < 0 || tx >= grid.w || ty >= grid.h) return null;
  return { x: tx, y: ty };
};

/** Painter's-algorithm order: back to front, so near tiles overdraw far ones. */
export const depthOf = (x, y) => x + y;

export const clampCamera = (cam, grid) => {
  const span = (grid.w + grid.h) * (TILE_H / 2) + 400;
  cam.panX = Math.max(-span, Math.min(span, cam.panX));
  cam.panY = Math.max(-span, Math.min(span, cam.panY));
  cam.zoom = Math.max(cam.minZoom, Math.min(cam.maxZoom, cam.zoom));
  return cam;
};
