import { useCallback, useState } from 'react';
import type { CaptionProcessingResult } from './use-local-caption-processing';
import type { AudioProcessingResult } from './use-local-audio-processing';

export interface ReplitAPIConfig {
  baseUrl: string;
  apiKey?: string;
}

export const useReplitAPI = (config?: ReplitAPIConfig) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default config - TODO: Update with actual Replit API endpoints
  const defaultConfig: ReplitAPIConfig = {
    baseUrl: process.env.NEXT_PUBLIC_REPLIT_API_BASE_URL || 'https://your-replit-api.repl.co',
    apiKey: process.env.NEXT_PUBLIC_REPLIT_API_KEY
  };

  const apiConfig = { ...defaultConfig, ...config };

  const processAudioWithAPI = useCallback(async (
    audioFile: File | Blob,
    options?: { language?: string; model?: string }
  ): Promise<AudioProcessingResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      if (options?.language) {
        formData.append('language', options.language);
      }
      
      if (options?.model) {
        formData.append('model', options.model);
      }

      const response = await fetch(`${apiConfig.baseUrl}/api/audio/transcribe`, {
        method: 'POST',
        headers: {
          ...(apiConfig.apiKey && { 'Authorization': `Bearer ${apiConfig.apiKey}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response to our expected format
      const result: AudioProcessingResult = {
        transcript: data.transcript || data.text || '',
        segments: data.segments || [],
        duration: data.duration || 0,
        sampleRate: data.sample_rate || 44100,
        language: data.language || options?.language || 'en'
      };

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Replit API audio processing failed: ${errorMessage}`);
      console.error('Replit API Error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [apiConfig]);

  const processCaptionsWithAPI = useCallback(async (
    videoFile: File,
    options?: { language?: string; model?: string }
  ): Promise<CaptionProcessingResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      
      if (options?.language) {
        formData.append('language', options.language);
      }
      
      if (options?.model) {
        formData.append('model', options.model);
      }

      const response = await fetch(`${apiConfig.baseUrl}/api/video/captions`, {
        method: 'POST',
        headers: {
          ...(apiConfig.apiKey && { 'Authorization': `Bearer ${apiConfig.apiKey}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response to our expected format
      const result: CaptionProcessingResult = {
        segments: data.segments || [],
        language: data.language || options?.language || 'en',
        duration: data.duration || 0
      };

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Replit API caption processing failed: ${errorMessage}`);
      console.error('Replit API Error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [apiConfig]);

  const processVideoWithAPI = useCallback(async (
    videoFile: File,
    options?: { 
      language?: string; 
      audioModel?: string; 
      captionModel?: string;
      includeAudio?: boolean;
      includeCaptions?: boolean;
    }
  ): Promise<{
    audio?: AudioProcessingResult;
    captions?: CaptionProcessingResult;
  } | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const results: {
        audio?: AudioProcessingResult;
        captions?: CaptionProcessingResult;
      } = {};

      // Process audio if requested
      if (options?.includeAudio !== false) {
        const audioResult = await processAudioWithAPI(videoFile, {
          language: options?.language,
          model: options?.audioModel
        });
        if (audioResult) {
          results.audio = audioResult;
        }
      }

      // Process captions if requested
      if (options?.includeCaptions !== false) {
        const captionResult = await processCaptionsWithAPI(videoFile, {
          language: options?.language,
          model: options?.captionModel
        });
        if (captionResult) {
          results.captions = captionResult;
        }
      }

      return Object.keys(results).length > 0 ? results : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Replit API video processing failed: ${errorMessage}`);
      console.error('Replit API Error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [processAudioWithAPI, processCaptionsWithAPI]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          ...(apiConfig.apiKey && { 'Authorization': `Bearer ${apiConfig.apiKey}` }),
        },
      });
      
      return response.ok;
    } catch (err) {
      console.error('Replit API connection test failed:', err);
      return false;
    }
  }, [apiConfig]);

  return {
    processAudioWithAPI,
    processCaptionsWithAPI,
    processVideoWithAPI,
    testConnection,
    isProcessing,
    error,
    config: apiConfig
  };
};