import { Vector2, BuildPiece, Player } from '../../types';
import { distance } from '../../utils';

// Wall thickness for collision response
const WALL_HALF_SIZE = 10;
const PLAYER_RADIUS = 8;

type AABB = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function buildPieceToAABB(piece: BuildPiece): AABB {
  // WHY: walls are axis-aligned in 0/180 rotation, perpendicular at 90/270
  const isVertical = piece.rotation === 90 || piece.rotation === 270;
  const halfW = isVertical ? WALL_HALF_SIZE : 50;
  const halfH = isVertical ? 50 : WALL_HALF_SIZE;
  return {
    minX: piece.position.x - halfW,
    maxX: piece.position.x + halfW,
    minY: piece.position.y - halfH,
    maxY: piece.position.y + halfH,
  };
}

export function resolvePlayerWallCollision(
  player: Player,
  pieces: BuildPiece[],
): Vector2 {
  let pos = { ...player.position };

  for (const piece of pieces) {
    if (piece.type === 'floor') continue; // players walk on floors, no lateral collision

    const box = buildPieceToAABB(piece);
    const closestX = Math.max(box.minX, Math.min(pos.x, box.maxX));
    const closestY = Math.max(box.minY, Math.min(pos.y, box.maxY));
    const dist = distance(pos, { x: closestX, y: closestY });

    if (dist < PLAYER_RADIUS) {
      // Push player out along the shortest axis
      const overlapX = PLAYER_RADIUS - Math.abs(pos.x - closestX);
      const overlapY = PLAYER_RADIUS - Math.abs(pos.y - closestY);
      if (overlapX < overlapY) {
        pos.x += pos.x < closestX ? -overlapX : overlapX;
      } else {
        pos.y += pos.y < closestY ? -overlapY : overlapY;
      }
    }
  }

  return pos;
}

export function checkBulletHit(
  bulletOrigin: Vector2,
  bulletTarget: Vector2,
  pieces: BuildPiece[],
): BuildPiece | null {
  // Simple ray-AABB intersection — returns first wall the bullet hits
  for (const piece of pieces) {
    if (piece.type === 'floor') continue;

    const box = buildPieceToAABB(piece);
    const dx = bulletTarget.x - bulletOrigin.x;
    const dy = bulletTarget.y - bulletOrigin.y;
    const tMinX = dx !== 0 ? (box.minX - bulletOrigin.x) / dx : -Infinity;
    const tMaxX = dx !== 0 ? (box.maxX - bulletOrigin.x) / dx : Infinity;
    const tMinY = dy !== 0 ? (box.minY - bulletOrigin.y) / dy : -Infinity;
    const tMaxY = dy !== 0 ? (box.maxY - bulletOrigin.y) / dy : Infinity;

    const tEnter = Math.max(Math.min(tMinX, tMaxX), Math.min(tMinY, tMaxY));
    const tExit  = Math.min(Math.max(tMinX, tMaxX), Math.max(tMinY, tMaxY));

    if (tEnter <= tExit && tEnter >= 0 && tEnter <= 1) {
      return piece;
    }
  }
  return null;
}

export function isPlayerHitByBullet(
  bulletOrigin: Vector2,
  bulletTarget: Vector2,
  target: Player,
): boolean {
  // Project target onto the bullet line segment
  const dx = bulletTarget.x - bulletOrigin.x;
  const dy = bulletTarget.y - bulletOrigin.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return false;

  const t = Math.max(0, Math.min(1,
    ((target.position.x - bulletOrigin.x) * dx + (target.position.y - bulletOrigin.y) * dy) / lenSq
  ));
  const closest = {
    x: bulletOrigin.x + t * dx,
    y: bulletOrigin.y + t * dy,
  };
  return distance(closest, target.position) < PLAYER_RADIUS * 2;
}
