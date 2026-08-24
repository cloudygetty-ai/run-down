import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../engine/sim/init';
import { Button, NEUTRAL_INPUT, type PlayerInput } from '../engine/types/input';
import { MAX_ROLLBACK_FRAMES, RollbackSession } from './rollback';

const config = defaultConfig();

function scriptA(frame: number): PlayerInput {
  return {
    dir: [5, 6, 6, 2, 3, 6, 5, 4][frame % 8] ?? 5,
    buttons: frame % 9 === 0 ? Button.Light : frame % 14 === 0 ? Button.Ki : 0,
  };
}

function scriptB(frame: number): PlayerInput {
  return {
    dir: [5, 4, 8, 6, 5, 2, 6, 5][frame % 8] ?? 5,
    buttons: frame % 11 === 0 ? Button.Medium : frame % 21 === 0 ? Button.Guard : 0,
  };
}

/**
 * Run two peers against each other with the network delaying every remote
 * input by `delay` frames, then flush the in-flight inputs and let both settle.
 *
 * Comparisons must be made against the last CONFIRMED frame, never the live
 * one: by definition the newest frame on each peer still contains a prediction
 * of the other's input, so the two are expected to disagree there.
 */
function playMatch(frames: number, delay: number) {
  const peer0 = new RollbackSession(config, 0);
  const peer1 = new RollbackSession(config, 1);

  for (let frame = 0; frame < frames; frame++) {
    peer0.addLocalInput(frame, scriptA(frame));
    peer1.addLocalInput(frame, scriptB(frame));

    const arriving = frame - delay;
    if (arriving >= 0) {
      peer0.addRemoteInput(arriving, scriptB(arriving));
      peer1.addRemoteInput(arriving, scriptA(arriving));
    }

    peer0.advance();
    peer1.advance();
  }

  // Flush the inputs still in flight, then give each peer a frame to correct.
  for (let frame = Math.max(0, frames - delay); frame < frames; frame++) {
    peer0.addRemoteInput(frame, scriptB(frame));
    peer1.addRemoteInput(frame, scriptA(frame));
  }
  peer0.addLocalInput(frames, scriptA(frames));
  peer1.addLocalInput(frames, scriptB(frames));
  peer0.advance();
  peer1.advance();

  return { peer0, peer1 };
}

describe('rollback session', () => {
  it('converges to an identical match on both peers despite delay', () => {
    const frames = 600;
    const { peer0, peer1 } = playMatch(frames, 4);
    expect(peer0.frame).toBe(peer1.frame);
    const a = peer0.checksumAt(frames - 1);
    expect(a).toBeDefined();
    expect(a).toBe(peer1.checksumAt(frames - 1));
  });

  it('still converges under heavy delay', () => {
    const frames = 400;
    const { peer0, peer1 } = playMatch(frames, MAX_ROLLBACK_FRAMES - 1);
    const a = peer0.checksumAt(frames - 1);
    expect(a).toBeDefined();
    expect(a).toBe(peer1.checksumAt(frames - 1));
  });

  it('corrects a mispredicted frame to match what really happened', () => {
    // A peer that simulated a wrong prediction must, after the real input
    // arrives, land on exactly the state a peer who never guessed would reach.
    const frames = 200;
    const delayed = playMatch(frames, 6).peer0;
    const instant = playMatch(frames, 0).peer0;
    expect(delayed.checksumAt(frames - 1)).toBe(instant.checksumAt(frames - 1));
    expect(delayed.telemetry.rollbacks).toBeGreaterThan(0);
    expect(instant.telemetry.rollbacks).toBe(0);
  });

  it('reports no desyncs across a clean match', () => {
    const { peer0, peer1 } = playMatch(600, 4);
    expect(peer0.telemetry.desyncs).toBe(0);
    expect(peer1.telemetry.desyncs).toBe(0);
  });

  it('agrees frame by frame on the confirmed checksums', () => {
    const { peer0, peer1 } = playMatch(300, 3);
    for (let frame = 250; frame < 290; frame++) {
      const a = peer0.checksumAt(frame);
      const b = peer1.checksumAt(frame);
      expect(a).toBeDefined();
      expect(a).toBe(b);
    }
  });

  it('never rolls back once prediction has something to go on', () => {
    // Prediction repeats the peer's last input, so an unchanging remote is
    // always guessed correctly. The opening frames are seeded because the very
    // first prediction has no history and is expected to miss.
    const peer = new RollbackSession(config, 0);
    const held: PlayerInput = { dir: 6, buttons: Button.Guard };
    for (let frame = 0; frame < 3; frame++) {
      peer.addRemoteInput(frame, held);
    }
    for (let frame = 0; frame < 120; frame++) {
      peer.addLocalInput(frame, scriptA(frame));
      peer.addRemoteInput(frame, held);
      peer.advance();
    }
    expect(peer.telemetry.rollbacks).toBe(0);
  });

  it('rolls back when a prediction turns out wrong', () => {
    const peer = new RollbackSession(config, 0);
    for (let frame = 0; frame < 30; frame++) {
      peer.addLocalInput(frame, NEUTRAL_INPUT);
      if (frame >= 2) {
        peer.addRemoteInput(frame - 2, NEUTRAL_INPUT);
      }
      peer.advance();
    }
    expect(peer.frame).toBe(30);

    // Frame 28 was simulated as neutral; it was really a heavy attack.
    peer.addRemoteInput(28, { dir: 6, buttons: Button.Heavy });
    peer.addLocalInput(30, NEUTRAL_INPUT);
    peer.advance();

    expect(peer.telemetry.rollbacks).toBe(1);
    expect(peer.telemetry.deepestRollback).toBe(2);
    expect(peer.telemetry.resimulatedFrames).toBe(2);
  });

  it('stalls rather than outrunning the rollback budget', () => {
    // A peer that has gone silent must not be predicted past the point where a
    // correction is still possible.
    const peer = new RollbackSession(config, 0);
    let advanced = 0;
    for (let frame = 0; frame < 60; frame++) {
      peer.addLocalInput(frame, NEUTRAL_INPUT);
      if (peer.advance()) {
        advanced++;
      }
    }
    expect(advanced).toBeLessThanOrEqual(MAX_ROLLBACK_FRAMES + 2);
    expect(peer.telemetry.stalledFrames).toBeGreaterThan(0);
  });

  it('resumes advancing once the silent peer speaks again', () => {
    const peer = new RollbackSession(config, 0);
    for (let frame = 0; frame < 40; frame++) {
      peer.addLocalInput(frame, NEUTRAL_INPUT);
      peer.advance();
    }
    const stalledAt = peer.frame;
    for (let frame = 0; frame < stalledAt + 10; frame++) {
      peer.addRemoteInput(frame, NEUTRAL_INPUT);
    }
    peer.addLocalInput(stalledAt, NEUTRAL_INPUT);
    expect(peer.advance()).toBe(true);
    expect(peer.frame).toBe(stalledAt + 1);
  });

  it('flags a checksum disagreement as a desync', () => {
    const peer = new RollbackSession(config, 0);
    peer.addLocalInput(0, NEUTRAL_INPUT);
    peer.advance();
    expect(peer.verifyChecksum(0, 0xdeadbeef)).toBe(false);
    expect(peer.telemetry.desyncs).toBe(1);
  });

  it('accepts a checksum for a frame it has not simulated', () => {
    const peer = new RollbackSession(config, 0);
    expect(peer.verifyChecksum(500, 123)).toBe(true);
    expect(peer.telemetry.desyncs).toBe(0);
  });

  it('bundles recent local inputs for redundant sending', () => {
    const peer = new RollbackSession(config, 0);
    for (let frame = 0; frame < 20; frame++) {
      peer.addLocalInput(frame, scriptA(frame));
      peer.addRemoteInput(frame, NEUTRAL_INPUT);
      peer.advance();
    }
    const bundle = peer.recentLocalInputs(5);
    expect(bundle.packed).toHaveLength(5);
    expect(bundle.frame).toBe(19);
    expect(bundle.packed[4]).toEqual(scriptA(19));
  });
});
