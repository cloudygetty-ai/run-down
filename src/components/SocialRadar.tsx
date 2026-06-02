import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { NearbyUser } from '../types/social';
import { heatLevelColor } from '../core/velocity/VelocityEngine';

const RADAR_RADIUS = 130; // visual radius of the radar disc

type BlipProps = {
  user: NearbyUser;
  radarRadius: number;
  maxDistance: number;
  onPress: (id: string) => void;
};

const Blip: React.FC<BlipProps> = ({ user, radarRadius, maxDistance, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const color = heatLevelColor(user.heatLevel);

  // Polar → cartesian: bearing 0 = up (north)
  const r = Math.min(radarRadius - 12, (user.distance / maxDistance) * radarRadius);
  const rad = ((user.bearing - 90) * Math.PI) / 180;
  const bx = r * Math.cos(rad);
  const by = r * Math.sin(rad);

  useEffect(() => {
    const speed = user.heatLevel === 'blazing' ? 400 : user.heatLevel === 'hot' ? 700 : 1400;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.8, duration: speed, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: speed, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [user.heatLevel, pulseAnim]);

  const blipSize = user.heatLevel === 'blazing' ? 12 : user.heatLevel === 'hot' ? 10 : 8;

  return (
    <TouchableOpacity
      style={[
        styles.blip,
        {
          left: radarRadius + bx - blipSize / 2,
          top: radarRadius + by - blipSize / 2,
          width: blipSize,
          height: blipSize,
        },
      ]}
      onPress={() => onPress(user.id)}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Animated.View
        style={[
          styles.blipRing,
          {
            width: blipSize * 2.5,
            height: blipSize * 2.5,
            borderRadius: blipSize * 1.25,
            borderColor: color,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <View
        style={[
          styles.blipCore,
          {
            width: blipSize,
            height: blipSize,
            borderRadius: blipSize / 2,
            backgroundColor: color,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

type Props = {
  nearbyUsers: NearbyUser[];
  localHeatLevel: import('../types/social').HeatLevel;
  onUserPress: (userId: string) => void;
};

export const SocialRadar: React.FC<Props> = ({ nearbyUsers, localHeatLevel, onUserPress }) => {
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const localColor = heatLevelColor(localHeatLevel);
  const maxDistance = 500;

  useEffect(() => {
    const sweep = Animated.loop(
      Animated.timing(sweepAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
    );
    sweep.start();
    return () => sweep.stop();
  }, [sweepAnim]);

  const sweepRotate = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const diameter = RADAR_RADIUS * 2;

  return (
    <View style={styles.root}>
      {/* Radar disc */}
      <View
        style={[styles.disc, { width: diameter, height: diameter, borderRadius: RADAR_RADIUS }]}
      >
        {/* Range rings */}
        {[0.33, 0.66, 1].map((frac) => (
          <View
            key={frac}
            style={[
              styles.ring,
              {
                width: diameter * frac,
                height: diameter * frac,
                borderRadius: RADAR_RADIUS * frac,
                opacity: 0.15 + frac * 0.05,
              },
            ]}
          />
        ))}

        {/* Cross-hair lines */}
        <View style={[styles.crossH, { opacity: 0.08 }]} />
        <View style={[styles.crossV, { opacity: 0.08 }]} />

        {/* Sweep arm */}
        <Animated.View style={[styles.sweep, { transform: [{ rotate: sweepRotate }] }]} />

        {/* User blips */}
        {nearbyUsers.map((u) => (
          <Blip
            key={u.id}
            user={u}
            radarRadius={RADAR_RADIUS}
            maxDistance={maxDistance}
            onPress={onUserPress}
          />
        ))}

        {/* Local user dot */}
        <View style={[styles.localDot, { backgroundColor: localColor, shadowColor: localColor }]} />
      </View>

      {/* Range label */}
      <Text style={styles.rangeLabel}>{maxDistance}m radius</Text>

      {/* Legend */}
      <View style={styles.legend}>
        {(['cold', 'warm', 'hot', 'blazing'] as const).map((heat) => (
          <View key={heat} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: heatLevelColor(heat) }]} />
            <Text style={styles.legendText}>{heat.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  disc: {
    backgroundColor: '#050510',
    borderWidth: 1,
    borderColor: 'rgba(57,255,20,0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#39FF14',
    alignSelf: 'center',
    top: '50%',
    left: '50%',
    marginLeft: -RADAR_RADIUS,
    marginTop: -RADAR_RADIUS,
  },
  crossH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: '#39FF14',
  },
  crossV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: '#39FF14',
  },
  sweep: {
    position: 'absolute',
    top: RADAR_RADIUS,
    left: RADAR_RADIUS,
    width: RADAR_RADIUS,
    height: 1,
    backgroundColor: 'rgba(57,255,20,0.6)',
    transformOrigin: '0 0',
  },
  blip: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blipRing: {
    position: 'absolute',
    borderWidth: 1,
    opacity: 0.4,
  },
  blipCore: {},
  localDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: RADAR_RADIUS - 5,
    left: RADAR_RADIUS - 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  rangeLabel: {
    fontSize: 9,
    color: '#333',
    letterSpacing: 1,
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendText: {
    fontSize: 7,
    color: '#444',
    letterSpacing: 1,
  },
});
