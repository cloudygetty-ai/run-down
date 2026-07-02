"""
RunDown — Create all 15 CharacterDataAsset instances
=====================================================
Run this once inside the Unreal Editor Python console (or as an Editor Utility Script):

    Window → Developer Tools → Output Log → Python console
    paste the full path and run:  exec(open(r"C:\path\to\run-down\unreal\Scripts\create_operatives.py").read())

All 15 DA_ assets are written to /Game/Operatives/.
Open each one in the Content Browser to assign Portrait, CharacterMesh, and CharacterClass later.
"""

import unreal

# ── Helpers ───────────────────────────────────────────────────────────────────

def hex_to_linear(h):
    h = h.lstrip('#')
    r, g, b = int(h[0:2],16)/255, int(h[2:4],16)/255, int(h[4:6],16)/255
    return unreal.LinearColor(r, g, b, 1.0)

EFFECT = {
    'none':             unreal.AbilityEffectType.NONE,
    'damage_immunity':  unreal.AbilityEffectType.DAMAGE_IMMUNITY,
    'damage_boost':     unreal.AbilityEffectType.DAMAGE_BOOST,
    'rapid_fire':       unreal.AbilityEffectType.RAPID_FIRE,
    'speed_boost':      unreal.AbilityEffectType.SPEED_BOOST,
}

DEST = "/Game/Operatives"
unreal.EditorAssetLibrary.make_directory(DEST)

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

def make_da(op_id, name, title, headgear, lore, quip, accent,
            passive_desc, max_hp=0, max_sh=0, start_sh=0,
            spd=1.0, dmg=1.0, res=0.0, rel=1.0, kill_hp=0, mats=0,
            ab_name="", ab_desc="", cooldown_ms=20000, duration_ms=0, effect='none'):

    asset_name = f"DA_{op_id.capitalize()}"
    full_path  = f"{DEST}/{asset_name}"

    # Skip if already exists
    if unreal.EditorAssetLibrary.does_asset_exist(full_path):
        unreal.log(f"[RunDown] {asset_name} already exists — skipping")
        return unreal.EditorAssetLibrary.load_asset(full_path)

    factory = unreal.DataAssetFactory()
    factory.data_asset_class = unreal.CharacterDataAsset
    da = asset_tools.create_asset(asset_name, DEST, unreal.CharacterDataAsset, factory)
    if not da:
        unreal.log_error(f"[RunDown] Failed to create {asset_name}")
        return None

    da.operative_id   = op_id
    da.operative_name = name
    da.title          = title
    da.headgear_type  = headgear
    da.lore           = lore
    da.meteor_quip    = quip
    da.accent_color   = hex_to_linear(accent)

    passive = unreal.CharacterPassive()
    passive.description      = passive_desc
    passive.max_health_bonus = float(max_hp)
    passive.max_shield_bonus = float(max_sh)
    passive.starting_shield  = float(start_sh)
    passive.speed_multiplier = float(spd)
    passive.damage_multiplier= float(dmg)
    passive.damage_resistance= float(res)
    passive.reload_multiplier= float(rel)
    passive.kill_heal_amount = float(kill_hp)
    passive.materials_bonus  = int(mats)
    da.passive = passive

    ability = unreal.CharacterAbility()
    ability.name        = ab_name
    ability.description = ab_desc
    ability.cooldown_sec= cooldown_ms / 1000.0
    ability.duration_sec= duration_ms / 1000.0
    ability.effect_type = EFFECT.get(effect, unreal.AbilityEffectType.NONE)
    da.ability = ability

    unreal.EditorAssetLibrary.save_asset(da.get_path_name())
    unreal.log(f"[RunDown] Created {asset_name}")
    return da

# ── 15 operatives ─────────────────────────────────────────────────────────────

make_da(
    'vex', 'Vex "Glitch" Calder', 'The Phantom', 'ECHO VISOR',
    'Quantum systems engineer who learned to weaponize lag. Blinks in and out of reality like a bad signal.',
    'I felt that before it landed. I hate this.', '#aa44ff',
    'Unstable signal. +10% movement speed and 25% faster reloads.',
    spd=1.1, rel=0.75,
    ab_name='Phase Skip',
    ab_desc='Teleports forward 250 units and leaves a decoy echo at the origin.',
    cooldown_ms=14000, duration_ms=0, effect='none',
)

make_da(
    'brutus', 'Brutus Hale', 'The Wall', 'IMPACT SHELL',
    'Walked through a building collapse once. The building lost.',
    'Good. Something to hit back.', '#888888',
    'Ironclad frame. +80 max HP.',
    max_hp=80,
    ab_name='Titan Guard',
    ab_desc='Deploys a frontal energy shield, absorbing all incoming damage for 6 seconds before releasing it as a shockwave.',
    cooldown_ms=28000, duration_ms=6000, effect='damage_immunity',
)

make_da(
    'nyra', 'Nyra Solis', 'The Solar', 'SOLAR CROWN',
    'Channelled solar energy into her biology. Warm to the touch. Lethal at range.',
    "A core. Finally. Stay back — it's mine.", '#ffaa00',
    'Solar resilience. Starts each match with 75 shield.',
    start_sh=75,
    ab_name='Solar Bloom',
    ab_desc='Emits a healing flare — instantly restores 60 HP — while enemies within range are marked for +40% bonus damage for 5 seconds.',
    cooldown_ms=22000, duration_ms=5000, effect='damage_boost',
)

make_da(
    'kade', 'Kade "Lockjaw" Mercer', 'The Tracker', "HUNTER'S MASK",
    'Never loses a mark. Patience measured in days. Mercy measured in zero.',
    'Sky just did my job for me.', '#cc6633',
    'Efficient hunter. Each elimination restores 15 HP.',
    kill_hp=15,
    ab_name='Trapline',
    ab_desc='Activates hidden snares — marks all enemies and increases outgoing damage by 40% for 6 seconds.',
    cooldown_ms=18000, duration_ms=6000, effect='damage_boost',
)

make_da(
    'iris', 'Iris Venn', 'The Fracture', 'FRACTURE LENS',
    'Psy-ops operator. Convinced three people they were somewhere else simultaneously.',
    'Controlled impact. Someone aimed that.', '#cc44aa',
    'Misdirection mastery. 15% of all incoming damage is deflected.',
    res=0.15,
    ab_name='Mind Fracture',
    ab_desc='Deploys hallucinations — enemies cannot accurately target for 4 seconds, effectively granting damage immunity.',
    cooldown_ms=20000, duration_ms=4000, effect='damage_immunity',
)

make_da(
    'rook', 'Rook Ashfall', 'The Smoke', 'SMOKE COWL',
    'Tactical specialist. Controls terrain. The smoke is never random.',
    'New cover. Adapt.', '#446688',
    'Prepared entry. +20 max HP and +20 max shield.',
    max_hp=20, max_sh=20,
    ab_name='Smoke Reign',
    ab_desc='Blankets the area — grants damage immunity for 3 seconds and doubles movement speed within the smoke.',
    cooldown_ms=16000, duration_ms=3000, effect='damage_immunity',
)

make_da(
    'talon', 'Talon Rhee', 'The Predator', 'PREDATOR HOOD',
    'Apex hunter from a collapsed nation. Tracks by sound. Closes in silence.',
    'Flushed them right out. Efficient.', '#882222',
    'Predator instinct. All weapons deal +15% damage.',
    dmg=1.15,
    ab_name='Predator Leap',
    ab_desc='Launches forward 200 units and marks the target, increasing all damage dealt to them by 50% for 5 seconds.',
    cooldown_ms=15000, duration_ms=5000, effect='damage_boost',
)

make_da(
    'voss', 'Dr. Quillan "Pulse" Voss', 'The Surgeon', 'MEDIC DOME',
    'Field surgeon who operates on himself between engagements. The stitches are self-dissolving.',
    'Triage priority just changed.', '#4488ff',
    'Biological optimization. +25 max HP and starts with 50 shield.',
    max_hp=25, start_sh=50,
    ab_name='Bio Surge',
    ab_desc='Sends a restorative wave — instantly heals 80 HP.',
    cooldown_ms=20000, duration_ms=0, effect='none',
)

make_da(
    'sable', 'Sable Korr', 'The Tether', 'INTEL CAP',
    'Former intelligence broker. Knows that information shared is pain shared.',
    'Accelerated evolution. The weak are being selected out.', '#9933cc',
    'Precision focus. Weapon reloads 20% faster.',
    rel=0.8,
    ab_name='Shadow Bind',
    ab_desc='Tethers enemies — damage dealt to any target is increased by 45% for 5 seconds as the bind amplifies all hits.',
    cooldown_ms=18000, duration_ms=5000, effect='damage_boost',
)

make_da(
    'orin', 'Orin "Scrap" Dax', 'The Salvager', 'SCRAP HELM',
    'Built his first weapon from a vending machine and a door hinge. Still uses it.',
    "Free parts. I'll take it.", '#cc8800',
    'Resource specialist. Starts with triple building materials.',
    mats=200,
    ab_name='Junk Fortress',
    ab_desc='Scavenges nearby debris — instantly grants +100 of each building material.',
    cooldown_ms=15000, duration_ms=0, effect='none',
)

make_da(
    'lyric', 'Lyric Vale', 'The Resonance', 'RESONANCE BAND',
    'Sound engineer turned soldier. The blast radius is calculated, not accidental.',
    'Beautiful resonance. Terrible timing.', '#44ccaa',
    'Sonic amplification. All weapons deal +20% damage.',
    dmg=1.2,
    ab_name='Sonic Crescendo',
    ab_desc='Charges a focused sound blast — knocks back nearby enemies and deals +50% weapon damage for 5 seconds.',
    cooldown_ms=20000, duration_ms=5000, effect='damage_boost',
)

make_da(
    'magnus', 'Magnus Drift', 'The Gravity', 'GRAVITY VISOR',
    'Physicist who discovered the practical applications of his research. Immediately regretted it.',
    'This is my fault. Again.', '#6644ff',
    'Gravitational mass. +25% weapon damage, -10% movement speed.',
    dmg=1.25, spd=0.9,
    ab_name='Gravity Well',
    ab_desc='Pulls enemies toward a central point — all pulled targets take +50% weapon damage for 5 seconds.',
    cooldown_ms=22000, duration_ms=5000, effect='damage_boost',
)

make_da(
    'eira', 'Eira Frost', 'The Glacier', 'CRYO SHELL',
    'Cryogenic containment specialist. The "containment" part is optional.',
    'Heat. I despise heat.', '#44ddff',
    'Ice armor. 20% of all incoming damage is deflected.',
    res=0.2,
    ab_name='Cryo Veil',
    ab_desc='Freezes the surrounding ground — grants damage immunity for 4 seconds and creates ice barriers that block bullets.',
    cooldown_ms=20000, duration_ms=4000, effect='damage_immunity',
)

make_da(
    'jax', 'Jax "Overclock" Renn', 'The Overclocked', 'OVERCLOCK CROWN',
    'Neural augmentations pushed past rated limits. The tremor in his hands is from the speed, not the fear.',
    "HA. Let's go again.", '#ff4400',
    'Overclocked systems. +25% movement speed.',
    spd=1.25,
    ab_name='Adrenal Override',
    ab_desc='Pushes all systems past the limit — doubles fire rate and movement speed for 5 seconds, but drains 5 HP per second during the effect.',
    cooldown_ms=20000, duration_ms=5000, effect='rapid_fire',
)

make_da(
    'kael', 'Kael Umbra', 'The Void', 'VOID COWL',
    'Emerged from a void experiment intact. Mostly. The parts that changed are the useful parts.',
    'The void remembers this energy.', '#220044',
    'Void-touched. 15% damage resistance and 20% faster reloads.',
    res=0.15, rel=0.8,
    ab_name='Void Step',
    ab_desc='Becomes intangible for 5 seconds — grants damage immunity and passes through all obstacles.',
    cooldown_ms=25000, duration_ms=5000, effect='damage_immunity',
)

unreal.log("[RunDown] All 15 operatives created in /Game/Operatives/")
