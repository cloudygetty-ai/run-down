import { Button } from '../types/input';
import { getCharacter } from './characters';

/**
 * Erasures — one per fighter, all mechanically identical, all flavoured
 * differently. Mechanical parity matters: a finisher that varied in difficulty
 * by character would quietly punish players for their roster choice at the one
 * moment the game is asking them to celebrate.
 */

export type Erasure = {
  readonly id: string;
  readonly characterId: string;
  /** Shown in place of the health bars while the cinematic plays. */
  readonly name: string;
  /** One line of flavour under the title card. */
  readonly caption: string;
  readonly motion: readonly number[];
  readonly button: number;
};

/**
 * The callout, addressed to the winner about the fighter left standing.
 *
 * The pronoun comes from the loser's character sheet rather than a global
 * string, so Marrow — who uses they — reads correctly instead of being forced
 * into a binary the roster does not have.
 */
export function finisherCallout(loserCharacterId: string): string {
  return `PUT ${getCharacter(loserCharacterId).pronoun.toUpperCase()} UNDER.`;
}

/** Neutral form, for menus and copy that has no fighter in scope. */
export const FINISHER_CALLOUT_GENERIC = 'PUT THEM UNDER.';
export const FINISHER_SUBTITLE = 'THE SKY IS STILL OWED';

const QCB = [2, 1, 4];

export const ERASURES: readonly Erasure[] = [
  {
    id: 'erasure.vanta',
    characterId: 'vanta',
    name: 'EVENT SILENCE',
    caption: 'She closes the space where you were standing.',
    motion: QCB,
    button: Button.Ki,
  },
  {
    id: 'erasure.korvath',
    characterId: 'korvath',
    name: 'BURIAL RITE',
    caption: 'The ground opens on request. It does not give anything back.',
    motion: QCB,
    button: Button.Heavy,
  },
  {
    id: 'erasure.sei',
    characterId: 'sei',
    name: 'THE TENTH STEP',
    caption: 'Nine steps get her there. The tenth is for you.',
    motion: QCB,
    button: Button.Medium,
  },
  {
    id: 'erasure.marrow',
    characterId: 'marrow',
    name: 'LONG DARK',
    caption: 'From further away than you ever got to stand.',
    motion: QCB,
    button: Button.Ki,
  },
  {
    id: 'erasure.talon',
    characterId: 'talon',
    name: 'FINAL REPLY',
    caption: 'He never throws the first punch. Only the last one.',
    motion: QCB,
    button: Button.Guard,
  },
  {
    id: 'erasure.helios',
    characterId: 'helios',
    name: 'TOTAL ECLIPSE',
    caption: 'He spends everything he has left. It is more than enough.',
    motion: QCB,
    button: Button.Heavy,
  },
];

const BY_CHARACTER = new Map(ERASURES.map((e) => [e.characterId, e]));

export function erasureFor(characterId: string): Erasure | undefined {
  return BY_CHARACTER.get(characterId);
}

export function erasureById(id: string): Erasure | undefined {
  return ERASURES.find((e) => e.id === id);
}
