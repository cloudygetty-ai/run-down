import { create } from 'zustand';
import { audioPipeline, PipelineState } from './AudioPipelineService';

type AudioStore = PipelineState & {
  engage: () => Promise<void>;
  calibrate: () => Promise<void>;
  stop: () => void;
};

export const useAudioStore = create<AudioStore>((set) => {
  audioPipeline.subscribe((state) => set(state));

  return {
    ...audioPipeline.getState(),
    engage: () => audioPipeline.engage(),
    calibrate: () => audioPipeline.calibrate(),
    stop: () => audioPipeline.stop(),
  };
});
