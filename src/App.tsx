import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { SocialHUDScreen } from './screens/SocialHUDScreen';
import { ARLookThroughScreen } from './screens/ARLookThroughScreen';
import { useGameStore } from './services/state';
import { useSocialStore } from './services/state/socialStore';

const App: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const socialPhase = useSocialStore((s) => s.social.phase);

  // WHY: derive nav from game phase — eliminates the class of bugs where
  // local screen state drifts from the actual game phase.
  const gamePhase = gameState.phase;

  // Social mode intercepts lobby navigation
  if (socialPhase === 'ar_mode') return <ARLookThroughScreen />;
  if (socialPhase === 'social_hud') return <SocialHUDScreen />;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {gamePhase === 'lobby' && <LobbyScreen />}
      {(gamePhase === 'playing' || gamePhase === 'dropping') && (
        <GameScreen onGameOver={() => {}} />
      )}
      {gamePhase === 'game_over' && gameState.result && (
        <GameOverScreen result={gameState.result} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});

export default App;
