import { KokoroTTS } from "kokoro-js";

async function detectWebGPU(): Promise<boolean> {
  try {
    if (!navigator.gpu) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

let tts: any = null;
let device: 'webgpu' | 'wasm' = 'wasm';

async function initializeModel() {
  try {
    // Device detection
    device = (await detectWebGPU()) ? "webgpu" : "wasm";
    self.postMessage({ status: "device", device });

    // Load the model
    const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
    tts = await KokoroTTS.from_pretrained(model_id, {
      dtype: device === "wasm" ? "q8" : "fp32",
      device,
    });

    self.postMessage({ 
      status: "ready", 
      voices: tts.voices, 
      device 
    });
  } catch (error) {
    self.postMessage({ 
      status: "error", 
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function generateAudio(text: string, voice: string) {
  if (!tts) {
    throw new Error('Model not initialized');
  }

  try {
    // Generate speech
    const audio = await tts.generate(text, { voice });

    // Convert to blob and create URL
    const blob = audio.toBlob();
    const audioUrl = URL.createObjectURL(blob);

    self.postMessage({ 
      status: "complete", 
      audio: audioUrl, 
      text,
      voice 
    });
  } catch (error) {
    self.postMessage({ 
      status: "error", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Initialize model on worker startup
initializeModel();

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, text, voice } = e.data;

  switch (type) {
    case "generate":
      await generateAudio(text, voice);
      break;
  }
});

export {}; // Make this a module