import {
  Florence2ForConditionalGeneration,
  AutoProcessor,
  AutoTokenizer,
  RawImage,
  full,
} from "@huggingface/transformers";

async function hasFp16(): Promise<boolean> {
  try {
    console.log("[Florence2 Worker] Checking WebGPU availability...");
    if (!navigator.gpu) {
      console.log("[Florence2 Worker] WebGPU not available");
      return false;
    }
    console.log("[Florence2 Worker] Requesting WebGPU adapter...");
    const adapter = await navigator.gpu.requestAdapter();
    const hasFp16 = adapter?.features.has("shader-f16") || false;
    console.log("[Florence2 Worker] WebGPU adapter:", adapter ? "available" : "null");
    console.log("[Florence2 Worker] FP16 support:", hasFp16);
    return hasFp16;
  } catch (e) {
    console.error("[Florence2 Worker] WebGPU check failed:", e);
    return false;
  }
}

class Florence2Singleton {
  static model_id = "onnx-community/Florence-2-base-ft";
  static processor: any;
  static tokenizer: any;
  static model: any;
  static supports_fp16: boolean;

  static async getInstance(progress_callback: ((progress: any) => void) | null = null) {
    console.log("[Florence2 Singleton] Getting instance for model:", this.model_id);

    console.log("[Florence2 Singleton] Loading processor...");
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {});

    console.log("[Florence2 Singleton] Loading tokenizer...");
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {});

    console.log("[Florence2 Singleton] Checking FP16 support...");
    this.supports_fp16 ??= await hasFp16();
    console.log("[Florence2 Singleton] FP16 support:", this.supports_fp16);

    console.log("[Florence2 Singleton] Loading main model...");
    console.log("[Florence2 Singleton] Model config:", {
      dtype: {
        embed_tokens: this.supports_fp16 ? "fp16" : "fp32",
        vision_encoder: this.supports_fp16 ? "fp16" : "fp32",
        encoder_model: "q4",
        decoder_model_merged: "q4",
      },
      device: "webgpu",
    });

    this.model ??= Florence2ForConditionalGeneration.from_pretrained(this.model_id, {
      dtype: {
        embed_tokens: this.supports_fp16 ? "fp16" : "fp32",
        vision_encoder: this.supports_fp16 ? "fp16" : "fp32",
        encoder_model: "q4",
        decoder_model_merged: "q4",
      },
      device: "webgpu",
      progress_callback: progress_callback || undefined,
    });

    console.log("[Florence2 Singleton] Awaiting all components...");
    return Promise.all([this.model, this.tokenizer, this.processor]);
  }
}

async function load() {
  try {
    console.log("[Florence2 Worker] Starting model load...");
    self.postMessage({
      status: "loading",
      data: "Loading Florence-2 model...",
    });

    console.log("[Florence2 Worker] Getting singleton instance...");
    const [model, tokenizer, processor] = await Florence2Singleton.getInstance((x: any) => {
      console.log("[Florence2 Worker] Progress:", x);
      self.postMessage(x);
    });

    console.log("[Florence2 Worker] Model loaded, compiling shaders...");
    self.postMessage({
      status: "loading",
      data: "Compiling shaders and warming up model...",
    });

    // Dummy inputs for shader compilation
    console.log("[Florence2 Worker] Creating dummy inputs...");
    const text_inputs = tokenizer("a");
    const pixel_values = full([1, 3, 768, 768], 0.0);

    console.log("[Florence2 Worker] Warming up model...");
    // Warm up model
    await model.generate({
      ...text_inputs,
      pixel_values,
      max_new_tokens: 1,
    });

    console.log("[Florence2 Worker] Model ready!");
    self.postMessage({ status: "ready" });
  } catch (error) {
    console.error("[Florence2 Worker] Load error:", error);
    self.postMessage({
      status: "error",
      data: error instanceof Error ? error.message : String(error),
    });
  }
}

const TASKS_WITH_INPUTS = ["<CAPTION_TO_PHRASE_GROUNDING>"];

let vision_inputs: any;
let image_size: any;

async function run({
  text,
  imageDataUrl,
  task,
}: {
  text?: string;
  imageDataUrl: string;
  task: string;
}) {
  const [model, tokenizer, processor] = await Florence2Singleton.getInstance();

  const start = performance.now();

  // Process image
  if (!vision_inputs || imageDataUrl !== vision_inputs.cached_url) {
    const image = await RawImage.fromURL(imageDataUrl);
    image_size = image.size;
    vision_inputs = await processor(image);
    vision_inputs.cached_url = imageDataUrl; // Cache URL for comparison
  }

  let user_input = task;
  if (TASKS_WITH_INPUTS.includes(task) && text) {
    user_input += text;
  }

  const prompts = processor.construct_prompts(user_input);
  const text_inputs = tokenizer(prompts);

  // Generate text
  const generated_ids = await model.generate({
    ...text_inputs,
    ...vision_inputs,
    max_new_tokens: 128,
    num_beams: 1,
    do_sample: false,
  });

  // Decode generated text
  const generated_text = tokenizer.batch_decode(generated_ids, {
    skip_special_tokens: false,
  })[0];

  // Post-process the generated text
  const result = processor.post_process_generation(generated_text, task, image_size);

  const end = performance.now();

  self.postMessage({
    status: "complete",
    result,
    time: end - start,
    task,
  });
}

// Initialize model on worker startup (like Kokoro)
console.log("[Florence2 Worker] Auto-initializing model...");
load();

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;
  console.log("[Florence2 Worker] Received message:", type, data);

  switch (type) {
    case "load":
      console.log("[Florence2 Worker] Load message received (already loading)");
      // Model is already loading from startup, no need to call load() again
      break;

    case "run":
      console.log("[Florence2 Worker] Run message received");
      run(data);
      break;

    case "reset":
      console.log("[Florence2 Worker] Reset message received");
      vision_inputs = image_size = null;
      break;

    default:
      console.warn("[Florence2 Worker] Unknown message type:", type);
  }
});

export {}; // Make this a module
