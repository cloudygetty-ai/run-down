import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, Vibration } from 'react-native';
import { CollisionAlert, NearbyUser } from '../types/social';

type Props = {
  alert: CollisionAlert;
  target: NearbyUser | undefined;
};

// Haptic pattern: escalating pulses as countdown closes
const HAPTIC_PATTERN = [0, 100, 200, 100, 150, 100, 100, 100, 50];

export const CollisionAlertOverlay: React.FC<Props> = ({ alert, target }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const prevSecRef = useRef(-1);

  const seconds = Math.ceil(alert.countdownMs / 1000);

  useEffect(() => {
    // Haptic pulse once per second
    if (seconds !== prevSecRef.current && seconds > 0) {
      prevSecRef.current = seconds;
      Vibration.vibrate(HAPTIC_PATTERN);
    }
  }, [seconds]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 300, useNativeDriver: true }),
      ]),
    );
    const flash = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    );
    const expand = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    flash.start();
    expand.start();
    return () => {
      pulse.stop();
      flash.stop();
      expand.stop();
    };
  }, [scaleAnim, flashAnim, ringAnim]);

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.8, 0.2, 0] });

  return (
    <View style={styles.root} pointerEvents="none">
      {/* Expanding sonar ring */}
      <Animated.View
        style={[styles.sonarRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />

      {/* Alert card */}
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.flashBorder, { opacity: flashAnim }]} />

        <Text style={styles.alertTag}>⚡ COLLISION ALERT</Text>

        <Text style={styles.countdown}>{seconds}</Text>

        <Text style={styles.distLabel}>{Math.round(alert.distanceMeters)}m away</Text>

        {target && (
          <View style={styles.vibeRow}>
            <View style={[styles.dot, { backgroundColor: target.accentColor }]} />
            <Text style={styles.vibeText}>
              {target.vibeTicker.genre} · {target.vibeTicker.bpm}bpm
            </Text>
          </View>
        )}

        <Text style={styles.subtitle}>Two high-velocity paths converging</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  sonarRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#FF006E',
  },
  card: {
    backgroundColor: '#0D0D18',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF006E',
    padding: 24,
    alignItems: 'center',
    width: 240,
    shadowColor: '#FF006E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  flashBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF006E',
  },
  alertTag: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#FF006E',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  countdown: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FF006E',
    lineHeight: 76,
    marginBottom: 4,
  },
  distLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vibeText: {
    fontSize: 11,
    color: '#ccc',
  },
  subtitle: {
    fontSize: 9,
    color: '#444',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
