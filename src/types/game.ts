// Core game entity types for Run Down — a battle royale prototype

export type Vector2 = {
  x: number;
  y: number;
};

export type WeaponType = 'assault_rifle' | 'shotgun' | 'sniper' | 'smg' | 'pickaxe';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type Weapon = {
  id: string;
  type: WeaponType;
  rarity: Rarity;
  damage: number;
  fireRate: number;       // shots per second
  magazineSize: number;
  currentAmmo: number;
  range: number;          // max effective range in game units
  reloadTime: number;     // ms
  isReloading: boolean;
};

export type BuildingMaterial = 'wood' | 'stone' | 'metal';

export type BuildPieceType = 'wall' | 'floor' | 'ramp';

export type BuildPiece = {
  id: string;
  type: BuildPieceType;
  material: BuildingMaterial;
  position: Vector2;
  rotation: number;       // degrees: 0, 90, 180, 270
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
  rotation: number;       // facing direction in degrees
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
};

// A single meteor impact crater — shown briefly on the map after a strike
export type MeteorImpact = {
  id: string;
  position: Vector2;
  blastRadius: number;
  age: number;     // ms since impact — used to drive the visual animation
  maxAge: number;  // ms before the crater fades out
};

export type BombardmentPhase = {
  phase: number;           // 1-based index
  shelterCenter: Vector2;
  shelterRadius: number;
  impactDamage: number;    // hp per meteor strike to players in blast radius
  impactInterval: number;  // ms between meteor strikes outside the shelter zone
  shrinkDuration: number;  // ms to shrink to next phase
  waitDuration: number;    // ms to wait before next shrink
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
  shrinkProgress: number;   // 0.0 → 1.0
  impactDamage: number;
  impactInterval: number;   // ms between meteor strikes
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
  players: Player[];
  buildPieces: BuildPiece[];
  lootDrops: LootDrop[];
  bombardment: Bombardment;
  mapWidth: number;
  mapHeight: number;
  tickCount: number;
  startTime: number;    // unix ms
  result: GameResult | null;
  // Derived: how many alive players remain
  alivePlayers: number;
};
