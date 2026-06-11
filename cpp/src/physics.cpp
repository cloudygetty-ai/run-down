#include "physics.h"
#include "utils.h"
#include <cmath>

static const float WALL_HALF_SIZE = 10.0f;
static const float PLAYER_RADIUS  = 8.0f;

struct AABB {
    float minX, maxX, minY, maxY;
};

static AABB buildPieceToAABB(const BuildPiece& piece) {
    // WHY: walls are axis-aligned in 0/180 rotation, perpendicular at 90/270
    bool isVertical = (piece.rotation == 90.0f || piece.rotation == 270.0f);
    float halfW = isVertical ? WALL_HALF_SIZE : 50.0f;
    float halfH = isVertical ? 50.0f : WALL_HALF_SIZE;
    return {
        piece.position.x - halfW,
        piece.position.x + halfW,
        piece.position.y - halfH,
        piece.position.y + halfH,
    };
}

Vector2 resolvePlayerWallCollision(const Player& player, const std::vector<BuildPiece>& pieces) {
    Vector2 pos = player.position;

    for (const auto& piece : pieces) {
        if (piece.type == BuildPieceType::Floor) continue;

        AABB box = buildPieceToAABB(piece);
        float closestX = std::max(box.minX, std::min(pos.x, box.maxX));
        float closestY = std::max(box.minY, std::min(pos.y, box.maxY));
        float dist = distance(pos, {closestX, closestY});

        if (dist < PLAYER_RADIUS) {
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

const BuildPiece* checkBulletHit(const Vector2& origin, const Vector2& target,
                                   const std::vector<BuildPiece>& pieces) {
    float dx = target.x - origin.x;
    float dy = target.y - origin.y;

    for (const auto& piece : pieces) {
        if (piece.type == BuildPieceType::Floor) continue;

        AABB box = buildPieceToAABB(piece);
        float tMinX = (dx != 0.0f) ? (box.minX - origin.x) / dx : -1e30f;
        float tMaxX = (dx != 0.0f) ? (box.maxX - origin.x) / dx :  1e30f;
        float tMinY = (dy != 0.0f) ? (box.minY - origin.y) / dy : -1e30f;
        float tMaxY = (dy != 0.0f) ? (box.maxY - origin.y) / dy :  1e30f;

        float tEnter = std::max(std::min(tMinX, tMaxX), std::min(tMinY, tMaxY));
        float tExit  = std::min(std::max(tMinX, tMaxX), std::max(tMinY, tMaxY));

        if (tEnter <= tExit && tEnter >= 0.0f && tEnter <= 1.0f) {
            return &piece;
        }
    }
    return nullptr;
}

bool isPlayerHitByBullet(const Vector2& origin, const Vector2& target, const Player& tgt) {
    float dx = target.x - origin.x;
    float dy = target.y - origin.y;
    float lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-12f) return false;

    float t = std::max(0.0f, std::min(1.0f,
        ((tgt.position.x - origin.x) * dx + (tgt.position.y - origin.y) * dy) / lenSq));
    float cx = origin.x + t * dx;
    float cy = origin.y + t * dy;
    return distance({cx, cy}, tgt.position) < PLAYER_RADIUS * 2.0f;
}
