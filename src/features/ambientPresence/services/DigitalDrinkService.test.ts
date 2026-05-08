import {
  createToken,
  resolveToken,
  isMelted,
  timeRemainingMs,
  progressFraction,
} from './DigitalDrinkService';
import { SONG_DURATION_MS } from '../types';

describe('DigitalDrinkService', () => {
  describe('createToken', () => {
    it('creates a pending token', () => {
      const t = createToken('alice', 'bob', 'bar');
      expect(t.status).toBe('pending');
      expect(t.fromUserId).toBe('alice');
      expect(t.toUserId).toBe('bob');
      expect(t.offer).toBe('bar');
    });

    it('sets expiresAt = sentAt + SONG_DURATION_MS', () => {
      const t = createToken('a', 'b', 'walk');
      expect(t.expiresAt - t.sentAt).toBe(SONG_DURATION_MS);
    });

    it('generates unique ids across calls', () => {
      const t1 = createToken('a', 'b', 'bar');
      const t2 = createToken('a', 'b', 'bar');
      expect(t1.id).not.toBe(t2.id);
    });
  });

  describe('resolveToken', () => {
    it('returns accepted when accepted before expiry', () => {
      const t = createToken('a', 'b', 'coffee');
      const resolved = resolveToken(t, true, t.sentAt + 1000);
      expect(resolved.status).toBe('accepted');
    });

    it('returns melted when declined before expiry', () => {
      const t = createToken('a', 'b', 'walk');
      const resolved = resolveToken(t, false, t.sentAt + 1000);
      expect(resolved.status).toBe('melted');
    });

    it('returns melted even if accepted but past expiry', () => {
      const t = createToken('a', 'b', 'rooftop');
      const resolved = resolveToken(t, true, t.expiresAt + 1);
      expect(resolved.status).toBe('melted');
    });

    it('returns melted exactly at expiry boundary', () => {
      const t = createToken('a', 'b', 'bar');
      const resolved = resolveToken(t, true, t.expiresAt);
      expect(resolved.status).toBe('melted');
    });
  });

  describe('isMelted', () => {
    it('returns false for a fresh pending token', () => {
      const t = createToken('a', 'b', 'bar');
      expect(isMelted(t, t.sentAt + 100)).toBe(false);
    });

    it('returns true past expiry', () => {
      const t = createToken('a', 'b', 'bar');
      expect(isMelted(t, t.expiresAt + 1)).toBe(true);
    });

    it('returns true for an already-melted token regardless of time', () => {
      const t = createToken('a', 'b', 'coffee');
      const melted = resolveToken(t, false, t.sentAt + 1);
      expect(isMelted(melted, t.sentAt + 1)).toBe(true);
    });
  });

  describe('timeRemainingMs', () => {
    it('returns SONG_DURATION_MS immediately after creation', () => {
      const t = createToken('a', 'b', 'bar');
      expect(timeRemainingMs(t, t.sentAt)).toBe(SONG_DURATION_MS);
    });

    it('returns 0 at expiry', () => {
      const t = createToken('a', 'b', 'bar');
      expect(timeRemainingMs(t, t.expiresAt)).toBe(0);
    });

    it('floors at 0 past expiry (no negative)', () => {
      const t = createToken('a', 'b', 'bar');
      expect(timeRemainingMs(t, t.expiresAt + 99999)).toBe(0);
    });
  });

  describe('progressFraction', () => {
    it('returns 1 at creation', () => {
      const t = createToken('a', 'b', 'walk');
      expect(progressFraction(t, t.sentAt)).toBe(1);
    });

    it('returns 0 at expiry', () => {
      const t = createToken('a', 'b', 'walk');
      expect(progressFraction(t, t.expiresAt)).toBe(0);
    });

    it('returns 0.5 at half-life', () => {
      const t = createToken('a', 'b', 'bar');
      const half = t.sentAt + SONG_DURATION_MS / 2;
      expect(progressFraction(t, half)).toBeCloseTo(0.5, 5);
    });
  });
});
