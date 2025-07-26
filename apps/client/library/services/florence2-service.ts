export type Florence2Task = 
  | '<CAPTION>'
  | '<DETAILED_CAPTION>' 
  | '<MORE_DETAILED_CAPTION>'
  | '<OCR>'
  | '<OCR_WITH_REGION>'
  | '<OD>'
  | '<DENSE_REGION_CAPTION>'
  | '<CAPTION_TO_PHRASE_GROUNDING>';

export interface Florence2Result {
  [key: string]: string | object;
}

export interface Florence2Progress {
  status: string;
  file?: string;
  progress?: number;
  total?: number;
}

export class Florence2Service {
  private worker: Worker | null = null;
  private isModelLoaded = false;
  private isLoading = false;

  constructor() {
    console.log("[Florence2 Service] Constructor called");
    this.initWorker();
    this.startListeningForAutoInit();
  }

  private initWorker() {
    this.worker = new Worker(
      new URL('../workers/florence2-worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  private startListeningForAutoInit() {
    if (!this.worker) return;
    
    console.log("[Florence2 Service] Starting to listen for auto-init");
    this.isLoading = true;

    const handleAutoInitMessage = (e: MessageEvent) => {
      const { status, data } = e.data;
      console.log("[Florence2 Service] Auto-init message:", status, data);

      switch (status) {
        case 'loading':
          console.log("[Florence2 Service] Auto-loading:", data);
          break;
        
        case 'initiate':
        case 'progress':
        case 'done':
          console.log("[Florence2 Service] Auto-init progress:", e.data);
          break;
        
        case 'ready':
          console.log("[Florence2 Service] Auto-init complete!");
          this.isModelLoaded = true;
          this.isLoading = false;
          this.worker?.removeEventListener('message', handleAutoInitMessage);
          break;
        
        case 'error':
          console.error("[Florence2 Service] Auto-init error:", data);
          this.isLoading = false;
          this.worker?.removeEventListener('message', handleAutoInitMessage);
          break;
      }
    };

    this.worker.addEventListener('message', handleAutoInitMessage);
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
          reject(new Error(e.data.data));
        }
      };

      this.worker.addEventListener('message', handleMessage);
    });
  }

  async loadModel(
    onProgress?: (progress: Florence2Progress) => void,
    onLoadingMessage?: (message: string) => void
  ): Promise<void> {
    if (this.isModelLoaded || this.isLoading) {
      return;
    }

    this.isLoading = true;

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handleMessage = (e: MessageEvent) => {
        const { status, data } = e.data;

        switch (status) {
          case 'loading':
            onLoadingMessage?.(data);
            break;
          
          case 'initiate':
          case 'progress':
          case 'done':
            onProgress?.(e.data);
            break;
          
          case 'ready':
            this.isModelLoaded = true;
            this.isLoading = false;
            this.worker?.removeEventListener('message', handleMessage);
            resolve();
            break;
          
          case 'error':
            this.isLoading = false;
            this.worker?.removeEventListener('message', handleMessage);
            reject(new Error(data));
            break;
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ type: 'load' });
    });
  }

  async generateCaption(
    imageDataUrl: string,
    task: Florence2Task = '<CAPTION>',
    text?: string
  ): Promise<{ result: Florence2Result; time: number }> {
    if (!this.isModelLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handleMessage = (e: MessageEvent) => {
        const { status, result, time } = e.data;

        if (status === 'complete') {
          this.worker?.removeEventListener('message', handleMessage);
          resolve({ result, time });
        } else if (status === 'error') {
          this.worker?.removeEventListener('message', handleMessage);
          reject(new Error(e.data.data));
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({
        type: 'run',
        data: { imageDataUrl, task, text }
      });
    });
  }

  resetImageCache() {
    this.worker?.postMessage({ type: 'reset' });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.isModelLoaded = false;
    this.isLoading = false;
  }
}