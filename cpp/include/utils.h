#pragma once
#include <cmath>
#include <random>
#include <algorithm>

// ── Vector2 ────────────────────────────────────────────────────────────────────
struct Vector2 {
    float x = 0.0f;
    float y = 0.0f;
};

// ── RNG ───────────────────────────────────────────────────────────────────────
// WHY: single seeded mt19937 gives reproducible sim runs
inline std::mt19937& getRng() {
    static std::mt19937 rng(42);
    return rng;
}

inline float randomInRange(float lo, float hi) {
    std::uniform_real_distribution<float> dist(lo, hi);
    return dist(getRng());
}

inline int randomInt(int lo, int hi) {
    std::uniform_int_distribution<int> dist(lo, hi);
    return dist(getRng());
}

// ── Math helpers ──────────────────────────────────────────────────────────────
inline float clampf(float v, float lo, float hi) {
    return std::max(lo, std::min(hi, v));
}

inline float distanceVec(const Vector2& a, const Vector2& b) {
    float dx = a.x - b.x;
    float dy = a.y - b.y;
    return std::sqrt(dx * dx + dy * dy);
}

inline Vector2 normalizeVec(const Vector2& v) {
    float len = std::sqrt(v.x * v.x + v.y * v.y);
    if (len < 1e-6f) return {0.0f, 0.0f};
    return {v.x / len, v.y / len};
}

inline float lerp(float a, float b, float t) {
    return a + (b - a) * t;
}

inline Vector2 lerpVec2(const Vector2& a, const Vector2& b, float t) {
    return {lerp(a.x, b.x, t), lerp(a.y, b.y, t)};
}

inline bool isInsideCircle(const Vector2& point, const Vector2& center, float radius) {
    return distanceVec(point, center) <= radius;
}

// ── Convenience aliases ───────────────────────────────────────────────────────
// WHY: source files use shorter names; these forwards avoid renaming the originals.
inline float distance(const Vector2& a, const Vector2& b) { return distanceVec(a, b); }
inline Vector2 normalize(const Vector2& v) { return normalizeVec(v); }
inline float clamp(float v, float lo, float hi) { return clampf(v, lo, hi); }
