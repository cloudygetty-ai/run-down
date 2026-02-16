import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LootDrop, Rarity } from '../types';

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

const WEAPON_ICONS: Record<string, string> = {
  assault_rifle: 'AR',
  shotgun:       'SG',
  sniper:        'SN',
  smg:           'SM',
  pickaxe:       'PX',
};

export const LootDropView: React.FC<Props> = ({ loot, viewportX, viewportY }) => {
  const left = loot.position.x - viewportX - 12;
  const top  = loot.position.y - viewportY - 6;
  const color = loot.weapon ? RARITY_COLORS[loot.weapon.rarity] : '#ffffff';
  const label = loot.weapon ? (WEAPON_ICONS[loot.weapon.type] ?? '?') : 'IT';

  return (
    <View style={[styles.container, { left, top, borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 24,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 7,
    fontWeight: 'bold',
  },
});
