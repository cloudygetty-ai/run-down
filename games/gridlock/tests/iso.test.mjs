import test from 'node:test';
import assert from 'node:assert/strict';

import { createGrid } from '../src/core/grid.js';
import { clampCamera, createCamera, pickTile, screenToTile, tileToScreen } from '../src/render/iso.js';

const view = { width: 1200, height: 800 };

test('screen projection round-trips back to the same tile', () => {
  const grid = createGrid(11);
  const cam = createCamera(grid);
  for (const [x, y] of [[0, 0], [5, 12], [31, 31], [17, 3]]) {
    const { sx, sy } = tileToScreen(x, y, cam, view);
    const back = screenToTile(sx, sy, cam, view);
    assert.ok(Math.abs(back.x - x) < 1e-9, `x ${back.x} != ${x}`);
    assert.ok(Math.abs(back.y - y) < 1e-9, `y ${back.y} != ${y}`);
  }
});

test('round-trip holds under zoom and pan', () => {
  const grid = createGrid(11);
  const cam = { ...createCamera(grid), zoom: 1.9, panX: -120, panY: 64 };
  const { sx, sy } = tileToScreen(9, 4, cam, view);
  assert.deepEqual(pickTile(sx, sy, cam, view, grid), { x: 9, y: 4 });
});

test('picking snaps to the nearest tile centre, not the floor', () => {
  const grid = createGrid(11);
  const cam = createCamera(grid);
  const { sx, sy } = tileToScreen(6, 6, cam, view);
  // A few pixels off-centre must still resolve to the same tile.
  assert.deepEqual(pickTile(sx + 6, sy + 2, cam, view, grid), { x: 6, y: 6 });
});

test('picking off the grid returns null', () => {
  const grid = createGrid(11);
  const cam = createCamera(grid);
  assert.equal(pickTile(-5000, -5000, cam, view, grid), null);
});

test('camera zoom is clamped to its configured bounds', () => {
  const grid = createGrid(11);
  const cam = createCamera(grid);
  cam.zoom = 99;
  clampCamera(cam, grid);
  assert.equal(cam.zoom, cam.maxZoom);
  cam.zoom = 0.001;
  clampCamera(cam, grid);
  assert.equal(cam.zoom, cam.minZoom);
});
