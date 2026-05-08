import { RevealPulseEngine } from './RevealPulseEngine';
import { REVEAL_INTERVAL_MS, REVEAL_DURATION_MS } from '../types';

jest.useFakeTimers();

describe('RevealPulseEngine', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('fires handler(true) after one interval', () => {
    const handler = jest.fn();
    const engine = new RevealPulseEngine(handler);
    engine.start();
    jest.advanceTimersByTime(REVEAL_INTERVAL_MS);
    expect(handler).toHaveBeenCalledWith(true);
    engine.stop();
  });

  it('fires handler(false) after interval + reveal duration', () => {
    const handler = jest.fn();
    const engine = new RevealPulseEngine(handler);
    engine.start();
    jest.advanceTimersByTime(REVEAL_INTERVAL_MS + REVEAL_DURATION_MS);
    expect(handler).toHaveBeenCalledWith(false);
    engine.stop();
  });

  it('fires on each subsequent interval', () => {
    const handler = jest.fn();
    const engine = new RevealPulseEngine(handler);
    engine.start();
    jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 3);
    const trueCalls = handler.mock.calls.filter(([v]) => v === true).length;
    expect(trueCalls).toBe(3);
    engine.stop();
  });

  it('does not fire after stop()', () => {
    const handler = jest.fn();
    const engine = new RevealPulseEngine(handler);
    engine.start();
    engine.stop();
    jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 5);
    expect(handler).not.toHaveBeenCalled();
  });

  it('fireImmediate() triggers pulse without waiting for interval', () => {
    const handler = jest.fn();
    const engine = new RevealPulseEngine(handler);
    engine.fireImmediate();
    expect(handler).toHaveBeenCalledWith(true);
    jest.advanceTimersByTime(REVEAL_DURATION_MS);
    expect(handler).toHaveBeenCalledWith(false);
    engine.stop();
  });

  it('stop() prevents pending end-timeout from firing', () => {
    const handler = jest.fn();
    const engine = new RevealPulseEngine(handler);
    engine.start();
    jest.advanceTimersByTime(REVEAL_INTERVAL_MS); // fires(true)
    engine.stop();
    jest.advanceTimersByTime(REVEAL_DURATION_MS); // should NOT fire(false)
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(true);
  });
});
