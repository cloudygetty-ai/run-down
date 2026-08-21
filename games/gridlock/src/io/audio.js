/**
 * Synthesised UI audio — no asset files, a few hundred bytes of oscillator.
 *
 * The context is created lazily on the first gesture because browsers refuse
 * to start audio before one, and every call is wrapped: a blocked or missing
 * AudioContext must never break a click handler.
 */

const VOICES = {
  place: { freq: 520, type: 'triangle', ms: 90, gain: 0.16 },
  bulldoze: { freq: 180, type: 'sawtooth', ms: 130, gain: 0.13 },
  deny: { freq: 120, type: 'square', ms: 150, gain: 0.1 },
  tick: { freq: 880, type: 'sine', ms: 40, gain: 0.05 },
  good: { freq: 700, type: 'sine', ms: 220, gain: 0.14, slide: 1.5 },
  crisis: { freq: 260, type: 'sawtooth', ms: 420, gain: 0.16, slide: 0.6 },
};

export const createAudio = () => {
  let ctx = null;
  let muted = false;

  const ensure = () => {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      ctx = null;
    }
    return ctx;
  };

  return {
    play(name) {
      if (muted) return;
      const voice = VOICES[name];
      const audio = ensure();
      if (!voice || !audio) return;
      try {
        if (audio.state === 'suspended') audio.resume();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const now = audio.currentTime;
        const end = now + voice.ms / 1000;
        osc.type = voice.type;
        osc.frequency.setValueAtTime(voice.freq, now);
        if (voice.slide) osc.frequency.exponentialRampToValueAtTime(voice.freq * voice.slide, end);
        gain.gain.setValueAtTime(voice.gain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain).connect(audio.destination);
        osc.start(now);
        osc.stop(end);
      } catch {
        // Audio is a nicety; failure is silent by design.
      }
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted: () => muted,
  };
};
