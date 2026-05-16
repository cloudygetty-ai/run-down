export type PipelineStatus = 'offline' | 'connecting' | 'active' | 'calibrating' | 'error';

export interface PipelineState {
  status: PipelineStatus;
  statusText: string;
  gateOpen: boolean;
  gateThresholdDb: number;
  isCalibrated: boolean;
  errorMessage: string | null;
}

export type PipelineStateListener = (state: PipelineState) => void;

export class AudioPipelineService {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private hpFilterNode: BiquadFilterNode | null = null;
  private gateCompressorNode: DynamicsCompressorNode | null = null;
  private outputGainNode: GainNode | null = null;

  private animationFrameId: number | null = null;
  private calibrationCleanup: (() => void) | null = null;

  private gateThresholdDb = -45;
  private isActive = false;
  private isCalibrating = false;
  private isCalibrated = false;

  private listeners = new Set<PipelineStateListener>();
  private currentState: PipelineState = {
    status: 'offline',
    statusText: 'Audio Engine Disconnected',
    gateOpen: false,
    gateThresholdDb: -45,
    isCalibrated: false,
    errorMessage: null,
  };

  subscribe(listener: PipelineStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  private emit(patch: Partial<PipelineState>): void {
    this.currentState = { ...this.currentState, ...patch };
    this.listeners.forEach((l) => l(this.currentState));
  }

  async engage(): Promise<void> {
    if (this.isActive) {
      this.stop();
      return;
    }

    this.emit({ status: 'connecting', statusText: 'Connecting to media devices...', errorMessage: null });

    try {
      if (!this.ctx) {
        // Cast for vendor-prefixed fallback on older WebKit browsers
        const Ctor =
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
          window.AudioContext;
        this.ctx = new Ctor({ latencyHint: 'interactive', sampleRate: 44100 });
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });

      this.sourceNode = this.ctx.createMediaStreamSource(this.stream);

      // High-pass filter at 80 Hz cuts sub-bass rumble and mechanical noise
      this.hpFilterNode = this.ctx.createBiquadFilter();
      this.hpFilterNode.type = 'highpass';
      this.hpFilterNode.frequency.setValueAtTime(80, this.ctx.currentTime);

      // DynamicsCompressor as hard-knee noise gate:
      // ratio 20:1 + knee 0 makes it behave like an aggressive downward expander
      this.gateCompressorNode = this.ctx.createDynamicsCompressor();
      this.gateCompressorNode.threshold.setValueAtTime(this.gateThresholdDb, this.ctx.currentTime);
      this.gateCompressorNode.knee.setValueAtTime(0, this.ctx.currentTime);
      this.gateCompressorNode.ratio.setValueAtTime(20, this.ctx.currentTime);
      this.gateCompressorNode.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.gateCompressorNode.release.setValueAtTime(0.1, this.ctx.currentTime);

      this.outputGainNode = this.ctx.createGain();
      this.outputGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Signal chain: source → HP filter → noise gate → output → speakers
      this.sourceNode.connect(this.hpFilterNode);
      this.hpFilterNode.connect(this.gateCompressorNode);
      this.gateCompressorNode.connect(this.outputGainNode);
      this.outputGainNode.connect(this.ctx.destination);

      this.isActive = true;
      this.emit({ status: 'active', statusText: 'Audio Engine Active' });

      this.startVisualizationLoop();

      if (!this.isCalibrated) {
        this.calibrate();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.stop();
      this.emit({ status: 'error', statusText: 'Pipeline Initialization Failed', errorMessage: message });
    }
  }

  async calibrate(): Promise<void> {
    if (
      !this.isActive ||
      this.isCalibrating ||
      !this.ctx ||
      !this.hpFilterNode ||
      !this.gateCompressorNode
    ) {
      return;
    }

    this.isCalibrating = true;
    this.isCalibrated = false;
    this.emit({
      status: 'calibrating',
      statusText: 'Calibrating noise gate... Keep environment silent.',
      isCalibrated: false,
    });

    // Lower threshold to -100 dB so the compressor passes all signal during measurement
    this.gateCompressorNode.threshold.setValueAtTime(-100, this.ctx.currentTime);

    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;
    this.hpFilterNode.connect(analyser);

    const dataArray = new Float32Array(analyser.frequencyBinCount);
    let totalDb = 0;
    let iterations = 0;
    const maxIterations = 30; // 1500 ms at 50 ms intervals

    const finish = () => {
      analyser.disconnect();
      this.calibrationCleanup = null;
      this.isCalibrating = false;
    };

    const id = setInterval(() => {
      if (!this.isActive) {
        clearInterval(id);
        finish();
        return;
      }

      analyser.getFloatFrequencyData(dataArray);

      let peak = -Infinity;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > peak) peak = dataArray[i];
      }

      if (peak !== -Infinity) {
        totalDb += peak;
        iterations++;
      }

      if (iterations >= maxIterations) {
        clearInterval(id);

        const avg = totalDb / iterations;
        // +12 dB safety buffer above measured floor, clamped to [-70, -20]
        this.gateThresholdDb = Math.min(Math.max(avg + 12, -70), -20);

        if (this.gateCompressorNode) {
          this.gateCompressorNode.threshold.setValueAtTime(
            this.gateThresholdDb,
            this.ctx!.currentTime,
          );
        }

        finish();
        this.isCalibrated = true;
        this.emit({
          status: 'active',
          statusText: 'Audio Engine Active',
          gateThresholdDb: this.gateThresholdDb,
          isCalibrated: true,
        });
      }
    }, 50);

    // Store cleanup reference so stop() can cancel a mid-flight calibration
    this.calibrationCleanup = () => {
      clearInterval(id);
      finish();
    };
  }

  private startVisualizationLoop(): void {
    if (this.animationFrameId != null) cancelAnimationFrame(this.animationFrameId);
    if (!this.ctx || !this.outputGainNode) return;

    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 32;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    // Tap post-gate output so gateOpen only reflects signal that passed through
    this.outputGainNode.connect(analyser);

    const tick = () => {
      if (!this.isActive) return;

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];

      this.emit({ gateOpen: sum / dataArray.length > 2 });
      this.animationFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  stop(): void {
    this.isActive = false;
    this.isCalibrating = false;

    this.calibrationCleanup?.();

    if (this.animationFrameId != null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;

    this.sourceNode?.disconnect();       this.sourceNode = null;
    this.hpFilterNode?.disconnect();     this.hpFilterNode = null;
    this.gateCompressorNode?.disconnect(); this.gateCompressorNode = null;
    this.outputGainNode?.disconnect();   this.outputGainNode = null;

    this.isCalibrated = false;
    this.emit({
      status: 'offline',
      statusText: 'Audio Engine Disconnected',
      gateOpen: false,
      isCalibrated: false,
      errorMessage: null,
    });
  }

  getState(): PipelineState {
    return this.currentState;
  }

  get active(): boolean {
    return this.isActive;
  }
}

export const audioPipeline = new AudioPipelineService();
