import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GameResult } from "../types";
import { useGameStore } from "../services/state";

type Props = {
  result: GameResult;
  onPlayAgain: () => void;
};

const ordinal = (n: number): string => {
  if (n === 1) {
    return "1st";
  }
  if (n === 2) {
    return "2nd";
  }
  if (n === 3) {
    return "3rd";
  }
  return `${n}th`;
};

export const GameOverScreen: React.FC<Props> = ({ result, onPlayAgain }) => {
  const { resetGame } = useGameStore();
  const isWin = result.placement === 1;
  const survivalMin = Math.floor(result.survivalTimeMs / 60000);
  const survivalSec = Math.floor((result.survivalTimeMs % 60000) / 1000);

  const handlePlayAgain = () => {
    resetGame();
    onPlayAgain();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {isWin ? (
          <>
            <Text style={styles.victoryTitle}>VICTORY ROYALE</Text>
            <Text style={styles.victorySubtitle}>Last one standing!</Text>
          </>
        ) : (
          <>
            <Text style={styles.defeatTitle}>ELIMINATED</Text>
            <Text style={styles.defeatSubtitle}>
              You finished {ordinal(result.placement)} place
            </Text>
          </>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{result.kills}</Text>
            <Text style={styles.statLabel}>Eliminations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{ordinal(result.placement)}</Text>
            <Text style={styles.statLabel}>Placement</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {survivalMin}:{survivalSec.toString().padStart(2, "0")}
            </Text>
            <Text style={styles.statLabel}>Survived</Text>
          </View>
        </View>

        {result.winner && !isWin && (
          <Text style={styles.winnerText}>Winner: {result.winner}</Text>
        )}

        <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
          <Text style={styles.playAgainText}>PLAY AGAIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 32,
    width: 360,
    maxWidth: "90%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  victoryTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffcc00",
    textAlign: "center",
    letterSpacing: 3,
  },
  victorySubtitle: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 6,
    marginBottom: 24,
  },
  defeatTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ff4444",
    textAlign: "center",
    letterSpacing: 3,
  },
  defeatSubtitle: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 6,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  winnerText: {
    color: "#ffcc00",
    fontSize: 13,
    marginBottom: 20,
  },
  playAgainBtn: {
    backgroundColor: "#ffcc00",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    letterSpacing: 2,
  },
});
