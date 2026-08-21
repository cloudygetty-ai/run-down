/**
 * Save/load. State is plain JSON by construction, so persistence is a
 * stringify with the derived stats snapshot stripped — derived data is always
 * recomputed, never trusted from disk.
 *
 * Every path is guarded: a browser with storage disabled, a full quota, or a
 * corrupted payload must degrade to "no save", never to a broken game.
 */

import { SAVE_KEY, SAVE_VERSION } from '../config/balance.js';

const storage = () => {
  try {
    const probe = '__gridlock__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null; // Private mode, blocked cookies, or no storage at all.
  }
};

export const saveGame = (state) => {
  const store = storage();
  if (!store) return { ok: false, reason: 'Storage unavailable in this browser.' };
  try {
    const payload = JSON.stringify({ v: SAVE_VERSION, savedAt: Date.now(), state: { ...state, stats: null } });
    store.setItem(SAVE_KEY, payload);
    return { ok: true, bytes: payload.length };
  } catch (error) {
    return { ok: false, reason: error?.name === 'QuotaExceededError' ? 'Save file too large.' : 'Save failed.' };
  }
};

export const hasSave = () => {
  const store = storage();
  return Boolean(store && store.getItem(SAVE_KEY));
};

export const loadGame = () => {
  const store = storage();
  if (!store) return { ok: false, reason: 'Storage unavailable.' };
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return { ok: false, reason: 'No saved city.' };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.v !== SAVE_VERSION) return { ok: false, reason: 'Save is from an older build.' };
    if (!parsed.state?.grid?.tiles?.length) return { ok: false, reason: 'Save file is corrupt.' };
    return { ok: true, state: parsed.state, savedAt: parsed.savedAt };
  } catch {
    return { ok: false, reason: 'Save file is corrupt.' };
  }
};

export const clearSave = () => {
  const store = storage();
  if (store) store.removeItem(SAVE_KEY);
};
