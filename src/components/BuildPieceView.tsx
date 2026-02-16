import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BuildPiece } from '../types';

type Props = {
  piece: BuildPiece;
  viewportX: number;
  viewportY: number;
};

const MATERIAL_COLORS = {
  wood:  '#a0522d',
  stone: '#888',
  metal: '#aaa',
};

export const BuildPieceView: React.FC<Props> = ({ piece, viewportX, viewportY }) => {
  const isVertical = piece.rotation === 90 || piece.rotation === 270;
  const w = piece.type === 'floor' ? 100 : (isVertical ? 8 : 100);
  const h = piece.type === 'floor' ? 100 : (isVertical ? 100 : 8);

  // Health determines opacity — damaged pieces look worn
  const opacity = 0.5 + 0.5 * (piece.health / piece.maxHealth);

  return (
    <View
      style={[
        styles.piece,
        {
          left: piece.position.x - viewportX - w / 2,
          top:  piece.position.y - viewportY - h / 2,
          width: w,
          height: h,
          backgroundColor: MATERIAL_COLORS[piece.material],
          opacity,
          transform: piece.type === 'ramp'
            ? [{ rotate: `${piece.rotation}deg` }, { skewX: '-20deg' }]
            : [{ rotate: `${piece.rotation}deg` }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
});
