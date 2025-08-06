import {
  AutoProcessor,
  AutoModelForImageTextToText,
  load_image,
  TextStreamer,
} from "@huggingface/transformers";
import wavefile from "wavefile";

class Gemma3nSingleton {
  static model_id = "onnx-community/gemma-3n-E2B-it-ONNX";
  static processor: any;
  static model: any;

  static async getInstance(progress_callback: ((progress: any) => void) | null = null) {
    console.log("[Gemma3n Singleton] Getting instance for model:", this.model_id);

    console.log("[Gemma3n Singleton] Loading processor...");
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {});

    console.log("[Gemma3n Singleton] Loading main model...");
    console.log("[Gemma3n Singleton] Model config:", {
      dtype: {
        embed_tokens: "q8",
        audio_encoder: "q4",
        vision_encoder: "fp16",
        decoder_model_merged: "q4",
      },
      device: "cpu", // Force CPU as specified
    });

    this.model ??= AutoModelForImageTextToText.from_pretrained(this.model_id, {
      dtype: {
        embed_tokens: "q8",
        audio_encoder: "q4", 
        vision_encoder: "fp16",
        decoder_model_merged: "q4",
      },
      device: "cpu", // Force CPU as specified
      progress_callback: progress_callback || undefined,
    });

    console.log("[Gemma3n Singleton] Awaiting all components...");
    return Promise.all([this.model, this.processor]);
  }
}

async function load() {
  try {
    console.log("[Gemma3n Worker] Starting model load...");
    self.postMessage({
      status: "loading",
      data: "Loading Gemma 3n model...",
    });

    console.log("[Gemma3n Worker] Getting singleton instance...");
    const [model, processor] = await Gemma3nSingleton.getInstance((x: any) => {
      console.log("[Gemma3n Worker] Progress:", x);
      self.postMessage(x);
    });

    console.log("[Gemma3n Worker] Model loaded and ready!");
    self.postMessage({ status: "ready" });
  } catch (error) {
    console.error("[Gemma3n Worker] Load error:", error);
    self.postMessage({
      status: "error",
      data: error instanceof Error ? error.message : String(error),
    });
  }
}

async function captionImage({
  imageUrl,
  prompt = "Describe this image in detail.",
}: {
  imageUrl: string;
  prompt?: string;
}) {
  try {
    const [model, processor] = await Gemma3nSingleton.getInstance();

    const start = performance.now();

    // Prepare prompt
    const messages = [
      {
        role: "user",
        content: [
          { type: "image" },
          { type: "text", text: prompt },
        ],
      },
    ];
    const chatPrompt = processor.apply_chat_template(messages, {
      add_generation_prompt: true,
    });

    // Load and prepare image
    const image = await load_image(imageUrl);
    const audio = null;
    const inputs = await processor(chatPrompt, image, audio, {
      add_special_tokens: false,
    });

    // Generate output
    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: 512,
      do_sample: false,
    });

    // Decode output
    const decoded = processor.batch_decode(
      outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
      { skip_special_tokens: true },
    );

    const end = performance.now();

    self.postMessage({
      status: "complete",
      result: decoded[0],
      time: end - start,
      task: "caption_image",
    });
  } catch (error) {
    console.error("[Gemma3n Worker] Caption error:", error);
    self.postMessage({
      status: "error",
      data: error instanceof Error ? error.message : String(error),
    });
  }
}

async function transcribeAudio({
  audioUrl,
  prompt = "Transcribe this audio verbatim.",
}: {
  audioUrl: string;
  prompt?: string;
}) {
  try {
    const [model, processor] = await Gemma3nSingleton.getInstance();

    const start = performance.now();

    // Prepare prompt
    const messages = [
      {
        role: "user",
        content: [
          { type: "audio" },
          { type: "text", text: prompt },
        ],
      },
    ];
    const chatPrompt = processor.apply_chat_template(messages, {
      add_generation_prompt: true,
    });

    // Load and prepare audio
    const buffer = Buffer.from(await fetch(audioUrl).then((x) => x.arrayBuffer()));
    const wav = new wavefile.WaveFile(buffer);
    wav.toBitDepth("32f"); // Pipeline expects input as a Float32Array
    wav.toSampleRate(processor.feature_extractor.config.sampling_rate);
    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
      if (audioData.length > 1) {
        for (let i = 0; i < audioData[0].length; ++i) {
          audioData[0][i] = (Math.sqrt(2) * (audioData[0][i] + audioData[1][i])) / 2;
        }
      }
      audioData = audioData[0];
    }

    const image = null;
    const audio = audioData;
    const inputs = await processor(chatPrompt, image, audio, {
      add_special_tokens: false,
    });

    // Generate output
    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: 512,
      do_sample: false,
    });

    // Decode output
    const decoded = processor.batch_decode(
      outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
      { skip_special_tokens: true },
    );

    const end = performance.now();

    self.postMessage({
      status: "complete",
      result: decoded[0],
      time: end - start,
      task: "transcribe_audio",
    });
  } catch (error) {
    console.error("[Gemma3n Worker] Transcribe error:", error);
    self.postMessage({
      status: "error",
      data: error instanceof Error ? error.message : String(error),
    });
  }
}

// Initialize model on worker startup
console.log("[Gemma3n Worker] Auto-initializing model...");
load();

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;
  console.log("[Gemma3n Worker] Received message:", type, data);

  switch (type) {
    case "load":
      console.log("[Gemma3n Worker] Load message received (already loading)");
      // Model is already loading from startup, no need to call load() again
      break;

    case "caption_image":
      console.log("[Gemma3n Worker] Caption image message received");
      captionImage(data);
      break;

    case "transcribe_audio":
      console.log("[Gemma3n Worker] Transcribe audio message received");
      transcribeAudio(data);
      break;

    default:
      console.warn("[Gemma3n Worker] Unknown message type:", type);
  }
});

export {}; // Make this a module