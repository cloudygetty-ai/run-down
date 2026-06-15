import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FractureCore } from '../types';

const CORE_COLORS: Record<string, string> = {
  cooldown_reduction: '#4488ff',
  damage_amp:         '#ff4433',
  ability_mutation:   '#cc44ff',
};

const CORE_LABELS: Record<string, string> = {
  cooldown_reduction: 'CDR',
  damage_amp:         'AMP',
  ability_mutation:   'MUT',
};

type Props = {
  core: FractureCore;
  viewportX: number;
  viewportY: number;
};

export const FractureCoreView: React.FC<Props> = ({ core, viewportX, viewportY }) => {
  const screenX = core.position.x - viewportX;
  const screenY = core.position.y - viewportY;
  const color = CORE_COLORS[core.effect] ?? '#ffffff';
  const label = CORE_LABELS[core.effect] ?? '?';

  return (
    <View
      style={[
        styles.core,
        { left: screenX - 18, top: screenY - 18, borderColor: color, shadowColor: color },
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  core: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
