import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SupplyDrop } from '../types';

type Props = {
  drop: SupplyDrop;
  viewportX: number;
  viewportY: number;
};

export const SupplyDropView: React.FC<Props> = ({ drop, viewportX, viewportY }) => {
  const cx = drop.position.x - viewportX;
  const cy = drop.position.y - viewportY;

  if (!drop.isLanded) {
    // Descending — show landing zone ring that pulses with countdown
    const progress = 1 - drop.landInMs / 8000; // 0 = just spawned, 1 = landing
    const ringSize = 60 + (1 - progress) * 40; // shrinks as it approaches
    const opacity = 0.4 + progress * 0.5;
    const sec = Math.ceil(drop.landInMs / 1000);

    return (
      <View
        pointerEvents="none"
        style={[
          styles.landingRing,
          {
            left: cx - ringSize / 2,
            top: cy - ringSize / 2,
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            opacity,
          },
        ]}
      >
        <Text style={styles.countdownText}>{sec}s</Text>
      </View>
    );
  }

  // Landed — show a golden crate icon
  return (
    <View style={[styles.crate, { left: cx - 14, top: cy - 14 }]}>
      <Text style={styles.crateIcon}>📦</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  landingRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffdd00',
    backgroundColor: 'rgba(255, 220, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: '#ffdd00',
    fontWeight: 'bold',
    fontSize: 10,
  },
  crate: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: '#ffaa00',
    borderRadius: 4,
  },
  crateIcon: {
    fontSize: 14,
  },
});
