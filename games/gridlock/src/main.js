/**
 * Application shell: owns the state reference, the frame loop, and the wiring
 * between input, simulation, and view. Everything else is pure or presentational.
 *
 * State moves in exactly one direction:
 *   input → command/tick (pure, returns new state) → renderer + UI read it
 */

import { SPEED_MS } from './config/balance.js';
import { canPlace, demolish, place, setSpeed, setTax } from './core/commands.js';
import { getCrisis, resolveCrisis } from './core/events.js';
import { createInitialState } from './core/state.js';
import { refreshStats, tickMonth } from './core/simulate.js';
import { createCamera } from './render/iso.js';
import { createEffects } from './render/effects.js';
import { createRenderer } from './render/renderer.js';
import { OVERLAYS, nextOverlay } from './render/overlays.js';
import { attachInput } from './io/input.js';
import { createAudio } from './io/audio.js';
import { hasSave, loadGame, saveGame } from './io/persist.js';
import { createTelemetry } from './telemetry/telemetry.js';
import { $, el, percent, setClass, setText } from './ui/dom.js';
import { BULLDOZE, createBuildBar } from './ui/build.js';
import { createHud } from './ui/hud.js';
import { createInspector } from './ui/inspector.js';
import { createModal } from './ui/modal.js';
import { createPanels } from './ui/panels.js';
import { createToaster } from './ui/toast.js';
import { BANKRUPT, HELP, INTRO, VICTORY } from './ui/copy.js';

const MAX_CATCHUP_TICKS = 4;

const boot = () => {
  const canvas = $('#stage');
  const effects = createEffects();
  const renderer = createRenderer(canvas, effects);
  const telemetry = createTelemetry();
  const audio = createAudio();
  const toaster = createToaster($('#toasts'));
  const modal = createModal($('#modal'));
  const hud = createHud(document);
  const panels = createPanels(document);
  const inspector = createInspector($('#inspector'));

  let state = refreshStats(createInitialState());
  // WHY one mutable camera object rather than reassignment: the input handler
  // captures this reference for the life of the page.
  const cam = createCamera(state.grid);
  const resetCamera = (grid) => Object.assign(cam, createCamera(grid));
  let hover = null;
  let tool = null;
  let hoverDef = null;
  let overlay = 'none';
  let accumulator = 0;
  let lastFrame = performance.now();
  let announcedVictory = false;
  let announcedBankruptcy = false;

  // ── View sync ──────────────────────────────────────────────────────────
  const legalHere = () =>
    !hover || !tool || tool === BULLDOZE || canPlace(state, hover.x, hover.y, tool).ok;

  const refreshInspector = () => inspector.show(state, hover, tool, hoverDef);

  const refreshAll = () => {
    hud.update(state);
    panels.update(state);
    build.update(state);
    refreshInspector();
    setText($('#tax-value'), percent(state.taxRate));
    for (const btn of document.querySelectorAll('#speed-group [data-speed]')) {
      setClass(btn, 'active', Number(btn.dataset.speed) === state.speed);
    }
  };

  const commit = (next) => {
    state = refreshStats(next);
    refreshAll();
  };

  // ── Commands ───────────────────────────────────────────────────────────
  const paint = (tile) => {
    if (!tile || modal.isOpen()) return;
    const result = tool === BULLDOZE
      ? demolish(state, tile.x, tile.y)
      : place(state, tile.x, tile.y, tool);

    if (!result.ok) {
      toaster.push(result.reason ?? 'Cannot build there.', 'bad');
      audio.play('deny');
      return;
    }
    audio.play(tool === BULLDOZE ? 'bulldoze' : 'place');
    commit(result.state);
  };

  const build = createBuildBar($('#build-list'), {
    onSelect: (id) => {
      tool = id;
      canvas.style.cursor = id ? 'crosshair' : 'grab';
      refreshInspector();
    },
    onHoverDef: (def) => {
      hoverDef = def;
      refreshInspector();
    },
  });

  // ── Simulation ─────────────────────────────────────────────────────────
  const advance = () => {
    const started = performance.now();
    state = tickMonth(state);
    telemetry.tick(performance.now() - started);
    effects.emit(state, state.stats);
    refreshAll();
    checkInterrupts();
  };

  const checkInterrupts = () => {
    if (state.crisis.active && !modal.isOpen()) {
      const crisis = getCrisis(state.crisis.active);
      if (crisis) {
        audio.play('crisis');
        modal.showCrisis(crisis, state, state.stats, (index) => {
          const result = resolveCrisis(state, state.stats, index);
          if (!result.ok) return toaster.push(result.reason ?? 'Cannot do that.', 'bad');
          modal.hide();
          audio.play('good');
          commit(setSpeed(result.state, 1));
          return undefined;
        });
        return;
      }
    }
    if (state.won && !announcedVictory) {
      announcedVictory = true;
      audio.play('good');
      modal.showMessage({ ...VICTORY, actions: [{ label: 'Keep building', primary: true, onClick: modal.hide }] });
      return;
    }
    if (state.bankrupt && !announcedBankruptcy) {
      announcedBankruptcy = true;
      modal.showMessage({ ...BANKRUPT, kind: 'crisis', actions: [{ label: 'Understood', primary: true, onClick: modal.hide }] });
    }
    if (!state.bankrupt) announcedBankruptcy = false;
  };

  // ── Frame loop ─────────────────────────────────────────────────────────
  const frame = (now) => {
    const dt = Math.min(now - lastFrame, 250); // Tab-switch guard.
    lastFrame = now;
    telemetry.frame(dt);

    if (!modal.isOpen() && state.speed > 0) {
      accumulator += dt;
      const step = SPEED_MS[state.speed];
      let ticks = 0;
      while (accumulator >= step && ticks < MAX_CATCHUP_TICKS) {
        accumulator -= step;
        ticks += 1;
        advance();
      }
      if (ticks === MAX_CATCHUP_TICKS) accumulator = 0; // Never spiral.
    }

    effects.update(dt);
    const drawMs = renderer.draw(state, {
      cam, hover, tool, overlay, time: now, canPlaceHere: legalHere(),
    });
    telemetry.draw(drawMs);
    renderTelemetry();
    requestAnimationFrame(frame);
  };

  // ── Chrome wiring ──────────────────────────────────────────────────────
  const overlayGroup = $('#overlay-group');
  for (const view of OVERLAYS) {
    const btn = el('button', 'btn tiny', view.label);
    btn.dataset.overlay = view.id;
    btn.title = view.hint;
    btn.addEventListener('click', () => setOverlay(view.id));
    overlayGroup.appendChild(btn);
  }
  const setOverlay = (id) => {
    overlay = id;
    for (const btn of overlayGroup.querySelectorAll('[data-overlay]')) {
      setClass(btn, 'active', btn.dataset.overlay === id);
    }
  };
  setOverlay('none');

  for (const btn of document.querySelectorAll('#speed-group [data-speed]')) {
    btn.addEventListener('click', () => commit(setSpeed(state, Number(btn.dataset.speed))));
  }
  $('#tax-up').addEventListener('click', () => commit(setTax(state, state.taxRate + 0.01)));
  $('#tax-down').addEventListener('click', () => commit(setTax(state, state.taxRate - 0.01)));

  $('#btn-save').addEventListener('click', () => {
    const result = saveGame(state);
    toaster.push(result.ok ? 'City saved to this browser.' : result.reason, result.ok ? 'good' : 'bad');
  });
  $('#btn-load').addEventListener('click', () => loadCity());
  $('#btn-new').addEventListener('click', () => newCity());
  $('#btn-mute').addEventListener('click', (event) => {
    const muted = audio.toggleMute();
    event.currentTarget.textContent = muted ? '♪̸' : '♪';
  });
  $('#btn-help').addEventListener('click', () => showHelp());

  const loadCity = () => {
    const result = loadGame();
    if (!result.ok) return toaster.push(result.reason, 'bad');
    resetCamera(result.state.grid);
    announcedVictory = result.state.won;
    commit(result.state);
    modal.hide();
    toaster.push('City restored.', 'good');
    return undefined;
  };

  const newCity = () => {
    state = refreshStats(createInitialState());
    resetCamera(state.grid);
    announcedVictory = false;
    announcedBankruptcy = false;
    build.select(null);
    refreshAll();
    modal.hide();
  };

  const showHelp = () => modal.showMessage({
    ...HELP,
    actions: [{ label: 'Back to the city', primary: true, onClick: modal.hide }],
  });

  const showIntro = () => modal.showMessage({
    ...INTRO,
    actions: [
      { label: 'Found the city', primary: true, onClick: modal.hide },
      ...(hasSave() ? [{ label: 'Load saved city', onClick: loadCity }] : []),
      { label: 'How to play', onClick: showHelp },
    ],
  });

  // ── Keyboard ───────────────────────────────────────────────────────────
  const onKey = (event) => {
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      if (modal.isOpen() && !state.crisis.active) modal.hide();
      else build.select(null);
      return;
    }
    if (modal.isOpen()) return;
    if (key === ' ') {
      event.preventDefault();
      commit(setSpeed(state, state.speed === 0 ? 1 : 0));
    } else if (['1', '2', '3'].includes(key)) commit(setSpeed(state, Number(key)));
    else if (key === 'x') build.select(BULLDOZE);
    else if (key === 'o') setOverlay(nextOverlay(overlay));
    else if (key === 's') $('#btn-save').click();
    else if (key === 'h') showHelp();
    else if (key === '`') $('#telemetry').classList.toggle('hidden');
  };

  const telemetryNode = $('#telemetry');
  const renderTelemetry = () => {
    if (telemetryNode.classList.contains('hidden')) return;
    const snap = telemetry.snapshot();
    telemetryNode.textContent = [
      `HEALTH     alive=${snap.health.alive} frames=${snap.health.frames}`,
      `PRESSURE   fps=${snap.pressure.fps.toFixed(0)} draw=${snap.pressure.drawMs.toFixed(2)}ms tick=${snap.pressure.tickMs.toFixed(2)}ms`,
      `EFFICIENCY heap=${snap.efficiency.heapMb ? `${snap.efficiency.heapMb.toFixed(1)}MB` : 'n/a'} drops=${percent(snap.efficiency.dropRate, 1)}`,
      `WORLD      month=${state.month} tiles=${state.grid.tiles.length} fx=${effects.count()}`,
    ].join('\n');
  };

  attachInput(canvas, cam, renderer.view, () => state, {
    hasTool: () => tool !== null,
    onHover: (tile) => {
      hover = tile;
      refreshInspector();
    },
    onPaint: paint,
    onKey,
  });

  // Opt-in inspection hook for automated smoke tests and balance tuning.
  // Read-only by contract: it exposes state, it does not accept commands.
  if (new URLSearchParams(window.location.search).has('debug')) {
    window.__gridlock = {
      state: () => state,
      camera: () => cam,
      telemetry: () => telemetry.snapshot(),
      modalOpen: () => modal.isOpen(),
    };
    $('#telemetry').classList.remove('hidden');
  }

  window.addEventListener('resize', () => renderer.resize());
  renderer.resize();
  refreshAll();
  showIntro();
  requestAnimationFrame(frame);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
