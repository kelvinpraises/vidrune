# Vidrune

Video indexing platform with conviction-based quality control and prediction markets. Videos are processed client-side using browser-native AI, then challenged through a trustless conviction system powered by SUI blockchain and TEE-based resolution.

---

## 🎬 Complete Flow: Video Indexing → Conviction → Market → Trading → Resolution

### **STEP 1: Video Upload (Indexer)**

#### Actions:

```
Indexer uploads video
  ↓
Browser processes:
  - Extract audio → Transcription
  - Generate captions
  - Capture scene images
  - Create TTS summary
  ↓
Package uploaded to Walrus
  ↓
Indexer → SUI: submit_index()
  ↓
VideoIndex created on-chain:
{
  id: "vid_123"
  walrus_blob_id: "abc..."
  indexer: "0x..."
  upload_time: now
  conviction_period_end: now + 30min
  status: "pending"
}
```

#### Economics:

- **Indexer pays:** Gas fees only (no stake)

#### UI (on /console):

```
┌─────────────────────────────────────────
│ ✅ VIDEO INDEXED
├─────────────────────────────────────────
│ Video: "Bitcoin Explained"
│ Status: ⏰ Conviction Period (29m left)
│
│ 📊 Processing Complete:
│   • Transcription: ✓
│   • Scenes: 24 captured
│   • TTS Summary: ✓
│   • Walrus Upload: ✓
│
│ 🔍 Challenge Window:
│   Anyone can submit convictions for
│   the next 29 minutes
└─────────────────────────────────────────
```

---

### **STEP 2: Conviction Period (Challengers)**

#### Actions:

```
Challenger browses /explore
  ↓
Spots issue: "Tags are incomplete"
  ↓
Clicks [Challenge Index]
  ↓
ConvictionDialog opens:
  - Fact: "Tags are incomplete"
  - Proof: "Video mentions 'blockchain' 50x but tag missing"
  - Stake: 0.5 ROHR
  ↓
Challenger → SUI: submit_conviction()
  - Video in conviction period?
  - Wallet has 0.5 ROHR?
  ↓
Conviction recorded on-chain:
{
  id: "conv_1"
  video_id: "vid_123"
  challenger: "0x742..."
  fact: "Tags are incomplete"
  proof_walrus_blob_id: "xyz..." (stored on Walrus)
  stake_amount: 0.5 ROHR (locked)
  created_at: now
}
```

#### Economics:

- **Challenger pays:** 0.5 ROHR stake (locked until market resolves)
- **Potential outcome:**
  - **If YES wins:** Get stake back + share of total pool (2-5x return)
  - **If NO wins:** Lose entire stake (goes to NO holders)

#### UI (Global Activity Feed on homepage):

```
┌─────────────────────────────────────────
│ 🔴 LIVE ACTIVITY
├─────────────────────────────────────────
│ 1m ago
│ 👤 0x742...abc staked 0.5 ROHR
│ 📹 "Bitcoin Explained"
│ 💭 "Tags are incomplete"
│ 📄 Proof: "Missing 'blockchain' tag..."
│
│ [View Full Conviction]
└─────────────────────────────────────────
```

---

### **STEP 3: Market Creation (Client Poller → TEE)**

#### Actions:

```
Client polls TEE every 1 minute
  ↓
Client → TEE: POST /api/markets/check-and-create
  ↓
TEE processes:
  0. Finds videos past conviction period
     → {
         video_id: "vid_123",
         convictions: [conv_1, conv_2, conv_3]
       }

  1. Groups similar convictions
     → All 3 about "incomplete tags"

  2. Generates question
     → "Are the tags incomplete?"

  3. Calculates pools
     challenger_stakes: [0.5, 0.3, 0.2] = 1.0 ROHR
     YES pool: 1.0 ROHR
     NO pool: 0.1 ROHR (10% of YES, from protocol treasury)

  4. Builds Move transaction

  5. Signs with TEE keypair

  6. Submits to SUI: create_market()
  ↓
Smart contract executes:
  1. Create PredictionMarket object
  2. Initialize pools (1.0 YES, 0.1 NO)
  3. Auto-mint Position NFTs:
     - 0.5 YES shares → Challenger A (0x742...)
     - 0.3 YES shares → Challenger B (0xabc...)
     - 0.2 YES shares → Challenger C (0xdef...)
  4. Set end_time = now + 48 hours
  5. Share market object
```

#### Economics:

- **Total pool:** 1.1 ROHR (1.0 from challengers + 0.1 protocol seed on NO side)
- **Challengers:** Already hold YES shares (their stakes converted)

#### UI (Homepage - New Market Card):

```
┌─────────────────────────────────────────
│ 🎯 NEW MARKET
├─────────────────────────────────────────
│ Video: "Bitcoin Explained"
│ Question: "Are the tags incomplete?"
│
│ Initial Pool: 1.1 ROHR
│   📈 YES: 91% (1.0 ROHR)
│   📉 NO: 9% (0.1 ROHR)
│
│ ⏰ Ends in: 48 hours
│
│ 💡 Arbitrage Alert!
│ "9% NO seems mispriced - investigate!"
│
│ [View Details] [Trade Now]
└─────────────────────────────────────────
```

---

### **STEP 4: Trading Phase (Traders)**

#### Actions:

```
Trader sees market
  ↓
Watches video + reads conviction proofs
  ↓
Decides: "Tags ARE incomplete, YES is right"
  ↓
Buys 2 ROHR of YES shares
  ↓
Client → SUI: buy_position()
  {
    market_id: "market_123",
    is_yes: true,
    amount: 2.0 ROHR
  }
  ↓
Receive YES shares proportional to pool state
```

#### Economics (Simplified):

- Trader buys 2 ROHR of YES
- Receives YES shares
- New odds: ~95% YES / ~5% NO
- If YES wins: Trader gets proportional share of total pool

#### UI (Market Detail Page):

```
┌─────────────────────────────────────────
│ 📊 MARKET: Are tags incomplete?
├─────────────────────────────────────────
│ Current Odds:
│   YES: 95% ██████████████████░░ (3.0Ρ)
│   NO:  5%  █░░░░░░░░░░░░░░░░░░░ (0.05Ρ)
│
│ Total Volume: 3.05 ROHR
│ Time Remaining: 47h 23m
│
│ YOUR POSITION:
│   0 shares
│
│ BUY SHARES:
│   Amount: [2.0] ROHR
│   Position: (•) YES  ( ) NO
│   Est. Return if win: +65%
│
│   [Buy Shares]
└─────────────────────────────────────────
```

---

### **STEP 5: Resolution (Client Poller → TEE Judge)**

#### Actions:

```
Client polls TEE every 1 minute
  ↓
Client poller detects: "Market ready to resolve"
  ↓
Client → TEE: POST /api/markets/resolve
  ↓
TEE processes:
  0. market_id: "market_123"

  1. Fetch video manifest from Walrus

  2. Fetch all conviction proofs from Walrus

  3. Call GPT-4:
     Prompt: "Video manifest: {...}
              Conviction: Tags are incomplete
              Proof: Missing 'blockchain' tag
              Is this conviction valid? YES or NO"

  4. GPT-4 responds: "YES"

  5. TEE signs verdict

  6. TEE calls SUI: resolve_market(market_id, true)
  ↓
Smart contract updates:
  market.resolved = true
  market.winning_position = Some(true) // YES wins
  ↓
Winners can now claim rewards
```

#### Economics (Example Payout):

```
Final state:
  Total pool: 10.0 ROHR (after more trading)
  YES shares: 5.0 total
  NO shares: 1.0 total
  Winning position: YES

Winners (YES holders):
  - Challenger A (0.5 shares): (0.5/5.0) × 10 = 1.0 ROHR
  - Challenger B (0.3 shares): (0.3/5.0) × 10 = 0.6 ROHR
  - Challenger C (0.2 shares): (0.2/5.0) × 10 = 0.4 ROHR
  - Trader 1 (2.0 shares): (2.0/5.0) × 10 = 4.0 ROHR
  - Trader 2 (2.0 shares): (2.0/5.0) × 10 = 4.0 ROHR

Losers (NO holders):
  - Lose all stakes (went to winning pool)
```

#### UI (Resolution Page):

```
┌─────────────────────────────────────────
│ ✅ MARKET RESOLVED
├─────────────────────────────────────────
│ Winning Position: YES ✓
│
│ Final Stats:
│   Total Pool: 10.0 ROHR
│   Total YES Shares: 5.0
│   Payout Per Share: 2.0 ROHR
│
│ YOUR RESULT:
│   Position: 2.0 YES shares
│   Cost Basis: 2.0 ROHR
│   Payout: 4.0 ROHR
│   Profit: +2.0 ROHR (+100%) 🎉
│
│   [Claim Rewards]
└─────────────────────────────────────────
```

---

## Key Features

### 🤖 Browser-Native AI with Transformers.js

- **Florence-2**: Vision-language model for video content analysis and scene understanding
- **Kokoro Text-to-Speech**: 82M parameter model for audio synthesis from captions
- **VISE Engine**: Frame extraction and video processing
- **WebGPU Acceleration**: High-performance inference for Kokoro with automatic WASM fallback
- **Web Workers**: Non-blocking AI processing in dedicated threads
- **Offline Capable**: All AI models run entirely in the browser

### 🔗 Blockchain Integration

- **SUI Network**: On-chain video registry and conviction system
- **Walrus Storage**: Decentralized blob storage for video packages
- **TEE Resolution**: Trusted execution environment for AI-based market resolution
- **Smart Contracts**: Move-based prediction markets with position NFTs

### 🎯 Conviction-Based Quality Control

- **Stake-to-Challenge**: 0.5 ROHR minimum stake to submit convictions
- **30-Minute Window**: Challenge period after video upload
- **Proof Storage**: Conviction evidence stored on Walrus
- **Market Conversion**: Stakes automatically convert to YES shares

### 📊 Prediction Markets

- **Unbalanced Initialization**: 91% YES / 9% NO pools
- **48-Hour Trading**: Active trading period after market creation
- **Position NFTs**: Tradable shares representing market positions
- **Proportional Payouts**: Winners split total pool by share ownership

### 🔍 Advanced Search

- **Python spaCy Server**: NLP-powered search with semantic understanding
- **Lazy Indexing**: On-demand video content indexing
- **REST API**: FastAPI server with comprehensive search endpoints
- **Test Coverage**: Full test suite with pytest

---

## Technology Stack

### Frontend

- **Framework**: Vite, TanStack Router, React, TypeScript
- **Styling**: Tailwind CSS
- **State**: TanStack Query for async state management

### AI Processing

- **Models**: Transformers.js, Florence-2, Kokoro TTS
- **Acceleration**: WebGPU, ONNX Runtime
- **Workers**: Web Workers for non-blocking processing

### Blockchain

- **Network**: SUI blockchain
- **Storage**: Walrus decentralized storage
- **Smart Contracts**: Move language
- **Wallet**: SUI wallet integration

### Search & Indexing

- **NLP**: Python, spaCy, FastAPI
- **Indexing**: Lazy on-demand indexing
- **API**: RESTful endpoints

### TEE & Resolution

- **Environment**: Trusted Execution Environment
- **AI Judge**: GPT-4 for conviction validation
- **Automation**: Client-side polling for market lifecycle

---

## AI Models Integration

All AI processing uses Transformers.js with WebGPU acceleration:

- **Florence Worker** (`florence-worker.ts`): Video content analysis and scene understanding
- **Kokoro Worker** (`kokoro-worker.ts`): Text-to-speech synthesis for accessibility
- **VISE Integration**: Frame extraction and video processing pipeline
- **WebGPU Detection**: Hardware acceleration for Kokoro, CPU fallback for Florence
- **Model Caching**: Persistent local storage for faster subsequent loads

---

## License

MIT
