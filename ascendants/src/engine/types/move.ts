import type { Vec3 } from '../math/vec3';

export type MoveKind =
  | 'normal'      // chainable light/medium/heavy
  | 'command'     // direction + button
  | 'special'     // motion input, costs nothing
  | 'overdrive'   // EX special, costs drive
  | 'super'       // level 3, costs full super meter
  | 'fatal'       // once-per-match cinematic finisher
  | 'blast'       // ki projectile
  | 'beam'        // sustained beam, clashable
  | 'throw'
  | 'driveImpact'
  | 'transform';

/** Motion notation in numpad form, e.g. [2,3,6] for a quarter-circle forward. */
export type Motion = readonly number[];

export type MoveInput = {
  readonly motion: Motion;
  readonly button: number;
  /** Held direction required at the moment of the button press (0 = any). */
  readonly holdDir?: number;
};

/**
 * A capsule hitbox in fighter-local space: +z is forward, +y is up.
 * Active only while the move's frame counter sits inside [startFrame, endFrame].
 */
export type Hitbox = {
  readonly offset: Vec3;
  readonly radius: number;
  readonly length: number;
  readonly startFrame: number;
  readonly endFrame: number;
};

export type HitProps = {
  readonly damage: number;
  readonly chipDamage: number;
  readonly hitstun: number;
  readonly blockstun: number;
  /** Freeze frames applied to both fighters — the "weight" of an impact. */
  readonly hitstop: number;
  readonly pushback: number;
  /** Upward velocity imparted; > 0 launches into a juggle. */
  readonly launch: number;
  readonly juggleCost: number;
  readonly knockdown: boolean;
  readonly wallBounce: boolean;
  readonly guardBreak: boolean;
  readonly kiGainOnHit: number;
  readonly kiGainOnBlock: number;
  /** Drive gauge burned from the defender when this is blocked (SF6 rule). */
  readonly driveDamageOnBlock: number;
};

export type ProjectileSpec = {
  readonly kind: 'blast' | 'beam';
  readonly speed: number;
  readonly radius: number;
  readonly lifetime: number;
  readonly spawnOffset: Vec3;
  /** Radians per frame of tracking toward the target; 0 = straight. */
  readonly homing: number;
  /** Contest weight when two projectiles collide head-on. */
  readonly clashPower: number;
  readonly pierce: boolean;
  readonly hit: HitProps;
};

export type InvulnWindow = {
  readonly start: number;
  readonly end: number;
  readonly kind: 'full' | 'strike' | 'projectile' | 'armor';
  /** Hits absorbed before armor breaks; ignored for non-armor windows. */
  readonly armorHits?: number;
};

export type MoveCost = {
  readonly ki: number;
  readonly drive: number;
  readonly superMeter: number;
};

export type Move = {
  readonly id: string;
  readonly name: string;
  readonly kind: MoveKind;
  readonly input: MoveInput;
  readonly startup: number;
  readonly active: number;
  readonly recovery: number;
  readonly hitboxes: readonly Hitbox[];
  readonly hit: HitProps;
  readonly cost: MoveCost;
  /** Move ids this move may cancel into once it has connected. */
  readonly cancels: readonly string[];
  readonly groundOk: boolean;
  readonly airOk: boolean;
  /** Motion imparted to the user, applied on the first startup frame. */
  readonly travel?: { readonly forward: number; readonly up: number };
  readonly projectile?: ProjectileSpec;
  readonly invuln?: InvulnWindow;
  /** Landing this move ends the round with a cinematic. */
  readonly finisher?: boolean;
};

export function totalFrames(move: Move): number {
  return move.startup + move.active + move.recovery;
}

/** Frame advantage on block: negative means the defender acts first. */
export function onBlock(move: Move): number {
  return move.hit.blockstun - (move.active + move.recovery);
}

/** Frame advantage on hit. */
export function onHit(move: Move): number {
  return move.hit.hitstun - (move.active + move.recovery);
}
