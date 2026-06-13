#pragma once
#include "types.h"
#include "utils.h"
#include <vector>
#include <cmath>

// ── Collision constants ────────────────────────────────────────────────────────
static constexpr float WALL_HALF_SIZE = 10.f;
static constexpr float PLAYER_RADIUS  = 8.f;

struct AABB {
    float minX, maxX, minY, maxY;
};

inline AABB buildPieceToAABB(const BuildPiece& piece) {
    // Walls are axis-aligned at 0/180 degrees, perpendicular at 90/270.
    bool isVertical = (piece.rotation == 90.f || piece.rotation == 270.f);
    float halfW = isVertical ? WALL_HALF_SIZE : 50.f;
    float halfH = isVertical ? 50.f : WALL_HALF_SIZE;
    return {
        piece.position.x - halfW,
        piece.position.x + halfW,
        piece.position.y - halfH,
        piece.position.y + halfH,
    };
}

// Push player out of any overlapping build-piece walls.
// Returns the resolved position.
inline Vec2 resolvePlayerWallCollision(const Player& player,
                                       const std::vector<BuildPiece>& pieces)
{
    Vec2 pos = player.position;

    for (const auto& piece : pieces) {
        if (piece.type == BuildPieceType::floor) continue;

        AABB box = buildPieceToAABB(piece);

        float closestX = std::max(box.minX, std::min(pos.x, box.maxX));
        float closestY = std::max(box.minY, std::min(pos.y, box.maxY));
        float d = dist(pos, {closestX, closestY});

        if (d < PLAYER_RADIUS) {
            float overlapX = PLAYER_RADIUS - std::abs(pos.x - closestX);
            float overlapY = PLAYER_RADIUS - std::abs(pos.y - closestY);
            if (overlapX < overlapY) {
                pos.x += (pos.x < closestX) ? -overlapX : overlapX;
            } else {
                pos.y += (pos.y < closestY) ? -overlapY : overlapY;
            }
        }
    }
    return pos;
}

// Ray-AABB intersection — returns pointer to the first wall the bullet hits, or nullptr.
inline const BuildPiece* checkBulletHit(Vec2 origin, Vec2 target,
                                         const std::vector<BuildPiece>& pieces)
{
    float dx = target.x - origin.x;
    float dy = target.y - origin.y;

    for (const auto& piece : pieces) {
        if (piece.type == BuildPieceType::floor) continue;

        AABB box = buildPieceToAABB(piece);

        float tMinX = (dx != 0.f) ? (box.minX - origin.x) / dx : -1e30f;
        float tMaxX = (dx != 0.f) ? (box.maxX - origin.x) / dx :  1e30f;
        float tMinY = (dy != 0.f) ? (box.minY - origin.y) / dy : -1e30f;
        float tMaxY = (dy != 0.f) ? (box.maxY - origin.y) / dy :  1e30f;

        float tEnter = std::max(std::min(tMinX, tMaxX), std::min(tMinY, tMaxY));
        float tExit  = std::min(std::max(tMinX, tMaxX), std::max(tMinY, tMaxY));

        if (tEnter <= tExit && tEnter >= 0.f && tEnter <= 1.f) {
            return &piece;
        }
    }
    return nullptr;
}

// Project target onto the bullet line segment; true if within hit radius.
inline bool isPlayerHitByBullet(Vec2 origin, Vec2 target, const Player& tgt) {
    float dx = target.x - origin.x;
    float dy = target.y - origin.y;
    float lenSq = dx * dx + dy * dy;
    // WHY: zero-length shot (point-blank/melee) — fall back to radial check
    if (lenSq == 0.f) return dist(origin, tgt.position) < PLAYER_RADIUS * 2.f;

    float t = ((tgt.position.x - origin.x) * dx +
               (tgt.position.y - origin.y) * dy) / lenSq;
    t = std::max(0.f, std::min(1.f, t));

    Vec2 closest = { origin.x + t * dx, origin.y + t * dy };
    return dist(closest, tgt.position) < PLAYER_RADIUS * 2.f;
}
