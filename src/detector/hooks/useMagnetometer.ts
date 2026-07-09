import { useEffect } from 'react';
import { magnetometerService } from '../services/magnetometer.service';
import { useDetectorStore } from '../store/detector.store';

export function useMagnetometer(active: boolean): void {
  const setMagneticReading = useDetectorStore((s) => s.setMagneticReading);

  useEffect(() => {
    if (!active) {
      return;
    }
    magnetometerService.start(setMagneticReading);
    return () => magnetometerService.stop();
  }, [active, setMagneticReading]);
}
