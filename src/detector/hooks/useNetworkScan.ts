import { useCallback, useRef } from 'react';
import { scanNetwork } from '../services/network.service';
import { useDetectorStore } from '../store/detector.store';

export function useNetworkScan() {
  const abortRef = useRef<AbortController | null>(null);
  const addNetworkDevice = useDetectorStore((s) => s.addNetworkDevice);
  const setNetworkProgress = useDetectorStore((s) => s.setNetworkProgress);

  const start = useCallback(async () => {
    abortRef.current = new AbortController();
    await scanNetwork(
      (scanned, total) => setNetworkProgress(Math.round((scanned / total) * 100)),
      addNetworkDevice,
      abortRef.current.signal,
    );
  }, [addNetworkDevice, setNetworkProgress]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { start, stop };
}
