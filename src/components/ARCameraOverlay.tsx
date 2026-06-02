import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, Dimensions } from 'react-native';
import { NearbyUser } from '../types/social';
import { heatLevelColor } from '../core/velocity/VelocityEngine';

const { width: W, height: H } = Dimensions.get('window');

type SilhouetteProps = {
  user: NearbyUser;
  index: number;
};

const Silhouette: React.FC<SilhouetteProps> = ({ user, index }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const color = heatLevelColor(user.heatLevel);

  // Deterministic-but-varied positions based on bearing
  const bearing = user.bearing;
  const x = W * 0.15 + (bearing / 360) * W * 0.7;
  const y = H * 0.2 + ((index * (H * 0.08)) % (H * 0.45));
  const scale = Math.max(0.4, 1.2 - user.distance / 200);

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000 + index * 400,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 2000 + index * 400,
          useNativeDriver: true,
        }),
      ]),
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200 + index * 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1200 + index * 200,
          useNativeDriver: true,
        }),
      ]),
    );
    float.start();
    glow.start();
    return () => {
      float.stop();
      glow.stop();
    };
  }, [floatAnim, glowAnim, index]);

  useEffect(() => {
    // Scan line sweeps downward continuously
    const scan = Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
    );
    scan.start();
    return () => scan.stop();
  }, [scanAnim]);

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  return (
    <Animated.View
      style={[
        styles.silhouette,
        {
          left: x - 30,
          top: y,
          transform: [{ translateY: floatAnim }, { scale }],
        },
      ]}
    >
      {/* Body shape */}
      <Animated.View
        style={[styles.silBody, { borderColor: color, shadowColor: color, opacity: glowAnim }]}
      >
        {/* Head */}
        <View style={[styles.silHead, { backgroundColor: color + '33', borderColor: color }]} />
        {/* Torso */}
        <View style={[styles.silTorso, { backgroundColor: color + '22', borderColor: color }]} />

        {/* Scan line */}
        <Animated.View
          style={[
            styles.scanLine,
            { backgroundColor: color + '88', transform: [{ translateY: scanTranslateY }] },
          ]}
        />
      </Animated.View>

      {/* Distance badge */}
      <View style={[styles.distBadge, { borderColor: color + '55' }]}>
        <Text style={[styles.distText, { color }]}>{Math.round(user.distance)}m</Text>
      </View>

      {/* Vibe tag (anonymous) */}
      {!user.isIdentityRevealed && (
        <View style={[styles.vibeTag, { borderColor: color + '44' }]}>
          <Text style={[styles.vibeText, { color: color + 'cc' }]} numberOfLines={1}>
            {user.vibeTicker.genre}
          </Text>
        </View>
      )}

      {/* Revealed name */}
      {user.isIdentityRevealed && user.displayName && (
        <View style={[styles.revealTag, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[styles.revealName, { color }]}>{user.displayName}</Text>
        </View>
      )}
    </Animated.View>
  );
};

// Scan grid lines for AR HUD aesthetic
const ScanGrid: React.FC = () => {
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const scan = Animated.loop(
      Animated.timing(lineAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
    );
    scan.start();
    return () => scan.stop();
  }, [lineAnim]);

  const lineY = lineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, H] });

  return (
    <>
      {/* Horizontal grid lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={[styles.gridLine, { top: (H / 8) * i, opacity: 0.06 }]} />
      ))}
      {/* Animated scan line */}
      <Animated.View
        style={[styles.activeScanLine, { transform: [{ translateY: lineY }] }]}
        pointerEvents="none"
      />
      {/* Corner brackets */}
      <View style={[styles.bracket, styles.bracketTL]} />
      <View style={[styles.bracket, styles.bracketTR]} />
      <View style={[styles.bracket, styles.bracketBL]} />
      <View style={[styles.bracket, styles.bracketBR]} />
    </>
  );
};

type Props = {
  nearbyUsers: NearbyUser[];
  proximityHum: number;
  glitchIntensity: number;
};

export const ARCameraOverlay: React.FC<Props> = ({
  nearbyUsers,
  proximityHum,
  glitchIntensity,
}) => {
  const glitchShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (glitchIntensity < 0.2) {
      glitchShift.setValue(0);
      return;
    }
    const glitch = Animated.loop(
      Animated.sequence([
        Animated.timing(glitchShift, {
          toValue: glitchIntensity * 3,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(glitchShift, {
          toValue: -glitchIntensity * 3,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(glitchShift, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    );
    glitch.start();
    return () => glitch.stop();
  }, [glitchIntensity, glitchShift]);

  const visibleUsers = nearbyUsers.filter((u) => u.distance < 200).slice(0, 5);

  return (
    <View style={styles.root}>
      {/* Simulated camera background — dark with tinted overlay */}
      <View style={styles.cameraBg} />

      {/* Vignette */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* AR grid */}
      <ScanGrid />

      {/* Silhouettes */}
      <Animated.View
        style={[styles.silhouetteLayer, { transform: [{ translateX: glitchShift }] }]}
        pointerEvents="none"
      >
        {visibleUsers.map((u, i) => (
          <Silhouette key={u.id} user={u} index={i} />
        ))}
      </Animated.View>

      {/* HUD header */}
      <View style={styles.hudHeader} pointerEvents="none">
        <Text style={styles.hudTitle}>AR LOOK-THROUGH</Text>
        <View style={styles.humBar}>
          <View style={[styles.humFill, { width: `${proximityHum * 100}%` as any }]} />
        </View>
        <Text style={styles.signalCount}>
          {visibleUsers.length} SIGNAL{visibleUsers.length !== 1 ? 'S' : ''} DETECTED
        </Text>
      </View>

      {/* Range indicator */}
      <View style={styles.rangeRing} pointerEvents="none">
        <Text style={styles.rangeText}>200m</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  cameraBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050508',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 60,
    borderColor: 'rgba(0,0,0,0.6)',
  },
  silhouetteLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  silhouette: {
    position: 'absolute',
    alignItems: 'center',
  },
  silBody: {
    width: 60,
    height: 100,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
  },
  silHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  silTorso: {
    width: 40,
    height: 52,
    borderRadius: 4,
    borderWidth: 1,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  distBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  distText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  vibeTag: {
    marginTop: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    maxWidth: 80,
  },
  vibeText: {
    fontSize: 8,
    letterSpacing: 1,
  },
  revealTag: {
    marginTop: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  revealName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#39FF14',
  },
  activeScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(57,255,20,0.25)',
  },
  bracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'rgba(57,255,20,0.4)',
  },
  bracketTL: { top: 60, left: 20, borderTopWidth: 2, borderLeftWidth: 2 },
  bracketTR: { top: 60, right: 20, borderTopWidth: 2, borderRightWidth: 2 },
  bracketBL: { bottom: 120, left: 20, borderBottomWidth: 2, borderLeftWidth: 2 },
  bracketBR: { bottom: 120, right: 20, borderBottomWidth: 2, borderRightWidth: 2 },
  hudHeader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hudTitle: {
    fontSize: 10,
    letterSpacing: 4,
    color: 'rgba(57,255,20,0.7)',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  humBar: {
    width: 120,
    height: 2,
    backgroundColor: 'rgba(57,255,20,0.15)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  humFill: {
    height: 2,
    backgroundColor: '#39FF14',
    borderRadius: 1,
  },
  signalCount: {
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(57,255,20,0.5)',
  },
  rangeRing: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(57,255,20,0.12)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  rangeText: {
    fontSize: 8,
    color: 'rgba(57,255,20,0.3)',
    letterSpacing: 1,
  },
});
