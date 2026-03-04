import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { Vector2 } from '../types';
import { clamp } from '../utils';

type Props = {
  onMove: (direction: Vector2) => void;
  onRelease: () => void;
  size?: number;
};

const DEFAULT_SIZE = 120;
const KNOB_SIZE = 44;

export const Joystick: React.FC<Props> = ({
  onMove,
  onRelease,
  size = DEFAULT_SIZE,
}) => {
  // State drives the visual knob position; ref drives the input value.
  // WHY: PanResponder callbacks are not inside React's render cycle —
  // setState triggers the re-render while the ref keeps reads synchronous.
  const [knobOffset, setKnobOffset] = useState<Vector2>({ x: 0, y: 0 });
  const knobRef = useRef<Vector2>({ x: 0, y: 0 });
  const maxRadius = (size - KNOB_SIZE) / 2;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        knobRef.current = { x: 0, y: 0 };
        setKnobOffset({ x: 0, y: 0 });
      },

      onPanResponderMove: (_e, gestureState) => {
        const dx = clamp(gestureState.dx, -maxRadius, maxRadius);
        const dy = clamp(gestureState.dy, -maxRadius, maxRadius);
        knobRef.current = { x: dx, y: dy };
        setKnobOffset({ x: dx, y: dy });
        onMove({ x: dx / maxRadius, y: dy / maxRadius });
      },

      onPanResponderRelease: () => {
        knobRef.current = { x: 0, y: 0 };
        setKnobOffset({ x: 0, y: 0 });
        onRelease();
      },

      onPanResponderTerminate: () => {
        knobRef.current = { x: 0, y: 0 };
        setKnobOffset({ x: 0, y: 0 });
        onRelease();
      },
    })
  ).current;

  const half = size / 2;
  const knobHalf = KNOB_SIZE / 2;

  return (
    <View
      style={[styles.base, { width: size, height: size, borderRadius: half }]}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.knob,
          {
            left: half - knobHalf + knobOffset.x,
            top: half - knobHalf + knobOffset.y,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    position: 'relative',
  },
  knob: {
    position: 'absolute',
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
