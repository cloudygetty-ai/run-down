import {
  DigitalDrinkToken,
  DigitalDrinkOffer,
  DigitalDrinkStatus,
  SONG_DURATION_MS,
} from '../types';

function makeTokenId(): string {
  return `token_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createToken(
  fromUserId: string,
  toUserId: string,
  offer: DigitalDrinkOffer,
): DigitalDrinkToken {
  const now = Date.now();
  return {
    id: makeTokenId(),
    fromUserId,
    toUserId,
    offer,
    sentAt: now,
    expiresAt: now + SONG_DURATION_MS,
    status: 'pending',
  };
}

// Resolves a token to 'accepted' or 'melted'. Expired tokens always melt.
export function resolveToken(
  token: DigitalDrinkToken,
  accept: boolean,
  now = Date.now(),
): DigitalDrinkToken {
  const expired = now >= token.expiresAt;
  const status: DigitalDrinkStatus = !expired && accept ? 'accepted' : 'melted';
  return { ...token, status };
}

export function isMelted(token: DigitalDrinkToken, now = Date.now()): boolean {
  return token.status === 'melted' || now >= token.expiresAt;
}

export function timeRemainingMs(token: DigitalDrinkToken, now = Date.now()): number {
  return Math.max(0, token.expiresAt - now);
}

export function progressFraction(token: DigitalDrinkToken, now = Date.now()): number {
  return timeRemainingMs(token, now) / SONG_DURATION_MS;
}
