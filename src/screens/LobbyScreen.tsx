import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../services/state';
import { clearBotBrains } from '../services/ai';

type Props = {
  onStart: () => void;
};

export const LobbyScreen: React.FC<Props> = ({ onStart }) => {
  const { gameState, startGame, resetGame } = useGameStore();
  const totalPlayers = gameState.players.length;

  const handleStart = () => {
    clearBotBrains();
    startGame();
    onStart();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>RUN DOWN</Text>
        <Text style={styles.subtitle}>Battle royale — last one standing</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalPlayers}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{gameState.lootDrops.length}</Text>
            <Text style={styles.statLabel}>Loot Drops</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>6</Text>
            <Text style={styles.statLabel}>Meteor Phases</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How to play</Text>
          <Text style={styles.infoText}>• Left joystick — move your character</Text>
          <Text style={styles.infoText}>• Right joystick — aim direction</Text>
          <Text style={styles.infoText}>• FIRE — auto-targets nearest enemy</Text>
          <Text style={styles.infoText}>• BUILD — place walls to protect yourself</Text>
          <Text style={styles.infoText}>• RELOAD — reload active weapon</Text>
          <Text style={styles.infoText}>• Walk over loot to pick it up</Text>
          <Text style={styles.infoText}>• Stay inside the shelter zone — meteors strike outside!</Text>
        </View>

        <TouchableOpacity style={styles.playButton} onPress={handleStart}>
          <Text style={styles.playButtonText}>PLAY NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 32,
    width: 400,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffcc00',
    textAlign: 'center',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,200,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  infoSection: {
    marginBottom: 28,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#bbb',
    lineHeight: 22,
  },
  playButton: {
    backgroundColor: '#ffcc00',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
  },
});
