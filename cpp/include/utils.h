#pragma once
#include "types.h"
#include <cmath>
#include <random>
#include <algorithm>
#include <string>
#include <chrono>

// ── Random number generation ──────────────────────────────────────────────────
// WHY: single static engine so all callers share the same seeded state.

inline std::mt19937& rng() {
    static std::mt19937 engine(
        static_cast<unsigned>(
            std::chrono::steady_clock::now().time_since_epoch().count()
        )
    );
    return engine;
}

inline float randomInRange(float lo, float hi) {
    return lo + std::uniform_real_distribution<float>(0.f, 1.f)(rng()) * (hi - lo);
}

inline int randomInt(int lo, int hi) {
    return std::uniform_int_distribution<int>(lo, hi)(rng());
}

// ── Math helpers ──────────────────────────────────────────────────────────────

inline float dist(Vec2 a, Vec2 b) {
    float dx = b.x - a.x;
    float dy = b.y - a.y;
    return std::sqrt(dx * dx + dy * dy);
}

inline Vec2 normalize(Vec2 v) {
    float len = std::sqrt(v.x * v.x + v.y * v.y);
    if (len == 0.f) return {0.f, 0.f};
    return {v.x / len, v.y / len};
}

inline float lerp(float a, float b, float t) {
    t = std::max(0.f, std::min(1.f, t));
    return a + (b - a) * t;
}

inline Vec2 lerpVec2(Vec2 a, Vec2 b, float t) {
    return {lerp(a.x, b.x, t), lerp(a.y, b.y, t)};
}

inline float clampf(float v, float lo, float hi) {
    return std::max(lo, std::min(hi, v));
}

inline bool isInsideCircle(Vec2 point, Vec2 center, float radius) {
    return dist(point, center) <= radius;
}

inline float angleDeg(Vec2 from, Vec2 to) {
    return std::atan2(to.y - from.y, to.x - from.x) * (180.f / 3.14159265f);
}

// ── Time helper ───────────────────────────────────────────────────────────────

inline float nowMs() {
    return static_cast<float>(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()
        ).count()
    );
}

// ── Simple unique id ──────────────────────────────────────────────────────────

inline std::string makeId(const std::string& prefix) {
    static int counter = 0;
    return prefix + "_" + std::to_string(++counter);
}
