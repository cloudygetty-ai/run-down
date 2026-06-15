import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player, AbilityEffectType } from '../types';

type Props = {
  player: Player;
  viewportX: number;
  viewportY: number;
};

const PLAYER_SIZE = 20;

const ABILITY_GLOW: Partial<Record<AbilityEffectType, string>> = {
  damage_immunity: '#4488ff',
  speed_boost:     '#ffcc00',
  rapid_fire:      '#ff8800',
  damage_boost:    '#ff4444',
};

export const PlayerSprite: React.FC<Props> = ({ player, viewportX, viewportY }) => {
  const left = player.position.x - viewportX - PLAYER_SIZE / 2;
  const top  = player.position.y - viewportY - PLAYER_SIZE / 2;

  const isKnocked = player.status === 'knocked';
  const abilityActive = player.abilityActiveMs > 0 && player.activeAbilityEffect !== 'none';
  const glowColor = abilityActive ? (ABILITY_GLOW[player.activeAbilityEffect] ?? null) : null;

  const color        = isKnocked ? '#555555' : (player.isHuman ? '#00aaff' : '#ff4444');
  const outlineColor = isKnocked ? '#333333' : (player.isHuman ? '#0055aa' : '#880000');

  const healthPct = Math.max(0, Math.min(1, player.health / player.maxHealth));

  return (
    <View
      style={[
        styles.player,
        {
          left,
          top,
          backgroundColor: color,
          borderColor: outlineColor,
          opacity: isKnocked ? 0.5 : 1,
          transform: [
            { rotate: `${player.rotation}deg` },
            { scale: isKnocked ? 0.75 : 1 },
          ],
        },
      ]}
    >
      {/* Ability active glow ring — rendered behind the sprite */}
      {glowColor && (
        <View style={[styles.abilityGlow, { borderColor: glowColor }]} />
      )}

      {/* Direction dot — hidden when knocked */}
      {!isKnocked && <View style={styles.directionDot} />}

      {/* Knocked X marker */}
      {isKnocked && <Text style={styles.knockedX}>✕</Text>}

      {/* Health bar above player */}
      <View style={styles.healthBarContainer}>
        <View
          style={[
            styles.healthBar,
            { width: `${healthPct * 100}%` },
            healthPct < 0.3 && styles.healthBarLow,
          ]}
        />
      </View>

      {player.isHuman && <Text style={styles.nameTag}>YOU</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityGlow: {
    position: 'absolute',
    width: PLAYER_SIZE + 14,
    height: PLAYER_SIZE + 14,
    borderRadius: (PLAYER_SIZE + 14) / 2,
    borderWidth: 2.5,
    left: -9,
    top: -9,
  },
  directionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    position: 'absolute',
    top: 2,
  },
  knockedX: {
    color: '#ff4444',
    fontSize: 7,
    fontWeight: 'bold',
  },
  healthBarContainer: {
    position: 'absolute',
    top: -8,
    left: -5,
    width: PLAYER_SIZE + 10,
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  healthBar: {
    height: '100%',
    backgroundColor: '#44ff44',
    borderRadius: 2,
  },
  healthBarLow: { backgroundColor: '#ff4444' },
  nameTag: {
    position: 'absolute',
    top: -18,
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
});
