# Vidrune

Simplified video indexing platform with WebGPU-accelerated AI processing.

## Recent Updates: WebGPU AI Integration

Added real-time AI processing using WebGPU for browser-native performance:

- **Florence2 Vision Model**: 230M parameter model for scene captioning with WebGPU acceleration
- **Kokoro Text-to-Speech**: 82M parameter model for audio synthesis from captions  
- **Smart Fallbacks**: Automatic WebGPU to WASM fallback for broader device support
- **Real-time Processing**: VISE to Florence2 to Kokoro pipeline with live status updates

## Architecture Overview

```
Video Upload -> VISE Engine -> Florence2 WebGPU -> Kokoro WebGPU -> Complete
                    ↓              ↓                  ↓
                Frame Capture   AI Captions      TTS Audio
```

**Processing Pipeline**: Video Upload -> Frame Extraction -> AI Captions -> Audio Synthesis -> Searchable Index

Models run entirely in the browser using Transformers.js - no server calls required after initial load.