import type { Fighter } from '../types/fighter';
import type { MatchState, Projectile } from '../types/match';

/**
 * Snapshot copying for rollback.
 *
 * Vec3 values are treated as immutable and shared by reference rather than
 * copied: every write site in the simulation replaces the whole vector instead
 * of mutating a component, so two snapshots can safely point at the same
 * position object. That turns the hottest allocation in the rollback path into
 * a pointer copy.
 */

export function cloneFighter(f: Fighter): Fighter {
  return {
    ...f,
    chain: f.chain.slice(),
    connected: f.connected.slice(),
    inputHistory: f.inputHistory.slice(),
  };
}

export function cloneProjectile(p: Projectile): Projectile {
  return { ...p };
}

export function cloneState(state: MatchState): MatchState {
  return {
    ...state,
    fighters: [cloneFighter(state.fighters[0]), cloneFighter(state.fighters[1])],
    projectiles: state.projectiles.map(cloneProjectile),
    // Effects are render-only and rebuilt every frame, so a snapshot starts empty.
    effects: [],
    rng: { ...state.rng },
    finisher: { ...state.finisher },
  };
}
