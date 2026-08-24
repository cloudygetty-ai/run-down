import type { Fighter } from '../types/fighter';
import type { MatchState } from '../types/match';

/**
 * State checksum for desync detection.
 *
 * Rollback's failure mode is silent: two peers drift apart and keep playing
 * different games. Hashing the confirmed state every frame and comparing the
 * value with the opponent turns that into a loud, immediate error.
 *
 * Floats are hashed by their exact bit pattern rather than a rounded value —
 * the whole point is to catch a one-ULP divergence on the frame it happens,
 * not after it has grown large enough to see.
 */

const scratch = new Float64Array(1);
const scratchBytes = new Uint32Array(scratch.buffer);

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function mix(hash: number, value: number): number {
  return Math.imul(hash ^ (value >>> 0), FNV_PRIME) >>> 0;
}

function mixFloat(hash: number, value: number): number {
  scratch[0] = value;
  return mix(mix(hash, scratchBytes[0] ?? 0), scratchBytes[1] ?? 0);
}

function mixString(hash: number, value: string): number {
  let h = hash;
  for (let i = 0; i < value.length; i++) {
    h = mix(h, value.charCodeAt(i));
  }
  return h;
}

function mixFighter(hash: number, f: Fighter): number {
  let h = mixString(hash, f.characterId);
  h = mixFloat(h, f.pos.x);
  h = mixFloat(h, f.pos.y);
  h = mixFloat(h, f.pos.z);
  h = mixFloat(h, f.vel.x);
  h = mixFloat(h, f.vel.y);
  h = mixFloat(h, f.vel.z);
  h = mixFloat(h, f.facing);
  h = mixString(h, f.state);
  h = mixString(h, f.moveId ?? '-');
  h = mixFloat(h, f.health);
  h = mixFloat(h, f.ki);
  h = mixFloat(h, f.drive);
  h = mixFloat(h, f.superMeter);
  h = mix(h, f.stateFrame);
  h = mix(h, f.moveFrame);
  h = mix(h, f.stun);
  h = mix(h, f.hitstop);
  h = mix(h, f.juggle);
  h = mix(h, f.comboHits);
  h = mix(h, f.burnout);
  h = mix(h, f.armor);
  h = mix(h, f.wins);
  h = mix(h, f.grounded ? 1 : 0);
  h = mix(h, f.flying ? 1 : 0);
  h = mix(h, f.transformed ? 1 : 0);
  h = mix(h, f.fatalUsed ? 1 : 0);
  for (const id of f.connected) {
    h = mix(h, id);
  }
  return h;
}

export function checksum(state: MatchState): number {
  let h = FNV_OFFSET;
  h = mix(h, state.frame);
  h = mixString(h, state.phase);
  h = mix(h, state.phaseFrame);
  h = mix(h, state.round);
  h = mix(h, state.timer);
  h = mix(h, state.finisher.window);
  h = mix(h, state.finisher.performer + 1);
  h = mixString(h, state.finisher.performed ?? '-');
  h = mixFighter(h, state.fighters[0]);
  h = mixFighter(h, state.fighters[1]);
  for (const p of state.projectiles) {
    h = mix(h, p.id);
    h = mixFloat(h, p.pos.x);
    h = mixFloat(h, p.pos.y);
    h = mixFloat(h, p.pos.z);
    h = mix(h, p.life);
    h = mix(h, p.clashWith + 1);
  }
  h = mix(h, state.rng.a);
  h = mix(h, state.rng.d);
  return h >>> 0;
}
