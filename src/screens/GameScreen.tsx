import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GameMap } from '../components/GameMap';
import { HUD } from '../components/HUD';
import { Joystick } from '../components/Joystick';
import { useGameStore } from '../services/state';
import { tickGame, fireShot, InputState } from '../core/gameEngine';
import { tickBots } from '../services/ai';
import { startReload, switchWeaponSlot } from '../services/weapons';
import { Vector2, BuildPiece, Player } from '../types';
import { distance } from '../utils';
import { logger } from '../utils';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TICK_MS        = 50;
const LOOT_PICKUP_RANGE = 60;
const VIEWPORT_W    = SCREEN_W;
const VIEWPORT_H    = SCREEN_H;

type Props = {
  onGameOver: () => void;
};

export const GameScreen: React.FC<Props> = ({ onGameOver }) => {
  const { gameState, updateGameState, pickUpLoot, placeBuildPiece } = useGameStore();
  const inputRef = useRef<InputState>({
    moveVector: { x: 0, y: 0 },
    aimVector:  { x: 1, y: 0 },
    isShooting: false,
    isBuilding: false,
    buildPieceType: 'wall',
    buildPosition: null,
    wantsReload: false,
  });
  const lastFireTimeRef = useRef(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Camera follows the human player
  const human = gameState.players.find(p => p.isHuman);
  const viewportX = human
    ? Math.max(0, Math.min(gameState.mapWidth  - VIEWPORT_W, human.position.x - VIEWPORT_W / 2))
    : 0;
  const viewportY = human
    ? Math.max(0, Math.min(gameState.mapHeight - VIEWPORT_H, human.position.y - VIEWPORT_H / 2))
    : 0;

  const tryPickUpNearbyLoot = useCallback((pos: Vector2) => {
    const nearby = gameState.lootDrops.find(l => distance(l.position, pos) < LOOT_PICKUP_RANGE);
    if (nearby && human) {
      pickUpLoot(human.id, nearby.id);
    }
  }, [gameState.lootDrops, human, pickUpLoot]);

  useEffect(() => {
    tickIntervalRef.current = setInterval(() => {
      const state = useGameStore.getState().gameState;
      if (state.phase !== 'playing') {
        clearInterval(tickIntervalRef.current!);
        return;
      }

      try {
        let next = tickGame(state, inputRef.current, TICK_MS);
        next = tickBots(next, TICK_MS);

        if (next.phase === 'game_over') {
          updateGameState(next);
          onGameOver();
          return;
        }

        // Auto-pickup loot for human
        const h = next.players.find(p => p.isHuman);
        if (h) {
          const nearby = next.lootDrops.find(l => distance(l.position, h.position) < LOOT_PICKUP_RANGE);
          if (nearby) {
            // WHY: pickup is handled via store to keep state mutation atomic
            pickUpLoot(h.id, nearby.id);
            return; // Store update will trigger re-render
          }
        }

        updateGameState(next);
      } catch (err) {
        logger.error('GameScreen', 'game tick error', err);
      }
    }, TICK_MS);

    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []); // WHY: intentionally empty — the interval reads state via store.getState() each tick

  const handleMove = useCallback((direction: Vector2) => {
    inputRef.current = { ...inputRef.current, moveVector: direction };
  }, []);

  const handleMoveRelease = useCallback(() => {
    inputRef.current = { ...inputRef.current, moveVector: { x: 0, y: 0 } };
  }, []);

  const handleShoot = useCallback(() => {
    if (!human || human.status !== 'alive') return;
    const state = useGameStore.getState().gameState;
    const weapon = human.weapons[human.activeWeaponSlot];
    if (!weapon || weapon.isReloading || weapon.currentAmmo <= 0) return;

    const now = Date.now();
    const minInterval = 1000 / weapon.fireRate;
    if (now - lastFireTimeRef.current < minInterval) return;

    lastFireTimeRef.current = now;

    // Aim toward nearest visible enemy, or straight ahead if none
    const enemies = state.players.filter(p => !p.isHuman && p.status === 'alive');
    const target = enemies.reduce<Player | null>((best, e) => {
      if (!best) return e;
      return distance(e.position, human.position) < distance(best.position, human.position) ? e : best;
    }, null);

    const aimPoint = target
      ? target.position
      : {
          x: human.position.x + Math.cos(human.rotation * Math.PI / 180) * weapon.range,
          y: human.position.y + Math.sin(human.rotation * Math.PI / 180) * weapon.range,
        };

    const next = fireShot(state, human.id, aimPoint);
    updateGameState(next);
  }, [human, updateGameState]);

  const handleReload = useCallback(() => {
    if (!human) return;
    startReload(human, updated => {
      const state = useGameStore.getState().gameState;
      const players = state.players.map(p => p.id === human.id ? updated : p);
      updateGameState({ ...state, players });
    });
  }, [human, updateGameState]);

  const handleBuildToggle = useCallback(() => {
    if (!human) return;
    const state = useGameStore.getState().gameState;
    const players = state.players.map(p =>
      p.id === human.id ? { ...p, isBuilding: !p.isBuilding } : p,
    );
    updateGameState({ ...state, players });
  }, [human, updateGameState]);

  const handleWeaponSwitch = useCallback((slot: 0 | 1 | 2) => {
    if (!human) return;
    const updated = switchWeaponSlot(human, slot);
    const state = useGameStore.getState().gameState;
    const players = state.players.map(p => p.id === human.id ? updated : p);
    updateGameState({ ...state, players });
  }, [human, updateGameState]);

  const handlePlaceBuild = useCallback(() => {
    if (!human || !human.isBuilding) return;
    const piece: BuildPiece = {
      id: `bp_${Date.now()}`,
      type: human.selectedBuildPiece,
      material: human.selectedBuildMaterial,
      position: {
        x: human.position.x + Math.cos(human.rotation * Math.PI / 180) * 60,
        y: human.position.y + Math.sin(human.rotation * Math.PI / 180) * 60,
      },
      rotation: Math.round(human.rotation / 90) * 90,
      health: 150,
      maxHealth: 150,
      ownerId: human.id,
    };
    placeBuildPiece(piece);
  }, [human, placeBuildPiece]);

  if (!human) return null;

  return (
    <View style={styles.container}>
      <GameMap
        state={gameState}
        viewportX={viewportX}
        viewportY={viewportY}
        viewportW={VIEWPORT_W}
        viewportH={VIEWPORT_H}
      />

      {/* Left joystick for movement */}
      <View style={styles.joystickLeft}>
        <Joystick onMove={handleMove} onRelease={handleMoveRelease} />
      </View>

      {/* Right joystick for aim direction */}
      <View style={styles.joystickRight}>
        <Joystick
          onMove={v => {
            inputRef.current = { ...inputRef.current, aimVector: v };
          }}
          onRelease={() => {}}
          size={100}
        />
      </View>

      <HUD
        player={human}
        storm={gameState.storm}
        alivePlayers={gameState.alivePlayers}
        onShoot={human.isBuilding ? handlePlaceBuild : handleShoot}
        onReload={handleReload}
        onBuildToggle={handleBuildToggle}
        onWeaponSwitch={handleWeaponSwitch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  joystickLeft: {
    position: 'absolute',
    bottom: 30,
    left: 30,
  },
  joystickRight: {
    position: 'absolute',
    bottom: 50,
    right: 160,
  },
});
