export async function detectWebGPU(): Promise<boolean> {
  try {
    if (!navigator.gpu) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    console.warn('WebGPU detection failed:', e);
    return false;
  }
}

export async function hasFp16(): Promise<boolean> {
  try {
    if (!navigator.gpu) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    return adapter?.features.has("shader-f16") || false;
  } catch (e) {
    console.warn('FP16 detection failed:', e);
    return false;
  }
}

export type ProcessingDevice = 'webgpu' | 'wasm';

export async function selectOptimalDevice(): Promise<ProcessingDevice> {
  const supportsWebGPU = await detectWebGPU();
  return supportsWebGPU ? 'webgpu' : 'wasm';
}