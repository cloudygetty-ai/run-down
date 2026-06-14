import { MapTheme } from '../../types';

export type EnvironmentId =
  | 'fractured_metropolis'
  | 'cryo_wastes'
  | 'ashfall_crater'
  | 'signal_station'
  | 'verdant_decay';

export type Environment = {
  id: EnvironmentId;
  name: string;
  tagline: string;
  theme: MapTheme;
  lootCountMult: number;        // multiplied into base loot scatter count
  playerSpeedMult: number;      // applied to every player's speedMult at match start
  supplyDropIntervalMs: number; // overrides default supply drop timer
  outsideZoneDps: number;       // extra HP/s drained from players outside shelter
  meteorFrequencyMult: number;  // divides base impactInterval (higher = more meteors)
};

export const ENVIRONMENTS: Environment[] = [
  {
    id: 'fractured_metropolis',
    name: 'Fractured Metropolis',
    tagline: 'Urban ruins, contested supply lines.',
    theme: { bgColor: '#12121e', groundColor: '#1e1e30', accentColor: '#7788ff' },
    lootCountMult: 1.0,
    playerSpeedMult: 1.0,
    supplyDropIntervalMs: 180_000,
    outsideZoneDps: 0,
    meteorFrequencyMult: 1.0,
  },
  {
    id: 'cryo_wastes',
    name: 'Cryo Wastes',
    tagline: 'Frozen tundra. Movement is lethal slowness.',
    theme: { bgColor: '#08141e', groundColor: '#102030', accentColor: '#44ccee' },
    lootCountMult: 0.8,
    playerSpeedMult: 0.8,
    supplyDropIntervalMs: 150_000,
    outsideZoneDps: 0,
    meteorFrequencyMult: 0.75,
  },
  {
    id: 'ashfall_crater',
    name: 'Ashfall Crater',
    tagline: 'SIGIL direct-impact zone. Survive the ash.',
    theme: { bgColor: '#140800', groundColor: '#241000', accentColor: '#ff5500' },
    lootCountMult: 1.3,
    playerSpeedMult: 1.0,
    supplyDropIntervalMs: 240_000,
    outsideZoneDps: 8,
    meteorFrequencyMult: 2.0,
  },
  {
    id: 'signal_station',
    name: 'Signal Station',
    tagline: 'Helix orbital uplink. Relays everywhere.',
    theme: { bgColor: '#080814', groundColor: '#0a0a20', accentColor: '#bb44ff' },
    lootCountMult: 1.0,
    playerSpeedMult: 1.1,
    supplyDropIntervalMs: 90_000,
    outsideZoneDps: 0,
    meteorFrequencyMult: 1.0,
  },
  {
    id: 'verdant_decay',
    name: 'Verdant Decay',
    tagline: 'Fracture energy corrupts the overgrowth.',
    theme: { bgColor: '#030a03', groundColor: '#071407', accentColor: '#33ff77' },
    lootCountMult: 1.5,
    playerSpeedMult: 1.0,
    supplyDropIntervalMs: 180_000,
    outsideZoneDps: 0,
    meteorFrequencyMult: 1.25,
  },
];

export const DEFAULT_ENVIRONMENT_ID: EnvironmentId = 'fractured_metropolis';

export function getEnvironment(id: EnvironmentId | string): Environment {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0];
}
