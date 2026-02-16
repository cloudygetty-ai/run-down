import { createInitialStorm, tickStorm } from './StormManager';

const MAP_W = 1600;
const MAP_H = 1600;

describe('StormManager', () => {
  describe('createInitialStorm', () => {
    it('centers the initial safe zone on the map center', () => {
      const storm = createInitialStorm(MAP_W, MAP_H);
      expect(storm.safeZoneCenter.x).toBe(MAP_W / 2);
      expect(storm.safeZoneCenter.y).toBe(MAP_H / 2);
    });

    it('starts with a large radius', () => {
      const storm = createInitialStorm(MAP_W, MAP_H);
      expect(storm.safeZoneRadius).toBeGreaterThan(500);
    });

    it('is not shrinking at start', () => {
      const storm = createInitialStorm(MAP_W, MAP_H);
      expect(storm.isShrinking).toBe(false);
    });

    it('has a valid next safe zone', () => {
      const storm = createInitialStorm(MAP_W, MAP_H);
      expect(storm.nextSafeZoneRadius).toBeLessThan(storm.safeZoneRadius);
    });
  });

  describe('tickStorm', () => {
    it('decrements timeUntilNextPhase when not shrinking', () => {
      const storm = createInitialStorm(MAP_W, MAP_H);
      const updated = tickStorm(storm, 1000, MAP_W, MAP_H);
      expect(updated.timeUntilNextPhase).toBe(storm.timeUntilNextPhase - 1000);
    });

    it('begins shrinking when countdown expires', () => {
      const storm = createInitialStorm(MAP_W, MAP_H);
      const fastForward = tickStorm(storm, storm.timeUntilNextPhase + 100, MAP_W, MAP_H);
      expect(fastForward.isShrinking).toBe(true);
    });

    it('advances phase when shrink completes', () => {
      let storm = createInitialStorm(MAP_W, MAP_H);
      // Force into shrinking state
      storm = { ...storm, isShrinking: true, shrinkProgress: 0 };
      // Advance past full shrink duration
      const done = tickStorm(storm, 999_999, MAP_W, MAP_H);
      expect(done.isShrinking).toBe(false);
      expect(done.currentPhase).toBeGreaterThan(storm.currentPhase);
    });

    it('reduces safe zone radius during shrink', () => {
      let storm = createInitialStorm(MAP_W, MAP_H);
      const initialRadius = storm.safeZoneRadius;
      storm = { ...storm, isShrinking: true, shrinkProgress: 0 };
      const midShrink = tickStorm(storm, 30_000, MAP_W, MAP_H);
      expect(midShrink.safeZoneRadius).toBeLessThan(initialRadius);
    });
  });
});
