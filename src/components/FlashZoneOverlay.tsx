import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { FlashZone } from '../types/social';
import { getFlashZoneTimeRemaining, formatCountdown } from '../core/flashzone/FlashZoneManager';

type Props = {
  zone: FlashZone;
  onDismiss: () => void;
};

export const FlashZoneOverlay: React.FC<Props> = ({ zone, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;
  const shutterAnim = useRef(new Animated.Value(1)).current;

  const remaining = getFlashZoneTimeRemaining(zone);
  const isRevealing = zone.status === 'revealing';
  const isRevealed = zone.status === 'revealed';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (isRevealing) {
      Animated.timing(revealAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
    if (isRevealed) {
      Animated.timing(shutterAnim, { toValue: 0, duration: 600, useNativeDriver: false }).start();
    }
  }, [isRevealing, isRevealed, revealAnim, shutterAnim]);

  const shutterHeight = shutterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.root, { transform: [{ translateY: slideAnim }] }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dropDot} />
          <Text style={styles.dropLabel}>THE DROP</Text>
          <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <Text style={styles.locationName}>{zone.locationName}</Text>
        <Text style={styles.locationSub}>
          {zone.participantCount} signals detected · {zone.radiusMeters}m radius
        </Text>

        {/* Countdown ring */}
        <View style={styles.countdownWrap}>
          {isRevealed ? (
            <Text style={styles.revealedText}>IDENTITIES OPEN</Text>
          ) : isRevealing ? (
            <Animated.Text style={[styles.revealCountdown, { opacity: revealAnim }]}>
              REVEALING…
            </Animated.Text>
          ) : (
            <>
              <Text style={styles.countdownValue}>{formatCountdown(remaining)}</Text>
              <Text style={styles.countdownSub}>remaining</Text>
            </>
          )}
        </View>

        {/* Reveal bar — fills during countdown */}
        {!isRevealed && (
          <View style={styles.revealTrack}>
            <View
              style={[
                styles.revealFill,
                {
                  width: `${(1 - zone.revealCountdownMs / 10000) * 100}%` as any,
                },
              ]}
            />
          </View>
        )}

        {/* Shutter — lifts on reveal */}
        <View style={styles.anonymousPanel}>
          <Animated.View style={[styles.shutterOverlay, { height: shutterHeight as any }]} />
          <Text style={styles.anonymousCopy}>
            {isRevealed
              ? 'All nearby identities visible. Approach now.'
              : 'Identities masked — only vibe visible inside the zone.'}
          </Text>
        </View>

        {/* Status pill */}
        <View style={[styles.statusPill, isRevealed && styles.statusPillOpen]}>
          <Text style={styles.statusPillText}>
            {isRevealed ? '🔓 OPEN' : isRevealing ? '⚡ REVEALING' : '🔒 ANONYMOUS'}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    padding: 16,
  },
  card: {
    backgroundColor: '#0A0A14',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#39FF14',
    padding: 20,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#39FF14',
    marginRight: 8,
  },
  dropLabel: {
    flex: 1,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: 'bold',
    color: '#39FF14',
  },
  dismiss: { padding: 4 },
  dismissText: { color: '#555', fontSize: 14 },
  locationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E8E8F0',
    marginBottom: 4,
  },
  locationSub: {
    fontSize: 11,
    color: '#555',
    marginBottom: 20,
  },
  countdownWrap: {
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  countdownValue: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#39FF14',
    fontVariant: ['tabular-nums'],
  },
  countdownSub: {
    fontSize: 9,
    color: '#444',
    letterSpacing: 2,
    marginTop: -4,
  },
  revealCountdown: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 4,
  },
  revealedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 3,
  },
  revealTrack: {
    height: 3,
    backgroundColor: 'rgba(57,255,20,0.15)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  revealFill: {
    height: 3,
    backgroundColor: '#39FF14',
    borderRadius: 2,
  },
  anonymousPanel: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  shutterOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    backgroundColor: 'rgba(10,10,20,0.95)',
  },
  anonymousCopy: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    textAlign: 'center',
  },
  statusPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(57,255,20,0.3)',
  },
  statusPillOpen: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderColor: 'rgba(255,215,0,0.3)',
  },
  statusPillText: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#aaa',
    fontWeight: 'bold',
  },
});
