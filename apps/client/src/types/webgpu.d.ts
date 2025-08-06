// WebGPU type declarations
declare global {
  interface Navigator {
    gpu?: GPU;
  }

  interface GPU {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  }

  interface GPUAdapter {
    features: GPUSupportedFeatures;
  }

  interface GPUSupportedFeatures {
    has(feature: string): boolean;
  }

  interface GPURequestAdapterOptions {
    powerPreference?: 'low-power' | 'high-performance';
    forceFallbackAdapter?: boolean;
  }
}

export {};