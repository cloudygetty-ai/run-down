#pragma once
#include "types.h"
#include <vector>

// Returns the corrected position after resolving a player-vs-wall collision.
Vector2 resolvePlayerWallCollision(const Player& player, const std::vector<BuildPiece>& pieces);

// Returns the first BuildPiece hit by a bullet ray, or nullptr if clear.
const BuildPiece* checkBulletHit(const Vector2& origin, const Vector2& target,
                                  const std::vector<BuildPiece>& pieces);

// Returns true if the bullet line segment hits the target player's hitbox.
bool isPlayerHitByBullet(const Vector2& origin, const Vector2& target, const Player& tgt);
