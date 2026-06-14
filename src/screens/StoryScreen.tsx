import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: W } = Dimensions.get('window');

type StoryPanel = {
  title: string;
  subtitle: string;
  body: string;
  accentColor: string;
  icon: string;
};

const PANELS: StoryPanel[] = [
  {
    title: 'HELIX CORPORATION',
    subtitle: 'They rebuilt the world. Then decided who got to live in it.',
    body:
      'After the Resource Collapse of 2041, Helix Corp emerged as the sole architect of civilization — controlling food, medicine, and the orbital infrastructure that kept satellites alive. Compliance was not optional. Resistance was logged, catalogued, and eventually… resolved.',
    accentColor: '#7788ff',
    icon: '⬡',
  },
  {
    title: 'SIGIL',
    subtitle: 'Strategic Interdiction and Guided Impact Lattice.',
    body:
      'SIGIL is a network of kinetic bombardment platforms in low orbit. Each node can place a precision meteorite strike anywhere on the surface within 90 seconds. Helix deployed it to end two border conflicts. Then they kept it running. Nobody asked why.',
    accentColor: '#ff5500',
    icon: '◈',
  },
  {
    title: 'THE PROVING GROUND',
    subtitle: 'Where problems become solutions — or disappear entirely.',
    body:
      'Operatives who know too much. Defectors. Rivals. Anyone Helix wants gone but can\'t officially touch. They\'re dropped into a designated zone — one of several across the globe — and the SIGIL clock starts ticking. Only the last one standing leaves. Helix calls it "resolution". Everyone else calls it the Run Down.',
    accentColor: '#ffcc00',
    icon: '▽',
  },
  {
    title: 'FRACTURE CORES',
    subtitle: 'Power pulled from the impact sites. At a cost.',
    body:
      'Explosive meteor strikes don\'t just leave craters. The kinetic energy fractures local spacetime, crystallizing into dense cores of raw potential. Holding one amplifies your abilities — faster cooldowns, harder hits. But the fracture energy is corrosive. Hold it too long and it starts taking something back.',
    accentColor: '#33ff77',
    icon: '◇',
  },
  {
    title: 'HELIX RELAYS',
    subtitle: 'Their infrastructure. Your leverage.',
    body:
      'Signal towers scattered across every Proving Ground. Helix uses them to coordinate SIGIL targeting. Capture one and you disrupt that coordination — buying time, forcing the bombardment to recalibrate, and pulling emergency supply caches from rogue factions who\'d love to see Helix lose a node. Work the relays. Control the ground.',
    accentColor: '#bb44ff',
    icon: '⊕',
  },
];

type Props = {
  onComplete: () => void;
};

export const StoryScreen: React.FC<Props> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const panel = PANELS[index];
  const isLast = index === PANELS.length - 1;

  const advance = () => {
    if (isLast) {
      onComplete();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <View style={styles.root}>
      {/* Subtle scanline texture via repeated thin lines */}
      <View style={styles.scanlines} pointerEvents="none" />

      {/* Progress dots */}
      <View style={styles.dots}>
        {PANELS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && { backgroundColor: panel.accentColor, transform: [{ scale: 1.4 }] },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={[styles.icon, { color: panel.accentColor }]}>{panel.icon}</Text>
        <Text style={[styles.title, { color: panel.accentColor }]}>{panel.title}</Text>
        <Text style={styles.subtitle}>{panel.subtitle}</Text>
        <View style={[styles.divider, { backgroundColor: panel.accentColor + '44' }]} />
        <Text style={styles.body}>{panel.body}</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, { borderColor: panel.accentColor + '88' }]}
        onPress={advance}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, { color: panel.accentColor }]}>
          {isLast ? 'ENTER THE PROVING GROUND' : 'CONTINUE  ›'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
        <Text style={styles.skipText}>skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05050d',
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 28,
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.04,
    backgroundColor: 'transparent',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 5,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  body: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 30,
  },
  btnText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingTop: 14,
  },
  skipText: {
    fontSize: 11,
    color: '#333',
    letterSpacing: 1,
  },
});
