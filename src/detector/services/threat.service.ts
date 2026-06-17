import type { ThreatScore, ThreatLevel, MagneticReading, NetworkDevice, BleDevice } from '../types';

const WEIGHTS = { magnetic: 0.25, network: 0.45, bluetooth: 0.30 } as const;

// Magnetic anomaly thresholds in µT above rolling baseline
const MAG = { low: 8, medium: 20, high: 45, critical: 80 } as const;

function scoreMagnetic(reading: MagneticReading | null): number {
  if (!reading) return 0;
  const a = reading.anomaly;
  if (a < MAG.low) return 0;
  if (a < MAG.medium) return 25;
  if (a < MAG.high) return 55;
  if (a < MAG.critical) return 80;
  return 100;
}

function scoreNetwork(devices: NetworkDevice[]): number {
  if (!devices.length) return 0;
  const cameras = devices.filter(d => d.isCamera);
  if (!cameras.length) return Math.min(12, devices.length * 2);
  return Math.min(100, Math.max(...cameras.map(d => d.confidence)));
}

function scoreBluetooth(devices: BleDevice[]): number {
  if (!devices.length) return 0;
  const cameras = devices.filter(d => d.isCamera);
  if (!cameras.length) return Math.min(8, devices.length * 2);
  return Math.min(100, Math.max(...cameras.map(d => d.confidence)));
}

export function computeThreatScore(params: {
  magnetic: MagneticReading | null;
  networkDevices: NetworkDevice[];
  bleDevices: BleDevice[];
}): ThreatScore {
  const magnetic = scoreMagnetic(params.magnetic);
  const network = scoreNetwork(params.networkDevices);
  const bluetooth = scoreBluetooth(params.bleDevices);

  const total = Math.round(
    magnetic * WEIGHTS.magnetic +
    network * WEIGHTS.network +
    bluetooth * WEIGHTS.bluetooth,
  );

  // Confidence reflects how many sensor channels are active
  const confidence =
    (params.magnetic ? 25 : 0) +
    (params.networkDevices.length > 0 ? 45 : 0) +
    (params.bleDevices.length > 0 ? 30 : 0);

  return {
    total: Math.min(100, total),
    level: levelFromScore(total),
    contributors: { magnetic, network, bluetooth },
    confidence,
  };
}

export function levelFromScore(score: number): ThreatLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  if (score >= 15) return 'low';
  return 'safe';
}

export const THREAT_COLORS: Record<ThreatLevel, string> = {
  safe: '#22C55E',
  low: '#84CC16',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

export const THREAT_LABELS: Record<ThreatLevel, string> = {
  safe: 'AREA CLEAR',
  low: 'LOW RISK',
  medium: 'SUSPICIOUS',
  high: 'THREAT DETECTED',
  critical: 'CAMERA FOUND',
};
