import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HelixRelay } from '../types';

type Props = {
  relay: HelixRelay;
  viewportX: number;
  viewportY: number;
};

export const HelixRelayView: React.FC<Props> = ({ relay, viewportX, viewportY }) => {
  const cx = relay.position.x - viewportX;
  const cy = relay.position.y - viewportY;

  const captured  = relay.captureProgress >= 1;
  const capturing = relay.captureProgress > 0 && relay.captureProgress < 1;

  const ringColor  = captured ? 'rgba(150,255,100,0.35)' : capturing ? 'rgba(255,220,80,0.35)' : 'rgba(180,80,255,0.25)';
  const ringBorder = captured ? 'rgba(150,255,100,0.9)'  : capturing ? 'rgba(255,220,80,0.9)'  : 'rgba(180,80,255,0.6)';
  const towerColor = captured ? '#aaffaa' : capturing ? '#ffee44' : '#cc88ff';
  const r = relay.captureRadius;

  return (
    <>
      {/* Capture radius ring */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderWidth: 1.5,
          borderColor: ringBorder,
          backgroundColor: ringColor,
        }}
      />

      {/* Capture progress arc — filled ring section */}
      {capturing && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - 18,
            top: cy - 18,
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 3,
            borderColor: '#ffee44',
            opacity: 0.7,
          }}
        />
      )}

      {/* Center tower */}
      <View
        pointerEvents="none"
        style={[styles.tower, { left: cx - 10, top: cy - 10, borderColor: towerColor }]}
      >
        <Text style={[styles.towerIcon, { color: towerColor }]}>⊕</Text>
        {capturing && (
          <Text style={styles.progressPct}>
            {Math.round(relay.captureProgress * 100)}%
          </Text>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  tower: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  towerIcon: {
    fontSize: 10,
    fontWeight: 'bold',
    transform: [{ rotate: '-45deg' }],
  },
  progressPct: {
    position: 'absolute',
    top: -16,
    fontSize: 8,
    color: '#ffee44',
    fontWeight: 'bold',
    transform: [{ rotate: '-45deg' }],
  },
});
