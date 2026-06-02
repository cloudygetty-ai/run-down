import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { PowerUp, PowerUpType } from '../types/social';
import {
  POWERUP_META,
  isPowerUpActive,
  getPowerUpRemainingMs,
} from '../core/powerups/PowerUpEngine';

type Props = {
  activePowerUp: PowerUp | null;
  onActivate: (type: PowerUpType) => void;
  onDeactivate: () => void;
};

function RemainingTimer({ powerUp }: { powerUp: PowerUp }) {
  const [remaining, setRemaining] = React.useState(getPowerUpRemainingMs(powerUp));

  useEffect(() => {
    if (powerUp.durationMs === Infinity) return;
    const id = setInterval(() => {
      setRemaining(getPowerUpRemainingMs(powerUp));
    }, 1000);
    return () => clearInterval(id);
  }, [powerUp]);

  if (powerUp.durationMs === Infinity) return null;

  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  return (
    <Text style={styles.timerText}>
      {mins}:{secs.toString().padStart(2, '0')}
    </Text>
  );
}

const PowerUpButton: React.FC<{
  type: PowerUpType;
  isActive: boolean;
  onPress: () => void;
}> = ({ type, isActive, onPress }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const meta = POWERUP_META[type];

  useEffect(() => {
    if (!isActive) {
      glowAnim.setValue(0);
      return;
    }
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
      ]),
    );
    glow.start();
    return () => glow.stop();
  }, [isActive, glowAnim]);

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { borderColor: isActive ? meta.color : meta.color + '44' },
        isActive && { backgroundColor: meta.color + '18' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Animated.View
        style={[styles.btnGlow, { backgroundColor: meta.color, opacity: isActive ? glowAnim : 0 }]}
      />
      <Text style={[styles.btnLabel, { color: isActive ? meta.color : meta.color + '88' }]}>
        {type === 'smoke_screen' ? '◎' : '⚡'}
      </Text>
      <Text style={[styles.btnName, { color: isActive ? meta.color : '#555' }]}>{meta.label}</Text>
      <Text style={styles.btnDesc} numberOfLines={2}>
        {meta.description}
      </Text>
      {isActive && <Text style={[styles.activeTag, { color: meta.color }]}>ACTIVE</Text>}
    </TouchableOpacity>
  );
};

export const PowerUpBar: React.FC<Props> = ({ activePowerUp, onActivate, onDeactivate }) => {
  const smokeActive = activePowerUp?.type === 'smoke_screen' && isPowerUpActive(activePowerUp);
  const overclockActive = activePowerUp?.type === 'overclock' && isPowerUpActive(activePowerUp);

  return (
    <View style={styles.root}>
      <Text style={styles.sectionLabel}>SOCIAL SCRIPTS</Text>

      <View style={styles.row}>
        <PowerUpButton
          type="smoke_screen"
          isActive={smokeActive}
          onPress={() => (smokeActive ? onDeactivate() : onActivate('smoke_screen'))}
        />
        <PowerUpButton
          type="overclock"
          isActive={overclockActive}
          onPress={() => (overclockActive ? onDeactivate() : onActivate('overclock'))}
        />
      </View>

      {activePowerUp && isPowerUpActive(activePowerUp) && (
        <View
          style={[styles.activeBar, { borderColor: POWERUP_META[activePowerUp.type].color + '55' }]}
        >
          <View
            style={[styles.activeDot, { backgroundColor: POWERUP_META[activePowerUp.type].color }]}
          />
          <Text style={[styles.activeName, { color: POWERUP_META[activePowerUp.type].color }]}>
            {POWERUP_META[activePowerUp.type].label}
          </Text>
          <RemainingTimer powerUp={activePowerUp} />
          <TouchableOpacity onPress={onDeactivate} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#444',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  btnGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 2,
  },
  btnLabel: {
    fontSize: 22,
    marginBottom: 6,
  },
  btnName: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  btnDesc: {
    fontSize: 9,
    color: '#444',
    lineHeight: 13,
  },
  activeTag: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 6,
  },
  activeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeName: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 11,
    color: '#888',
    fontVariant: ['tabular-nums'],
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
  },
  cancelText: {
    fontSize: 8,
    color: '#555',
    letterSpacing: 1,
  },
});
