export interface KokoroVoice {
  name: string;
  language: string;
  gender: string;
}

export interface KokoroVoices {
  [key: string]: KokoroVoice;
}

export interface KokoroAudioResult {
  audio: string; // Blob URL
  text: string;
  voice: string;
}

export class KokoroService {
  private worker: Worker | null = null;
  private isModelLoaded = false;
  private voices: KokoroVoices = {};
  private device: 'webgpu' | 'wasm' = 'wasm';

  public getWorker(): Worker | null {
    return this.worker;
  }

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    this.worker = new Worker(
      new URL('../workers/kokoro-worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.worker) return;

    this.worker.addEventListener('message', (e) => {
      const { status } = e.data;

      switch (status) {
        case 'device':
          this.device = e.data.device;
          break;
        
        case 'ready':
          this.isModelLoaded = true;
          this.voices = e.data.voices;
          break;
        
        case 'error':
          console.error('Kokoro worker error:', e.data.error);
          break;
      }
    });
  }

  async waitForModelLoad(): Promise<void> {
    if (this.isModelLoaded) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handleMessage = (e: MessageEvent) => {
        const { status } = e.data;

        if (status === 'ready') {
          this.worker?.removeEventListener('message', handleMessage);
          resolve();
        } else if (status === 'error') {
          this.worker?.removeEventListener('message', handleMessage);
          reject(new Error(e.data.error));
        }
      };

      this.worker.addEventListener('message', handleMessage);
    });
  }

  async generateAudio(
    text: string, 
    voice: string = 'af_heart'
  ): Promise<KokoroAudioResult> {
    if (!this.isModelLoaded) {
      throw new Error('Model not loaded. Wait for initialization.');
    }

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handleMessage = (e: MessageEvent) => {
        const { status } = e.data;

        if (status === 'complete') {
          this.worker?.removeEventListener('message', handleMessage);
          resolve({
            audio: e.data.audio,
            text: e.data.text,
            voice: e.data.voice
          });
        } else if (status === 'error') {
          this.worker?.removeEventListener('message', handleMessage);
          reject(new Error(e.data.error));
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({
        type: 'generate',
        text,
        voice
      });
    });
  }

  getVoices(): KokoroVoices {
    return this.voices;
  }

  getDevice(): 'webgpu' | 'wasm' {
    return this.device;
  }

  isReady(): boolean {
    return this.isModelLoaded;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.isModelLoaded = false;
    this.voices = {};
  }
}