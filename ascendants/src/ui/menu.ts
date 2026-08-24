import { ROSTER, type Character } from '../engine/data/characters';
import { FINISHER_CALLOUT_GENERIC, erasureFor } from '../engine/data/finishers';
import { getMove } from '../engine/data/moves';
import { designFor } from '../render/design';
import { renderPortraits } from '../render/portrait';
import { frameNotation, inputNotation, motionNotation, buttonNotation } from './notation';
import type { Difficulty } from '../engine/ai/cpu';

/**
 * Front end: title, mode select, character select, room entry.
 *
 * Each screen resolves a promise, so the flow reads as a straight line in
 * `run()` instead of a state machine with transitions to keep in sync.
 */

export type MatchSetup = {
  readonly mode:
    | { kind: 'cpu'; difficulty: Difficulty }
    | { kind: 'versus' }
    | { kind: 'online'; roomId: string };
  readonly characterIds: [string, string];
  readonly localIndex: 0 | 1;
};

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: 'rookie', label: 'ROOKIE', blurb: 'Slow to react. Blocks rarely.' },
  { id: 'fighter', label: 'FIGHTER', blurb: 'Blocks, punishes, escapes combos.' },
  { id: 'herald', label: 'HERALD', blurb: 'Reacts in three frames. Uses everything.' },
];

function statBar(label: string, value: number, max = 2): string {
  const percent = Math.max(4, Math.min(100, (value / max) * 100));
  // The fill is percentage-width, so it needs its own track to resolve
  // against — sized against the whole row it overflows past the label.
  return `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${percent}%"></i></div></div>`;
}

/** One row of the move list: name, input notation, and its frame data. */
function skillRow(moveId: string): string {
  const move = getMove(moveId);
  return `
    <li class="skill">
      <span class="skill-name">${move.name}</span>
      <span class="skill-input">${inputNotation(move)}</span>
      <span class="skill-frames">${frameNotation(move)}</span>
    </li>`;
}

function erasureRow(characterId: string): string {
  const erasure = erasureFor(characterId);
  if (!erasure) {
    return '';
  }
  const notation = `${motionNotation(erasure.motion)} + ${buttonNotation(erasure.button)}`;
  return `
    <li class="skill erasure">
      <span class="skill-name">${erasure.name}</span>
      <span class="skill-input">${notation}</span>
      <span class="skill-frames">ERASURE · finisher only</span>
    </li>`;
}

function characterCard(character: Character, portrait: string | undefined): string {
  const design = designFor(character.id);
  const stats = character.stats;
  const portraitStyle = portrait
    ? `background-image:url(${portrait});background-size:contain;background-position:center bottom;background-repeat:no-repeat;`
    : '';
  return `
    <button class="fighter-card" data-character="${character.id}"
            style="--accent:${character.accent};--secondary:${character.secondary}">
      <div class="fighter-head">
        <div class="fighter-portrait"
             style="background-color:${design.palette.secondary};${portraitStyle}"></div>
        <div class="fighter-id">
          <div class="fighter-name">${character.name}</div>
          <div class="fighter-title">${character.title}</div>
          <div class="fighter-stats">
            ${statBar('PWR', stats.damageMult)}
            ${statBar('SPD', stats.walkMult)}
            ${statBar('DEF', 2 - stats.defenseMult)}
            ${statBar('KI', stats.kiRegenMult)}
            ${statBar('HP', stats.maxHealth / 600, 2)}
          </div>
        </div>
      </div>
      <ul class="skill-list">
        ${character.specials.map(skillRow).join('')}
        ${skillRow(character.superMove)}
        ${erasureRow(character.id)}
      </ul>
      <div class="fighter-silhouette">${design.silhouette}</div>
    </button>`;
}

export class Menu {
  /** Rendered lazily: building six rigs is wasted work until it is needed. */
  private portraits: Map<string, string> | null = null;

  constructor(private readonly root: HTMLElement) {}

  private getPortraits(): Map<string, string> {
    if (!this.portraits) {
      try {
        this.portraits = renderPortraits();
      } catch {
        // A machine without WebGL still gets a usable select screen, just
        // with flat colour blocks instead of rendered fighters.
        this.portraits = new Map();
      }
    }
    return this.portraits;
  }

  private show(html: string): void {
    this.root.innerHTML = `<div class="menu">${html}</div>`;
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }

  private title(): Promise<void> {
    return new Promise((resolve) => {
      this.show(`
        <h1 class="logo">ASCENDANTS</h1>
        <p class="tagline">The sky fell. Some of us got back up.</p>
        <button class="primary" data-start>ENTER</button>
        <p class="footnote">${FINISHER_CALLOUT_GENERIC}</p>`);
      this.root.querySelector('[data-start]')?.addEventListener('click', () => resolve());
    });
  }

  private mode(): Promise<MatchSetup['mode']> {
    return new Promise((resolve) => {
      this.show(`
        <h2>SELECT MODE</h2>
        <div class="mode-grid">
          <button class="mode-card" data-mode="cpu">
            <span class="mode-name">ARCADE</span>
            <span class="mode-blurb">Fight the machine.</span>
          </button>
          <button class="mode-card" data-mode="versus">
            <span class="mode-name">LOCAL VERSUS</span>
            <span class="mode-blurb">Two players, one keyboard.</span>
          </button>
          <button class="mode-card" data-mode="online">
            <span class="mode-name">ONLINE</span>
            <span class="mode-blurb">Rollback netcode. Share a room code.</span>
          </button>
        </div>
        <div class="difficulty-row" data-difficulty-row>
          ${DIFFICULTIES.map(
            (d, i) =>
              `<button class="chip${i === 1 ? ' selected' : ''}" data-difficulty="${d.id}">
                 <strong>${d.label}</strong><span>${d.blurb}</span>
               </button>`,
          ).join('')}
        </div>`);

      let difficulty: Difficulty = 'fighter';
      for (const chip of this.root.querySelectorAll<HTMLElement>('[data-difficulty]')) {
        chip.addEventListener('click', () => {
          for (const other of this.root.querySelectorAll('[data-difficulty]')) {
            other.classList.remove('selected');
          }
          chip.classList.add('selected');
          difficulty = (chip.dataset.difficulty as Difficulty) ?? 'fighter';
        });
      }

      for (const card of this.root.querySelectorAll<HTMLElement>('[data-mode]')) {
        card.addEventListener('click', () => {
          const kind = card.dataset.mode;
          if (kind === 'cpu') {
            resolve({ kind: 'cpu', difficulty });
          } else if (kind === 'versus') {
            resolve({ kind: 'versus' });
          } else {
            void this.roomCode().then((roomId) => resolve({ kind: 'online', roomId }));
          }
        });
      }
    });
  }

  private roomCode(): Promise<string> {
    return new Promise((resolve) => {
      // Suggested rather than imposed: both players need the same string, and
      // typing a shared word is easier to say out loud than a generated id.
      const suggested = Math.random().toString(36).slice(2, 7).toUpperCase();
      this.show(`
        <h2>ROOM CODE</h2>
        <p class="tagline">Both players enter the same code.</p>
        <input class="room-input" data-room value="${suggested}" maxlength="12" />
        <button class="primary" data-confirm>CONNECT</button>`);

      const input = this.root.querySelector<HTMLInputElement>('[data-room]');
      const confirm = (): void => resolve((input?.value || suggested).trim().toUpperCase());
      this.root.querySelector('[data-confirm]')?.addEventListener('click', confirm);
      input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          confirm();
        }
      });
      input?.focus();
    });
  }

  private pickCharacter(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      const portraits = this.getPortraits();
      this.show(`
        <h2>${prompt}</h2>
        <div class="roster">
          ${ROSTER.map((c) => characterCard(c, portraits.get(c.id))).join('')}
        </div>`);

      for (const card of this.root.querySelectorAll<HTMLElement>('[data-character]')) {
        card.addEventListener('click', () => {
          const id = card.dataset.character;
          if (id) {
            resolve(id);
          }
        });
      }
    });
  }

  status(message: string): void {
    this.show(`<h2>${message}</h2><div class="spinner"></div>`);
  }

  async run(): Promise<MatchSetup> {
    await this.title();
    const mode = await this.mode();

    if (mode.kind === 'online') {
      // Online only picks your own fighter: the server pairs the two hellos and
      // sends back the authoritative pair, so choosing an opponent here would
      // be a lie the start message immediately overwrites.
      const own = await this.pickCharacter('YOUR FIGHTER');
      return { mode, characterIds: [own, 'korvath'], localIndex: 0 };
    }

    const first = await this.pickCharacter('PLAYER ONE');
    const second = await this.pickCharacter(mode.kind === 'versus' ? 'PLAYER TWO' : 'OPPONENT');
    return { mode, characterIds: [first, second], localIndex: 0 };
  }
}
