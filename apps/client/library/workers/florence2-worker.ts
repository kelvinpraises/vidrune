import {
  Florence2ForConditionalGeneration,
  AutoProcessor,
  AutoTokenizer,
  RawImage,
  full,
} from "@huggingface/transformers";

async function hasFp16(): Promise<boolean> {
  try {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return adapter?.features.has("shader-f16") || false;
  } catch (e) {
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
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {});
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {});

    this.supports_fp16 ??= await hasFp16();
    this.model ??= Florence2ForConditionalGeneration.from_pretrained(
      this.model_id,
      {
        dtype: {
          embed_tokens: this.supports_fp16 ? "fp16" : "fp32",
          vision_encoder: this.supports_fp16 ? "fp16" : "fp32",
          encoder_model: "q4",
          decoder_model_merged: "q4",
        },
        device: "webgpu",
        progress_callback: progress_callback || undefined,
      },
    );

    return Promise.all([this.model, this.tokenizer, this.processor]);
  }
}

async function load() {
  self.postMessage({
    status: "loading",
    data: "Loading Florence-2 model...",
  });

  const [model, tokenizer, processor] = await Florence2Singleton.getInstance(
    (x: any) => {
      self.postMessage(x);
    },
  );

  self.postMessage({
    status: "loading",
    data: "Compiling shaders and warming up model...",
  });

  // Dummy inputs for shader compilation
  const text_inputs = tokenizer("a");
  const pixel_values = full([1, 3, 768, 768], 0.0);

  // Warm up model
  await model.generate({
    ...text_inputs,
    pixel_values,
    max_new_tokens: 1,
  });

  self.postMessage({ status: "ready" });
}

const TASKS_WITH_INPUTS = ["<CAPTION_TO_PHRASE_GROUNDING>"];

let vision_inputs: any;
let image_size: any;

async function run({ text, imageDataUrl, task }: { text?: string; imageDataUrl: string; task: string }) {
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
  const result = processor.post_process_generation(
    generated_text,
    task,
    image_size,
  );

  const end = performance.now();

  self.postMessage({ 
    status: "complete", 
    result, 
    time: end - start,
    task 
  });
}

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case "load":
      load();
      break;

    case "run":
      run(data);
      break;

    case "reset":
      vision_inputs = image_size = null;
      break;
  }
});

export {}; // Make this a module