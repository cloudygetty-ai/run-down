import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Decoy } from '../types';

type Props = {
  decoy: Decoy;
  viewportX: number;
  viewportY: number;
};

export const DecoyView: React.FC<Props> = ({ decoy, viewportX, viewportY }) => {
  const cx = decoy.position.x - viewportX;
  const cy = decoy.position.y - viewportY;
  const opacity = Math.min(1, decoy.ttlMs / 1000); // fade out in last second

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { left: cx - 12, top: cy - 12, opacity }]}
    >
      <View style={styles.ring} />
      <Text style={styles.icon}>⟡</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(160,220,255,0.7)',
    backgroundColor: 'rgba(80,160,255,0.12)',
  },
  icon: {
    fontSize: 12,
    color: 'rgba(180,230,255,0.9)',
    fontWeight: 'bold',
  },
});
