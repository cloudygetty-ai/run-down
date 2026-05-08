import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

type Props = {
  screenX: number;
  screenY: number;
};

const OUTER = 88;
const MID   = OUTER * 0.62;

// AR soft-glow halo placed beneath the Vibe Match silhouette.
// Rendered as concentric rings that breathe in/out continuously.
export const VibeMatchGlow: React.FC<Props> = ({ screenX, screenY }) => {
  const breathe = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1,    duration: 1_800, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.65, duration: 1_800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const left = screenX - OUTER / 2;
  const top  = screenY - OUTER / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.root, { left, top, opacity: breathe }]}
    >
      {/* Outer ring */}
      <Animated.View style={styles.outerRing} />
      {/* Mid ring */}
      <Animated.View style={styles.midRing} />
      {/* Gold core */}
      <Animated.View style={styles.core} />
      {/* Micro label */}
      <Text style={styles.label}>VIBE MATCH</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    width: OUTER,
    height: OUTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 160, 96, 0.5)',
  },
  midRing: {
    position: 'absolute',
    width: MID,
    height: MID,
    borderRadius: MID / 2,
    borderWidth: 1,
    borderColor: 'rgba(192, 160, 96, 0.3)',
  },
  core: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C0A060',
    // Shadow simulates glow effect on iOS; elevation handles Android
    shadowColor: '#C0A060',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  label: {
    position: 'absolute',
    top: OUTER + 2,
    color: '#C0A060',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
});
