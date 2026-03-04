import React from "react";
import { View, StyleSheet } from "react-native";
import { Bombardment } from "../types";

type Props = {
  bombardment: Bombardment;
  viewportX: number;
  viewportY: number;
  viewportW: number;
  viewportH: number;
};

// WHY: Same "safe circle with danger outside" visual technique as before, but
// recolored to fire/orange/red to sell the meteor shower theme.
// Impact craters are rendered as small glowing circles at their world positions.

export const MeteorZoneOverlay: React.FC<Props> = ({
  bombardment,
  viewportX,
  viewportY,
}) => {
  const cx = bombardment.shelterCenter.x - viewportX;
  const cy = bombardment.shelterCenter.y - viewportY;
  const r = bombardment.shelterRadius;
  const outlineSize = r * 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Danger zone — orange-red tint outside the shelter */}
      <View style={[StyleSheet.absoluteFill, styles.dangerZone]} />

      {/* Shelter zone — clear circle cutting through the danger tint */}
      <View
        style={[
          styles.shelterZone,
          {
            width: outlineSize,
            height: outlineSize,
            borderRadius: r,
            left: cx - r,
            top: cy - r,
          },
        ]}
      />

      {/* Shelter boundary ring — glowing fire ring */}
      <View
        style={[
          styles.shelterRing,
          {
            width: outlineSize + 6,
            height: outlineSize + 6,
            borderRadius: r + 3,
            left: cx - r - 3,
            top: cy - r - 3,
          },
        ]}
      />

      {/* Next shelter zone indicator — dashed white ring */}
      <View
        style={[
          styles.nextZoneIndicator,
          {
            width: bombardment.nextShelterRadius * 2,
            height: bombardment.nextShelterRadius * 2,
            borderRadius: bombardment.nextShelterRadius,
            left:
              bombardment.nextShelterCenter.x -
              viewportX -
              bombardment.nextShelterRadius,
            top:
              bombardment.nextShelterCenter.y -
              viewportY -
              bombardment.nextShelterRadius,
          },
        ]}
      />

      {/* Meteor impact craters */}
      {bombardment.activeImpacts.map((impact) => {
        const screenX = impact.position.x - viewportX;
        const screenY = impact.position.y - viewportY;
        const size = impact.blastRadius * 2;
        // Fade out as the crater ages
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
  dangerZone: {
    backgroundColor: "rgba(200, 60, 0, 0.30)",
  },
  shelterZone: {
    position: "absolute",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  shelterRing: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "rgba(255, 120, 0, 0.95)",
    backgroundColor: "transparent",
  },
  nextZoneIndicator: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255, 200, 100, 0.5)",
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  crater: {
    position: "absolute",
    backgroundColor: "rgba(255, 80, 0, 0.6)",
    borderWidth: 2,
    borderColor: "rgba(255, 200, 0, 0.8)",
  },
});
