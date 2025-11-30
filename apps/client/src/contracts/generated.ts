import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PointsRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const pointsRegistryAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'awardPoints',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'convictionRegistry',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getPoints',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'predictionMarket',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_videoRegistry', internalType: 'address', type: 'address' },
      { name: '_predictionMarket', internalType: 'address', type: 'address' },
      { name: '_convictionRegistry', internalType: 'address', type: 'address' },
    ],
    name: 'setContracts',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'videoRegistry',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'videoRegistry', internalType: 'address', type: 'address', indexed: false },
      {
        name: 'predictionMarket',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'convictionRegistry',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'ContractsSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'amount', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'reason', internalType: 'string', type: 'string', indexed: false },
    ],
    name: 'PointsAwarded',
  },
  { type: 'error', inputs: [], name: 'InvalidAddress' },
  { type: 'error', inputs: [], name: 'Unauthorized' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PredictionMarket
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const predictionMarketAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_pointsRegistry', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MARKET_DURATION',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'WINNER_POINTS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string' }],
    name: 'closeMarket',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string' },
      { name: 'question', internalType: 'string', type: 'string' },
    ],
    name: 'createMarket',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getActivityCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAllActivities',
    outputs: [
      {
        name: '',
        internalType: 'struct PredictionMarket.Activity[]',
        type: 'tuple[]',
        components: [
          {
            name: 'activityType',
            internalType: 'enum PredictionMarket.ActivityType',
            type: 'uint8',
          },
          { name: 'user', internalType: 'address', type: 'address' },
          { name: 'marketId', internalType: 'string', type: 'string' },
          { name: 'isYes', internalType: 'bool', type: 'bool' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAllMarketIds',
    outputs: [{ name: '', internalType: 'string[]', type: 'string[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string' }],
    name: 'getMarket',
    outputs: [
      {
        name: '',
        internalType: 'struct PredictionMarket.Market',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'string', type: 'string' },
          { name: 'videoId', internalType: 'string', type: 'string' },
          { name: 'question', internalType: 'string', type: 'string' },
          { name: 'creator', internalType: 'address', type: 'address' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'expiresAt', internalType: 'uint256', type: 'uint256' },
          { name: 'yesVotes', internalType: 'uint256', type: 'uint256' },
          { name: 'noVotes', internalType: 'uint256', type: 'uint256' },
          { name: 'resolved', internalType: 'bool', type: 'bool' },
          { name: 'winningSide', internalType: 'bool', type: 'bool' },
          {
            name: 'status',
            internalType: 'enum PredictionMarket.MarketStatus',
            type: 'uint8',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string' }],
    name: 'getMarketActivities',
    outputs: [
      {
        name: '',
        internalType: 'struct PredictionMarket.Activity[]',
        type: 'tuple[]',
        components: [
          {
            name: 'activityType',
            internalType: 'enum PredictionMarket.ActivityType',
            type: 'uint8',
          },
          { name: 'user', internalType: 'address', type: 'address' },
          { name: 'marketId', internalType: 'string', type: 'string' },
          { name: 'isYes', internalType: 'bool', type: 'bool' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getMarketCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string' }],
    name: 'getMarketOdds',
    outputs: [
      { name: 'yesPercentage', internalType: 'uint256', type: 'uint256' },
      { name: 'noPercentage', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string' }],
    name: 'getMarketVoters',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'marketId', internalType: 'string', type: 'string' },
      { name: 'user', internalType: 'address', type: 'address' },
    ],
    name: 'getPosition',
    outputs: [
      {
        name: '',
        internalType: 'struct PredictionMarket.Position',
        type: 'tuple',
        components: [
          { name: 'yesVotes', internalType: 'uint256', type: 'uint256' },
          { name: 'noVotes', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'count', internalType: 'uint256', type: 'uint256' }],
    name: 'getRecentActivities',
    outputs: [
      {
        name: '',
        internalType: 'struct PredictionMarket.Activity[]',
        type: 'tuple[]',
        components: [
          {
            name: 'activityType',
            internalType: 'enum PredictionMarket.ActivityType',
            type: 'uint8',
          },
          { name: 'user', internalType: 'address', type: 'address' },
          { name: 'marketId', internalType: 'string', type: 'string' },
          { name: 'isYes', internalType: 'bool', type: 'bool' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string' }],
    name: 'isMarketExpired',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pointsRegistry',
    outputs: [{ name: '', internalType: 'contract PointsRegistry', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'marketId', internalType: 'string', type: 'string' },
      { name: 'winningSide', internalType: 'bool', type: 'bool' },
    ],
    name: 'resolveMarket',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string' }],
    name: 'voteNo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string' }],
    name: 'voteYes',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'marketId', internalType: 'string', type: 'string', indexed: true }],
    name: 'MarketClosed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'marketId', internalType: 'string', type: 'string', indexed: true },
      { name: 'videoId', internalType: 'string', type: 'string', indexed: true },
      { name: 'question', internalType: 'string', type: 'string', indexed: false },
      { name: 'creator', internalType: 'address', type: 'address', indexed: true },
      { name: 'expiresAt', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'MarketCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'marketId', internalType: 'string', type: 'string', indexed: true },
      { name: 'winningSide', internalType: 'bool', type: 'bool', indexed: false },
      { name: 'yesVotes', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'noVotes', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'MarketResolved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'marketId', internalType: 'string', type: 'string', indexed: true },
      { name: 'voter', internalType: 'address', type: 'address', indexed: true },
      { name: 'isYes', internalType: 'bool', type: 'bool', indexed: false },
      { name: 'amount', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'VoteCast',
  },
  { type: 'error', inputs: [], name: 'EmptyQuestion' },
  { type: 'error', inputs: [], name: 'EmptyVideoId' },
  { type: 'error', inputs: [], name: 'InvalidVoteAmount' },
  { type: 'error', inputs: [], name: 'MarketAlreadyResolved' },
  { type: 'error', inputs: [], name: 'MarketExpired' },
  { type: 'error', inputs: [], name: 'MarketNotExpired' },
  { type: 'error', inputs: [], name: 'MarketNotFound' },
  { type: 'error', inputs: [], name: 'Unauthorized' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// VideoRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const videoRegistryAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_pointsRegistry', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CONVICTION_PERIOD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UPLOAD_POINTS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string' },
      { name: 'convictionIndex', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'dismissConviction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'videoId', internalType: 'string', type: 'string' }],
    name: 'finalizeVideo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAllVideoIds',
    outputs: [{ name: '', internalType: 'string[]', type: 'string[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string' },
      { name: 'convictionIndex', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getConviction',
    outputs: [
      {
        name: '',
        internalType: 'struct VideoRegistry.Conviction',
        type: 'tuple',
        components: [
          { name: 'challenger', internalType: 'address', type: 'address' },
          { name: 'walrusBlobId', internalType: 'string', type: 'string' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
          {
            name: 'status',
            internalType: 'enum VideoRegistry.ConvictionStatus',
            type: 'uint8',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'videoId', internalType: 'string', type: 'string' }],
    name: 'getConvictionCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'videoId', internalType: 'string', type: 'string' }],
    name: 'getVideo',
    outputs: [
      {
        name: '',
        internalType: 'struct VideoRegistry.VideoIndex',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'string', type: 'string' },
          { name: 'walrusBlobId', internalType: 'string', type: 'string' },
          { name: 'uploader', internalType: 'address', type: 'address' },
          { name: 'uploadTime', internalType: 'uint256', type: 'uint256' },
          { name: 'convictionPeriodEnd', internalType: 'uint256', type: 'uint256' },
          { name: 'status', internalType: 'enum VideoRegistry.VideoStatus', type: 'uint8' },
          {
            name: 'convictions',
            internalType: 'struct VideoRegistry.Conviction[]',
            type: 'tuple[]',
            components: [
              { name: 'challenger', internalType: 'address', type: 'address' },
              { name: 'walrusBlobId', internalType: 'string', type: 'string' },
              { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
              {
                name: 'status',
                internalType: 'enum VideoRegistry.ConvictionStatus',
                type: 'uint8',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getVideoCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'videoId', internalType: 'string', type: 'string' }],
    name: 'isInConvictionPeriod',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pointsRegistry',
    outputs: [{ name: '', internalType: 'contract PointsRegistry', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string' },
      { name: 'convictionIndex', internalType: 'uint256', type: 'uint256' },
      { name: 'upheld', internalType: 'bool', type: 'bool' },
    ],
    name: 'resolveConviction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string' },
      { name: 'proofBlobId', internalType: 'string', type: 'string' },
    ],
    name: 'submitConviction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string' },
      { name: 'walrusBlobId', internalType: 'string', type: 'string' },
    ],
    name: 'submitIndex',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string', indexed: true },
      { name: 'convictionIndex', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'ConvictionDismissed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string', indexed: true },
      { name: 'convictionIndex', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'upheld', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ConvictionResolved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string', indexed: true },
      { name: 'convictionIndex', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'challenger', internalType: 'address', type: 'address', indexed: true },
      { name: 'walrusBlobId', internalType: 'string', type: 'string', indexed: false },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'ConvictionSubmitted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'videoId', internalType: 'string', type: 'string', indexed: true }],
    name: 'VideoChallenged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'videoId', internalType: 'string', type: 'string', indexed: true }],
    name: 'VideoFinalized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'videoId', internalType: 'string', type: 'string', indexed: true },
      { name: 'uploader', internalType: 'address', type: 'address', indexed: true },
      { name: 'walrusBlobId', internalType: 'string', type: 'string', indexed: false },
      { name: 'uploadTime', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'convictionPeriodEnd',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VideoIndexed',
  },
  { type: 'error', inputs: [], name: 'ConvictionNotFound' },
  { type: 'error', inputs: [], name: 'ConvictionPeriodActive' },
  { type: 'error', inputs: [], name: 'ConvictionPeriodEnded' },
  { type: 'error', inputs: [], name: 'EmptyBlobId' },
  { type: 'error', inputs: [], name: 'EmptyVideoId' },
  { type: 'error', inputs: [], name: 'InvalidStatus' },
  { type: 'error', inputs: [], name: 'Unauthorized' },
  { type: 'error', inputs: [], name: 'VideoAlreadyExists' },
  { type: 'error', inputs: [], name: 'VideoNotFound' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link pointsRegistryAbi}__
 */
export const useReadPointsRegistry = /*#__PURE__*/ createUseReadContract({
  abi: pointsRegistryAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"convictionRegistry"`
 */
export const useReadPointsRegistryConvictionRegistry = /*#__PURE__*/ createUseReadContract({
  abi: pointsRegistryAbi,
  functionName: 'convictionRegistry',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"getPoints"`
 */
export const useReadPointsRegistryGetPoints = /*#__PURE__*/ createUseReadContract({
  abi: pointsRegistryAbi,
  functionName: 'getPoints',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"owner"`
 */
export const useReadPointsRegistryOwner = /*#__PURE__*/ createUseReadContract({
  abi: pointsRegistryAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"predictionMarket"`
 */
export const useReadPointsRegistryPredictionMarket = /*#__PURE__*/ createUseReadContract({
  abi: pointsRegistryAbi,
  functionName: 'predictionMarket',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"videoRegistry"`
 */
export const useReadPointsRegistryVideoRegistry = /*#__PURE__*/ createUseReadContract({
  abi: pointsRegistryAbi,
  functionName: 'videoRegistry',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link pointsRegistryAbi}__
 */
export const useWritePointsRegistry = /*#__PURE__*/ createUseWriteContract({
  abi: pointsRegistryAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"awardPoints"`
 */
export const useWritePointsRegistryAwardPoints = /*#__PURE__*/ createUseWriteContract({
  abi: pointsRegistryAbi,
  functionName: 'awardPoints',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"setContracts"`
 */
export const useWritePointsRegistrySetContracts = /*#__PURE__*/ createUseWriteContract({
  abi: pointsRegistryAbi,
  functionName: 'setContracts',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link pointsRegistryAbi}__
 */
export const useSimulatePointsRegistry = /*#__PURE__*/ createUseSimulateContract({
  abi: pointsRegistryAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"awardPoints"`
 */
export const useSimulatePointsRegistryAwardPoints = /*#__PURE__*/ createUseSimulateContract(
  { abi: pointsRegistryAbi, functionName: 'awardPoints' },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link pointsRegistryAbi}__ and `functionName` set to `"setContracts"`
 */
export const useSimulatePointsRegistrySetContracts =
  /*#__PURE__*/ createUseSimulateContract({
    abi: pointsRegistryAbi,
    functionName: 'setContracts',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link pointsRegistryAbi}__
 */
export const useWatchPointsRegistryEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: pointsRegistryAbi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link pointsRegistryAbi}__ and `eventName` set to `"ContractsSet"`
 */
export const useWatchPointsRegistryContractsSetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: pointsRegistryAbi,
    eventName: 'ContractsSet',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link pointsRegistryAbi}__ and `eventName` set to `"PointsAwarded"`
 */
export const useWatchPointsRegistryPointsAwardedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: pointsRegistryAbi,
    eventName: 'PointsAwarded',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__
 */
export const useReadPredictionMarket = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"MARKET_DURATION"`
 */
export const useReadPredictionMarketMarketDuration = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'MARKET_DURATION',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"WINNER_POINTS"`
 */
export const useReadPredictionMarketWinnerPoints = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'WINNER_POINTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getActivityCount"`
 */
export const useReadPredictionMarketGetActivityCount = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'getActivityCount',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getAllActivities"`
 */
export const useReadPredictionMarketGetAllActivities = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'getAllActivities',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getAllMarketIds"`
 */
export const useReadPredictionMarketGetAllMarketIds = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'getAllMarketIds',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getMarket"`
 */
export const useReadPredictionMarketGetMarket = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'getMarket',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getMarketActivities"`
 */
export const useReadPredictionMarketGetMarketActivities =
  /*#__PURE__*/ createUseReadContract({
    abi: predictionMarketAbi,
    functionName: 'getMarketActivities',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getMarketCount"`
 */
export const useReadPredictionMarketGetMarketCount = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'getMarketCount',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getMarketOdds"`
 */
export const useReadPredictionMarketGetMarketOdds = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'getMarketOdds',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getMarketVoters"`
 */
export const useReadPredictionMarketGetMarketVoters = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'getMarketVoters',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getPosition"`
 */
export const useReadPredictionMarketGetPosition = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'getPosition',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"getRecentActivities"`
 */
export const useReadPredictionMarketGetRecentActivities =
  /*#__PURE__*/ createUseReadContract({
    abi: predictionMarketAbi,
    functionName: 'getRecentActivities',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"isMarketExpired"`
 */
export const useReadPredictionMarketIsMarketExpired = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'isMarketExpired',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"pointsRegistry"`
 */
export const useReadPredictionMarketPointsRegistry = /*#__PURE__*/ createUseReadContract({
  abi: predictionMarketAbi,
  functionName: 'pointsRegistry',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link predictionMarketAbi}__
 */
export const useWritePredictionMarket = /*#__PURE__*/ createUseWriteContract({
  abi: predictionMarketAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"closeMarket"`
 */
export const useWritePredictionMarketCloseMarket = /*#__PURE__*/ createUseWriteContract({
  abi: predictionMarketAbi,
  functionName: 'closeMarket',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"createMarket"`
 */
export const useWritePredictionMarketCreateMarket = /*#__PURE__*/ createUseWriteContract({
  abi: predictionMarketAbi,
  functionName: 'createMarket',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"resolveMarket"`
 */
export const useWritePredictionMarketResolveMarket = /*#__PURE__*/ createUseWriteContract({
  abi: predictionMarketAbi,
  functionName: 'resolveMarket',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"voteNo"`
 */
export const useWritePredictionMarketVoteNo = /*#__PURE__*/ createUseWriteContract({
  abi: predictionMarketAbi,
  functionName: 'voteNo',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"voteYes"`
 */
export const useWritePredictionMarketVoteYes = /*#__PURE__*/ createUseWriteContract({
  abi: predictionMarketAbi,
  functionName: 'voteYes',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link predictionMarketAbi}__
 */
export const useSimulatePredictionMarket = /*#__PURE__*/ createUseSimulateContract({
  abi: predictionMarketAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"closeMarket"`
 */
export const useSimulatePredictionMarketCloseMarket =
  /*#__PURE__*/ createUseSimulateContract({
    abi: predictionMarketAbi,
    functionName: 'closeMarket',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"createMarket"`
 */
export const useSimulatePredictionMarketCreateMarket =
  /*#__PURE__*/ createUseSimulateContract({
    abi: predictionMarketAbi,
    functionName: 'createMarket',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"resolveMarket"`
 */
export const useSimulatePredictionMarketResolveMarket =
  /*#__PURE__*/ createUseSimulateContract({
    abi: predictionMarketAbi,
    functionName: 'resolveMarket',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"voteNo"`
 */
export const useSimulatePredictionMarketVoteNo = /*#__PURE__*/ createUseSimulateContract({
  abi: predictionMarketAbi,
  functionName: 'voteNo',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link predictionMarketAbi}__ and `functionName` set to `"voteYes"`
 */
export const useSimulatePredictionMarketVoteYes = /*#__PURE__*/ createUseSimulateContract({
  abi: predictionMarketAbi,
  functionName: 'voteYes',
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link predictionMarketAbi}__
 */
export const useWatchPredictionMarketEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: predictionMarketAbi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link predictionMarketAbi}__ and `eventName` set to `"MarketClosed"`
 */
export const useWatchPredictionMarketMarketClosedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: predictionMarketAbi,
    eventName: 'MarketClosed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link predictionMarketAbi}__ and `eventName` set to `"MarketCreated"`
 */
export const useWatchPredictionMarketMarketCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: predictionMarketAbi,
    eventName: 'MarketCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link predictionMarketAbi}__ and `eventName` set to `"MarketResolved"`
 */
export const useWatchPredictionMarketMarketResolvedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: predictionMarketAbi,
    eventName: 'MarketResolved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link predictionMarketAbi}__ and `eventName` set to `"VoteCast"`
 */
export const useWatchPredictionMarketVoteCastEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: predictionMarketAbi,
    eventName: 'VoteCast',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__
 */
export const useReadVideoRegistry = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"CONVICTION_PERIOD"`
 */
export const useReadVideoRegistryConvictionPeriod = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
  functionName: 'CONVICTION_PERIOD',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"UPLOAD_POINTS"`
 */
export const useReadVideoRegistryUploadPoints = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
  functionName: 'UPLOAD_POINTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"getAllVideoIds"`
 */
export const useReadVideoRegistryGetAllVideoIds = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
  functionName: 'getAllVideoIds',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"getConviction"`
 */
export const useReadVideoRegistryGetConviction = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
  functionName: 'getConviction',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"getConvictionCount"`
 */
export const useReadVideoRegistryGetConvictionCount = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
  functionName: 'getConvictionCount',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"getVideo"`
 */
export const useReadVideoRegistryGetVideo = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
  functionName: 'getVideo',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"getVideoCount"`
 */
export const useReadVideoRegistryGetVideoCount = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
  functionName: 'getVideoCount',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"isInConvictionPeriod"`
 */
export const useReadVideoRegistryIsInConvictionPeriod = /*#__PURE__*/ createUseReadContract(
  { abi: videoRegistryAbi, functionName: 'isInConvictionPeriod' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"pointsRegistry"`
 */
export const useReadVideoRegistryPointsRegistry = /*#__PURE__*/ createUseReadContract({
  abi: videoRegistryAbi,
  functionName: 'pointsRegistry',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link videoRegistryAbi}__
 */
export const useWriteVideoRegistry = /*#__PURE__*/ createUseWriteContract({
  abi: videoRegistryAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"dismissConviction"`
 */
export const useWriteVideoRegistryDismissConviction = /*#__PURE__*/ createUseWriteContract({
  abi: videoRegistryAbi,
  functionName: 'dismissConviction',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"finalizeVideo"`
 */
export const useWriteVideoRegistryFinalizeVideo = /*#__PURE__*/ createUseWriteContract({
  abi: videoRegistryAbi,
  functionName: 'finalizeVideo',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"resolveConviction"`
 */
export const useWriteVideoRegistryResolveConviction = /*#__PURE__*/ createUseWriteContract({
  abi: videoRegistryAbi,
  functionName: 'resolveConviction',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"submitConviction"`
 */
export const useWriteVideoRegistrySubmitConviction = /*#__PURE__*/ createUseWriteContract({
  abi: videoRegistryAbi,
  functionName: 'submitConviction',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"submitIndex"`
 */
export const useWriteVideoRegistrySubmitIndex = /*#__PURE__*/ createUseWriteContract({
  abi: videoRegistryAbi,
  functionName: 'submitIndex',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link videoRegistryAbi}__
 */
export const useSimulateVideoRegistry = /*#__PURE__*/ createUseSimulateContract({
  abi: videoRegistryAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"dismissConviction"`
 */
export const useSimulateVideoRegistryDismissConviction =
  /*#__PURE__*/ createUseSimulateContract({
    abi: videoRegistryAbi,
    functionName: 'dismissConviction',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"finalizeVideo"`
 */
export const useSimulateVideoRegistryFinalizeVideo =
  /*#__PURE__*/ createUseSimulateContract({
    abi: videoRegistryAbi,
    functionName: 'finalizeVideo',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"resolveConviction"`
 */
export const useSimulateVideoRegistryResolveConviction =
  /*#__PURE__*/ createUseSimulateContract({
    abi: videoRegistryAbi,
    functionName: 'resolveConviction',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"submitConviction"`
 */
export const useSimulateVideoRegistrySubmitConviction =
  /*#__PURE__*/ createUseSimulateContract({
    abi: videoRegistryAbi,
    functionName: 'submitConviction',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link videoRegistryAbi}__ and `functionName` set to `"submitIndex"`
 */
export const useSimulateVideoRegistrySubmitIndex = /*#__PURE__*/ createUseSimulateContract({
  abi: videoRegistryAbi,
  functionName: 'submitIndex',
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link videoRegistryAbi}__
 */
export const useWatchVideoRegistryEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: videoRegistryAbi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link videoRegistryAbi}__ and `eventName` set to `"ConvictionDismissed"`
 */
export const useWatchVideoRegistryConvictionDismissedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: videoRegistryAbi,
    eventName: 'ConvictionDismissed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link videoRegistryAbi}__ and `eventName` set to `"ConvictionResolved"`
 */
export const useWatchVideoRegistryConvictionResolvedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: videoRegistryAbi,
    eventName: 'ConvictionResolved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link videoRegistryAbi}__ and `eventName` set to `"ConvictionSubmitted"`
 */
export const useWatchVideoRegistryConvictionSubmittedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: videoRegistryAbi,
    eventName: 'ConvictionSubmitted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link videoRegistryAbi}__ and `eventName` set to `"VideoChallenged"`
 */
export const useWatchVideoRegistryVideoChallengedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: videoRegistryAbi,
    eventName: 'VideoChallenged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link videoRegistryAbi}__ and `eventName` set to `"VideoFinalized"`
 */
export const useWatchVideoRegistryVideoFinalizedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: videoRegistryAbi,
    eventName: 'VideoFinalized',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link videoRegistryAbi}__ and `eventName` set to `"VideoIndexed"`
 */
export const useWatchVideoRegistryVideoIndexedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: videoRegistryAbi,
    eventName: 'VideoIndexed',
  })
