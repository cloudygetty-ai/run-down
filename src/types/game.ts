// Core game entity types for Run Down — a battle royale prototype

export type AbilityEffectType =
  | 'none'
  | 'damage_immunity'  // take zero damage
  | 'speed_boost'      // movement speed multiplied
  | 'rapid_fire'       // fire rate doubled
  | 'damage_boost';    // outgoing damage multiplied

export type CharacterAbility = {
  name: string;
  description: string;
  cooldownMs: number;
  durationMs: number; // 0 = instant effect
  effectType: AbilityEffectType;
};

export type CharacterPassive = {
  description: string;
  maxHealthBonus: number;
  maxShieldBonus: number;
  startingShield: number;
  speedMult: number;
  damageMult: number;
  damageResistance: number; // 0.0–1.0 fraction of incoming damage blocked
  reloadMult: number;       // multiplied into reloadTime (< 1.0 = faster)
  killHealAmount: number;   // HP restored per elimination
  materialsBonus: number;   // extra starting units of each material
};

export type Character = {
  id: string;
  name: string;
  title: string;
  lore: string;
  meteorQuip: string; // what the character says when a meteor strikes nearby
  // Visual identity — local asset require() or remote URL. Null = use color placeholder.
  portraitSource: number | string | null;
  accentColor: string; // hex — drives card border, ability tag, and HUD accent
  passive: CharacterPassive;
  ability: CharacterAbility;
};

export type Vector2 = {
  x: number;
  y: number;
};

export type WeaponType =
  // Melee
  | 'pickaxe'
  // Pistols
  | 'pistol'
  | 'revolver'
  | 'hand_cannon'
  | 'burst_pistol'
  // SMGs
  | 'smg'
  | 'compact_smg'
  | 'suppressed_smg'
  // Assault Rifles
  | 'assault_rifle'
  | 'burst_ar'
  | 'heavy_ar'
  | 'thermal_ar'
  // Shotguns
  | 'shotgun'
  | 'tactical_shotgun'
  | 'heavy_shotgun'
  | 'drum_shotgun'
  // Sniper Rifles
  | 'sniper'
  | 'semi_sniper'
  | 'heavy_sniper'
  | 'hunting_rifle'
  // Marksman / DMR
  | 'marksman_rifle'
  // LMGs
  | 'lmg'
  // Explosives
  | 'rocket_launcher'
  // Special / Exotic
  | 'crossbow'
  | 'minigun'
  | 'rail_gun';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type Weapon = {
  id: string;
  type: WeaponType;
  rarity: Rarity;
  damage: number;
  fireRate: number; // shots per second
  magazineSize: number;
  currentAmmo: number;
  range: number; // max effective range in game units
  reloadTime: number; // ms
  isReloading: boolean;
};

export type BuildingMaterial = 'wood' | 'stone' | 'metal';

export type BuildPieceType = 'wall' | 'floor' | 'ramp';

export type BuildPiece = {
  id: string;
  type: BuildPieceType;
  material: BuildingMaterial;
  position: Vector2;
  rotation: number; // degrees: 0, 90, 180, 270
  health: number;
  maxHealth: number;
  ownerId: string;
};

export type LootDrop = {
  id: string;
  position: Vector2;
  weapon: Weapon | null;
  ammo: number;
  materials: Record<BuildingMaterial, number>;
  shield: number;
  health: number;
};

export type PlayerStatus = 'alive' | 'knocked' | 'eliminated';

export type Player = {
  id: string;
  name: string;
  isHuman: boolean;
  position: Vector2;
  velocity: Vector2;
  rotation: number; // facing direction in degrees
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  status: PlayerStatus;
  weapons: [Weapon | null, Weapon | null, Weapon | null]; // 3 slots
  activeWeaponSlot: 0 | 1 | 2;
  materials: Record<BuildingMaterial, number>;
  kills: number;
  isBuilding: boolean;
  selectedBuildPiece: BuildPieceType;
  selectedBuildMaterial: BuildingMaterial;
  // Character system
  characterId: string;
  damageMult: number;          // outgoing damage multiplier from passive
  damageResistance: number;    // fraction of incoming damage blocked (0.0–1.0)
  killHealAmount: number;      // HP restored per kill
  speedMult: number;           // movement speed multiplier from passive
  reloadMult: number;          // reload time multiplier (< 1.0 = faster)
  abilityChargeMs: number;     // ms until ability is ready again (0 = ready)
  abilityActiveMs: number;     // ms remaining on the active timed effect
  activeAbilityEffect: AbilityEffectType;
  // Fracture Core system
  heldCoreEffect: FractureCoreEffect | null; // buff from a picked-up Fracture Core
  corruptionDps: number;                     // HP drained per second while holding a core
};

export type MeteorType =
  | 'explosive' // standard — deals AoE damage, leaves a Fracture Core
  | 'gravity'   // bends space — creates a Gravity Distortion Field, no AoE damage
  | 'echo';     // rare — creates a Time Echo Zone, no AoE damage

// A meteor still descending — shown as a warning ring before it lands.
export type IncomingMeteor = {
  id: string;
  position: Vector2;
  timeUntilImpactMs: number; // counts down to 0, then converts to a real MeteorImpact
  meteorType: MeteorType;
};

// A single meteor impact crater — shown briefly on the map after a strike
export type MeteorImpact = {
  id: string;
  position: Vector2;
  blastRadius: number;
  age: number; // ms since impact — used to drive the visual animation
  maxAge: number; // ms before the crater fades out
  meteorType: MeteorType;
};

export type FractureCoreEffect =
  | 'cooldown_reduction' // instantly halves ability cooldown; ongoing: charges faster
  | 'damage_amp'         // +40% outgoing damage while held
  | 'ability_mutation';  // triggers a random ability effect for 10s; unpredictable

// Loot left at explosive impact sites. Strong buff, slow corruption.
export type FractureCore = {
  id: string;
  position: Vector2;
  effect: FractureCoreEffect;
  corruptionDps: number; // HP drained per second while this core is held
};

// Created by gravity-type meteors. Slows and pulls players toward the center.
export type GravityZone = {
  id: string;
  position: Vector2;
  radius: number;
  pullStrength: number; // units per tick pulled toward center
  speedMult: number;    // movement speed multiplier inside the zone
  age: number;
  maxAge: number;
};

// Created by echo-type meteors. Causes desync effects for players inside.
export type TimeEchoZone = {
  id: string;
  position: Vector2;
  radius: number;
  age: number;
  maxAge: number;
};

// Helix Dominion's signal tower — players capture it by standing inside.
// Capturing disrupts Helix targeting and spawns a high-tier loot cache.
export type HelixRelay = {
  id: string;
  position: Vector2;
  captureRadius: number;
  captureProgress: number;    // 0.0 → 1.0 (fills over 5 seconds while occupied)
  capturedById: string | null;
  rewardCooldownMs: number;   // ms until it can reward again after capture
};

// A crate airdropped by rogue factions opposing Helix.
// Lands after a delay and holds epic/legendary loot.
export type SupplyDrop = {
  id: string;
  position: Vector2;
  isLanded: boolean;
  landInMs: number;     // countdown ms until impact (positive = descending)
  pickupRadius: number;
  weaponType: WeaponType;
  rarity: Rarity;
};

export type BombardmentPhase = {
  phase: number; // 1-based index
  shelterCenter: Vector2;
  shelterRadius: number;
  impactDamage: number; // hp per meteor strike to players in blast radius
  impactInterval: number; // ms between meteor strikes outside the shelter zone
  shrinkDuration: number; // ms to shrink to next phase
  waitDuration: number; // ms to wait before next shrink
};

// The meteor shower that closes in on players throughout the match.
// Players inside the shelter zone are safe; outside they risk meteor strikes.
export type Bombardment = {
  currentPhase: number;
  shelterCenter: Vector2;
  shelterRadius: number;
  nextShelterCenter: Vector2;
  nextShelterRadius: number;
  isShrinking: boolean;
  shrinkProgress: number; // 0.0 → 1.0
  impactDamage: number;
  impactInterval: number; // ms between meteor strikes
  timeUntilNextImpact: number;
  timeUntilNextPhase: number;
  activeImpacts: MeteorImpact[];
};

export type GamePhase = 'lobby' | 'dropping' | 'playing' | 'game_over';

export type GameResult = {
  placement: number;
  kills: number;
  survivalTimeMs: number;
  winner: string | null;
};

export type MapTile = {
  type: 'ground' | 'water' | 'mountain' | 'building_floor';
  elevation: number;
  hasLoot: boolean;
};

export type GameState = {
  phase: GamePhase;
  selectedCharacterId: string;
  players: Player[];
  buildPieces: BuildPiece[];
  lootDrops: LootDrop[];
  bombardment: Bombardment;
  mapWidth: number;
  mapHeight: number;
  tickCount: number;
  startTime: number; // unix ms
  result: GameResult | null;
  // Derived: how many alive players remain
  alivePlayers: number;
  // Meteor storm hazard objects
  fractureCores: FractureCore[];
  gravityZones: GravityZone[];
  timeEchoZones: TimeEchoZone[];
  // Mid-match objectives
  helixRelays: HelixRelay[];
  supplyDrops: SupplyDrop[];
  nextSupplyDropMs: number;  // countdown until next supply drop spawns
  // Comeback mechanic
  bountyPlayerId: string | null; // highest-kill alive player — bonus loot on elimination
  // Active character quip (displayed briefly after a nearby meteor strike)
  activeQuip: string | null;
  quipTtlMs: number; // ms remaining before quip clears
  // Incoming meteors — warning phase before they land
  incomingMeteors: IncomingMeteor[];
};
