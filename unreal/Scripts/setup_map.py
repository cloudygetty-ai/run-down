"""
RunDown — Populate a test level
================================
Run AFTER the project compiles and a level called "RunDownMap" exists.

This script spawns into the current editor level:
  - 100 PlayerStart actors spread in a grid
  - 1 FractureCore at the map center
  - 6 HelixRelay actors around the map
  - 20 LootDropActor actors scattered randomly

Run in the UE Python console:
    exec(open(r"C:\path\to\run-down\unreal\Scripts\setup_map.py").read())
"""

import unreal
import random

editor_subsystem  = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
level_subsystem   = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actor_factory     = unreal.EditorLevelLibrary

MAP_HALF_SIZE = 15000  # cm — 300m radius map

# ── Helper ────────────────────────────────────────────────────────────────────

def spawn(class_path, x, y, z=0, yaw=0):
    loc = unreal.Vector(x, y, z)
    rot = unreal.Rotator(0, yaw, 0)
    # Use unreal class reference for C++ classes
    asset_class = unreal.load_class(None, class_path)
    if not asset_class:
        unreal.log_warning(f"[RunDown] Could not load class: {class_path}")
        return None
    return unreal.EditorLevelLibrary.spawn_actor_from_class(asset_class, loc, rot)

# ── 100 PlayerStarts on a 10×10 grid ─────────────────────────────────────────

unreal.log("[RunDown] Spawning 100 PlayerStarts...")
spacing = 800  # 8m apart
for row in range(10):
    for col in range(10):
        x = (col - 5) * spacing
        y = (row - 5) * spacing
        yaw = random.uniform(0, 360)
        spawn("/Script/Engine.PlayerStart", x, y, 100, yaw)

# ── FractureCore at center ────────────────────────────────────────────────────

unreal.log("[RunDown] Spawning FractureCore at origin...")
spawn("/Script/RunDown.FractureCore", 0, 0, 50)

# ── 6 HelixRelays around the map ─────────────────────────────────────────────

import math
unreal.log("[RunDown] Spawning 6 HelixRelays...")
relay_radius = 8000
for i in range(6):
    angle = math.radians(i * 60)
    x = math.cos(angle) * relay_radius
    y = math.sin(angle) * relay_radius
    relay = spawn("/Script/RunDown.HelixRelay", x, y, 50)
    if relay:
        relay.set_editor_property("RelayId", f"relay_{i}")

# ── 20 LootDropActors scattered randomly ─────────────────────────────────────

unreal.log("[RunDown] Spawning 20 LootDropActors...")
for i in range(20):
    x = random.uniform(-MAP_HALF_SIZE * 0.6, MAP_HALF_SIZE * 0.6)
    y = random.uniform(-MAP_HALF_SIZE * 0.6, MAP_HALF_SIZE * 0.6)
    loot = spawn("/Script/RunDown.LootDropActor", x, y, 50)
    if loot:
        # Alternate between weapon and material pickups
        loot.set_editor_property("bIsWeapon", i % 3 == 0)
        loot.set_editor_property("MaterialAmount", 75)

# ── Nav Mesh Bounds Volume ────────────────────────────────────────────────────

unreal.log("[RunDown] Spawning NavMeshBoundsVolume...")
nav = spawn("/Script/NavigationSystem.NavMeshBoundsVolume", 0, 0, 1000)
if nav:
    # Scale to cover the full map
    nav.set_actor_scale3d(unreal.Vector(
        MAP_HALF_SIZE / 100,   # UE scale = extent / 100 (box starts at 100cm)
        MAP_HALF_SIZE / 100,
        20                     # 2000cm tall
    ))

# ── Save ──────────────────────────────────────────────────────────────────────

level_subsystem.save_current_level()
unreal.log("[RunDown] Level saved. Open World Settings and set GameMode Override = BP_RunDownGameMode.")
