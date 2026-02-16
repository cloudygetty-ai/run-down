import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { useGameStore } from './services/state';

type AppScreen = 'lobby' | 'game' | 'game_over';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('lobby');
  const gameState = useGameStore(s => s.gameState);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {screen === 'lobby' && (
        <LobbyScreen onStart={() => setScreen('game')} />
      )}
      {screen === 'game' && (
        <GameScreen onGameOver={() => setScreen('game_over')} />
      )}
      {screen === 'game_over' && gameState.result && (
        <GameOverScreen
          result={gameState.result}
          onPlayAgain={() => setScreen('lobby')}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default App;
