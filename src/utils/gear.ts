import { Gear, GearSlot, Rarity, Player } from '../types';
import { randomInt } from './math';

const RARITY_INDEX: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

const GEAR_NAMES: Record<GearSlot, string[]> = {
  helmet: ['Scrap Cap',   'Field Helmet',  'Tactical Helm',    'Reinforced Helm', 'Orbital Visor'],
  chest:  ['Scrap Vest',  'Ballistic Vest','Combat Plate',     'Reinforced Plate','Void Armor'],
  legs:   ['Runner Wrap', 'Combat Greaves','Tac Kneeguards',   'Reactive Legs',   'Quantum Stride'],
  gloves: ['Grip Wrap',   'Tact. Gloves', 'Aim Gauntlets',    'Prec. Gauntlets', 'Neural Gloves'],
};

const GEAR_HP: Record<GearSlot, number[]> = {
  helmet: [10, 20, 30, 45,  60], chest:  [15, 25, 40, 55,  70],
  legs:   [10, 15, 25, 35,  50], gloves: [ 0,  0,  5, 10,  15],
};
const GEAR_SHIELD: Record<GearSlot, number[]> = {
  helmet: [ 0,  5, 10, 15,  25], chest:  [20, 30, 50, 70, 100],
  legs:   [ 0,  0,  0, 10,  20], gloves: [ 0,  0,  0,  0,  10],
};
const GEAR_RESISTANCE: Record<GearSlot, number[]> = {
  helmet: [0.03,0.05,0.08,0.12,0.18], chest:  [0.05,0.08,0.12,0.18,0.25],
  legs:   [0.00,0.02,0.04,0.07,0.10], gloves: [0.00,0.00,0.02,0.04,0.06],
};
const GEAR_SPEED: Record<GearSlot, number[]> = {
  helmet: [0.00,0.00,0.01,0.02,0.03], chest:  [0.00,0.00,0.00,0.01,0.02],
  legs:   [0.02,0.04,0.06,0.09,0.12], gloves: [0.00,0.01,0.02,0.03,0.05],
};
const GEAR_DAMAGE: Record<GearSlot, number[]> = {
  helmet: [0.00,0.00,0.02,0.04,0.06], chest:  [0.00,0.00,0.02,0.05,0.08],
  legs:   [0.00,0.00,0.00,0.02,0.04], gloves: [0.05,0.10,0.15,0.20,0.25],
};
// Negative = faster reload (additive to reloadMult that defaults to 1.0)
const GEAR_RELOAD: Record<GearSlot, number[]> = {
  helmet: [ 0.00, 0.00, 0.00,-0.03,-0.05], chest:  [ 0.00, 0.00, 0.00,-0.03,-0.06],
  legs:   [ 0.00, 0.00, 0.00, 0.00,-0.03], gloves: [-0.05,-0.08,-0.12,-0.18,-0.25],
};

export function makeGear(slot: GearSlot, rarity: Rarity): Gear {
  const ri = RARITY_INDEX[rarity];
  return {
    id: `gear_${slot}_${randomInt(0, 999999)}`,
    slot,
    rarity,
    name: GEAR_NAMES[slot][ri],
    healthBonus:     GEAR_HP[slot][ri],
    shieldBonus:     GEAR_SHIELD[slot][ri],
    resistanceBonus: GEAR_RESISTANCE[slot][ri],
    speedBonus:      GEAR_SPEED[slot][ri],
    damageBonus:     GEAR_DAMAGE[slot][ri],
    reloadBonus:     GEAR_RELOAD[slot][ri],
  };
}

// Apply or remove one gear piece's stat deltas (sign = +1 equip, -1 unequip).
export function applyGearDelta(player: Player, gear: Gear, sign: 1 | -1): Player {
  const hpDelta = gear.healthBonus * sign;
  const shDelta = gear.shieldBonus * sign;
  const newMaxHealth = player.maxHealth + hpDelta;
  const newMaxShield = player.maxShield + shDelta;
  const newHealth = sign === 1
    ? Math.min(newMaxHealth, player.health + hpDelta)
    : Math.max(1, Math.min(player.health, newMaxHealth));
  const newShield = sign === 1
    ? Math.min(newMaxShield, player.shield + shDelta)
    : Math.max(0, Math.min(player.shield, newMaxShield));
  return {
    ...player,
    maxHealth:        newMaxHealth,
    health:           newHealth,
    maxShield:        newMaxShield,
    shield:           newShield,
    damageResistance: Math.max(0, Math.min(0.75, player.damageResistance + gear.resistanceBonus * sign)),
    speedMult:        Math.max(0.1, player.speedMult  + gear.speedBonus  * sign),
    damageMult:       Math.max(0.1, player.damageMult + gear.damageBonus * sign),
    reloadMult:       Math.max(0.1, Math.min(2.0, player.reloadMult + gear.reloadBonus * sign)),
  };
}
