import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { MysteryClue } from '../types';

type Props = {
  clue: MysteryClue;
};

// Fades in on mount, holds at full opacity for 8 seconds, then dims to a persistent
// 40% — indicating the clue is still active but no longer "fresh."
export const MysteryBoxBanner: React.FC<Props> = ({ clue }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1,   duration: 600,   useNativeDriver: true }),
      Animated.delay(8_000),
      Animated.timing(fadeAnim, { toValue: 0.4, duration: 2_000, useNativeDriver: true }),
    ]).start();
  }, [clue.id]); // re-animate when a new clue drops

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
      <Text style={styles.tag}>NEARBY</Text>
      <Text style={styles.text}>{clue.text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#0F0A14',
    borderLeftWidth: 3,
    borderLeftColor: '#8B1A2E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 4,
  },
  tag: {
    color: '#8B1A2E',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  text: {
    color: '#E8E0D0',
    fontSize: 13,
    lineHeight: 19,
  },
});
