import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { StoryScreen } from './screens/StoryScreen';
import { useGameStore } from './services/state';

const App: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  // WHY: derive nav from game phase — eliminates the class of bugs where
  // local screen state drifts from the actual game phase.
  const phase = gameState.phase;

  // WHY: story state lives here, not in GameState, so resetGame never re-shows the intro.
  const [storySeen, setStorySeen] = useState(false);

  const showStory = phase === 'lobby' && !storySeen;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {showStory && <StoryScreen onComplete={() => setStorySeen(true)} />}
      {!showStory && phase === 'lobby' && <LobbyScreen />}
      {(phase === 'playing' || phase === 'dropping') && <GameScreen onGameOver={() => {}} />}
      {phase === 'game_over' && gameState.result && <GameOverScreen result={gameState.result} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});

export default App;
