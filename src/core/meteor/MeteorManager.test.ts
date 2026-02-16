import { createInitialBombardment, tickBombardment } from './MeteorManager';

const MAP_W = 1600;
const MAP_H = 1600;

describe('MeteorManager', () => {
  describe('createInitialBombardment', () => {
    it('centers the initial shelter zone on the map center', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      expect(b.shelterCenter.x).toBe(MAP_W / 2);
      expect(b.shelterCenter.y).toBe(MAP_H / 2);
    });

    it('starts with a large shelter radius', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      expect(b.shelterRadius).toBeGreaterThan(500);
    });

    it('is not shrinking at start', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      expect(b.isShrinking).toBe(false);
    });

    it('has no active impacts at start', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      expect(b.activeImpacts).toHaveLength(0);
    });

    it('has a valid next shelter zone smaller than current', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      expect(b.nextShelterRadius).toBeLessThan(b.shelterRadius);
    });
  });

  describe('tickBombardment', () => {
    it('decrements timeUntilNextPhase when not shrinking', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const { bombardment } = tickBombardment(b, 1000, MAP_W, MAP_H);
      expect(bombardment.timeUntilNextPhase).toBe(b.timeUntilNextPhase - 1000);
    });

    it('begins shrinking when countdown expires', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const { bombardment } = tickBombardment(b, b.timeUntilNextPhase + 100, MAP_W, MAP_H);
      expect(bombardment.isShrinking).toBe(true);
    });

    it('advances phase when shrink completes', () => {
      let b = createInitialBombardment(MAP_W, MAP_H);
      b = { ...b, isShrinking: true, shrinkProgress: 0 };
      const { bombardment: done } = tickBombardment(b, 999_999, MAP_W, MAP_H);
      expect(done.isShrinking).toBe(false);
      expect(done.currentPhase).toBeGreaterThan(b.currentPhase);
    });

    it('reduces shelter radius during shrink', () => {
      let b = createInitialBombardment(MAP_W, MAP_H);
      const initialRadius = b.shelterRadius;
      b = { ...b, isShrinking: true, shrinkProgress: 0 };
      const { bombardment: mid } = tickBombardment(b, 30_000, MAP_W, MAP_H);
      expect(mid.shelterRadius).toBeLessThan(initialRadius);
    });

    it('spawns a meteor impact when impact timer expires', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      // Force the timer to fire on the next tick
      const earlyImpact = { ...b, timeUntilNextImpact: 10 };
      const { newImpacts } = tickBombardment(earlyImpact, 50, MAP_W, MAP_H);
      expect(newImpacts.length).toBeGreaterThan(0);
    });

    it('spawns impact OUTSIDE the shelter zone', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const earlyImpact = { ...b, timeUntilNextImpact: 10 };
      const { newImpacts, bombardment } = tickBombardment(earlyImpact, 50, MAP_W, MAP_H);
      for (const impact of newImpacts) {
        const dx = impact.position.x - bombardment.shelterCenter.x;
        const dy = impact.position.y - bombardment.shelterCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(bombardment.shelterRadius);
      }
    });

    it('ages existing impacts on each tick', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const earlyImpact = { ...b, timeUntilNextImpact: 10 };
      const { bombardment: after1 } = tickBombardment(earlyImpact, 50, MAP_W, MAP_H);
      const { bombardment: after2 } = tickBombardment(after1, 500, MAP_W, MAP_H);
      if (after2.activeImpacts.length > 0) {
        expect(after2.activeImpacts[0].age).toBeGreaterThan(0);
      }
    });

    it('removes impacts that have exceeded maxAge', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const withOldImpact = {
        ...b,
        activeImpacts: [{
          id: 'old',
          position: { x: 0, y: 0 },
          blastRadius: 45,
          age: 2400,
          maxAge: 2500,
        }],
      };
      const { bombardment } = tickBombardment(withOldImpact, 200, MAP_W, MAP_H);
      expect(bombardment.activeImpacts.find(i => i.id === 'old')).toBeUndefined();
    });
  });
});
