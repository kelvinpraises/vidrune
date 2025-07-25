import { useCallback, useState, useRef, useEffect } from 'react';
import useCaptureStills from './use-capture-stills';

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
}

export const useVideoPipeline = () => {
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    viseBin: [],
    florence2Bin: [],
    kokoroBin: [],
    completed: [],
    currentStage: 'idle',
    progress: 0
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

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

    setPipelineState(prev => {
      const newState = { ...prev };

      // Process VISE bin -> Florence2
      if (newState.viseBin.length > 0) {
        newState.currentStage = 'florence2';
        const scene = newState.viseBin.shift()!;
        
        // Florence2 processor body (placeholder)
        const captionedScene = {
          ...scene,
          caption: `Scene at ${scene.timestamp.toFixed(1)}s: A video frame showing visual content`,
          processed: true
        };
        
        newState.florence2Bin.push(captionedScene);
      }
      // Process Florence2 bin -> Kokoro
      else if (newState.florence2Bin.length > 0) {
        newState.currentStage = 'kokoro';
        const scene = newState.florence2Bin.shift()!;
        
        // Kokoro processor body (placeholder)
        const audioScene = {
          ...scene,
          audioUrl: `data:audio/wav;base64,${generateMockAudio()}`,
          processed: true
        };
        
        newState.kokoroBin.push(audioScene);
      }
      // Process Kokoro bin -> Completed
      else if (newState.kokoroBin.length > 0) {
        const scene = newState.kokoroBin.shift()!;
        newState.completed.push(scene);
        
        if (newState.kokoroBin.length === 0 && newState.florence2Bin.length === 0 && newState.viseBin.length === 0) {
          newState.currentStage = 'complete';
        }
      } else {
        newState.currentStage = 'idle';
      }

      // Update progress
      const totalScenes = newState.viseBin.length + newState.florence2Bin.length + newState.kokoroBin.length + newState.completed.length;
      newState.progress = totalScenes > 0 ? (newState.completed.length / totalScenes) * 100 : 0;

      return newState;
    });

    processingRef.current = false;
  }, []);

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

  const startPipeline = useCallback(() => {
    setIsProcessing(true);
    setPipelineState(prev => ({ ...prev, currentStage: 'vise' }));
    startPolling();
    startUploadPolling();
  }, [startPolling, startUploadPolling]);

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
function generateMockAudio(): string {
  // Generate a simple base64 audio placeholder
  return 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMaADB...';
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}