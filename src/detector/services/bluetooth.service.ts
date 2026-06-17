import type { BleDevice } from '../types';

// Name patterns strongly associated with IP/BLE cameras
const CAMERA_NAME_RE = [
  /\bcam(era)?\b/i,
  /\bipc\b/i,
  /\bdvr\b/i,
  /\bnvr\b/i,
  /\bspy\b/i,
  /\bhidden\b/i,
  /reolink/i,
  /dahua/i,
  /hikvision/i,
  /foscam/i,
  /blink/i,
  /wyze\s*cam/i,
  /arlo/i,
  /ring\s*cam/i,
  /nest\s*cam/i,
  /eufycam/i,
];

// Known BLE manufacturer IDs mapped to camera vendors
// TODO[P1]: Expand from full IEEE OUI database
const CAMERA_MANUFACTURER_IDS: number[] = [
  0x01e4, // Axis Communications
  0x033b, // Sony (some surveillance)
  0x04e8, // Samsung Techwin
];

export function analyzeDevice(
  name?: string,
  manufacturerId?: number,
): {
  isCamera: boolean;
  indicators: string[];
  confidence: number;
} {
  const indicators: string[] = [];
  let confidence = 0;

  if (name) {
    for (const re of CAMERA_NAME_RE) {
      if (re.test(name)) {
        indicators.push(`Name matches: ${re.source}`);
        confidence += 40;
        break;
      }
    }
  }

  if (manufacturerId !== undefined && CAMERA_MANUFACTURER_IDS.includes(manufacturerId)) {
    indicators.push(`Camera vendor ID: 0x${manufacturerId.toString(16).toUpperCase()}`);
    confidence += 45;
  }

  // Unnamed devices near -60 dBm or closer are mildly suspicious
  if (!name) {
    indicators.push('Anonymous device');
    confidence += 8;
  }

  return { isCamera: confidence >= 40, indicators, confidence: Math.min(100, confidence) };
}

class BluetoothService {
  // NOTE[P1]: Replace mock with react-native-ble-plx when installed:
  //   import { BleManager } from 'react-native-ble-plx';
  //   const mgr = new BleManager();
  //   mgr.startDeviceScan(null, { allowDuplicates: false }, (err, device) => {
  //     if (device) onDevice(mapDevice(device));
  //   });
  private readonly useMock = true;

  async scan(
    onDevice: (d: BleDevice) => void,
    durationMs = 12000,
    signal?: AbortSignal,
  ): Promise<BleDevice[]> {
    return this.useMock ? this.mockScan(onDevice, durationMs, signal) : Promise.resolve([]);
  }

  private mockScan(
    onDevice: (d: BleDevice) => void,
    durationMs: number,
    signal?: AbortSignal,
  ): Promise<BleDevice[]> {
    const pool: Array<{ name?: string; rssi: number }> = [
      { name: 'iPhone 14', rssi: -68 },
      { name: 'AirPods Pro', rssi: -72 },
      { name: 'MacBook Air', rssi: -81 },
      { name: undefined, rssi: -54 }, // anonymous — mildly suspicious
      { name: 'Smart TV', rssi: -77 },
      { name: undefined, rssi: -47 }, // anonymous, close range
      { name: 'BT Speaker', rssi: -85 },
      { name: 'iPad mini', rssi: -63 },
    ];

    const found: BleDevice[] = [];
    let idx = 0;
    const interval = Math.floor(durationMs / pool.length);

    return new Promise((resolve) => {
      const tick = setInterval(() => {
        if (signal?.aborted || idx >= pool.length) {
          clearInterval(tick);
          resolve(found);
          return;
        }
        const raw = pool[idx++];
        const analysis = analyzeDevice(raw.name);
        const device: BleDevice = {
          id: `ble-${idx}`,
          name: raw.name,
          rssi: raw.rssi,
          isCamera: analysis.isCamera,
          cameraIndicators: analysis.indicators,
          confidence: analysis.confidence,
          firstSeen: Date.now(),
        };
        found.push(device);
        onDevice(device);
      }, interval);

      setTimeout(() => {
        clearInterval(tick);
        resolve(found);
      }, durationMs);
    });
  }
}

export const bluetoothService = new BluetoothService();
