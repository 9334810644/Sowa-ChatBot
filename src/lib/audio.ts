/**
 * High-performance raw PCM audio streaming, buffering, and ultra-low latency gapless playback for Sowa AI.
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x4000; // 16KB sub-chunks for optimal String.fromCharCode speed
  for (let i = 0; i < len; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, sub as unknown as number[]);
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array {
  try {
    const binary = atob(base64);
    const len = binary.length;
    const safeLen = len - (len % 2);
    const bytes = new Uint8Array(safeLen);
    for (let i = 0; i < safeLen; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer, 0, safeLen / 2);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  } catch (e) {
    console.error("PCM conversion error:", e);
    return new Float32Array(0);
  }
}

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private audioQueue: { data: Float32Array; sampleRate: number }[] = [];
  private onVolumeChange: ((volume: number) => void) | null = null;
  private onStateChange: ((isPlaying: boolean) => void) | null = null;
  private onInterrupted: (() => void) | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPaused = false;
  private playbackRate = 1.0;
  private nextStartTime = 0;
  private endTimeout: any = null;

  // Ring buffer / accumulator to batch audio into optimal packets (~32ms for ultra-low latency turn detection)
  private inputBuffer: Float32Array = new Float32Array(8192);
  private inputBufferLength: number = 0;
  private readonly targetChunkSize = 512; // ~32ms at 16kHz - blazing fast detection without network flooding

  constructor(private inputSampleRate: number = 16000, private defaultOutputSampleRate: number = 24000) {}

  setVolumeCallback(callback: (volume: number) => void) {
    this.onVolumeChange = callback;
  }

  setInterruptedCallback(callback: () => void) {
    this.onInterrupted = callback;
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
  }

  setStateCallback(callback: (isPlaying: boolean) => void) {
    this.onStateChange = callback;
  }

  setVolume(volume: number) {
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
    }
  }

  pauseInput() {
    this.isPaused = true;
  }

  resumeInput() {
    this.isPaused = false;
  }

  getIsPlaying(): boolean {
    return this.isPlaying || this.activeSources.size > 0;
  }

  private initAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.audioContext = new AudioContextClass({ latencyHint: 'interactive' });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(console.error);
    }
    return this.audioContext;
  }

  private resample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (Math.abs(fromRate - toRate) < 1) return data;
    const ratio = fromRate / toRate;
    const newLength = Math.floor(data.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio;
      const index = Math.floor(pos);
      const frac = pos - index;
      if (index + 1 < data.length) {
        result[i] = data[index] * (1 - frac) + data[index + 1] * frac;
      } else {
        result[i] = data[index];
      }
    }
    return result;
  }

  async startInput(onAudioData: (base64: string, inputVolume?: number) => void) {
    try {
      this.inputBufferLength = 0;
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: this.inputSampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      if (!this.stream) {
        throw new Error("No audio stream available");
      }

      const ctx = this.initAudioContext();
      const source = ctx.createMediaStreamSource(this.stream);
      const contextSampleRate = ctx.sampleRate;

      const handleInputBuffer = (inputData: Float32Array) => {
        if (this.isPaused) return;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(console.error);
        }

        // Resample input slice to 16kHz
        const resampledData = this.resample(inputData, contextSampleRate, this.inputSampleRate);
        const resampledLen = resampledData.length;

        // Append to pre-allocated typed array buffer
        if (this.inputBufferLength + resampledLen > this.inputBuffer.length) {
          const newBuf = new Float32Array(Math.max(this.inputBuffer.length * 2, this.inputBufferLength + resampledLen));
          newBuf.set(this.inputBuffer.subarray(0, this.inputBufferLength));
          this.inputBuffer = newBuf;
        }
        this.inputBuffer.set(resampledData, this.inputBufferLength);
        this.inputBufferLength += resampledLen;

        // Drain chunks of targetChunkSize
        while (this.inputBufferLength >= this.targetChunkSize) {
          const chunk = this.inputBuffer.subarray(0, this.targetChunkSize);

          // Calculate RMS volume for visualizers
          let sum = 0;
          for (let i = 0; i < this.targetChunkSize; i++) {
            sum += chunk[i] * chunk[i];
          }
          const inputVolume = Math.sqrt(sum / this.targetChunkSize);

          const pcmData = this.floatTo16BitPCM(chunk);
          const base64Data = arrayBufferToBase64(pcmData);

          onAudioData(base64Data, inputVolume);

          // Shift remaining buffer
          this.inputBuffer.copyWithin(0, this.targetChunkSize, this.inputBufferLength);
          this.inputBufferLength -= this.targetChunkSize;
        }
      };

      // Use AudioWorklet if supported
      let useWorklet = false;
      if (ctx.audioWorklet) {
        try {
          const workletCode = `
            class SowaAudioProcessor extends AudioWorkletProcessor {
              process(inputs) {
                const input = inputs[0];
                if (input && input[0] && input[0].length > 0) {
                  this.port.postMessage(input[0]);
                }
                return true;
              }
            }
            registerProcessor('sowa-audio-processor', SowaAudioProcessor);
          `;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await ctx.audioWorklet.addModule(url);
          URL.revokeObjectURL(url);

          const workletNode = new AudioWorkletNode(ctx, 'sowa-audio-processor');
          workletNode.port.onmessage = (e) => {
            handleInputBuffer(e.data as Float32Array);
          };

          source.connect(workletNode);
          this.processor = workletNode;
          useWorklet = true;
        } catch (e) {
          console.warn("AudioWorklet fallback to ScriptProcessorNode:", e);
        }
      }

      if (!useWorklet) {
        const scriptProcessor = ctx.createScriptProcessor(2048, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
          handleInputBuffer(e.inputBuffer.getChannelData(0));
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(ctx.destination);
        this.processor = scriptProcessor;
      }
    } catch (error: any) {
      console.error("Failed to start audio input:", error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error("Microphone access denied. Please allow microphone permissions in your browser settings.");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error("No microphone found. Please connect a microphone.");
      } else {
        throw new Error(`Microphone error: ${error.message}`);
      }
    }
  }

  stopInput() {
    this.stopPlayback();
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isPlaying = false;
    this.audioQueue = [];
    this.inputBufferLength = 0;
  }

  private stopPlayback() {
    this.activeSources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.activeSources.clear();
    this.nextStartTime = 0;
    this.isPlaying = false;
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }
    if (this.onVolumeChange) this.onVolumeChange(0);
    if (this.onStateChange) this.onStateChange(false);
  }

  addAudioChunk(base64: string, mimeType?: string) {
    const float32 = base64ToFloat32(base64);
    if (float32.length === 0) return;

    let sampleRate = this.defaultOutputSampleRate;
    if (mimeType) {
      const match = mimeType.match(/rate=(\d+)/);
      if (match && match[1]) {
        sampleRate = parseInt(match[1], 10);
      }
    }

    this.audioQueue.push({ data: float32, sampleRate });
    this.scheduleNextChunks();
  }

  private scheduleNextChunks() {
    const ctx = this.initAudioContext();
    if (!ctx) return;

    if (this.audioQueue.length === 0) return;

    const now = ctx.currentTime;

    // Ultra-low jitter buffer lead time: 10ms lead time when starting fresh or drained
    if (this.nextStartTime < now + 0.003) {
      this.nextStartTime = now + 0.010;
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onStateChange?.(true);
    }

    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }

    while (this.audioQueue.length > 0) {
      const item = this.audioQueue.shift()!;
      const chunk = item.data;
      const rate = item.sampleRate;

      // Calculate volume for lip-sync & visualizer
      let sum = 0;
      for (let i = 0; i < chunk.length; i++) {
        sum += chunk[i] * chunk[i];
      }
      const volume = Math.sqrt(sum / chunk.length);

      const buffer = ctx.createBuffer(1, chunk.length, rate);
      buffer.getChannelData(0).set(chunk);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.playbackRate;

      if (this.gainNode) {
        source.connect(this.gainNode);
      } else {
        source.connect(ctx.destination);
      }

      const duration = buffer.duration / this.playbackRate;
      const startTime = this.nextStartTime;
      this.nextStartTime += duration;

      const delayMs = Math.max(0, (startTime - now) * 1000);
      setTimeout(() => {
        if (this.isPlaying && this.onVolumeChange) {
          this.onVolumeChange(volume);
        }
      }, delayMs);

      this.activeSources.add(source);

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0 && this.audioQueue.length === 0) {
          if (this.endTimeout) clearTimeout(this.endTimeout);
          this.endTimeout = setTimeout(() => {
            if (this.activeSources.size === 0 && this.audioQueue.length === 0) {
              this.isPlaying = false;
              this.onStateChange?.(false);
              this.onVolumeChange?.(0);
            }
          }, 25);
        }
      };

      source.start(startTime);
    }
  }

  clearQueue() {
    this.audioQueue = [];
    this.stopPlayback();
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output.buffer;
  }
}
