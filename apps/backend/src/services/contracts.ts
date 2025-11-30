/**
 * Somnia Contracts Service
 *
 * Handles interactions with Somnia testnet smart contracts
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Import generated ABIs (run `npm run gen` to regenerate)
import {
  videoRegistryAbi,
  predictionMarketAbi,
  pointsRegistryAbi
} from "../types/generated";

// Chain configuration helper - called at runtime when env vars are loaded
function getChainConfig() {
  const rpcUrl = process.env.SOMNIA_RPC_URL || "";
  const isLocalDev = rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1");

  // Local Anvil chain configuration
  const localAnvil = {
    id: 31337,
    name: "Anvil Local",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["http://localhost:8545"],
      },
    },
  } as const;

  // Somnia testnet chain configuration
  const somniaTestnet = {
    id: 50312,
    name: "Somnia Testnet",
    nativeCurrency: {
      name: "STT",
      symbol: "STT",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl || "https://dream-rpc.somnia.network"],
      },
    },
  } as const;

  return isLocalDev ? localAnvil : somniaTestnet;
}

// Type definitions
interface Video {
  id: string;
  walrusBlobId: string;
  manifestBlobId: string;
  uploader: Address;
  uploadTime: bigint;
  convictionPeriodEnd: bigint;
  status: number;
}

interface Conviction {
  id: string;
  videoId: string;
  challenger: Address;
  walrusBlobId: string;
  timestamp: bigint;
  status: number;
}

interface Market {
  id: string;
  videoId: string;
  question: string;
  creator: Address;
  createdAt: bigint;
  expiresAt: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  resolved: boolean;
  winningSide: boolean;
  status: number;
}

/**
 * Somnia Contracts Service
 *
 * Provides read and write access to Somnia smart contracts
 */
export class ContractsService {
  private publicClient: PublicClient;
  private walletClient: WalletClient;

  // Contract addresses
  private videoRegistryAddress: Address;
  private predictionMarketAddress: Address;
  private pointsRegistryAddress: Address;

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private isConfigured: boolean = false;

  constructor() {
    // Validate environment variables
    if (!process.env.SOMNIA_RPC_URL) {
      console.warn("⚠️  SOMNIA_RPC_URL not set, using default");
    }

    if (!process.env.BACKEND_WALLET_PRIVATE_KEY) {
      console.warn(
        "⚠️  BACKEND_WALLET_PRIVATE_KEY not set - contract write operations will be disabled"
      );
      this.isConfigured = false;
      // Initialize with dummy values to avoid null checks
      this.videoRegistryAddress = "0x0" as Address;
      this.predictionMarketAddress = "0x0" as Address;
      this.pointsRegistryAddress = "0x0" as Address;
      this.publicClient = null as any;
      this.walletClient = null as any;
      return;
    }

    this.isConfigured = true;

    // Load contract addresses from environment
    this.videoRegistryAddress = (process.env.VIDEO_REGISTRY_ADDRESS || "0x0") as Address;
    this.predictionMarketAddress = (process.env.PREDICTION_MARKET_ADDRESS ||
      "0x0") as Address;
    this.pointsRegistryAddress = (process.env.POINTS_REGISTRY_ADDRESS || "0x0") as Address;

    // Get chain config at runtime (after env vars are loaded)
    const activeChain = getChainConfig();
    
    // Create clients - use activeChain for automatic local/production switching
    console.log(`🔗 Using chain: ${activeChain.name} (ID: ${activeChain.id})`);
    console.log(`   RPC URL: ${process.env.SOMNIA_RPC_URL}`);
    
    this.publicClient = createPublicClient({
      chain: activeChain,
      transport: http(process.env.SOMNIA_RPC_URL),
    }) as any;

    const account = privateKeyToAccount(
      process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`
    );

    this.walletClient = createWalletClient({
      account,
      chain: activeChain,
      transport: http(process.env.SOMNIA_RPC_URL),
    }) as any;

    console.log("✅ ContractsService initialized");
    console.log("   - VideoRegistry:", this.videoRegistryAddress);
    console.log("   - PredictionMarket:", this.predictionMarketAddress);
    console.log("   - PointsRegistry:", this.pointsRegistryAddress);
  }

  /**
   * Check if service is configured for write operations
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error(
        "ContractsService is not configured. Set BACKEND_WALLET_PRIVATE_KEY in environment."
      );
    }
  }

  /**
   * Execute transaction with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(
          `${operationName} failed (attempt ${attempt}/${this.MAX_RETRIES}):`,
          error
        );

        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY * attempt));
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.MAX_RETRIES} attempts: ${lastError?.message}`
    );
  }

  // ========== READ METHODS ==========

  /**
   * Get all videos that are ready for prediction markets
   * (videos past conviction period with convictions that need markets)
   */
  async getVideosReadyForMarkets(): Promise<Video[]> {
    this.ensureConfigured();
    try {
      // Get all video IDs
      const videoIds = (await (this.publicClient as any).readContract({
        address: this.videoRegistryAddress,
        abi: videoRegistryAbi,
        functionName: "getAllVideoIds",
      })) as string[];

      const videos: Video[] = [];
      const currentTime = BigInt(Math.floor(Date.now() / 1000));

      // Fetch each video's details
      for (const videoId of videoIds) {
        const video = (await (this.publicClient as any).readContract({
          address: this.videoRegistryAddress,
          abi: videoRegistryAbi,
          functionName: "getVideo",
          args: [videoId],
        })) as any;

        // Status: 0=Pending, 1=Finalized, 2=Challenged
        // We want videos that:
        // 1. Have passed conviction period (currentTime >= convictionPeriodEnd)
        // 2. Have status Challenged (2) - meaning they have convictions
        // Note: Finalized videos (1) have no convictions, so no markets needed
        const isPastConvictionPeriod = currentTime >= video.convictionPeriodEnd;
        const isChallenged = video.status === 2;

        if (isPastConvictionPeriod && isChallenged) {
          videos.push({
            id: video.id,
            walrusBlobId: video.walrusBlobId,
            manifestBlobId: video.manifestBlobId,
            uploader: video.uploader,
            uploadTime: video.uploadTime,
            convictionPeriodEnd: video.convictionPeriodEnd,
            status: video.status,
          });
        }
      }

      return videos;
    } catch (error) {
      console.error("Failed to get videos ready for markets:", error);
      throw error;
    }
  }

  /**
   * Get all convictions for a specific video
   */
  async getConvictions(videoId: string): Promise<Conviction[]> {
    this.ensureConfigured();
    try {
      // Get conviction count for this video
      const count = (await (this.publicClient as any).readContract({
        address: this.videoRegistryAddress,
        abi: videoRegistryAbi,
        functionName: "getConvictionCount",
        args: [videoId],
      })) as bigint;

      const convictions: Conviction[] = [];

      // Fetch each conviction's details
      for (let i = 0; i < Number(count); i++) {
        const conviction = (await (this.publicClient as any).readContract({
          address: this.videoRegistryAddress,
          abi: videoRegistryAbi,
          functionName: "getConviction",
          args: [videoId, i],
        })) as any;

        convictions.push({
          id: `${videoId}_${i}`,
          videoId: videoId,
          challenger: conviction.challenger,
          walrusBlobId: conviction.walrusBlobId,
          timestamp: conviction.timestamp,
          status: conviction.status,
        });
      }

      return convictions;
    } catch (error) {
      console.error(`Failed to get convictions for video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get all markets that are ready for resolution
   * (expired markets that haven't been resolved yet)
   */
  async getMarketsReadyForResolution(): Promise<Market[]> {
    this.ensureConfigured();
    try {
      // Get all market IDs
      const marketIds = (await (this.publicClient as any).readContract({
        address: this.predictionMarketAddress,
        abi: predictionMarketAbi,
        functionName: "getAllMarketIds",
      })) as string[];

      const markets: Market[] = [];
      const currentTime = BigInt(Math.floor(Date.now() / 1000));

      // Fetch each market's details
      for (const marketId of marketIds) {
        const market = (await (this.publicClient as any).readContract({
          address: this.predictionMarketAddress,
          abi: predictionMarketAbi,
          functionName: "getMarket",
          args: [marketId],
        })) as any;

        // Check if market is expired and not resolved
        if (market.expiresAt <= currentTime && !market.resolved) {
          markets.push({
            id: market.id,
            videoId: market.videoId,
            question: market.question,
            creator: market.creator,
            createdAt: market.createdAt,
            expiresAt: market.expiresAt,
            yesVotes: market.yesVotes,
            noVotes: market.noVotes,
            resolved: market.resolved,
            winningSide: market.winningSide,
            status: market.status,
          });
        }
      }

      return markets;
    } catch (error) {
      console.error("Failed to get markets ready for resolution:", error);
      throw error;
    }
  }

  /**
   * Get specific video details by ID
   */
  async getVideo(videoId: string): Promise<Video> {
    this.ensureConfigured();
    try {
      const video = (await (this.publicClient as any).readContract({
        address: this.videoRegistryAddress,
        abi: videoRegistryAbi,
        functionName: "getVideo",
        args: [videoId],
      })) as any;

      return {
        id: video.id,
        walrusBlobId: video.walrusBlobId,
        manifestBlobId: video.manifestBlobId,
        uploader: video.uploader,
        uploadTime: video.uploadTime,
        convictionPeriodEnd: video.convictionPeriodEnd,
        status: video.status,
      };
    } catch (error) {
      console.error(`Failed to get video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get specific market details
   */
  async getMarket(marketId: string): Promise<Market> {
    this.ensureConfigured();
    try {
      const market = (await (this.publicClient as any).readContract({
        address: this.predictionMarketAddress,
        abi: predictionMarketAbi,
        functionName: "getMarket",
        args: [marketId],
      })) as any;

      return {
        id: market.id,
        videoId: market.videoId,
        question: market.question,
        creator: market.creator,
        createdAt: market.createdAt,
        expiresAt: market.expiresAt,
        yesVotes: market.yesVotes,
        noVotes: market.noVotes,
        resolved: market.resolved,
        winningSide: market.winningSide,
        status: market.status,
      };
    } catch (error) {
      console.error(`Failed to get market ${marketId}:`, error);
      throw error;
    }
  }

  // ========== WRITE METHODS ==========

  /**
   * Submit a video index to the blockchain
   */
  async submitVideo(videoId: string, walrusBlobId: string): Promise<string> {
    this.ensureConfigured();
    return this.executeWithRetry(async () => {
      console.log(`Submitting video ${videoId} to blockchain...`);

      // Prepare transaction
      const { request } = await (this.publicClient as any).simulateContract({
        address: this.videoRegistryAddress,
        abi: videoRegistryAbi,
        functionName: "submitIndex",
        args: [videoId, walrusBlobId],
        account: this.walletClient.account,
      });

      // Execute transaction
      const hash = await (this.walletClient as any).writeContract(request);
      console.log(`Video submission tx hash: ${hash}`);

      // Wait for confirmation
      const receipt = await (this.publicClient as any).waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

      console.log(`Video submitted successfully in block ${receipt.blockNumber}`);
      return hash;
    }, "submitVideo");
  }

  /**
   * Submit a conviction (challenge) against a video
   */
  async submitConviction(videoId: string, proofBlobId: string): Promise<string> {
    this.ensureConfigured();
    return this.executeWithRetry(async () => {
      console.log(`Submitting conviction for video ${videoId}...`);

      // Prepare transaction
      const { request } = await (this.publicClient as any).simulateContract({
        address: this.videoRegistryAddress,
        abi: videoRegistryAbi,
        functionName: "submitConviction",
        args: [videoId, proofBlobId],
        account: this.walletClient.account,
      });

      // Execute transaction
      const hash = await (this.walletClient as any).writeContract(request);
      console.log(`Conviction submission tx hash: ${hash}`);

      // Wait for confirmation
      const receipt = await (this.publicClient as any).waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

      console.log(`Conviction submitted successfully in block ${receipt.blockNumber}`);
      return hash;
    }, "submitConviction");
  }

  /**
   * Create a new prediction market for a video
   */
  async createMarket(
    videoId: string,
    question: string,
    _convictionIds: string[]
  ): Promise<string> {
    this.ensureConfigured();
    return this.executeWithRetry(async () => {
      console.log(`Creating market for video ${videoId}...`);

      // Prepare transaction
      const { request } = await (this.publicClient as any).simulateContract({
        address: this.predictionMarketAddress,
        abi: predictionMarketAbi,
        functionName: "createMarket",
        args: [videoId, question],
        account: this.walletClient.account,
      });

      // Execute transaction
      const hash = await (this.walletClient as any).writeContract(request);
      console.log(`Market creation tx hash: ${hash}`);

      // Wait for confirmation
      const receipt = await (this.publicClient as any).waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

      console.log(`Market created successfully in block ${receipt.blockNumber}`);

      // Extract market ID from logs (simplified - in production parse events properly)
      return `market_${videoId}_${Date.now()}`;
    }, "createMarket");
  }

  /**
   * Resolve a prediction market
   */
  async resolveMarket(marketId: string, winningSide: boolean): Promise<string> {
    this.ensureConfigured();
    return this.executeWithRetry(async () => {
      console.log(`Resolving market ${marketId} with winningSide=${winningSide}...`);

      // Prepare transaction
      const { request } = await (this.publicClient as any).simulateContract({
        address: this.predictionMarketAddress,
        abi: predictionMarketAbi,
        functionName: "resolveMarket",
        args: [marketId, winningSide],
        account: this.walletClient.account,
      });

      // Execute transaction
      const hash = await (this.walletClient as any).writeContract(request);
      console.log(`Market resolution tx hash: ${hash}`);

      // Wait for confirmation
      const receipt = await (this.publicClient as any).waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

      console.log(`Market resolved successfully in block ${receipt.blockNumber}`);
      return hash;
    }, "resolveMarket");
  }

  /**
   * Close an expired market
   */
  async closeMarket(marketId: string): Promise<string> {
    this.ensureConfigured();
    return this.executeWithRetry(async () => {
      console.log(`Closing market ${marketId}...`);

      // Prepare transaction
      const { request } = await (this.publicClient as any).simulateContract({
        address: this.predictionMarketAddress,
        abi: predictionMarketAbi,
        functionName: "closeMarket",
        args: [marketId],
        account: this.walletClient.account,
      });

      // Execute transaction
      const hash = await (this.walletClient as any).writeContract(request);
      console.log(`Market close tx hash: ${hash}`);

      // Wait for confirmation
      const receipt = await (this.publicClient as any).waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

      console.log(`Market closed successfully in block ${receipt.blockNumber}`);
      return hash;
    }, "closeMarket");
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: Hash) {
    return await this.publicClient.getTransactionReceipt({ hash });
  }
}

// Export singleton instance
let contractsServiceInstance: ContractsService | null = null;

export function getContractsService(): ContractsService {
  if (!contractsServiceInstance) {
    contractsServiceInstance = new ContractsService();
  }
  return contractsServiceInstance;
}
