import type { MagneticReading } from '../types';

// Rolling baseline window — 20 readings @ 10 Hz = 2 seconds
const BASELINE_WINDOW = 20;

type ReadingCallback = (r: MagneticReading) => void;

class MagnetometerService {
  private readings: number[] = [];
  private subscriber: ReadingCallback | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  // NOTE[P1]: Swap mock with react-native-sensors when installed:
  //   import { magnetometer, SensorTypes, setUpdateIntervalForType } from 'react-native-sensors';
  //   setUpdateIntervalForType(SensorTypes.magnetometer, 100);
  //   const sub = magnetometer.subscribe(({ x, y, z }) => this.process(x, y, z));
  private readonly useMock = true;

  start(onReading: ReadingCallback): void {
    this.subscriber = onReading;
    this.readings = [];
    if (this.useMock) {
      this.startMock();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.subscriber = null;
    this.readings = [];
  }

  private startMock(): void {
    // Realistic Earth magnetic field baseline (~25-65 µT depending on location)
    const baseX = 22 + Math.random() * 10;
    const baseY = -15 + Math.random() * 5;
    const baseZ = 40 + Math.random() * 10;

    let anomalyActive = false;
    let anomalyMagnitude = 0;
    let ticksSinceAnomaly = 0;

    this.timer = setInterval(() => {
      const noise = () => (Math.random() - 0.5) * 3;

      // Randomly trigger anomaly bursts simulating nearby electronics
      ticksSinceAnomaly++;
      if (!anomalyActive && ticksSinceAnomaly > 40 && Math.random() < 0.04) {
        anomalyActive = true;
        anomalyMagnitude = 15 + Math.random() * 65;
        ticksSinceAnomaly = 0;
      }
      if (anomalyActive && Math.random() < 0.08) {
        anomalyActive = false;
        anomalyMagnitude = 0;
      }

      const boost = anomalyActive ? anomalyMagnitude : 0;
      const x = baseX + noise() + boost * 0.6;
      const y = baseY + noise() + boost * 0.3;
      const z = baseZ + noise() + boost * 0.1;

      this.process(x, y, z);
    }, 100); // 10 Hz
  }

  private process(x: number, y: number, z: number): void {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    this.readings.push(magnitude);
    if (this.readings.length > BASELINE_WINDOW) {
      this.readings.shift();
    }

    const baseline =
      this.readings.reduce((a, b) => a + b, 0) / this.readings.length;
    const anomaly = Math.abs(magnitude - baseline);

    this.subscriber?.({
      x, y, z, magnitude, baseline, anomaly,
      timestamp: Date.now(),
    });
  }
}

export const magnetometerService = new MagnetometerService();
