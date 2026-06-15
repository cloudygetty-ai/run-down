import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GameResult } from '../types';
import { useGameStore } from '../services/state';

type Props = {
  result: GameResult;
};

const ordinal = (n: number): string => {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
};

export const GameOverScreen: React.FC<Props> = ({ result }) => {
  const { resetGame } = useGameStore();
  const isWin = result.placement === 1;
  const survivalMin = Math.floor(result.survivalTimeMs / 60_000);
  const survivalSec = Math.floor((result.survivalTimeMs % 60_000) / 1000);
  const envName = result.environmentId.replace(/_/g, ' ').toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Environment context */}
        <Text style={styles.envLabel}>{envName}</Text>

        {isWin ? (
          <>
            <Text style={styles.victoryTitle}>VICTORY ROYALE</Text>
            <Text style={styles.victorySubtitle}>Last operative standing.</Text>
          </>
        ) : (
          <>
            <Text style={styles.defeatTitle}>ELIMINATED</Text>
            <Text style={styles.defeatSubtitle}>
              Finished {ordinal(result.placement)} of the field
            </Text>
          </>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, result.kills > 0 && styles.statValueKills]}>
              {result.kills}
            </Text>
            <Text style={styles.statLabel}>Eliminations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, isWin && styles.statValueWin]}>
              {ordinal(result.placement)}
            </Text>
            <Text style={styles.statLabel}>Placement</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {survivalMin}:{survivalSec.toString().padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>Survived</Text>
          </View>
        </View>

        {result.winner && !isWin && (
          <View style={styles.winnerRow}>
            <Text style={styles.winnerLabel}>Winner</Text>
            <Text style={styles.winnerName}>{result.winner}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.playAgainBtn} onPress={resetGame}>
          <Text style={styles.playAgainText}>PLAY AGAIN</Text>
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 32,
    width: 360,
    maxWidth: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  envLabel: {
    fontSize: 10,
    color: '#555',
    letterSpacing: 3,
    marginBottom: 14,
    fontWeight: 'bold',
  },
  victoryTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffcc00',
    textAlign: 'center',
    letterSpacing: 3,
  },
  victorySubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  defeatTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ff4444',
    textAlign: 'center',
    letterSpacing: 3,
  },
  defeatSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    marginBottom: 24,
  },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statValueKills: { color: '#ff7733' },
  statValueWin: { color: '#ffcc00' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: 'rgba(255,204,0,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.2)',
  },
  winnerLabel: { color: '#888', fontSize: 11 },
  winnerName: { color: '#ffcc00', fontSize: 13, fontWeight: 'bold' },
  playAgainBtn: {
    backgroundColor: '#ffcc00',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
  },
});
