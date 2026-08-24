import type { Move } from '../types/move';
import { UNIVERSAL_MOVES } from './universal';
import { VANTA_MOVES } from './specials/vanta';
import { KORVATH_MOVES } from './specials/korvath';
import { SEI_MOVES } from './specials/sei';
import { MARROW_MOVES } from './specials/marrow';
import { TALON_MOVES } from './specials/talon';
import { HELIOS_MOVES } from './specials/helios';

/**
 * The move registry.
 *
 * Character ownership is derived from the id prefix (`vanta.eclipse` belongs to
 * `vanta`, `u.*` belongs to everyone) rather than stored separately, so adding
 * a character cannot desynchronise two lists.
 */

const ALL: readonly Move[] = [
  ...UNIVERSAL_MOVES,
  ...VANTA_MOVES,
  ...KORVATH_MOVES,
  ...SEI_MOVES,
  ...MARROW_MOVES,
  ...TALON_MOVES,
  ...HELIOS_MOVES,
];

const BY_ID = new Map<string, Move>(ALL.map((m) => [m.id, m]));

export const ALL_MOVES = ALL;

export function getMove(id: string): Move {
  const found = BY_ID.get(id);
  if (!found) {
    throw new Error(`Unknown move: ${id}`);
  }
  return found;
}

export function tryGetMove(id: string): Move | undefined {
  return BY_ID.get(id);
}

export function ownerOf(moveId: string): string {
  const dot = moveId.indexOf('.');
  return dot < 0 ? 'u' : moveId.slice(0, dot);
}

/** Universal moves plus the ones belonging to `characterId`. */
export function movesFor(characterId: string): readonly Move[] {
  return ALL.filter((m) => {
    const owner = ownerOf(m.id);
    return owner === 'u' || owner === characterId;
  });
}

/**
 * Resolve a cancel list, expanding the `@special` / `@super` wildcards against
 * the acting character's own kit.
 */
export function resolveCancels(move: Move, characterId: string): readonly string[] {
  const out: string[] = [];
  for (const entry of move.cancels) {
    if (entry === '@special') {
      for (const m of movesFor(characterId)) {
        if (m.kind === 'special' || m.kind === 'blast') {
          out.push(m.id);
        }
      }
    } else if (entry === '@super') {
      for (const m of movesFor(characterId)) {
        if (m.kind === 'super') {
          out.push(m.id);
        }
      }
    } else {
      out.push(entry);
    }
  }
  return out;
}
