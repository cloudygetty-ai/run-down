import { ROUND_TIME_FRAMES, ROUNDS_TO_WIN } from '../engine/data/constants';
import type { MatchConfig } from '../engine/types/match';
import { NEUTRAL_INPUT, type PlayerInput } from '../engine/types/input';
import { MatchView } from '../render/view';
import { Hud } from '../ui/hud';
import { Menu, type MatchSetup } from '../ui/menu';
import { WebSocketTransport } from '../net/transport';
import { KeyboardReader, PLAYER_ONE_BINDING, PLAYER_TWO_BINDING, readGamepad } from './input';
import { GameLoop } from './loop';
import { LocalMatch, OnlineMatch, type MatchRunner } from './match';

/**
 * Application bootstrap.
 *
 * Wires the menu to a match runner, a view and a loop, then gets out of the
 * way. Everything meaningful lives in the modules this file composes — if this
 * file starts growing logic, that logic belongs somewhere else.
 */

/** Overridable at build time so a deployed client can point at a real relay. */
const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? 'ws://localhost:8787';

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return found;
}

function configFor(setup: MatchSetup, seed: number): MatchConfig {
  return {
    roundsToWin: ROUNDS_TO_WIN,
    roundTimeFrames: ROUND_TIME_FRAMES,
    stageId: 'crater',
    seed,
    characterIds: setup.characterIds,
  };
}

/**
 * Online play cannot start until the server has paired both players and told
 * each which side they are on, so the transport is opened and awaited here.
 */
async function startOnline(
  setup: MatchSetup & { mode: { kind: 'online'; roomId: string } },
  menu: Menu,
): Promise<{ runner: OnlineMatch; characterIds: [string, string]; localIndex: 0 | 1 }> {
  menu.status('CONNECTING…');
  const transport = new WebSocketTransport(RELAY_URL);
  await transport.connect();

  menu.status('WAITING FOR OPPONENT…');
  return new Promise((resolve, reject) => {
    let assignedIndex: 0 | 1 = 0;

    transport.onMessage((message) => {
      if (message.type === 'assign') {
        assignedIndex = message.playerIndex;
        return;
      }
      if (message.type === 'start') {
        const runner = new OnlineMatch(
          configFor({ ...setup, characterIds: message.characterIds }, message.seed),
          assignedIndex,
          transport,
          setup.mode.roomId,
          setup.characterIds[0],
        );
        resolve({ runner, characterIds: message.characterIds, localIndex: assignedIndex });
        return;
      }
      if (message.type === 'error') {
        reject(new Error(message.reason));
      }
    });

    transport.send({
      type: 'hello',
      version: 1,
      roomId: setup.mode.roomId,
      characterId: setup.characterIds[0],
    });
  });
}

async function main(): Promise<void> {
  const canvas = element<HTMLCanvasElement>('#stage');
  const hudRoot = element('#hud');
  const menuRoot = element('#menu');

  const keyboard = new KeyboardReader();
  keyboard.attach();

  const menu = new Menu(menuRoot);
  const setup = await menu.run();

  let runner: MatchRunner;
  let characterIds: [string, string] = setup.characterIds;
  let localIndex: 0 | 1 = setup.localIndex;
  let online: OnlineMatch | null = null;

  if (setup.mode.kind === 'online') {
    const result = await startOnline(
      setup as MatchSetup & { mode: { kind: 'online'; roomId: string } },
      menu,
    );
    runner = result.runner;
    online = result.runner;
    characterIds = result.characterIds;
    localIndex = result.localIndex;
  } else {
    runner = new LocalMatch(configFor(setup, 0x5eed), setup.mode, 0);
  }

  menu.hide();

  const view = new MatchView(canvas, characterIds);
  const hud = new Hud(hudRoot);
  window.addEventListener('resize', () => view.resize());

  const readLocal = (): PlayerInput => {
    const toward = view.towardSign(runner.state, localIndex);
    return readGamepad(0, toward) ?? keyboard.read(PLAYER_ONE_BINDING, toward);
  };

  const readSecond = (): PlayerInput => {
    if (setup.mode.kind !== 'versus') {
      return NEUTRAL_INPUT;
    }
    const toward = view.towardSign(runner.state, localIndex === 0 ? 1 : 0);
    return readGamepad(1, toward) ?? keyboard.read(PLAYER_TWO_BINDING, toward);
  };

  const loop = new GameLoop({
    tick: () => runner.advance(readLocal(), readSecond()),
    render: (deltaSeconds) => {
      const state = runner.state;
      view.render(state, runner.drainEffects(), deltaSeconds);
      hud.update(state, {
        netLine: online
          ? `${online.rttMs < 0 ? '--' : online.rttMs}ms · rollbacks ${online.telemetry.rollbacks} · ` +
            `desyncs ${online.telemetry.desyncs}${online.isDisconnected ? ` · ${online.reason}` : ''}`
          : `${loop.telemetry.fps.toFixed(0)} fps`,
      });
    },
  });

  loop.start();
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  document.body.innerHTML = `<div class="fatal"><h1>ASCENDANTS</h1><p>${message}</p></div>`;
});
