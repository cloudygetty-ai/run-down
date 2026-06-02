import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { VibeTicker as VibeTick, HeatLevel } from '../types/social';
import { heatLevelColor } from '../core/velocity/VelocityEngine';

type Props = {
  ticker: VibeTick;
  heatLevel: HeatLevel;
  compact?: boolean;
};

export const VibeTicker: React.FC<Props> = ({ ticker, heatLevel, compact = false }) => {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const bpmAnim = useRef(new Animated.Value(0.7)).current;
  const color = heatLevelColor(heatLevel);

  useEffect(() => {
    // BPM pulse synced to actual BPM
    const interval = 60_000 / ticker.bpm;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(bpmAnim, { toValue: 1, duration: interval * 0.15, useNativeDriver: true }),
        Animated.timing(bpmAnim, {
          toValue: 0.7,
          duration: interval * 0.85,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [ticker.bpm, bpmAnim]);

  useEffect(() => {
    // Ticker scroll — loops genre/mood text
    const scroll = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(scrollAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    scroll.start();
    return () => scroll.stop();
  }, [scrollAnim]);

  if (compact) {
    return (
      <View style={styles.compact}>
        <Animated.View style={[styles.bpmDot, { backgroundColor: color, opacity: bpmAnim }]} />
        <Text style={[styles.compactGenre, { color }]}>{ticker.genre}</Text>
        <Text style={styles.compactMood} numberOfLines={1}>
          {ticker.mood}
        </Text>
        <Text style={[styles.compactBpm, { color }]}>{ticker.bpm}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { borderColor: color + '33' }]}>
      <View style={styles.row}>
        <Animated.View style={[styles.bpmDot, { backgroundColor: color, opacity: bpmAnim }]} />
        <Text style={[styles.genre, { color }]}>{ticker.genre}</Text>
        <Text style={[styles.bpmLabel, { color: color + '99' }]}>{ticker.bpm} BPM</Text>
      </View>
      <Text style={styles.mood}>{ticker.mood}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bpmDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  genre: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  bpmLabel: {
    fontSize: 9,
    letterSpacing: 1,
  },
  mood: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactGenre: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  compactMood: {
    flex: 1,
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
  },
  compactBpm: {
    fontSize: 9,
    fontWeight: 'bold',
  },
});
