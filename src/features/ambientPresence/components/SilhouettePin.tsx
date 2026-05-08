import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { PresenceUser } from '../types';

type Props = {
  user: PresenceUser;
  screenX: number;
  screenY: number;
  isVibeMatch: boolean;
};

// Silhouette dimensions
const PIN_W  = 24;
const PIN_H  = 36;
const HEAD_D = 12;
const BODY_W = 10;
const BODY_H = 16;

export const SilhouettePin: React.FC<Props> = ({ user, screenX, screenY, isVibeMatch }) => {
  const revealProgress = useRef(new Animated.Value(user.isRevealed ? 1 : 0)).current;
  const scalePop       = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(revealProgress, {
        toValue: user.isRevealed ? 1 : 0,
        duration: 900,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(scalePop, {
          toValue: user.isRevealed ? 1.25 : 0.85,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(scalePop, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [user.isRevealed]);

  // Opacity: shadow (0.35) → revealed (0.9)
  const opacity = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.9],
  });

  // Silhouette body colour: deep shadow → lavender-tinged reveal
  const bodyColor = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1A0F1E', '#3D1F4A'],
  });

  // Border: invisible shadow → gold (or crimson for vibe match)
  const borderColor = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1A0F1E', isVibeMatch ? '#C0A060' : '#7B4F8A'],
  });

  const left = screenX - PIN_W / 2;
  const top  = screenY - PIN_H / 2;

  return (
    <Animated.View
      style={[styles.root, { left, top, opacity, transform: [{ scale: scalePop }] }]}
    >
      {/* Head */}
      <Animated.View style={[styles.head, { backgroundColor: bodyColor, borderColor }]} />

      {/* Body */}
      <Animated.View style={[styles.body, { backgroundColor: bodyColor, borderColor }]} />

      {/* Label — only visible when revealed */}
      {user.isRevealed && (
        <View style={styles.labelContainer}>
          <Text style={styles.handle} numberOfLines={1}>{user.displayHandle}</Text>
          <Text style={styles.genre}>{user.vibeGenre}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    width: PIN_W,
    height: PIN_H,
    alignItems: 'center',
  },
  head: {
    width: HEAD_D,
    height: HEAD_D,
    borderRadius: HEAD_D / 2,
    borderWidth: 1.5,
  },
  body: {
    width: BODY_W,
    height: BODY_H,
    marginTop: 2,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  labelContainer: {
    position: 'absolute',
    top: PIN_H + 4,
    alignItems: 'center',
    width: 80,
  },
  handle: {
    color: '#C0A060',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  genre: {
    color: '#7B4F8A',
    fontSize: 8,
    marginTop: 1,
    letterSpacing: 0.3,
  },
});
