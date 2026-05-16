import { createInitialBombardment, tickBombardment, tickIncomingMeteors } from './MeteorManager';
import { METEOR_WARNING_MS } from '../balance';

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

    it('spawns an IncomingMeteor (not an instant impact) when timer expires', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const earlyImpact = { ...b, timeUntilNextImpact: 10 };
      const { newIncoming } = tickBombardment(earlyImpact, 50, MAP_W, MAP_H);
      expect(newIncoming.length).toBeGreaterThan(0);
    });

    it('incoming meteor has a warning countdown equal to METEOR_WARNING_MS', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const earlyImpact = { ...b, timeUntilNextImpact: 10 };
      const { newIncoming } = tickBombardment(earlyImpact, 50, MAP_W, MAP_H);
      expect(newIncoming[0].timeUntilImpactMs).toBe(METEOR_WARNING_MS);
    });

    it('incoming meteor spawns OUTSIDE the shelter zone', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const earlyImpact = { ...b, timeUntilNextImpact: 10 };
      const { newIncoming, bombardment } = tickBombardment(earlyImpact, 50, MAP_W, MAP_H);
      for (const m of newIncoming) {
        const dx = m.position.x - bombardment.shelterCenter.x;
        const dy = m.position.y - bombardment.shelterCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(bombardment.shelterRadius);
      }
    });

    it('ages existing impacts on each tick', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const withImpact = {
        ...b,
        activeImpacts: [{ id: 'i1', position: { x: 0, y: 0 }, blastRadius: 45, age: 0, maxAge: 2500, meteorType: 'explosive' as const }],
      };
      const { bombardment: after } = tickBombardment(withImpact, 500, MAP_W, MAP_H);
      expect(after.activeImpacts[0].age).toBe(500);
    });

    it('removes impacts that have exceeded maxAge', () => {
      const b = createInitialBombardment(MAP_W, MAP_H);
      const withOldImpact = {
        ...b,
        activeImpacts: [{ id: 'old', position: { x: 0, y: 0 }, blastRadius: 45, age: 2400, maxAge: 2500, meteorType: 'explosive' as const }],
      };
      const { bombardment } = tickBombardment(withOldImpact, 200, MAP_W, MAP_H);
      expect(bombardment.activeImpacts.find((i) => i.id === 'old')).toBeUndefined();
    });
  });

  describe('tickIncomingMeteors', () => {
    it('keeps meteors with remaining countdown in stillPending', () => {
      const incoming = [{ id: 'm1', position: { x: 100, y: 100 }, timeUntilImpactMs: 1000, meteorType: 'explosive' as const }];
      const { stillPending, newImpacts } = tickIncomingMeteors(incoming, 500);
      expect(stillPending).toHaveLength(1);
      expect(stillPending[0].timeUntilImpactMs).toBe(500);
      expect(newImpacts).toHaveLength(0);
    });

    it('graduates meteors whose countdown hits 0 into newImpacts', () => {
      const incoming = [{ id: 'm2', position: { x: 200, y: 300 }, timeUntilImpactMs: 100, meteorType: 'gravity' as const }];
      const { stillPending, newImpacts } = tickIncomingMeteors(incoming, 200);
      expect(stillPending).toHaveLength(0);
      expect(newImpacts).toHaveLength(1);
      expect(newImpacts[0].id).toBe('m2');
      expect(newImpacts[0].meteorType).toBe('gravity');
    });

    it('preserves position and meteorType through graduation', () => {
      const pos = { x: 777, y: 888 };
      const incoming = [{ id: 'mx', position: pos, timeUntilImpactMs: 50, meteorType: 'echo' as const }];
      const { newImpacts } = tickIncomingMeteors(incoming, 100);
      expect(newImpacts[0].position).toEqual(pos);
      expect(newImpacts[0].meteorType).toBe('echo');
    });
  });
});
