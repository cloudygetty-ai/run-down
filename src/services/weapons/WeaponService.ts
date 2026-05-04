import { Player, Weapon } from '../../types';
import { logger } from '../../utils';

// Tracks reload timers keyed by weaponId
const reloadTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Begin reloading the active weapon for a player.
// Calls onComplete with the updated player when done.
export function startReload(player: Player, onComplete: (updated: Player) => void): void {
  const weapon = player.weapons[player.activeWeaponSlot];
  if (!weapon || weapon.type === 'pickaxe' || weapon.isReloading) {
    return;
  }
  if (weapon.currentAmmo === weapon.magazineSize) {
    return;
  }

  const weaponId = weapon.id;

  // Cancel any existing reload for this weapon
  if (reloadTimers.has(weaponId)) {
    clearTimeout(reloadTimers.get(weaponId)!);
  }

  logger.debug('WeaponService', `reload started: ${weapon.type}`);

  const timer = setTimeout(() => {
    reloadTimers.delete(weaponId);
    const updated = completeReload(player);
    onComplete(updated);
  }, weapon.reloadTime);

  reloadTimers.set(weaponId, timer);

  // Mark as reloading immediately
  const weapons = [...player.weapons] as Player['weapons'];
  weapons[player.activeWeaponSlot] = { ...weapon, isReloading: true };
  onComplete({ ...player, weapons });
}

function completeReload(player: Player): Player {
  const weapon = player.weapons[player.activeWeaponSlot];
  if (!weapon) {
    return player;
  }
  const weapons = [...player.weapons] as Player['weapons'];
  weapons[player.activeWeaponSlot] = {
    ...weapon,
    currentAmmo: weapon.magazineSize,
    isReloading: false,
  };
  return { ...player, weapons };
}

export function cancelAllReloads(): void {
  reloadTimers.forEach((t) => clearTimeout(t));
  reloadTimers.clear();
}

// Switch active weapon slot (0, 1, 2).
// Cancels any reload in progress on the old slot.
export function switchWeaponSlot(player: Player, slot: 0 | 1 | 2): Player {
  if (slot === player.activeWeaponSlot) {
    return player;
  }
  const oldWeapon = player.weapons[player.activeWeaponSlot];
  if (oldWeapon?.isReloading) {
    if (reloadTimers.has(oldWeapon.id)) {
      clearTimeout(reloadTimers.get(oldWeapon.id)!);
      reloadTimers.delete(oldWeapon.id);
    }
    const weapons = [...player.weapons] as Player['weapons'];
    weapons[player.activeWeaponSlot] = { ...oldWeapon, isReloading: false };
    return { ...player, weapons, activeWeaponSlot: slot };
  }
  return { ...player, activeWeaponSlot: slot };
}

// Returns whether enough time has passed since lastFireTime to fire again.
export function canFire(weapon: Weapon, lastFireTimeMs: number, nowMs: number): boolean {
  if (weapon.currentAmmo <= 0 || weapon.isReloading) {
    return false;
  }
  const minInterval = 1000 / weapon.fireRate;
  return nowMs - lastFireTimeMs >= minInterval;
}

// Compute the target position for a bot auto-aiming at a player,
// adding random spread based on weapon type.
export function computeAimPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  weapon: Weapon,
): { x: number; y: number } {
  const spread: Record<Weapon['type'], number> = {
    // Melee
    pickaxe: 0,
    // Pistols
    pistol: 20,
    revolver: 8,
    hand_cannon: 12,
    burst_pistol: 18,
    // SMGs
    smg: 25,
    compact_smg: 30,
    suppressed_smg: 20,
    // Assault Rifles
    assault_rifle: 15,
    burst_ar: 12,
    heavy_ar: 10,
    thermal_ar: 8,
    // Shotguns
    shotgun: 30,
    tactical_shotgun: 35,
    heavy_shotgun: 25,
    drum_shotgun: 40,
    // Sniper Rifles
    sniper: 5,
    semi_sniper: 7,
    heavy_sniper: 3,
    hunting_rifle: 10,
    // Marksman / DMR
    marksman_rifle: 6,
    // LMGs
    lmg: 20,
    // Explosives
    rocket_launcher: 5,
    // Special / Exotic
    crossbow: 3,
    minigun: 35,
    rail_gun: 2,
  };
  const s = spread[weapon.type];
  return {
    x: to.x + (Math.random() - 0.5) * s,
    y: to.y + (Math.random() - 0.5) * s,
  };
}
