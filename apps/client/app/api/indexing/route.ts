import Anthropic from "@anthropic-ai/sdk";
import { ImageBlockParam } from "@anthropic-ai/sdk/resources/index.mjs";
import { Livepeer } from "@livepeer/ai";
import ky from "ky";
import { type NextRequest, NextResponse } from "next/server";

import { db as dbInstance } from "@/db";
import { icStorage } from "@/library/services/ic-storage";
import initVideoSearchEngine from "@/library/utils/videarch";

// TODO: Replace with IC-specific metadata structure
type ICVideoMetadata = {
  title: string;
  uploadedBy: string;
  description: string;
};

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const videoCID = formData.getAll("videoCID");
    const capturedImages = formData.getAll("capturedImages");
    const extractedAudio = formData.get("extractedAudio") as Blob | null;

    if (!videoCID || videoCID.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty videoCID array" },
        { status: 400 }
      );
    }

    if (!extractedAudio || !(extractedAudio instanceof File)) {
      return NextResponse.json(
        { error: "Invalid or missing audio data" },
        { status: 400 }
      );
    }

    if (!Array.isArray(capturedImages) || capturedImages.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty imageCID array" },
        { status: 400 }
      );
    }

    const livepeer = new Livepeer({
      httpBearer: "c98baf31-5203-4b42-9b50-578a16342201",
    });

    const anthropic = new Anthropic();

    // TODO: Replace with IC storage metadata retrieval
    // For now, using placeholder metadata structure
    const videoMetadata: ICVideoMetadata = {
      title: "IC Video", // TODO: Get from IC storage metadata
      uploadedBy: "IC User", // TODO: Get from IC storage metadata 
      description: "Video stored on Internet Computer", // TODO: Get from IC storage metadata
    };

    // Handle audio transcription with error fallback
    let audioTranscription = "";
    try {
      const result = await livepeer.generate.audioToText({
        audio: extractedAudio,
        modelId: "openai/whisper-large-v3",
      });
      audioTranscription = result.textResponse?.text || "";
    } catch (audioError) {
      console.error("Audio transcription failed:", audioError);
      // Continue with empty transcription rather than failing the whole process
    }

    const imageContents: ImageBlockParam[] = (
      await Promise.all(
        capturedImages.map(async (imageCID) => {
          if (typeof imageCID !== "string") {
            console.log(`Skipping non-string image: ${imageCID}`);
            return null;
          }

          try {
            const url = icStorage.getVideoUrl(`/videos/${imageCID}`);
            const response = await ky.get(url);
            const data = await response.blob();
            const contentType = response.headers.get("content-type");

            if (
              !contentType ||
              !SUPPORTED_IMAGE_TYPES.includes(contentType as SupportedImageType)
            ) {
              console.log(
                `Skipping unsupported content type for image: ${imageCID}`
              );
              return null;
            }

            const arrayBuffer = await data.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString("base64");

            return {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType as SupportedImageType,
                data: base64Data,
              },
            };
          } catch (error) {
            console.error("Error fetching image:", error);
            return null;
          }
        })
      )
    ).filter((content): content is ImageBlockParam => content !== null);

    if (imageContents.length === 0) {
      return NextResponse.json(
        { error: "No valid image content found" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      tool_choice: { type: "tool", name: "analyze_media_context" },
      tools: [
        {
          name: "analyze_media_context",
          description:
            "Analyze images and audio from the current context and provide structured analysis",
          input_schema: {
            type: "object",
            properties: {
              cover: {
                type: "string",
                description:
                  "Choose a imageCID that that best represents a cover image among the provided images to imageCID mapping",
              },
              summary: {
                type: "string",
                description:
                  "Overall summary of the media content and their relationship",
              },
              scenes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    keywords: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                      description:
                        "Key terms or concepts identified in the image",
                    },
                    description: {
                      type: "string",
                      description:
                        "Detailed description of the image incorporating relevant audio context",
                    },
                  },
                  required: ["keywords", "description"],
                },
              },
            },
            required: ["cover", "summary", "scenes"],
          },
        },
      ],
      max_tokens: 4096,
      system:
        "You are an AI assistant tasked with creating concise, visually impaired-friendly descriptions for a series of video stills, considering both the visual content and associated audio context.",
      messages: [
        {
          role: "user",
          content: [
            ...imageContents,
            {
              type: "text",
              text: `Audio transcription: "${audioTranscription}"

                User provided title: ${videoMetadata.title}
                User provided description: ${videoMetadata.description}

                Analyze each image sequentially, considering both the visual content and the provided audio transcription. Create a brief, one-sentence description for each image that summarizes the key visual aspects and incorporates relevant audio context.

                Provide your output as a JSON array of strings, with each string being a concise description of one image. Describe directly without using phrases like 'this image shows'. Ensure your descriptions are clear, specific, and accessible to visually impaired individuals, integrating audio context where relevant.

                Note the instructions when returning the cover image each image above sequentially maps to the imageCIDs below.

                ${capturedImages
                  .map((imageCID, index) => `Image ${index + 1}: ${imageCID}`)
                  .join("\n")}

                Ensure to follow the input schema especially the scenes must be an array containing the keywords and description don't ever ever miss the schema
              `,
            },
          ],
        },
      ],
    });

    console.log(message);

    const toolUseContent = message.content.find(
      (item) => item.type === "tool_use"
    );

    if (toolUseContent && "input" in toolUseContent) {
      const data = {
        id: videoCID[0],
        title: videoMetadata.title,
        uploadedBy: videoMetadata.uploadedBy,
        description: videoMetadata.description,
        capturedImages,
        ...(typeof toolUseContent.input === "object"
          ? JSON.parse(JSON.stringify(toolUseContent.input))
          : {}),
      };

      console.log(data);

      const db = dbInstance();
      const searchEngine = await initVideoSearchEngine(db);
      await searchEngine.indexVideo(data);

      // TODO: Store index data in IC storage if needed
      // For now, returning the video CID as indexCID
      return NextResponse.json({ indexCID: videoCID[0] }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "No valid index data generated" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error processing video for indexing:", error);
    return NextResponse.json(
      { error: "Error processing video for indexing" },
      { status: 500 }
    );
  }
}
