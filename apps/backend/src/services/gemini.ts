/**
 * Gemini AI Service
 *
 * Implements AI operations with 10-key cycling and tool calling for:
 * - Conviction clustering
 * - Market resolution
 */

import { GoogleGenerativeAI, SchemaType, Part } from "@google/generative-ai";
import { Conviction, MarketGroup, MarketResolution } from "../types";

interface VideoManifest {
  version: string;
  videoId: string;
  title: string;
  description: string;
  uploadedBy: string;
  uploadTime: number;
  summary?: string;
  assets: {
    video: string;
    captions: string;
    scenes: string[];
    audio: string;
  };
  scenes?: Array<{
    description: string;
    keywords: string[];
  }>;
  searchableContent?: {
    transcription: string;
    sceneDescriptions: string;
    ttsContent: string;
  };
  metadata?: {
    duration: number;
    sceneCount: number;
    totalSize: number;
    processing: {
      captionModel: string;
      sceneDetection: string;
      ttsModel: string;
    };
  };
}

interface ExtractedVideoData {
  manifest: VideoManifest;
  sceneImages: Array<{ data: string; mimeType: string }>;
  captions: string;
}

/**
 * Get Walrus aggregator URL for a blob ID
 */
function getWalrusUrl(blobId: string): string {
  const aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 
    "https://aggregator.walrus-testnet.walrus.space";
  return `${aggregatorUrl}/v1/blobs/${blobId}`;
}

/**
 * Fetch and extract video package from Walrus (new chunked format)
 */
async function extractVideoPackage(manifestUrl: string): Promise<ExtractedVideoData> {
  // Fetch manifest JSON directly (no longer a ZIP)
  const manifestResponse = await fetch(manifestUrl);
  if (!manifestResponse.ok) {
    throw new Error(`Failed to fetch manifest: ${manifestResponse.status} ${manifestResponse.statusText}`);
  }

  const manifest = await manifestResponse.json() as VideoManifest;

  // Fetch captions
  let captions = "";
  if (manifest.assets.captions) {
    try {
      const captionsUrl = getWalrusUrl(manifest.assets.captions);
      const captionsResponse = await fetch(captionsUrl);
      if (captionsResponse.ok) {
        captions = await captionsResponse.text();
      }
    } catch (error) {
      console.warn("Failed to fetch captions:", error);
    }
  }

  // Fetch scene images as base64
  const sceneImages: Array<{ data: string; mimeType: string }> = [];
  for (const sceneBlobId of manifest.assets.scenes || []) {
    try {
      const sceneUrl = getWalrusUrl(sceneBlobId);
      const sceneResponse = await fetch(sceneUrl);
      if (sceneResponse.ok) {
        const arrayBuffer = await sceneResponse.arrayBuffer();
        sceneImages.push({
          data: Buffer.from(arrayBuffer).toString("base64"),
          mimeType: "image/png",
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch scene ${sceneBlobId}:`, error);
    }
  }

  return { manifest, sceneImages, captions };
}

export class GeminiService {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private model: string = "gemini-2.0-flash-exp";
  private temperature: number = 0.3;
  private isConfigured: boolean = false;

  constructor() {
    // Load all 10 API keys from environment
    this.apiKeys = [];
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_KEY_${i}`];
      if (key) {
        this.apiKeys.push(key);
      }
    }

    if (this.apiKeys.length === 0) {
      console.warn("⚠️  No Gemini API keys found - AI features will be disabled");
      console.warn(
        "   Set GEMINI_KEY_1 through GEMINI_KEY_10 in .env to enable AI market resolution"
      );
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      this.model = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
      console.log(
        `✅ GeminiService initialized with ${this.apiKeys.length} API keys, using model: ${this.model}`
      );
    }
  }

  /**
   * Check if service is configured
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error(
        "GeminiService is not configured. Please set GEMINI_KEY_1 through GEMINI_KEY_10 in environment variables."
      );
    }
  }

  /**
   * Get the next API key in rotation
   */
  private getNextKey(): string {
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  /**
   * Execute a Gemini API call with automatic key rotation on rate limit errors
   */
  private async executeWithRetry<T>(
    operation: (genAI: GoogleGenerativeAI) => Promise<T>,
    maxRetries: number = this.apiKeys.length
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.getNextKey();
      const genAI = new GoogleGenerativeAI(apiKey);

      try {
        return await operation(genAI);
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        const isRateLimit =
          error.message?.includes("429") ||
          error.message?.includes("quota") ||
          error.message?.includes("rate limit");

        if (isRateLimit && attempt < maxRetries - 1) {
          console.warn(`Rate limit hit on key ${attempt + 1}, trying next key...`);
          continue;
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error("All API keys exhausted");
  }

  /**
   * Cluster convictions into market groups using tool calling
   */
  async clusterConvictions(convictions: Conviction[]): Promise<MarketGroup[]> {
    this.ensureConfigured();

    if (convictions.length === 0) {
      return [];
    }

    const clusteringTool = {
      functionDeclarations: [
        {
          name: "cluster_convictions",
          description:
            "Cluster related convictions into market groups. Each group should contain convictions that can be answered by the same prediction market question.",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              groups: {
                type: SchemaType.ARRAY,
                description: "Array of market groups",
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    convictionIds: {
                      type: SchemaType.ARRAY,
                      description: "Array of conviction IDs in this group",
                      items: { type: SchemaType.STRING },
                    },
                    question: {
                      type: SchemaType.STRING,
                      description:
                        "A clear, binary prediction market question that covers all convictions in this group",
                    },
                  },
                  required: ["convictionIds", "question"],
                },
              },
            },
            required: ["groups"],
          },
        },
      ],
    };

    const prompt = `Analyze these convictions and cluster them into prediction market groups. Each group should contain related convictions that can be verified by the same binary question.

Convictions:
${convictions.map((c) => `ID: ${c.id}\nFact: ${c.fact}\nProof: ${c.proof}\n`).join("\n")}

Create groups where:
1. All convictions in a group can be answered by the same yes/no question
2. The question is specific and verifiable
3. Each conviction appears in exactly one group
4. Questions are clear and unambiguous

Use the cluster_convictions tool to return the grouped results.`;

    return this.executeWithRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: this.temperature,
        },
        tools: [clusteringTool],
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      // Extract tool call from response
      const functionCall = response.functionCalls()?.[0];

      if (!functionCall || functionCall.name !== "cluster_convictions") {
        throw new Error("Model did not return expected clustering tool call");
      }

      const groups = (functionCall.args as any).groups as MarketGroup[];

      // Validate that all conviction IDs are accounted for
      const allIds = new Set(convictions.map((c) => c.id));
      const groupedIds = new Set(groups.flatMap((g) => g.convictionIds));

      if (allIds.size !== groupedIds.size) {
        console.warn("Warning: Some convictions were not grouped properly");
      }

      return groups;
    });
  }

  /**
   * Resolve a market by analyzing video content against a conviction
   */
  async resolveMarket(
    videoUrl: string,
    conviction: string,
    proof: string
  ): Promise<MarketResolution> {
    this.ensureConfigured();

    // Extract video package (scenes, captions, metadata)
    console.log(`Extracting video package from: ${videoUrl}`);
    const { manifest, sceneImages, captions } = await extractVideoPackage(videoUrl);
    console.log(`Extracted ${sceneImages.length} scene images, captions: ${captions.length} chars`);

    const resolutionTool = {
      functionDeclarations: [
        {
          name: "resolve_market",
          description:
            "Resolve a prediction market by analyzing video evidence and determining if the conviction is true or false",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              verdict: {
                type: SchemaType.BOOLEAN,
                description:
                  "True if the conviction is supported by the video evidence, false otherwise",
              },
              reasoning: {
                type: SchemaType.STRING,
                description: "Detailed explanation of the verdict based on video analysis",
              },
            },
            required: ["verdict", "reasoning"],
          },
        },
      ],
    };

    // Build context from manifest
    const sceneDescriptions = manifest.scenes
      ?.map((s, i) => `Scene ${i + 1}: ${s.description} [Keywords: ${s.keywords.join(", ")}]`)
      .join("\n") || "No scene descriptions available";

    const prompt = `Analyze this video content to determine if the following conviction is true.

CONVICTION TO VERIFY: ${conviction}
PROOF CONTEXT: ${proof}

VIDEO METADATA:
- Title: ${manifest.title}
- Description: ${manifest.description}
- Summary: ${manifest.summary || "No summary available"}

SCENE DESCRIPTIONS:
${sceneDescriptions}

TRANSCRIPTION:
${manifest.searchableContent?.transcription || captions || "No transcription available"}

I'm providing ${sceneImages.length} scene images from the video. Analyze them along with the metadata above.

Determine:
1. Does the video content support or refute the conviction?
2. Is there clear visual or textual evidence?
3. What specific details support your conclusion?

Use the resolve_market tool to return your verdict (true/false) and detailed reasoning.`;

    return this.executeWithRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: this.temperature,
        },
        tools: [resolutionTool],
      });

      // Build content parts: images first, then prompt
      const parts: Part[] = [
        ...sceneImages.map((img) => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        })),
        { text: prompt },
      ];

      const result = await model.generateContent(parts);
      const response = result.response;

      // Extract tool call from response
      const functionCall = response.functionCalls()?.[0];

      if (!functionCall || functionCall.name !== "resolve_market") {
        throw new Error("Model did not return expected resolution tool call");
      }

      return {
        verdict: (functionCall.args as any).verdict as boolean,
        reasoning: (functionCall.args as any).reasoning as string,
      };
    });
  }

  /**
   * Get current key rotation status (for debugging)
   */
  getStatus() {
    return {
      totalKeys: this.apiKeys.length,
      currentKeyIndex: this.currentKeyIndex,
      model: this.model,
      temperature: this.temperature,
    };
  }
}
