import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player } from '../types';

type Props = {
  player: Player;
  viewportX: number;
  viewportY: number;
};

const PLAYER_SIZE = 20;

export const PlayerSprite: React.FC<Props> = ({ player, viewportX, viewportY }) => {
  const left = player.position.x - viewportX - PLAYER_SIZE / 2;
  const top  = player.position.y - viewportY - PLAYER_SIZE / 2;

  const color = player.isHuman ? '#00aaff' : '#ff4444';
  const outlineColor = player.isHuman ? '#0055aa' : '#880000';

  return (
    <View
      style={[
        styles.player,
        {
          left,
          top,
          backgroundColor: color,
          borderColor: outlineColor,
          transform: [{ rotate: `${player.rotation}deg` }],
        },
      ]}
    >
      {/* Direction indicator (small triangle at "front") */}
      <View style={styles.directionDot} />
      {/* Health bar above player */}
      <View style={styles.healthBarContainer}>
        <View
          style={[
            styles.healthBar,
            { width: `${(player.health / player.maxHealth) * 100}%` },
          ]}
        />
      </View>
      {player.isHuman && (
        <Text style={styles.nameTag}>YOU</Text>
      )}
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
  directionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    position: 'absolute',
    top: 2,
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
  nameTag: {
    position: 'absolute',
    top: -18,
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
});
