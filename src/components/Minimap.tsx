import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Player, Bombardment, SupplyDrop, IncomingMeteor } from '../types';

type Props = {
  players: Player[];
  bombardment: Bombardment;
  supplyDrops: SupplyDrop[];
  incomingMeteors: IncomingMeteor[];
  mapWidth: number;
  mapHeight: number;
};

const SIZE = 130; // minimap square side length in pts

export const Minimap: React.FC<Props> = ({
  players,
  bombardment,
  supplyDrops,
  incomingMeteors,
  mapWidth,
  mapHeight,
}) => {
  const scaleX = SIZE / mapWidth;
  const scaleY = SIZE / mapHeight;

  const toMini = (wx: number, wy: number) => ({
    x: wx * scaleX,
    y: wy * scaleY,
  });

  const shelterCx = bombardment.shelterCenter.x * scaleX;
  const shelterCy = bombardment.shelterCenter.y * scaleY;
  const shelterR = Math.max(2, bombardment.shelterRadius * scaleX);

  const nextCx = bombardment.nextShelterCenter.x * scaleX;
  const nextCy = bombardment.nextShelterCenter.y * scaleY;
  const nextR = Math.max(2, bombardment.nextShelterRadius * scaleX);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Next shelter zone (dashed look — just a dim ring) */}
      <View
        style={{
          position: 'absolute',
          left: nextCx - nextR,
          top: nextCy - nextR,
          width: nextR * 2,
          height: nextR * 2,
          borderRadius: nextR,
          borderWidth: 1,
          borderColor: 'rgba(255, 200, 100, 0.35)',
        }}
      />

      {/* Current shelter zone ring */}
      <View
        style={{
          position: 'absolute',
          left: shelterCx - shelterR,
          top: shelterCy - shelterR,
          width: shelterR * 2,
          height: shelterR * 2,
          borderRadius: shelterR,
          borderWidth: 1.5,
          borderColor: 'rgba(255, 120, 0, 0.9)',
        }}
      />

      {/* Incoming meteors — red dots */}
      {incomingMeteors.map((m) => {
        const { x, y } = toMini(m.position.x, m.position.y);
        return (
          <View
            key={m.id}
            style={{
              position: 'absolute',
              left: x - 2,
              top: y - 2,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 60, 0, 0.9)',
            }}
          />
        );
      })}

      {/* Supply drops */}
      {supplyDrops.map((drop) => {
        const { x, y } = toMini(drop.position.x, drop.position.y);
        return (
          <View
            key={drop.id}
            style={{
              position: 'absolute',
              left: x - 3,
              top: y - 3,
              width: 6,
              height: 6,
              borderRadius: 1,
              backgroundColor: drop.isLanded ? '#ffaa00' : 'rgba(255,220,0,0.6)',
              borderWidth: 0.5,
              borderColor: '#fff',
            }}
          />
        );
      })}

      {/* Bot dots */}
      {players
        .filter((p) => !p.isHuman && p.status === 'alive')
        .map((p) => {
          const { x, y } = toMini(p.position.x, p.position.y);
          return (
            <View
              key={p.id}
              style={{
                position: 'absolute',
                left: x - 2,
                top: y - 2,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#ff4444',
              }}
            />
          );
        })}

      {/* Human player dot */}
      {players
        .filter((p) => p.isHuman)
        .map((p) => {
          const { x, y } = toMini(p.position.x, p.position.y);
          return (
            <View
              key={p.id}
              style={{
                position: 'absolute',
                left: x - 4,
                top: y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#00ccff',
                borderWidth: 1,
                borderColor: '#fff',
              }}
            />
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
});
