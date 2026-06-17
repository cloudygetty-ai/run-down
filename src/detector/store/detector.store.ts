import { create } from 'zustand';
import type {
  MagneticReading,
  NetworkDevice,
  BleDevice,
  ScanResult,
  ThreatScore,
  ScanPhase,
} from '../types';
import { computeThreatScore } from '../services/threat.service';

interface DetectorState {
  scanPhase: ScanPhase;
  scanStartTime: number | null;
  magneticReading: MagneticReading | null;
  networkDevices: NetworkDevice[];
  bleDevices: BleDevice[];
  networkScanProgress: number;
  threatScore: ThreatScore;
  history: ScanResult[];

  startScan: () => void;
  stopScan: () => void;
  setMagneticReading: (r: MagneticReading) => void;
  addNetworkDevice: (d: NetworkDevice) => void;
  addBleDevice: (d: BleDevice) => void;
  setNetworkProgress: (n: number) => void;
  saveScan: () => void;
  resetScan: () => void;
}

const INITIAL_THREAT: ThreatScore = {
  total: 0,
  level: 'safe',
  contributors: { magnetic: 0, network: 0, bluetooth: 0 },
  confidence: 0,
};

function recompute(
  magnetic: MagneticReading | null,
  networkDevices: NetworkDevice[],
  bleDevices: BleDevice[],
): ThreatScore {
  return computeThreatScore({ magnetic, networkDevices, bleDevices });
}

export const useDetectorStore = create<DetectorState>((set, get) => ({
  scanPhase: 'idle',
  scanStartTime: null,
  magneticReading: null,
  networkDevices: [],
  bleDevices: [],
  networkScanProgress: 0,
  threatScore: INITIAL_THREAT,
  history: [],

  startScan: () =>
    set({
      scanPhase: 'scanning',
      scanStartTime: Date.now(),
      networkDevices: [],
      bleDevices: [],
      networkScanProgress: 0,
      magneticReading: null,
      threatScore: INITIAL_THREAT,
    }),

  stopScan: () => set({ scanPhase: 'complete' }),

  setMagneticReading: (magneticReading) => {
    const { networkDevices, bleDevices } = get();
    set({ magneticReading, threatScore: recompute(magneticReading, networkDevices, bleDevices) });
  },

  addNetworkDevice: (device) => {
    const { magneticReading, bleDevices } = get();
    const prev = get().networkDevices;
    const idx = prev.findIndex((d) => d.id === device.id);
    const networkDevices =
      idx >= 0 ? prev.map((d, i) => (i === idx ? device : d)) : [...prev, device];
    set({ networkDevices, threatScore: recompute(magneticReading, networkDevices, bleDevices) });
  },

  addBleDevice: (device) => {
    const { magneticReading, networkDevices } = get();
    const bleDevices = [...get().bleDevices, device];
    set({ bleDevices, threatScore: recompute(magneticReading, networkDevices, bleDevices) });
  },

  setNetworkProgress: (networkScanProgress) => set({ networkScanProgress }),

  saveScan: () => {
    const { magneticReading, networkDevices, bleDevices, threatScore, scanStartTime, history } =
      get();
    const result: ScanResult = {
      id: `scan-${Date.now()}`,
      timestamp: Date.now(),
      duration: scanStartTime ? Date.now() - scanStartTime : 0,
      threatScore: threatScore.total,
      threatLevel: threatScore.level,
      magneticAnomalyPeak: magneticReading?.anomaly ?? 0,
      networkDevices,
      bleDevices,
      cameraDetected: threatScore.level === 'critical' || threatScore.level === 'high',
    };
    set({ history: [result, ...history].slice(0, 100) });
  },

  resetScan: () =>
    set({
      scanPhase: 'idle',
      scanStartTime: null,
      magneticReading: null,
      networkDevices: [],
      bleDevices: [],
      networkScanProgress: 0,
      threatScore: INITIAL_THREAT,
    }),
}));
