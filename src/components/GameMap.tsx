import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { GameState, LootDrop, BuildPiece } from '../types';
import { PlayerSprite } from './PlayerSprite';
import { StormOverlay } from './StormOverlay';
import { BuildPieceView } from './BuildPieceView';
import { LootDropView } from './LootDropView';

type Props = {
  state: GameState;
  viewportX: number;  // top-left corner of the camera in world space
  viewportY: number;
  viewportW: number;
  viewportH: number;
};

// WHY: all world positions are translated by the camera offset so components
// just render at (worldX - viewportX, worldY - viewportY) without needing to
// know about the camera themselves.

export const GameMap: React.FC<Props> = ({ state, viewportX, viewportY, viewportW, viewportH }) => {
  const alivePlayers = useMemo(
    () => state.players.filter(p => p.status === 'alive'),
    [state.players],
  );

  const visibleLoot = useMemo(
    () => state.lootDrops.filter(l =>
      l.position.x >= viewportX - 40 && l.position.x <= viewportX + viewportW + 40 &&
      l.position.y >= viewportY - 40 && l.position.y <= viewportY + viewportH + 40,
    ),
    [state.lootDrops, viewportX, viewportY, viewportW, viewportH],
  );

  const visiblePieces = useMemo(
    () => state.buildPieces.filter(bp =>
      bp.position.x >= viewportX - 60 && bp.position.x <= viewportX + viewportW + 60 &&
      bp.position.y >= viewportY - 60 && bp.position.y <= viewportY + viewportH + 60,
    ),
    [state.buildPieces, viewportX, viewportY, viewportW, viewportH],
  );

  return (
    <View style={[styles.container, { width: viewportW, height: viewportH }]}>
      {/* Ground fill */}
      <View style={styles.ground} />

      {/* Storm circle */}
      <StormOverlay
        storm={state.storm}
        viewportX={viewportX}
        viewportY={viewportY}
        viewportW={viewportW}
        viewportH={viewportH}
        mapWidth={state.mapWidth}
        mapHeight={state.mapHeight}
      />

      {/* Build pieces */}
      {visiblePieces.map(bp => (
        <BuildPieceView key={bp.id} piece={bp} viewportX={viewportX} viewportY={viewportY} />
      ))}

      {/* Loot */}
      {visibleLoot.map(l => (
        <LootDropView key={l.id} loot={l} viewportX={viewportX} viewportY={viewportY} />
      ))}

      {/* Players */}
      {alivePlayers.map(p => (
        <PlayerSprite key={p.id} player={p} viewportX={viewportX} viewportY={viewportY} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2d5a27',
  },
  ground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3a7a30',
  },
});
