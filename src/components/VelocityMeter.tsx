import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { HeatLevel } from '../types/social';
import { heatLevelColor } from '../core/velocity/VelocityEngine';

type Props = {
  heatLevel: HeatLevel;
  velocityScore: number; // 0–1
  size?: number;
};

const HEAT_LABELS: Record<HeatLevel, string> = {
  cold: 'IDLE',
  warm: 'ACTIVE',
  hot: 'ON FIRE',
  blazing: 'BLAZING',
};

export const VelocityMeter: React.FC<Props> = ({ heatLevel, velocityScore, size = 64 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const color = heatLevelColor(heatLevel);

  useEffect(() => {
    // Pulse frequency scales with heat
    const duration =
      heatLevel === 'blazing'
        ? 400
        : heatLevel === 'hot'
        ? 700
        : heatLevel === 'warm'
        ? 1200
        : 2000;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
      ]),
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: duration / 2, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    glow.start();
    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [heatLevel, pulseAnim, glowAnim]);

  const ringSize = size + 20;

  return (
    <View style={[styles.container, { width: ringSize, height: ringSize }]}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: color,
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      {/* Core icon */}
      <View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color + '22',
            borderColor: color,
          },
        ]}
      >
        <Text style={[styles.icon, { color }]}>◆</Text>
      </View>
      {/* Heat label */}
      <Text style={[styles.label, { color }]}>{HEAT_LABELS[heatLevel]}</Text>
      {/* Score bar */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${velocityScore * 100}%` as any, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  icon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: 'bold',
    marginTop: 6,
  },
  barTrack: {
    width: 56,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 2,
    borderRadius: 1,
  },
});
