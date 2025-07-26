import { useCallback, useState, useRef, useEffect } from 'react';
import useCaptureStills from './use-capture-stills';
import { Florence2Service } from '../services/florence2-service';
import { KokoroService } from '../services/kokoro-service';

interface Scene {
  description: string;
  keywords: string[];
}

interface ProcessedScene {
  imageUrl: string;
  timestamp: number;
  caption?: string;
  audioUrl?: string;
  processed: boolean;
}

interface PipelineState {
  viseBin: ProcessedScene[];
  florence2Bin: ProcessedScene[];
  kokoroBin: ProcessedScene[];
  completed: ProcessedScene[];
  currentStage: 'idle' | 'vise' | 'florence2' | 'kokoro' | 'complete';
  progress: number;
  modelsLoaded: {
    florence2: boolean;
    kokoro: boolean;
  };
  error?: string;
}

export const useVideoPipeline = () => {
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    viseBin: [],
    florence2Bin: [],
    kokoroBin: [],
    completed: [],
    currentStage: 'idle',
    progress: 0,
    modelsLoaded: {
      florence2: false,
      kokoro: false
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  
  // WebGPU Services
  const florence2Service = useRef<Florence2Service | null>(null);
  const kokoroService = useRef<KokoroService | null>(null);

  // Initialize WebGPU services
  useEffect(() => {
    // Initialize Florence2 service
    if (!florence2Service.current) {
      florence2Service.current = new Florence2Service();
    }

    // Initialize Kokoro service
    if (!kokoroService.current) {
      kokoroService.current = new KokoroService();
      
      // Wait for Kokoro model to load
      kokoroService.current.waitForModelLoad().then(() => {
        setPipelineState(prev => ({
          ...prev,
          modelsLoaded: { ...prev.modelsLoaded, kokoro: true }
        }));
      }).catch((error) => {
        setPipelineState(prev => ({
          ...prev,
          error: `Kokoro model failed to load: ${error.message}`
        }));
      });
    }

    return () => {
      florence2Service.current?.dispose();
      kokoroService.current?.dispose();
    };
  }, []);

  // VISE Engine (existing capture hooks)
  const {
    videoRef,
    canvasRef,
    sceneRef,
    slicedRef,
    startPolling,
    stopPolling,
    startUploadPolling,
    stopUploadPolling,
    capturedImages,
    capturedScenes,
    processStatus,
    lastEvent
  } = useCaptureStills();

  // Sequential pipeline orchestrator
  const processNextItem = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const currentState = pipelineState;

      // Process VISE bin -> Florence2
      if (currentState.viseBin.length > 0) {
        setPipelineState(prev => ({ ...prev, currentStage: 'florence2' }));
        const scene = currentState.viseBin[0];
        
        if (florence2Service.current && currentState.modelsLoaded.florence2) {
          try {
            const { result } = await florence2Service.current.generateCaption(
              scene.imageUrl,
              '<DETAILED_CAPTION>'
            );
            
            const captionedScene = {
              ...scene,
              caption: result['<DETAILED_CAPTION>'] as string || `Scene at ${scene.timestamp.toFixed(1)}s`,
              processed: true
            };
            
            setPipelineState(prev => ({
              ...prev,
              viseBin: prev.viseBin.slice(1),
              florence2Bin: [...prev.florence2Bin, captionedScene]
            }));
          } catch (error) {
            console.error('Florence2 processing error:', error);
            // Fallback to basic caption
            const captionedScene = {
              ...scene,
              caption: `Scene at ${scene.timestamp.toFixed(1)}s: Video frame`,
              processed: true
            };
            
            setPipelineState(prev => ({
              ...prev,
              viseBin: prev.viseBin.slice(1),
              florence2Bin: [...prev.florence2Bin, captionedScene]
            }));
          }
        }
      }
      // Process Florence2 bin -> Kokoro
      else if (currentState.florence2Bin.length > 0) {
        setPipelineState(prev => ({ ...prev, currentStage: 'kokoro' }));
        const scene = currentState.florence2Bin[0];
        
        if (kokoroService.current && currentState.modelsLoaded.kokoro && scene.caption) {
          try {
            const audioResult = await kokoroService.current.generateAudio(
              scene.caption,
              'af_heart' // Default voice
            );
            
            const audioScene = {
              ...scene,
              audioUrl: audioResult.audio,
              processed: true
            };
            
            setPipelineState(prev => ({
              ...prev,
              florence2Bin: prev.florence2Bin.slice(1),
              kokoroBin: [...prev.kokoroBin, audioScene]
            }));
          } catch (error) {
            console.error('Kokoro processing error:', error);
            // Move to kokoro bin without audio
            setPipelineState(prev => ({
              ...prev,
              florence2Bin: prev.florence2Bin.slice(1),
              kokoroBin: [...prev.kokoroBin, { ...scene, processed: true }]
            }));
          }
        }
      }
      // Process Kokoro bin -> Completed
      else if (currentState.kokoroBin.length > 0) {
        const scene = currentState.kokoroBin[0];
        
        setPipelineState(prev => {
          const newState = {
            ...prev,
            kokoroBin: prev.kokoroBin.slice(1),
            completed: [...prev.completed, scene]
          };
          
          // Check if pipeline is complete
          if (newState.kokoroBin.length === 0 && newState.florence2Bin.length === 0 && newState.viseBin.length === 0) {
            newState.currentStage = 'complete';
          }
          
          // Update progress
          const totalScenes = newState.viseBin.length + newState.florence2Bin.length + newState.kokoroBin.length + newState.completed.length;
          newState.progress = totalScenes > 0 ? (newState.completed.length / totalScenes) * 100 : 0;
          
          return newState;
        });
      } else {
        setPipelineState(prev => ({ ...prev, currentStage: 'idle' }));
      }
    } catch (error) {
      console.error('Pipeline processing error:', error);
      setPipelineState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Pipeline processing failed'
      }));
    }

    processingRef.current = false;
  }, [pipelineState]);

  // Monitor VISE engine output and add to pipeline
  useEffect(() => {
    if (Object.keys(capturedScenes).length > 0) {
      const newScenes = Object.entries(capturedScenes)
        .map(([timestamp, imageUrl]) => ({
          imageUrl,
          timestamp: parseFloat(timestamp),
          processed: false
        }))
        .filter(scene => 
          !pipelineState.viseBin.some(existing => existing.imageUrl === scene.imageUrl) &&
          !pipelineState.completed.some(existing => existing.imageUrl === scene.imageUrl)
        );

      if (newScenes.length > 0) {
        setPipelineState(prev => ({
          ...prev,
          viseBin: [...prev.viseBin, ...newScenes]
        }));
      }
    }
  }, [capturedScenes, pipelineState.viseBin, pipelineState.completed]);

  // Auto-process pipeline when items are available
  useEffect(() => {
    if (isProcessing && !processingRef.current) {
      const timer = setInterval(processNextItem, 500); // Process every 500ms
      return () => clearInterval(timer);
    }
  }, [isProcessing, processNextItem]);

  const startPipeline = useCallback(async () => {
    setIsProcessing(true);
    setPipelineState(prev => ({ ...prev, currentStage: 'vise', error: undefined }));
    
    // Load Florence2 model if not already loaded
    if (florence2Service.current && !pipelineState.modelsLoaded.florence2) {
      try {
        await florence2Service.current.loadModel(
          (progress) => {
            // Handle loading progress
            console.log('Florence2 loading progress:', progress);
          },
          (message) => {
            console.log('Florence2 loading message:', message);
          }
        );
        
        setPipelineState(prev => ({
          ...prev,
          modelsLoaded: { ...prev.modelsLoaded, florence2: true }
        }));
      } catch (error) {
        setPipelineState(prev => ({
          ...prev,
          error: `Florence2 model failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`
        }));
        setIsProcessing(false);
        return;
      }
    }
    
    startPolling();
    startUploadPolling();
  }, [startPolling, startUploadPolling, pipelineState.modelsLoaded.florence2]);

  const stopPipeline = useCallback(() => {
    setIsProcessing(false);
    stopPolling();
    stopUploadPolling();
    setPipelineState(prev => ({ ...prev, currentStage: 'idle' }));
  }, [stopPolling, stopUploadPolling]);

  const generateSRTFile = useCallback(() => {
    const srtContent = pipelineState.completed
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((scene, index) => {
        const start = formatSRTTime(scene.timestamp);
        const end = formatSRTTime(scene.timestamp + 3); // 3 second duration
        return `${index + 1}\n${start} --> ${end}\n${scene.caption || 'Scene description'}\n`;
      })
      .join('\n');

    const blob = new Blob([srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    return url;
  }, [pipelineState.completed]);

  const generateMetadata = useCallback(() => {
    const metadata = {
      id: `video_${Date.now()}`,
      title: 'Processed Video',
      uploadedBy: 'User',
      description: 'Video processed through local pipeline',
      capturedImages: pipelineState.completed.map(scene => scene.imageUrl),
      cover: pipelineState.completed[0]?.imageUrl || '',
      summary: `Video with ${pipelineState.completed.length} processed scenes`,
      scenes: pipelineState.completed.map(scene => ({
        description: scene.caption || 'Scene description',
        keywords: ['video', 'scene', 'processed']
      }))
    };

    return metadata;
  }, [pipelineState.completed]);

  return {
    // VISE engine refs
    videoRef,
    canvasRef,
    sceneRef,
    slicedRef,
    
    // Pipeline state
    pipelineState,
    isProcessing,
    
    // Pipeline controls
    startPipeline,
    stopPipeline,
    
    // File generation
    generateSRTFile,
    generateMetadata,
    
    // VISE engine status
    viseStatus: processStatus,
    viseEvent: lastEvent
  };
};

// Helper functions

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}