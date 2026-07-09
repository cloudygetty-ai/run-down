export type ThreatLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export type ScanPhase = 'idle' | 'scanning' | 'complete';

export interface MagneticReading {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  baseline: number;
  anomaly: number;
  timestamp: number;
}

export interface NetworkDevice {
  id: string;
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  openPorts: number[];
  isCamera: boolean;
  cameraType?: 'ip_camera' | 'dvr' | 'nvr' | 'unknown';
  responseTimeMs?: number;
  firstSeen: number;
  lastSeen: number;
  confidence: number;
}

export interface BleDevice {
  id: string;
  name?: string;
  rssi: number;
  isCamera: boolean;
  cameraIndicators: string[];
  firstSeen: number;
  confidence: number;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  location?: string;
  duration: number;
  threatScore: number;
  threatLevel: ThreatLevel;
  magneticAnomalyPeak: number;
  networkDevices: NetworkDevice[];
  bleDevices: BleDevice[];
  cameraDetected: boolean;
}

export interface ThreatScore {
  total: number;
  level: ThreatLevel;
  contributors: {
    magnetic: number;
    network: number;
    bluetooth: number;
  };
  confidence: number;
}
