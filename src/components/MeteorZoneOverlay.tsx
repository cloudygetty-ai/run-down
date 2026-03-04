import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Bombardment } from '../types';

type Props = {
  bombardment: Bombardment;
  viewportX: number;
  viewportY: number;
  viewportW: number;
  viewportH: number;
};

// WHY: RN has no clip-path or CSS masking. We can't "cut a hole" in a View.
// Instead we render the danger tint as 4 rectangles surrounding the safe circle:
//   top bar, bottom bar, left strip, right strip — each clipped to the viewport.
// This correctly shows danger OUTSIDE the circle and clean ground INSIDE.

export const MeteorZoneOverlay: React.FC<Props> = ({
  bombardment,
  viewportX,
  viewportY,
  viewportW,
  viewportH,
}) => {
  const cx = bombardment.shelterCenter.x - viewportX;
  const cy = bombardment.shelterCenter.y - viewportY;
  const r = bombardment.shelterRadius;

  // Bounding box of the safe circle (clamped to viewport)
  const safeLeft = Math.max(0, cx - r);
  const safeRight = Math.min(viewportW, cx + r);
  const safeTop = Math.max(0, cy - r);
  const safeBottom = Math.min(viewportH, cy + r);

  const nextCx = bombardment.nextShelterCenter.x - viewportX;
  const nextCy = bombardment.nextShelterCenter.y - viewportY;
  const nextR = bombardment.nextShelterRadius;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Top danger strip — above the safe circle */}
      {safeTop > 0 && (
        <View style={[styles.danger, { top: 0, left: 0, width: viewportW, height: safeTop }]} />
      )}
      {/* Bottom danger strip */}
      {safeBottom < viewportH && (
        <View style={[styles.danger, { top: safeBottom, left: 0, width: viewportW, height: viewportH - safeBottom }]} />
      )}
      {/* Left danger strip (between top/bottom strips) */}
      {safeLeft > 0 && (
        <View style={[styles.danger, { top: safeTop, left: 0, width: safeLeft, height: safeBottom - safeTop }]} />
      )}
      {/* Right danger strip */}
      {safeRight < viewportW && (
        <View style={[styles.danger, { top: safeTop, left: safeRight, width: viewportW - safeRight, height: safeBottom - safeTop }]} />
      )}

      {/* Shelter boundary ring — glowing fire ring */}
      <View
        style={[
          styles.shelterRing,
          {
            width: r * 2 + 6,
            height: r * 2 + 6,
            borderRadius: r + 3,
            left: cx - r - 3,
            top: cy - r - 3,
          },
        ]}
      />

      {/* Next shelter zone indicator */}
      <View
        style={[
          styles.nextZoneIndicator,
          {
            width: nextR * 2,
            height: nextR * 2,
            borderRadius: nextR,
            left: nextCx - nextR,
            top: nextCy - nextR,
          },
        ]}
      />

      {/* Meteor impact craters */}
      {bombardment.activeImpacts.map((impact) => {
        const screenX = impact.position.x - viewportX;
        const screenY = impact.position.y - viewportY;
        const size = impact.blastRadius * 2;
        const opacity = Math.max(0, 1 - impact.age / impact.maxAge);

        return (
          <View
            key={impact.id}
            style={[
              styles.crater,
              {
                left: screenX - impact.blastRadius,
                top: screenY - impact.blastRadius,
                width: size,
                height: size,
                borderRadius: impact.blastRadius,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  danger: {
    position: 'absolute',
    backgroundColor: 'rgba(200, 60, 0, 0.30)',
  },
  shelterRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(255, 120, 0, 0.95)',
    backgroundColor: 'transparent',
  },
  nextZoneIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 100, 0.5)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 80, 0, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 0, 0.8)',
  },
});
