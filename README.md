# Vidrune

Video indexing platform with conviction-based quality control and prediction markets. Videos are processed client-side using browser-native AI, then verified through a community-driven conviction system.

---

## How It Works

### 1. Video Upload & Processing

Videos are processed entirely in the browser using local AI models to extract metadata, generate captions, and create summaries before being securely stored.

### 2. Community Verification

A challenge period allows the community to flag issues (e.g., incorrect tags). Users can stake credits to submit convictions, ensuring high-quality data.

### 3. Prediction Markets

Contested videos trigger prediction markets where users trade on the validity of the challenge. This effectively crowdsources truth and moderation.

### 4. AI-Assisted Resolution

Markets are resolved using advanced AI models that analyze the video content and evidence to determine the outcome, rewarding correct participants.

---

## Key Features

### Browser-Native AI

- **VISE**: Our Video Indexing and Sequencing Engine using canvas to extract frames.
- **Florence-2**: Vision-language model for scene understanding.
- **Kokoro TTS**: High-quality text-to-speech synthesis.
- **Privacy-First**: All AI models run locally in the browser via WebGPU.

### Conviction System

- **Seeding Markets**: Validated convictions seed the prediction markets.
- **Incentivized Moderation**: Stake-to-challenge mechanism prevents spam.
- **Transparent Resolution**: Evidence-based dispute resolution.

### Prediction Markets

- **Dynamic Trading**: Real-time trading on content accuracy.
- **Proportional Rewards**: Winners share the pool based on their position size.

### Advanced Search

- **Semantic Search**: NLP-powered search to find specific moments in videos.
- **Lazy Indexing**: Efficient on-demand content processing.

---

## Technology Stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS
- **AI**: Transformers.js, WebGPU, ONNX Runtime
- **Backend**: Python, FastAPI (Search & Indexing)
- **Storage**: Distributed Cloud Storage

## License

MIT
