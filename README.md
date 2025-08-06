# Vidrune

Video indexing platform with browser-based AI processing using Transformers.js and cross-platform desktop binaries via Cordova.

## Project Structure

```
vidrune/
├── apps/
│   ├── client/           # Vite + TanStack Router web application
│   │   ├── src/
│   │   │   ├── components/  # UI components (atoms, molecules, organisms)
│   │   │   ├── hooks/       # React hooks for video processing
│   │   │   ├── services/    # AI model services
│   │   │   ├── workers/     # Web workers (gemma3n, kokoro)
│   │   │   └── app/         # TanStack Router pages
│   │   └── public/          # Static assets
│   ├── cordova/          # Cross-platform desktop binaries
│   │   ├── platforms/    # Electron platform build
│   │   ├── www/          # Compiled web assets
│   │   └── scripts/      # Build automation
│   └── server/           # Python spaCy search server
│       ├── src/          # Search engine implementation
│       └── tests/        # Test suite
└── scripts/              # Deployment automation
```

## Architecture

### AI Processing Pipeline
```
Video Upload -> VISE Engine -> Gemma3n CPU -> Kokoro WebGPU -> Complete
                    ↓              ↓                ↓
                Frame Capture   Content Analysis    TTS Audio
```

**Processing Pipeline**: Video Upload -> Frame Extraction -> Content Analysis -> Audio Synthesis -> Searchable Index

## Key Features

### 🤖 Browser-Native AI with Transformers.js
- **Gemma3n**: E2B parameter model for enhanced content understanding and summarization (CPU-based due to size)
- **Kokoro Text-to-Speech**: 82M parameter model for audio synthesis from captions
- **VISE Engine**: Frame extraction and video processing
- **WebGPU Acceleration**: High-performance inference for Kokoro with automatic WASM fallback
- **Web Workers**: Non-blocking AI processing in dedicated threads
- **Offline Capable**: All AI models run entirely in the browser

### 📱 Cross-Platform Desktop Binaries with Cordova
- **Electron Desktop**: Native desktop applications for Windows, macOS, Linux
- **Automated Builds**: Vite compilation with automatic asset copying to Cordova
- **Self-Contained Binaries**: Pre-compiled models and assets included
- **Native Integration**: Platform-specific features through Cordova plugins
- **Offline First**: Complete functionality without internet connection

### 🔍 Advanced Search
- **Python spaCy Server**: NLP-powered search with semantic understanding
- **Lazy Indexing**: On-demand video content indexing
- **REST API**: FastAPI server with comprehensive search endpoints
- **Test Coverage**: Full test suite with pytest

## Technology Stack

- **Frontend**: Vite, TanStack Router, React, TypeScript, Tailwind CSS
- **AI**: Transformers.js, WebGPU, ONNX Runtime, Web Workers
- **Search**: Python, spaCy, FastAPI, NLP processing
- **Desktop**: Cordova, Electron
- **Build**: Vite, Node.js automation scripts

## Development

### Setup
```bash
cd apps/client
npm install
npm run dev
```

### Build Desktop Binaries
```bash
cd apps/cordova
npm install
npm run build-vite-and-copy  # Compiles web app and copies to Cordova
cordova build electron        # Creates desktop executables
```

### Run Search Server
```bash
cd apps/server
pip install -r requirements.txt
python -m pytest              # Run tests
python api/index.py           # Start server
```

## AI Models Integration

All AI processing uses Transformers.js with WebGPU acceleration:

- **Gemma3n Worker** (`gemma3n-worker.ts`): Video content analysis and summarization
- **Kokoro Worker** (`kokoro-worker.ts`): Text-to-speech synthesis for accessibility
- **VISE Integration**: Frame extraction and video processing pipeline
- **WebGPU Detection**: Hardware acceleration for Kokoro, CPU processing for Gemma3n
- **Model Caching**: Persistent local storage for faster subsequent loads

Desktop binaries created with Cordova include pre-loaded models for instant startup and full offline functionality.