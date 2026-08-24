import { Button, type PlayerInput } from '../engine/types/input';

/**
 * Turning hardware into a frame of input.
 *
 * The simulation wants directions in TARGET-RELATIVE numpad notation — 6 is
 * always toward the opponent. The player, however, is thinking in screen space:
 * they press right because the opponent is on the right. Translating here, at
 * the edge of the system, is what keeps every motion input working unchanged
 * when the fighters cross over, and keeps the engine ignorant of the camera.
 */

export type Binding = {
  readonly left: string[];
  readonly right: string[];
  readonly up: string[];
  readonly down: string[];
  readonly light: string[];
  readonly medium: string[];
  readonly heavy: string[];
  readonly ki: string[];
  readonly guard: string[];
  readonly drive: string[];
  readonly dash: string[];
  readonly charge: string[];
  readonly vanish: string[];
};

export const PLAYER_ONE_BINDING: Binding = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  down: ['KeyS'],
  light: ['KeyJ'],
  medium: ['KeyK'],
  heavy: ['KeyL'],
  ki: ['KeyU'],
  guard: ['Space'],
  drive: ['KeyI'],
  dash: ['ShiftLeft'],
  charge: ['KeyC'],
  vanish: ['KeyV'],
};

export const PLAYER_TWO_BINDING: Binding = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  light: ['Numpad1'],
  medium: ['Numpad2'],
  heavy: ['Numpad3'],
  ki: ['Numpad4'],
  guard: ['Numpad0'],
  drive: ['Numpad5'],
  dash: ['ShiftRight'],
  charge: ['Numpad7'],
  vanish: ['Numpad8'],
};

/**
 * Combine a horizontal and vertical axis into numpad notation.
 * @param toward +1 when screen-right means "toward the opponent", -1 otherwise
 */
export function toNumpad(screenX: number, screenY: number, toward: number): number {
  const forward = Math.sign(screenX) * toward;
  const vertical = Math.sign(screenY);
  if (vertical > 0) {
    return forward > 0 ? 9 : forward < 0 ? 7 : 8;
  }
  if (vertical < 0) {
    return forward > 0 ? 3 : forward < 0 ? 1 : 2;
  }
  return forward > 0 ? 6 : forward < 0 ? 4 : 5;
}

export class KeyboardReader {
  private readonly held = new Set<string>();
  private readonly onDown = (event: KeyboardEvent): void => {
    // Stop the browser scrolling the page out from under the match.
    if (event.code.startsWith('Arrow') || event.code === 'Space') {
      event.preventDefault();
    }
    this.held.add(event.code);
  };
  private readonly onUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
  };
  private readonly onBlur = (): void => {
    // Losing focus with a key down would otherwise leave it stuck forever.
    this.held.clear();
  };

  attach(target: Window = window): void {
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
    target.addEventListener('blur', this.onBlur);
  }

  detach(target: Window = window): void {
    target.removeEventListener('keydown', this.onDown);
    target.removeEventListener('keyup', this.onUp);
    target.removeEventListener('blur', this.onBlur);
  }

  isDown(codes: readonly string[]): boolean {
    return codes.some((code) => this.held.has(code));
  }

  read(binding: Binding, toward: number): PlayerInput {
    const screenX = (this.isDown(binding.right) ? 1 : 0) - (this.isDown(binding.left) ? 1 : 0);
    const screenY = (this.isDown(binding.up) ? 1 : 0) - (this.isDown(binding.down) ? 1 : 0);

    let buttons = 0;
    if (this.isDown(binding.light)) buttons |= Button.Light;
    if (this.isDown(binding.medium)) buttons |= Button.Medium;
    if (this.isDown(binding.heavy)) buttons |= Button.Heavy;
    if (this.isDown(binding.ki)) buttons |= Button.Ki;
    if (this.isDown(binding.guard)) buttons |= Button.Guard;
    if (this.isDown(binding.drive)) buttons |= Button.Drive;
    if (this.isDown(binding.dash)) buttons |= Button.Dash;
    if (this.isDown(binding.charge)) buttons |= Button.Charge;
    if (this.isDown(binding.vanish)) buttons |= Button.Vanish;

    return { dir: toNumpad(screenX, screenY, toward), buttons };
  }
}

const STICK_DEADZONE = 0.35;

/**
 * Read a connected gamepad, mapped face-button-per-attack in the arcade
 * convention. Returns null when no pad is present so the caller can fall back
 * to the keyboard without a mode switch.
 */
export function readGamepad(index: number, toward: number): PlayerInput | null {
  const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
  const pad = pads?.[index];
  if (!pad) {
    return null;
  }

  const axisX = pad.axes[0] ?? 0;
  const axisY = pad.axes[1] ?? 0;
  const dpadRight = pad.buttons[15]?.pressed ? 1 : 0;
  const dpadLeft = pad.buttons[14]?.pressed ? 1 : 0;
  const dpadUp = pad.buttons[12]?.pressed ? 1 : 0;
  const dpadDown = pad.buttons[13]?.pressed ? 1 : 0;

  const screenX =
    dpadRight - dpadLeft || (Math.abs(axisX) > STICK_DEADZONE ? Math.sign(axisX) : 0);
  // Gamepad Y is inverted relative to screen up.
  const screenY =
    dpadUp - dpadDown || (Math.abs(axisY) > STICK_DEADZONE ? -Math.sign(axisY) : 0);

  const pressed = (i: number): boolean => pad.buttons[i]?.pressed === true;
  let buttons = 0;
  if (pressed(2)) buttons |= Button.Light;
  if (pressed(3)) buttons |= Button.Medium;
  if (pressed(1)) buttons |= Button.Heavy;
  if (pressed(0)) buttons |= Button.Ki;
  if (pressed(6)) buttons |= Button.Guard;
  if (pressed(4)) buttons |= Button.Drive;
  if (pressed(5)) buttons |= Button.Dash;
  if (pressed(7)) buttons |= Button.Charge;
  if (pressed(10)) buttons |= Button.Vanish;

  return { dir: toNumpad(screenX, screenY, toward), buttons };
}
