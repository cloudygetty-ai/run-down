import { useDetectorStore } from '../store/detector.store';
import type { ThreatScore } from '../types';

export function useThreatScore(): ThreatScore {
  return useDetectorStore((s) => s.threatScore);
}
