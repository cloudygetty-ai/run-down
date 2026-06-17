import { useCallback, useRef } from 'react';
import { bluetoothService } from '../services/bluetooth.service';
import { useDetectorStore } from '../store/detector.store';

export function useBluetooth() {
  const abortRef = useRef<AbortController | null>(null);
  const addBleDevice = useDetectorStore(s => s.addBleDevice);

  const start = useCallback(async () => {
    abortRef.current = new AbortController();
    await bluetoothService.scan(addBleDevice, 12000, abortRef.current.signal);
  }, [addBleDevice]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { start, stop };
}
