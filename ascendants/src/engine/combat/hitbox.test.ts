import { describe, expect, it } from 'vitest';
import { HALF_PI } from '../math/trig';
import { vec3 } from '../math/vec3';
import { createFighter } from '../sim/init';
import { bodyCapsule, capsulesOverlap, forwardVector, hitboxCapsule, segmentDistanceSq, toWorld } from './hitbox';

const jab = { offset: vec3(0, 1.25, 0.55), radius: 0.42, length: 0.7, startFrame: 5, endFrame: 6 };

describe('capsule geometry', () => {
  it('measures distance between parallel segments', () => {
    const d = segmentDistanceSq(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 2, 0), vec3(1, 2, 0));
    expect(d).toBeCloseTo(4, 9);
  });

  it('returns zero for crossing segments', () => {
    const d = segmentDistanceSq(vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0));
    expect(d).toBeCloseTo(0, 9);
  });

  it('handles degenerate points', () => {
    const d = segmentDistanceSq(vec3(0, 0, 0), vec3(0, 0, 0), vec3(3, 4, 0), vec3(3, 4, 0));
    expect(d).toBeCloseTo(25, 9);
  });

  it('rotates a local offset a quarter turn', () => {
    const world = toWorld(vec3(0, 0, 1), HALF_PI);
    expect(world.x).toBeCloseTo(1, 6);
    expect(world.z).toBeCloseTo(0, 6);
  });

  it('points the forward vector along +z at zero yaw', () => {
    const f = forwardVector(0);
    expect(f.z).toBeCloseTo(1, 9);
    expect(f.x).toBeCloseTo(0, 9);
  });

  it('connects a jab against an adjacent opponent', () => {
    const attacker = createFighter(0, 'vanta');
    const defender = createFighter(1, 'vanta');
    attacker.pos = vec3(0, 0, 0);
    attacker.facing = 0;
    defender.pos = vec3(0, 0, 1.4);
    expect(capsulesOverlap(hitboxCapsule(attacker, jab), bodyCapsule(defender))).toBe(true);
  });

  it('whiffs the same jab at range', () => {
    const attacker = createFighter(0, 'vanta');
    const defender = createFighter(1, 'vanta');
    attacker.pos = vec3(0, 0, 0);
    attacker.facing = 0;
    defender.pos = vec3(0, 0, 4);
    expect(capsulesOverlap(hitboxCapsule(attacker, jab), bodyCapsule(defender))).toBe(false);
  });

  it('whiffs against an opponent standing behind the attacker', () => {
    const attacker = createFighter(0, 'vanta');
    const defender = createFighter(1, 'vanta');
    attacker.pos = vec3(0, 0, 0);
    attacker.facing = 0;
    defender.pos = vec3(0, 0, -1.4);
    expect(capsulesOverlap(hitboxCapsule(attacker, jab), bodyCapsule(defender))).toBe(false);
  });

  it('whiffs against an opponent far overhead', () => {
    const attacker = createFighter(0, 'vanta');
    const defender = createFighter(1, 'vanta');
    attacker.pos = vec3(0, 0, 0);
    attacker.facing = 0;
    defender.pos = vec3(0, 6, 1.2);
    expect(capsulesOverlap(hitboxCapsule(attacker, jab), bodyCapsule(defender))).toBe(false);
  });
});
