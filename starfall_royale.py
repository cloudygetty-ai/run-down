"""
Starfall Royale — Prototype
Battle Royale where a meteor shower replaces the shrinking storm.

Controls:
  WASD / Arrow Keys  — move player
  R                  — restart after game over
  ESC                — quit

Mechanics:
  - Meteors rain down at increasing frequency and size over time.
  - Orange warning circles appear 1.5 s before impact.
  - Grey reinforced structures provide full cover from meteor blasts.
  - Collect green health packs to restore HP.
  - Survive as long as possible — score is time alive in seconds.
"""

import pygame
import random
import math
import sys
from dataclasses import dataclass, field
from typing import List, Optional

# ── Constants ────────────────────────────────────────────────────────────────

SCREEN_W, SCREEN_H = 900, 700
MAP_W, MAP_H = 900, 700
FPS = 60
TITLE = "Starfall Royale"

PLAYER_SPEED = 3.5
PLAYER_RADIUS = 10
PLAYER_MAX_HP = 100

WARN_DURATION = 1.5   # seconds before impact
BASE_SPAWN_INTERVAL = 3.0   # seconds between meteor spawns at t=0
MIN_SPAWN_INTERVAL = 0.35   # floor as game escalates
ESCALATION_RATE = 0.012     # how fast interval shrinks per second of gameplay

BASE_METEOR_RADIUS = 28
MAX_METEOR_RADIUS = 70
RADIUS_ESCALATION = 0.10    # added radius per second, capped at MAX

BLAST_DAMAGE_FULL = 60      # damage at ground zero
BLAST_DAMAGE_EDGE = 15      # damage at blast perimeter

HEALTH_PACK_HP = 35
HEALTH_PACK_COUNT = 6
HEALTH_PACK_RESPAWN = 15.0  # seconds before a consumed pack reappears

# Colour palette
COL_BG          = (14, 10, 6)
COL_GRID        = (22, 18, 14)
COL_SHELTER     = (55, 55, 65)
COL_SHELTER_ROOF= (70, 70, 82)
COL_PLAYER      = (80, 200, 255)
COL_PLAYER_DARK = (40, 130, 200)
COL_WARN_OUTER  = (255, 120, 0, 60)
COL_WARN_INNER  = (255, 50, 0, 120)
COL_METEOR      = (255, 80, 20)
COL_METEOR_CORE = (255, 240, 180)
COL_BLAST       = (255, 160, 40, 80)
COL_HEALTH_PACK = (60, 220, 90)
COL_HP_BAR_BG   = (50, 20, 20)
COL_HP_BAR_FG   = (220, 60, 60)
COL_HP_BAR_HIGH = (60, 220, 80)
COL_WHITE       = (255, 255, 255)
COL_ORANGE      = (255, 140, 0)
COL_RED         = (220, 50, 50)
COL_DARK_GREY   = (40, 40, 40)
COL_GREY        = (120, 120, 120)
COL_YELLOW      = (255, 220, 40)

# ── Data structures ──────────────────────────────────────────────────────────

@dataclass
class Rect:
    x: float
    y: float
    w: float
    h: float

    def contains_point(self, px: float, py: float) -> bool:
        return self.x <= px <= self.x + self.w and self.y <= py <= self.y + self.h

    def to_pygame(self):
        return pygame.Rect(int(self.x), int(self.y), int(self.w), int(self.h))


@dataclass
class Meteor:
    cx: float
    cy: float
    radius: float
    warn_timer: float        # counts down from WARN_DURATION
    impact_done: bool = False
    blast_timer: float = 0.3  # how long the blast ring is visible after impact


@dataclass
class HealthPack:
    x: float
    y: float
    active: bool = True
    respawn_timer: float = 0.0


@dataclass
class Particle:
    x: float
    y: float
    vx: float
    vy: float
    life: float       # current life
    max_life: float
    radius: float
    color: tuple


# ── Shelters (static map layout) ─────────────────────────────────────────────

SHELTERS: List[Rect] = [
    Rect(60,  60,  130, 100),
    Rect(700, 60,  140, 110),
    Rect(60,  540, 120, 100),
    Rect(710, 530, 130, 110),
    Rect(370, 270, 160, 140),   # centre shelter
    Rect(180, 300, 100, 80),
    Rect(620, 310, 110, 80),
    Rect(320, 530, 100, 70),
    Rect(480, 80,  90,  70),
]


# ── Helper functions ──────────────────────────────────────────────────────────

def dist(ax, ay, bx, by) -> float:
    return math.hypot(ax - bx, ay - by)


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


def point_in_any_shelter(px: float, py: float) -> bool:
    for s in SHELTERS:
        if s.contains_point(px, py):
            return True
    return False


def spawn_health_packs() -> List[HealthPack]:
    packs = []
    attempts = 0
    while len(packs) < HEALTH_PACK_COUNT and attempts < 500:
        attempts += 1
        x = random.randint(30, MAP_W - 30)
        y = random.randint(30, MAP_H - 30)
        if not point_in_any_shelter(x, y):
            packs.append(HealthPack(x, y))
    return packs


def lerp_color(c1, c2, t):
    t = clamp(t, 0, 1)
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


# ── Game state ────────────────────────────────────────────────────────────────

class Game:
    def __init__(self, screen: pygame.Surface):
        self.screen = screen
        self.clock = pygame.time.Clock()
        self.font_small = pygame.font.SysFont("Courier New", 14, bold=True)
        self.font_med   = pygame.font.SysFont("Courier New", 20, bold=True)
        self.font_large = pygame.font.SysFont("Courier New", 48, bold=True)
        self.font_xlarge= pygame.font.SysFont("Courier New", 72, bold=True)
        self.reset()

    def reset(self):
        self.player_x = MAP_W / 2
        self.player_y = MAP_H / 2
        self.player_hp = PLAYER_MAX_HP
        self.alive = True
        self.elapsed = 0.0          # total seconds survived
        self.spawn_timer = 0.0      # counts up to next meteor spawn
        self.meteors: List[Meteor] = []
        self.particles: List[Particle] = []
        self.health_packs = spawn_health_packs()
        self.screen_shake = 0.0
        self.score = 0
        self.total_meteors = 0
        self.dodged = 0

    # ── Derived difficulty values ──────────────────────────────────────────

    def spawn_interval(self) -> float:
        return max(MIN_SPAWN_INTERVAL,
                   BASE_SPAWN_INTERVAL - self.elapsed * ESCALATION_RATE)

    def meteor_radius(self) -> float:
        return min(MAX_METEOR_RADIUS,
                   BASE_METEOR_RADIUS + self.elapsed * RADIUS_ESCALATION)

    def danger_level(self) -> float:
        """0.0 = calm  →  1.0 = maximum chaos"""
        return clamp((self.elapsed - 10) / 180, 0, 1)

    # ── Update ────────────────────────────────────────────────────────────

    def update(self, dt: float):
        if not self.alive:
            return

        self.elapsed += dt
        self.score = int(self.elapsed)

        self._handle_input(dt)
        self._update_meteors(dt)
        self._update_health_packs(dt)
        self._update_particles(dt)

        if self.screen_shake > 0:
            self.screen_shake = max(0, self.screen_shake - dt * 18)

        if self.player_hp <= 0:
            self.alive = False

    def _handle_input(self, dt: float):
        keys = pygame.key.get_pressed()
        dx = dy = 0
        if keys[pygame.K_a] or keys[pygame.K_LEFT]:  dx -= 1
        if keys[pygame.K_d] or keys[pygame.K_RIGHT]: dx += 1
        if keys[pygame.K_w] or keys[pygame.K_UP]:    dy -= 1
        if keys[pygame.K_s] or keys[pygame.K_DOWN]:  dy += 1

        if dx != 0 and dy != 0:
            dx *= 0.7071
            dy *= 0.7071

        nx = self.player_x + dx * PLAYER_SPEED
        ny = self.player_y + dy * PLAYER_SPEED
        nx = clamp(nx, PLAYER_RADIUS, MAP_W - PLAYER_RADIUS)
        ny = clamp(ny, PLAYER_RADIUS, MAP_H - PLAYER_RADIUS)
        self.player_x, self.player_y = nx, ny

    def _update_meteors(self, dt: float):
        self.spawn_timer += dt
        if self.spawn_timer >= self.spawn_interval():
            self.spawn_timer = 0.0
            self._spawn_meteor()

        alive_meteors = []
        for m in self.meteors:
            if not m.impact_done:
                m.warn_timer -= dt
                if m.warn_timer <= 0:
                    self._do_impact(m)
                    m.impact_done = True
                alive_meteors.append(m)
            else:
                m.blast_timer -= dt
                if m.blast_timer > 0:
                    alive_meteors.append(m)
                else:
                    self.dodged += 1  # survived this one
        self.meteors = alive_meteors

    def _spawn_meteor(self):
        r = self.meteor_radius()
        cx = random.uniform(r + 10, MAP_W - r - 10)
        cy = random.uniform(r + 10, MAP_H - r - 10)
        self.meteors.append(Meteor(cx, cy, r, WARN_DURATION))
        self.total_meteors += 1

    def _do_impact(self, m: Meteor):
        self.screen_shake = min(self.screen_shake + 0.6, 2.5)

        # Particles
        for _ in range(28):
            angle = random.uniform(0, math.tau)
            speed = random.uniform(40, 180)
            life  = random.uniform(0.4, 1.0)
            r     = random.uniform(2, 6)
            self.particles.append(Particle(
                m.cx, m.cy,
                math.cos(angle) * speed,
                math.sin(angle) * speed,
                life, life, r,
                random.choice([(255, 160, 40), (255, 80, 20), (255, 240, 180)])
            ))

        # Damage player unless in shelter
        if point_in_any_shelter(self.player_x, self.player_y):
            return

        d = dist(self.player_x, self.player_y, m.cx, m.cy)
        blast_r = m.radius * 1.8

        if d <= blast_r:
            t = 1 - (d / blast_r)   # 1 = ground zero, 0 = edge
            dmg = BLAST_DAMAGE_EDGE + (BLAST_DAMAGE_FULL - BLAST_DAMAGE_EDGE) * t
            self.player_hp = max(0, self.player_hp - dmg)

    def _update_health_packs(self, dt: float):
        for hp in self.health_packs:
            if not hp.active:
                hp.respawn_timer -= dt
                if hp.respawn_timer <= 0:
                    hp.active = True
                continue
            if dist(self.player_x, self.player_y, hp.x, hp.y) < PLAYER_RADIUS + 10:
                self.player_hp = min(PLAYER_MAX_HP, self.player_hp + HEALTH_PACK_HP)
                hp.active = False
                hp.respawn_timer = HEALTH_PACK_RESPAWN

    def _update_particles(self, dt: float):
        for p in self.particles:
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.vy += 120 * dt   # gravity
            p.life -= dt
        self.particles = [p for p in self.particles if p.life > 0]

    # ── Draw ──────────────────────────────────────────────────────────────

    def draw(self):
        ox = oy = 0
        if self.screen_shake > 0:
            mag = int(self.screen_shake * 5)
            ox = random.randint(-mag, mag)
            oy = random.randint(-mag, mag)

        surf = pygame.Surface((MAP_W, MAP_H))
        self._draw_world(surf)

        self.screen.fill(COL_BG)
        self.screen.blit(surf, (ox, oy))
        self._draw_hud()

        if not self.alive:
            self._draw_game_over()

        pygame.display.flip()

    def _draw_world(self, surf: pygame.Surface):
        surf.fill(COL_BG)

        # Grid
        for x in range(0, MAP_W, 40):
            pygame.draw.line(surf, COL_GRID, (x, 0), (x, MAP_H))
        for y in range(0, MAP_H, 40):
            pygame.draw.line(surf, COL_GRID, (0, y), (MAP_W, y))

        # Shelters
        for s in SHELTERS:
            r = s.to_pygame()
            pygame.draw.rect(surf, COL_SHELTER, r)
            pygame.draw.rect(surf, COL_SHELTER_ROOF, r, 2)
            lbl = self.font_small.render("SHELTER", True, (90, 90, 105))
            surf.blit(lbl, (r.x + 4, r.y + 4))

        # Warning circles (before impact)
        warn_surf = pygame.Surface((MAP_W, MAP_H), pygame.SRCALPHA)
        for m in self.meteors:
            if not m.impact_done:
                t = 1 - (m.warn_timer / WARN_DURATION)  # 0→1 as impact approaches
                alpha_outer = int(40 + t * 140)
                alpha_inner = int(60 + t * 160)
                blast_r = int(m.radius * 1.8)

                # Outer glow
                pygame.draw.circle(warn_surf, (*COL_ORANGE[:3], alpha_outer),
                                   (int(m.cx), int(m.cy)), blast_r)
                # Inner hot zone
                pygame.draw.circle(warn_surf, (*COL_RED[:3], alpha_inner),
                                   (int(m.cx), int(m.cy)), int(m.radius))

                # Pulsing ring
                ring_r = blast_r - int(t * blast_r * 0.4)
                pygame.draw.circle(warn_surf, (255, 100, 0, int(200 * t)),
                                   (int(m.cx), int(m.cy)), max(2, ring_r), 2)

                # Countdown text
                secs = m.warn_timer
                col = COL_YELLOW if secs > 0.7 else COL_RED
                txt = self.font_small.render(f"{secs:.1f}s", True, col)
                surf.blit(txt, (m.cx - txt.get_width() // 2, m.cy - m.radius - 20))

        surf.blit(warn_surf, (0, 0))

        # Blast rings (after impact)
        blast_surf = pygame.Surface((MAP_W, MAP_H), pygame.SRCALPHA)
        for m in self.meteors:
            if m.impact_done and m.blast_timer > 0:
                t = m.blast_timer / 0.3   # 1→0
                alpha = int(t * 120)
                blast_r = int(m.radius * 1.8 * (1 + (1 - t) * 0.4))
                pygame.draw.circle(blast_surf, (255, 140, 30, alpha),
                                   (int(m.cx), int(m.cy)), blast_r)
                pygame.draw.circle(blast_surf, (255, 200, 80, int(alpha * 1.5)),
                                   (int(m.cx), int(m.cy)), int(m.radius * t), 3)
        surf.blit(blast_surf, (0, 0))

        # Particles
        for p in self.particles:
            t = p.life / p.max_life
            alpha = int(t * 255)
            r = max(1, int(p.radius * t))
            col = lerp_color((50, 30, 0), p.color, t)
            pygame.draw.circle(surf, col, (int(p.x), int(p.y)), r)

        # Health packs
        for hp in self.health_packs:
            if not hp.active:
                continue
            pulse = 0.8 + 0.2 * math.sin(pygame.time.get_ticks() / 300)
            r = int(8 * pulse)
            pygame.draw.circle(surf, COL_HEALTH_PACK, (int(hp.x), int(hp.y)), r)
            pygame.draw.circle(surf, COL_WHITE, (int(hp.x), int(hp.y)), r, 2)
            # cross
            pygame.draw.line(surf, COL_WHITE,
                             (int(hp.x) - 4, int(hp.y)), (int(hp.x) + 4, int(hp.y)), 2)
            pygame.draw.line(surf, COL_WHITE,
                             (int(hp.x), int(hp.y) - 4), (int(hp.x), int(hp.y) + 4), 2)

        # Player shadow
        pygame.draw.circle(surf, (0, 0, 0), (int(self.player_x) + 3, int(self.player_y) + 4),
                           PLAYER_RADIUS, 0)
        # Player body
        in_shelter = point_in_any_shelter(self.player_x, self.player_y)
        body_col = lerp_color(COL_PLAYER, (160, 255, 160), 1 if in_shelter else 0)
        pygame.draw.circle(surf, body_col,
                           (int(self.player_x), int(self.player_y)), PLAYER_RADIUS)
        pygame.draw.circle(surf, COL_PLAYER_DARK,
                           (int(self.player_x), int(self.player_y)), PLAYER_RADIUS, 2)

        if in_shelter:
            lbl = self.font_small.render("SHELTERED", True, (120, 255, 120))
            surf.blit(lbl, (int(self.player_x) - lbl.get_width() // 2,
                            int(self.player_y) - PLAYER_RADIUS - 18))

    def _draw_hud(self):
        # HP bar
        bar_w, bar_h = 200, 18
        bar_x, bar_y = 12, 12
        pygame.draw.rect(self.screen, COL_HP_BAR_BG, (bar_x, bar_y, bar_w, bar_h), border_radius=4)
        hp_frac = self.player_hp / PLAYER_MAX_HP
        fill_col = lerp_color(COL_HP_BAR_FG, COL_HP_BAR_HIGH, hp_frac)
        pygame.draw.rect(self.screen, fill_col,
                         (bar_x, bar_y, int(bar_w * hp_frac), bar_h), border_radius=4)
        pygame.draw.rect(self.screen, COL_WHITE,
                         (bar_x, bar_y, bar_w, bar_h), 1, border_radius=4)
        hp_txt = self.font_small.render(f"HP  {int(self.player_hp)}", True, COL_WHITE)
        self.screen.blit(hp_txt, (bar_x + 6, bar_y + 2))

        # Timer / score
        mins = int(self.elapsed) // 60
        secs = int(self.elapsed) % 60
        time_txt = self.font_med.render(f"{mins:02d}:{secs:02d}", True, COL_WHITE)
        self.screen.blit(time_txt, (SCREEN_W // 2 - time_txt.get_width() // 2, 10))

        # Danger level
        danger = self.danger_level()
        dl_col = lerp_color(COL_GREY, COL_RED, danger)
        dl_txt = self.font_small.render(
            f"INTENSITY  {'▮' * int(danger * 10)}{'▯' * (10 - int(danger * 10))}",
            True, dl_col)
        self.screen.blit(dl_txt, (SCREEN_W - dl_txt.get_width() - 12, 12))

        # Spawn rate
        si_txt = self.font_small.render(
            f"SPAWN  {self.spawn_interval():.2f}s", True, COL_DARK_GREY)
        self.screen.blit(si_txt, (SCREEN_W - si_txt.get_width() - 12, 30))

        # Stats bottom bar
        stats = f"METEORS: {self.total_meteors}    DODGED: {self.dodged}"
        st_txt = self.font_small.render(stats, True, COL_DARK_GREY)
        self.screen.blit(st_txt, (12, SCREEN_H - 22))

        # Controls hint
        hint = self.font_small.render("WASD/ARROWS: move   SHELTER = safe from blasts", True, (50, 50, 50))
        self.screen.blit(hint, (SCREEN_W // 2 - hint.get_width() // 2, SCREEN_H - 22))

    def _draw_game_over(self):
        overlay = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 160))
        self.screen.blit(overlay, (0, 0))

        go_txt = self.font_xlarge.render("YOU FELL", True, COL_RED)
        self.screen.blit(go_txt, (SCREEN_W // 2 - go_txt.get_width() // 2,
                                  SCREEN_H // 2 - 120))

        mins = int(self.score) // 60
        secs = int(self.score) % 60
        sc_txt = self.font_large.render(f"Survived  {mins:02d}:{secs:02d}", True, COL_WHITE)
        self.screen.blit(sc_txt, (SCREEN_W // 2 - sc_txt.get_width() // 2,
                                  SCREEN_H // 2 - 30))

        detail = self.font_med.render(
            f"{self.total_meteors} meteors  —  {self.dodged} survived", True, COL_GREY)
        self.screen.blit(detail, (SCREEN_W // 2 - detail.get_width() // 2,
                                  SCREEN_H // 2 + 50))

        restart = self.font_med.render("Press  R  to restart  |  ESC  to quit", True, COL_ORANGE)
        self.screen.blit(restart, (SCREEN_W // 2 - restart.get_width() // 2,
                                   SCREEN_H // 2 + 110))

    # ── Main loop ────────────────────────────────────────────────────────

    def run(self):
        while True:
            dt = self.clock.tick(FPS) / 1000.0
            dt = min(dt, 0.05)   # cap to avoid spiral-of-death on slow frames

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        pygame.quit()
                        sys.exit()
                    if event.key == pygame.K_r and not self.alive:
                        self.reset()

            self.update(dt)
            self.draw()


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption(TITLE)
    game = Game(screen)
    game.run()


if __name__ == "__main__":
    main()
