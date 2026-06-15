import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LootDrop, Rarity, WeaponType, GearSlot } from '../types';

type Props = {
  loot: LootDrop;
  viewportX: number;
  viewportY: number;
};

const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#aaaaaa',
  uncommon:  '#00cc44',
  rare:      '#4488ff',
  epic:      '#aa44ff',
  legendary: '#ffaa00',
};

const WEAPON_LABELS: Partial<Record<WeaponType, string>> = {
  pickaxe: 'AXE',
  pistol: 'PST', revolver: 'RVL', hand_cannon: 'HCN', burst_pistol: 'BST',
  smg: 'SMG', compact_smg: 'CSM', suppressed_smg: 'SSM',
  assault_rifle: 'AR', burst_ar: 'BAR', heavy_ar: 'HAR', thermal_ar: 'TAR',
  shotgun: 'SG', tactical_shotgun: 'TSG', heavy_shotgun: 'HSG', drum_shotgun: 'DSG',
  sniper: 'SNP', semi_sniper: 'SSN', heavy_sniper: 'HSN', hunting_rifle: 'HNT',
  marksman_rifle: 'DMR',
  lmg: 'LMG',
  rocket_launcher: 'RPG',
  crossbow: 'XBOW', minigun: 'MINI', rail_gun: 'RAIL',
};

const GEAR_LABELS: Record<GearSlot, string> = {
  helmet: 'HLM', chest: 'CHT', legs: 'LGS', gloves: 'GLV',
};

export const LootDropView: React.FC<Props> = ({ loot, viewportX, viewportY }) => {
  const left = loot.position.x - viewportX - 16;
  const top  = loot.position.y - viewportY - 9;

  let color = '#ffffff';
  let label = 'ITEM';

  if (loot.weapon) {
    color = RARITY_COLORS[loot.weapon.rarity];
    label = WEAPON_LABELS[loot.weapon.type] ?? loot.weapon.type.slice(0, 3).toUpperCase();
  } else if (loot.gear) {
    color = RARITY_COLORS[loot.gear.rarity];
    label = GEAR_LABELS[loot.gear.slot];
  } else if (loot.shield > 0) {
    color = '#44aaff';
    label = 'SHD';
  } else if (loot.health > 0) {
    color = '#44ff88';
    label = 'MED';
  } else if (loot.ammo > 0) {
    color = '#ffcc44';
    label = 'AMO';
  }

  const isLegendary = (loot.weapon?.rarity === 'legendary') || (loot.gear?.rarity === 'legendary');

  return (
    <View
      style={[
        styles.container,
        { left, top, borderColor: color },
        isLegendary && styles.legendary,
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 32,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendary: {
    shadowColor: '#ffaa00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
