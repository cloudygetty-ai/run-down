"""
RunDown — Wire up BP_GameMode defaults
=======================================
Run AFTER create_operatives.py so the 15 DA_ assets exist.

This script:
  1. Finds or creates /Game/Blueprints/BP_RunDownGameMode
  2. Sets OperativeDataAssets to all 15 DA_ assets
  3. Sets DefaultPawnClass to /Game/Blueprints/BP_RunDownCharacter (if it exists)
  4. Sets HUDClass to /Game/Blueprints/BP_RunDownHUD (if it exists)

Run in the UE Python console:
    exec(open(r"C:\path\to\run-down\unreal\Scripts\setup_gamemode.py").read())
"""

import unreal

OPERATIVES_PATH = "/Game/Operatives"
BP_PATH         = "/Game/Blueprints"

unreal.EditorAssetLibrary.make_directory(BP_PATH)

# ── Load all 15 DA_ assets ────────────────────────────────────────────────────

OPERATIVE_IDS = [
    'Vex','Brutus','Nyra','Kade','Iris','Rook',
    'Talon','Voss','Sable','Orin','Lyric','Magnus',
    'Eira','Jax','Kael',
]

da_assets = []
for op_id in OPERATIVE_IDS:
    path = f"{OPERATIVES_PATH}/DA_{op_id}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        da = unreal.EditorAssetLibrary.load_asset(path)
        if da:
            da_assets.append(da)
            unreal.log(f"[RunDown] Loaded DA_{op_id}")
    else:
        unreal.log_warning(f"[RunDown] DA_{op_id} not found — run create_operatives.py first")

unreal.log(f"[RunDown] Loaded {len(da_assets)}/15 operative data assets")

# ── Find the GameMode blueprint ───────────────────────────────────────────────

gm_path = f"{BP_PATH}/BP_RunDownGameMode"

if not unreal.EditorAssetLibrary.does_asset_exist(gm_path):
    unreal.log_warning(
        "[RunDown] BP_RunDownGameMode not found.\n"
        "Create it manually: Content Browser → Add → Blueprint Class → RunDownGameMode.\n"
        "Then re-run this script to assign the operative array."
    )
else:
    gm_bp = unreal.EditorAssetLibrary.load_asset(gm_path)
    if gm_bp and len(da_assets) > 0:
        # Set the OperativeDataAssets array via CDO (Class Default Object)
        gm_cdo = unreal.get_default_object(gm_bp.generated_class())
        gm_cdo.set_editor_property("OperativeDataAssets", da_assets)
        unreal.EditorAssetLibrary.save_asset(gm_path)
        unreal.log(f"[RunDown] Assigned {len(da_assets)} operatives to BP_RunDownGameMode")

# ── Print summary ─────────────────────────────────────────────────────────────

unreal.log("""
[RunDown] Setup complete.

Remaining manual steps in the editor:
  1. Create BP_RunDownCharacter  (parent: RunDownCharacter)   → assign skeletal mesh + anim BP
  2. Create BP_RunDownBot        (parent: RunDownCharacter)   → simpler mesh, no camera input
  3. Create BP_RunDownHUD        (parent: RunDownHUD)         → assign WBP_MainHUD, WBP_KillFeed
  4. Create IMC_Default          (Input Mapping Context)      → bind all 16 IA_ actions
  5. Set BP_GameMode.BotClass    = BP_RunDownBot
  6. Open Project Settings → Maps & Modes → set default GameMode = BP_RunDownGameMode
  7. Run setup_map.py to populate a test level
""")
