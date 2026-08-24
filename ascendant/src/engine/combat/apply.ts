import { ARENA_RADIUS, JUGGLE_LIMIT, SUPER_GAIN_ON_TAKE, SUPER_GAIN_PER_DAMAGE, SUPER_MAX, TRANSFORM_DAMAGE_MULT } from '../data/constants';
import type { CharacterStats } from '../data/characters';
import { scale } from '../math/vec3';
import type { Fighter } from '../types/fighter';
import type { HitProps, Move } from '../types/move';
import type { EffectEvent } from '../types/match';
import { applyChip, applyDamage, computeDamage } from './damage';
import { drainDrive, gainDrive } from './drive';
import { gainKi } from './ki';
import { forwardVector } from './hitbox';

/** Everything the resolver needs that is not on the fighters themselves. */
export type CombatContext = {
  readonly stats: readonly [CharacterStats, CharacterStats];
  readonly effects: EffectEvent[];
};

const COUNTER_DAMAGE_MULT = 1.25;
const COUNTER_HITSTUN_BONUS = 6;
const ATTACKER_DRIVE_ON_HIT = 120;
const WALL_BOUNCE_MARGIN = 3;

function pushApart(attacker: Fighter, defender: Fighter, amount: number): void {
  const dir = forwardVector(attacker.facing);
  const impulse = scale(dir, amount);
  defender.vel = {
    x: defender.vel.x + impulse.x,
    y: defender.vel.y,
    z: defender.vel.z + impulse.z,
  };
}

function nearWall(fighter: Fighter): boolean {
  const r = Math.sqrt(fighter.pos.x * fighter.pos.x + fighter.pos.z * fighter.pos.z);
  return r > ARENA_RADIUS - WALL_BOUNCE_MARGIN;
}

function addSuper(fighter: Fighter, amount: number): void {
  fighter.superMeter = Math.min(SUPER_MAX, fighter.superMeter + amount);
}

export function applyHit(
  attacker: Fighter,
  defender: Fighter,
  move: Move,
  props: HitProps,
  ctx: CombatContext,
  counter: boolean,
): void {
  const attackerStats = ctx.stats[attacker.index];
  const defenderStats = ctx.stats[defender.index];
  const ignoreScaling = move.kind === 'super' || move.kind === 'fatal';

  const base = props.damage * (counter ? COUNTER_DAMAGE_MULT : 1);
  const dealt = applyDamage(
    defender,
    computeDamage({
      base,
      hitIndex: defender.comboHits,
      attackerStats,
      defenderStats,
      attackerTransformed: attacker.transformed,
      transformMult: TRANSFORM_DAMAGE_MULT,
      ignoreScaling,
    }),
  );

  defender.comboHits += 1;
  defender.comboDamage += dealt;

  // Juggles decay: once the limit is passed the victim simply falls out,
  // which is what stops a good launcher from becoming an infinite.
  const juggleExhausted = defender.juggle >= JUGGLE_LIMIT;
  const hitstun = juggleExhausted
    ? Math.floor(props.hitstun * 0.5)
    : props.hitstun + (counter ? COUNTER_HITSTUN_BONUS : 0);

  defender.stun = hitstun;
  defender.hitstop = props.hitstop;
  attacker.hitstop = props.hitstop;
  defender.moveId = null;
  defender.moveFrame = 0;
  defender.chain.length = 0;
  defender.armor = 0;

  const launching = props.launch > 0 && !juggleExhausted;
  if (launching) {
    defender.vel = { x: defender.vel.x, y: props.launch / defenderStats.weight, z: defender.vel.z };
    defender.grounded = false;
    defender.flying = false;
  }

  if (!defender.grounded) {
    defender.juggle += props.juggleCost;
  }

  const knockdown = props.knockdown || juggleExhausted;
  defender.state = launching || !defender.grounded ? 'launched' : knockdown ? 'knockdown' : 'hitstun';
  defender.stateFrame = 0;

  // Wall bounce only pays off with the opponent cornered — the reward for
  // winning the positioning battle rather than a property of the button.
  const bounce = props.wallBounce && nearWall(defender);
  pushApart(attacker, defender, (props.pushback * (bounce ? -0.6 : 1)) / defenderStats.weight);
  if (bounce) {
    defender.stun += 14;
    ctx.effects.push({ kind: 'launch', pos: defender.pos, power: 1, owner: attacker.index });
  }

  gainKi(attacker, props.kiGainOnHit);
  gainKi(defender, props.kiGainOnHit * 0.5);
  gainDrive(attacker, ATTACKER_DRIVE_ON_HIT);
  addSuper(attacker, dealt * SUPER_GAIN_PER_DAMAGE);
  addSuper(defender, dealt * SUPER_GAIN_ON_TAKE);

  ctx.effects.push({
    kind: counter ? 'launch' : 'impact',
    pos: defender.pos,
    power: Math.min(2, dealt / 80),
    owner: attacker.index,
  });
}

export function applyBlock(
  attacker: Fighter,
  defender: Fighter,
  props: HitProps,
  ctx: CombatContext,
  burnoutBonus: number,
): void {
  applyChip(defender, props.chipDamage);
  defender.stun = props.blockstun + burnoutBonus;
  defender.state = 'blockstun';
  defender.stateFrame = 0;
  defender.hitstop = Math.floor(props.hitstop * 0.6);
  attacker.hitstop = Math.floor(props.hitstop * 0.6);

  drainDrive(defender, props.driveDamageOnBlock);
  gainKi(defender, props.kiGainOnBlock);
  gainKi(attacker, props.kiGainOnBlock);
  pushApart(attacker, defender, props.pushback * 1.15);

  ctx.effects.push({ kind: 'block', pos: defender.pos, power: 1, owner: defender.index });
}

/** A successful Drive Parry: no damage, no stun, and a full bar of Drive back. */
export function applyParry(
  attacker: Fighter,
  defender: Fighter,
  props: HitProps,
  ctx: CombatContext,
  driveGain: number,
): void {
  gainDrive(defender, driveGain);
  defender.hitstop = props.hitstop;
  attacker.hitstop = props.hitstop + 4;
  defender.stun = 0;
  ctx.effects.push({ kind: 'parry', pos: defender.pos, power: 1.5, owner: defender.index });
}

/** Armor absorbs the hit: damage lands at a discount, the flow does not break. */
export function applyArmor(
  attacker: Fighter,
  defender: Fighter,
  props: HitProps,
  ctx: CombatContext,
): void {
  defender.armor -= 1;
  applyDamage(defender, Math.round(props.damage * 0.35));
  defender.hitstop = props.hitstop;
  attacker.hitstop = props.hitstop;
  gainKi(defender, 4);
  ctx.effects.push({ kind: 'block', pos: defender.pos, power: 1.4, owner: defender.index });
}
