import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { useGameStore } from './services/state';

const App: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  // WHY: derive nav from game phase — eliminates the class of bugs where
  // local screen state drifts from the actual game phase.
  const phase = gameState.phase;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {phase === 'lobby' && (
        <LobbyScreen onStart={() => {}} />
      )}
      {(phase === 'playing' || phase === 'dropping') && (
        <GameScreen onGameOver={() => {}} />
      )}
      {phase === 'game_over' && gameState.result && (
        <GameOverScreen result={gameState.result} onPlayAgain={() => {}} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});

export default App;
