import {
  canFire,
  computeAimPoint,
  switchWeaponSlot,
  startReload,
  cancelAllReloads,
} from "./WeaponService";
import { Player, Weapon } from "../../types";

function makeWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    id: "ar1",
    type: "assault_rifle",
    rarity: "common",
    damage: 35,
    fireRate: 5,
    magazineSize: 30,
    currentAmmo: 30,
    range: 400,
    reloadTime: 500, // short for test speed
    isReloading: false,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "human",
    name: "Test",
    isHuman: true,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 100,
    status: "alive",
    weapons: [makeWeapon({ id: "w0" }), null, null],
    activeWeaponSlot: 0,
    materials: { wood: 100, stone: 50, metal: 25 },
    kills: 0,
    isBuilding: false,
    selectedBuildPiece: "wall",
    selectedBuildMaterial: "wood",
    ...overrides,
  };
}

afterEach(() => {
  cancelAllReloads();
});

// ─── canFire ─────────────────────────────────────────────────────────────────

describe("WeaponService.canFire", () => {
  it("returns true when ammo is available and fire rate interval has passed", () => {
    const weapon = makeWeapon({ fireRate: 1 }); // 1 shot/s → 1000ms interval
    expect(canFire(weapon, 0, 1500)).toBe(true);
  });

  it("returns false when not enough time has passed since last shot", () => {
    const weapon = makeWeapon({ fireRate: 1 }); // interval = 1000ms
    expect(canFire(weapon, 0, 500)).toBe(false);
  });

  it("returns false when ammo is 0", () => {
    const weapon = makeWeapon({ currentAmmo: 0, fireRate: 1 });
    expect(canFire(weapon, 0, 2000)).toBe(false);
  });

  it("returns false when weapon is reloading", () => {
    const weapon = makeWeapon({ isReloading: true, fireRate: 1 });
    expect(canFire(weapon, 0, 2000)).toBe(false);
  });

  it("returns true exactly at the fire rate interval boundary", () => {
    const weapon = makeWeapon({ fireRate: 2 }); // interval = 500ms
    expect(canFire(weapon, 1000, 1500)).toBe(true);
  });

  it("handles high fire rate weapons (SMG at 10 rps = 100ms interval)", () => {
    const smg = makeWeapon({ fireRate: 10, currentAmmo: 35 });
    expect(canFire(smg, 1000, 1099)).toBe(false);
    expect(canFire(smg, 1000, 1100)).toBe(true);
  });
});

// ─── computeAimPoint ─────────────────────────────────────────────────────────

describe("WeaponService.computeAimPoint", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 100, y: 0 };

  it("returns a point near the target", () => {
    const weapon = makeWeapon({ type: "assault_rifle" });
    const aim = computeAimPoint(from, to, weapon);
    // AR spread is 15 — result should be within ±15 units of target
    expect(Math.abs(aim.x - 100)).toBeLessThanOrEqual(15);
    expect(Math.abs(aim.y)).toBeLessThanOrEqual(15);
  });

  it("sniper rifle has tighter spread than shotgun", () => {
    const sniper = makeWeapon({ type: "sniper" });
    const shotgun = makeWeapon({ type: "shotgun" });

    const RUNS = 200;
    let sniperMaxDist = 0;
    let shotgunMaxDist = 0;

    for (let i = 0; i < RUNS; i++) {
      const sAim = computeAimPoint(from, to, sniper);
      const gAim = computeAimPoint(from, to, shotgun);
      sniperMaxDist = Math.max(sniperMaxDist, Math.abs(sAim.y));
      shotgunMaxDist = Math.max(shotgunMaxDist, Math.abs(gAim.y));
    }

    // Over 200 runs, shotgun spread should statistically be wider than sniper
    expect(shotgunMaxDist).toBeGreaterThan(sniperMaxDist);
  });

  it("pickaxe has zero spread — always returns exact target", () => {
    const pickaxe = makeWeapon({ type: "pickaxe" });
    for (let i = 0; i < 20; i++) {
      const aim = computeAimPoint(from, to, pickaxe);
      expect(aim.x).toBe(to.x);
      expect(aim.y).toBe(to.y);
    }
  });
});

// ─── switchWeaponSlot ─────────────────────────────────────────────────────────

describe("WeaponService.switchWeaponSlot", () => {
  it("switches to the requested slot", () => {
    const w1 = makeWeapon({ id: "w1" });
    const player = makePlayer({
      weapons: [makeWeapon({ id: "w0" }), w1, null],
      activeWeaponSlot: 0,
    });
    const updated = switchWeaponSlot(player, 1);
    expect(updated.activeWeaponSlot).toBe(1);
  });

  it("returns the same player reference when already on that slot", () => {
    const player = makePlayer({ activeWeaponSlot: 0 });
    const updated = switchWeaponSlot(player, 0);
    expect(updated).toBe(player);
  });

  it("cancels reload on the old weapon when switching away", () => {
    const reloadingWeapon = makeWeapon({
      id: "reload_w",
      isReloading: true,
      currentAmmo: 0,
    });
    const player = makePlayer({
      weapons: [reloadingWeapon, makeWeapon({ id: "w1" }), null],
      activeWeaponSlot: 0,
    });
    const updated = switchWeaponSlot(player, 1);
    // Old slot weapon should no longer be marked as reloading
    expect(updated.weapons[0]?.isReloading).toBe(false);
    expect(updated.activeWeaponSlot).toBe(1);
  });

  it("does not touch the new slot weapon", () => {
    const w1 = makeWeapon({ id: "w1", currentAmmo: 20 });
    const player = makePlayer({
      weapons: [makeWeapon({ id: "w0" }), w1, null],
      activeWeaponSlot: 0,
    });
    const updated = switchWeaponSlot(player, 1);
    expect(updated.weapons[1]?.currentAmmo).toBe(20);
  });
});

// ─── startReload ─────────────────────────────────────────────────────────────

describe("WeaponService.startReload", () => {
  it("immediately marks weapon as reloading", (done) => {
    const emptyWeapon = makeWeapon({
      id: "empty",
      currentAmmo: 0,
      reloadTime: 300,
    });
    const player = makePlayer({ weapons: [emptyWeapon, null, null] });

    let firstCallbackPlayer: Player | null = null;

    startReload(player, (updated) => {
      if (!firstCallbackPlayer) {
        firstCallbackPlayer = updated;
        expect(updated.weapons[0]?.isReloading).toBe(true);
        done();
      }
    });
  });

  it("restores full ammo after reload completes", (done) => {
    const emptyWeapon = makeWeapon({
      id: "full",
      currentAmmo: 0,
      magazineSize: 30,
      reloadTime: 100,
    });
    const player = makePlayer({ weapons: [emptyWeapon, null, null] });

    let callCount = 0;
    startReload(player, (updated) => {
      callCount++;
      if (callCount === 2) {
        // Second callback is the completion callback
        expect(updated.weapons[0]?.currentAmmo).toBe(30);
        expect(updated.weapons[0]?.isReloading).toBe(false);
        done();
      }
    });
  });

  it("does not reload a weapon that is already full", () => {
    const fullWeapon = makeWeapon({
      id: "full",
      currentAmmo: 30,
      magazineSize: 30,
    });
    const player = makePlayer({ weapons: [fullWeapon, null, null] });

    const callback = jest.fn();
    startReload(player, callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not reload a pickaxe", () => {
    const pickaxe = makeWeapon({
      id: "axe",
      type: "pickaxe",
      currentAmmo: Infinity,
      magazineSize: Infinity,
    });
    const player = makePlayer({ weapons: [pickaxe, null, null] });

    const callback = jest.fn();
    startReload(player, callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not start a second reload if one is already in progress", () => {
    const emptyWeapon = makeWeapon({
      id: "dup",
      currentAmmo: 0,
      isReloading: true,
      reloadTime: 300,
    });
    const player = makePlayer({ weapons: [emptyWeapon, null, null] });

    const callback = jest.fn();
    startReload(player, callback);
    expect(callback).not.toHaveBeenCalled();
  });
});
