import { DRIVE_BAR, DRIVE_MAX, FATAL_HEALTH_RATIO, KI_MAX, SUPER_MAX, TICK_RATE } from '../engine/data/constants';
import { getCharacter } from '../engine/data/characters';
import { erasureById, finisherCallout, FINISHER_SUBTITLE } from '../engine/data/finishers';
import type { Fighter } from '../engine/types/fighter';
import type { MatchState } from '../engine/types/match';

/**
 * The heads-up display.
 *
 * Built from DOM rather than drawn into the 3D scene: text stays crisp at every
 * resolution, the layout costs nothing on the render thread, and the bars can
 * animate with CSS transitions instead of per-frame geometry work.
 *
 * The health bar carries a slower "ghost" behind it showing damage just taken.
 * That single detail is how a player reads the size of a combo at a glance
 * while they are still being hit by it.
 */

const DRIVE_SEGMENTS = DRIVE_MAX / DRIVE_BAR;

function bars(side: 'left' | 'right'): string {
  const segments = Array.from(
    { length: DRIVE_SEGMENTS },
    () => '<div class="drive-seg"><i></i></div>',
  ).join('');
  return `
    <div class="side ${side}">
      <div class="name-row">
        <span class="name" data-name></span>
        <span class="wins" data-wins></span>
      </div>
      <div class="health-track">
        <div class="health-ghost" data-ghost></div>
        <div class="health-fill" data-health></div>
        <div class="health-danger" data-danger></div>
      </div>
      <div class="drive-track" data-drive-track>${segments}</div>
      <div class="meter-row">
        <div class="ki-track"><div class="ki-fill" data-ki></div></div>
        <div class="super-track"><div class="super-fill" data-super></div></div>
      </div>
      <div class="status-row"><span data-status></span></div>
    </div>`;
}

type SideRefs = {
  name: HTMLElement;
  wins: HTMLElement;
  health: HTMLElement;
  ghost: HTMLElement;
  danger: HTMLElement;
  driveTrack: HTMLElement;
  driveSegments: HTMLElement[];
  ki: HTMLElement;
  superMeter: HTMLElement;
  status: HTMLElement;
  ghostValue: number;
};

function refsFor(root: HTMLElement, side: string): SideRefs {
  const scope = root.querySelector<HTMLElement>(`.side.${side}`);
  if (!scope) {
    throw new Error(`HUD side missing: ${side}`);
  }
  const pick = (selector: string): HTMLElement => {
    const found = scope.querySelector<HTMLElement>(selector);
    if (!found) {
      throw new Error(`HUD element missing: ${selector}`);
    }
    return found;
  };
  return {
    name: pick('[data-name]'),
    wins: pick('[data-wins]'),
    health: pick('[data-health]'),
    ghost: pick('[data-ghost]'),
    danger: pick('[data-danger]'),
    driveTrack: pick('[data-drive-track]'),
    driveSegments: Array.from(scope.querySelectorAll<HTMLElement>('.drive-seg i')),
    ki: pick('[data-ki]'),
    superMeter: pick('[data-super]'),
    status: pick('[data-status]'),
    ghostValue: 1,
  };
}

export type HudExtras = {
  /** Shown in the corner during online play. */
  readonly netLine?: string;
};

export class Hud {
  private readonly root: HTMLElement;
  private readonly sides: [SideRefs, SideRefs];
  private readonly timer: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly bannerSub: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly net: HTMLElement;

  constructor(container: HTMLElement) {
    container.innerHTML = `
      <div class="hud">
        ${bars('left')}
        <div class="center">
          <div class="timer" data-timer>99</div>
          <div class="combo" data-combo></div>
        </div>
        ${bars('right')}
      </div>
      <div class="banner-wrap">
        <div class="banner" data-banner></div>
        <div class="banner-sub" data-banner-sub></div>
      </div>
      <div class="net-line" data-net></div>`;

    this.root = container;
    this.sides = [refsFor(container, 'left'), refsFor(container, 'right')];
    this.timer = this.require('[data-timer]');
    this.banner = this.require('[data-banner]');
    this.bannerSub = this.require('[data-banner-sub]');
    this.combo = this.require('[data-combo]');
    this.net = this.require('[data-net]');
  }

  private require(selector: string): HTMLElement {
    const found = this.root.querySelector<HTMLElement>(selector);
    if (!found) {
      throw new Error(`HUD element missing: ${selector}`);
    }
    return found;
  }

  private updateSide(refs: SideRefs, fighter: Fighter): void {
    const character = getCharacter(fighter.characterId);
    const ratio = fighter.health / fighter.maxHealth;

    refs.name.textContent = character.name;
    refs.name.style.color = character.accent;
    refs.wins.textContent = '●'.repeat(fighter.wins) + '○'.repeat(Math.max(0, 2 - fighter.wins));
    refs.health.style.width = `${ratio * 100}%`;
    refs.health.style.background = `linear-gradient(90deg, ${character.accent}, ${character.secondary})`;

    // The ghost chases the real bar, so a long combo leaves a visible tail.
    refs.ghostValue += (ratio - refs.ghostValue) * 0.08;
    refs.ghost.style.width = `${Math.max(ratio, refs.ghostValue) * 100}%`;

    // Fatal Blow territory gets its own colour so the threat is obvious.
    refs.danger.style.opacity = ratio <= FATAL_HEALTH_RATIO && !fighter.fatalUsed ? '1' : '0';

    const burnedOut = fighter.burnout > 0;
    refs.driveTrack.classList.toggle('burnout', burnedOut);
    const filledSegments = fighter.drive / DRIVE_BAR;
    refs.driveSegments.forEach((segment, index) => {
      const fill = Math.max(0, Math.min(1, filledSegments - index));
      segment.style.width = `${fill * 100}%`;
    });

    refs.ki.style.width = `${(fighter.ki / KI_MAX) * 100}%`;
    refs.ki.classList.toggle('full', fighter.ki >= KI_MAX);
    refs.superMeter.style.width = `${Math.min(1, fighter.superMeter / SUPER_MAX) * 100}%`;

    const status: string[] = [];
    if (burnedOut) status.push('BURNOUT');
    if (fighter.transformed) status.push('ASCENDED');
    if (fighter.superMeter >= SUPER_MAX) status.push('SUPER READY');
    if (!fighter.fatalUsed && ratio <= FATAL_HEALTH_RATIO) status.push('FATAL BLOW');
    refs.status.textContent = status.join('  ·  ');
  }

  private bannerFor(state: MatchState): [string, string] {
    switch (state.phase) {
      case 'intro':
        return [`ROUND ${state.round}`, state.phaseFrame > 60 ? 'FIGHT' : ''];
      case 'roundEnd':
        return [state.lastRoundWinner < 0 ? 'DRAW' : 'K.O.', ''];
      case 'finisher': {
        const loser = state.fighters[state.finisher.performer === 0 ? 1 : 0];
        return [finisherCallout(loser.characterId), FINISHER_SUBTITLE];
      }
      case 'erasure': {
        const erasure = state.finisher.performed
          ? erasureById(state.finisher.performed)
          : undefined;
        return [erasure?.name ?? 'ERASURE', erasure?.caption ?? ''];
      }
      case 'matchEnd': {
        const winner = state.fighters[0].wins > state.fighters[1].wins ? 0 : 1;
        return [`${getCharacter(state.fighters[winner].characterId).name} WINS`, ''];
      }
      default:
        return ['', ''];
    }
  }

  update(state: MatchState, extras: HudExtras = {}): void {
    this.updateSide(this.sides[0], state.fighters[0]);
    this.updateSide(this.sides[1], state.fighters[1]);

    this.timer.textContent = String(Math.ceil(state.timer / TICK_RATE));
    this.timer.classList.toggle('urgent', state.timer < 10 * TICK_RATE);

    // A combo counter belongs to whoever is landing it, so it reads off the
    // hits the *other* fighter is currently taking.
    const comboOnLeft = state.fighters[1].comboHits;
    const comboOnRight = state.fighters[0].comboHits;
    const hits = Math.max(comboOnLeft, comboOnRight);
    this.combo.textContent = hits > 1 ? `${hits} HITS` : '';
    this.combo.classList.toggle('active', hits > 1);

    const [title, subtitle] = this.bannerFor(state);
    this.banner.textContent = title;
    this.bannerSub.textContent = subtitle;
    this.banner.classList.toggle('show', title !== '');
    this.banner.classList.toggle('finisher', state.phase === 'finisher' || state.phase === 'erasure');

    this.net.textContent = extras.netLine ?? '';
  }
}
