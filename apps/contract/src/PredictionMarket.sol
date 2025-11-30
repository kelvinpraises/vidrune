// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PointsRegistry.sol";

/**
 * @title PredictionMarket
 * @notice Simple YES/NO prediction markets for Vidrune videos
 * @dev Simplified version with vote counting (no AMM/bonding curves)
 * All activities stored on-chain for easy querying without graph indexer
 */
contract PredictionMarket {
    // Constants
    uint256 public constant MARKET_DURATION = 2700; // 45 minutes in seconds
    uint256 public constant WINNER_POINTS = 5; // Points awarded to winners

    // Structs
    struct Market {
        string id;
        string videoId;
        string question;
        address creator;
        uint256 createdAt;
        uint256 expiresAt; // When market closes (createdAt + MARKET_DURATION)
        uint256 yesVotes;
        uint256 noVotes;
        bool resolved;
        bool winningSide;
        MarketStatus status;
    }

    enum MarketStatus {
        Active,
        Closed,
        Resolved
    }

    struct Position {
        uint256 yesVotes;
        uint256 noVotes;
    }

    // Activity tracking for on-chain activity feed
    struct Activity {
        ActivityType activityType;
        address user;
        string marketId;
        bool isYes;
        uint256 timestamp;
    }

    enum ActivityType {
        MarketCreated,
        VoteCast,
        MarketClosed,
        MarketResolved
    }

    // State variables
    mapping(string => Market) private markets; // marketId => Market
    mapping(string => mapping(address => Position)) private positions; // marketId => user => Position
    mapping(string => address[]) private marketVoters; // marketId => voters[]
    mapping(string => Activity[]) private marketActivities; // marketId => activities[]
    Activity[] private allActivities; // Global activity feed
    string[] private marketIds; // All market IDs for enumeration
    uint256 private marketCounter; // Counter for generating unique IDs

    PointsRegistry public pointsRegistry;

    // Events
    event MarketCreated(
        string indexed marketId,
        string indexed videoId,
        string question,
        address indexed creator,
        uint256 expiresAt
    );
    event VoteCast(
        string indexed marketId,
        address indexed voter,
        bool isYes,
        uint256 amount
    );
    event MarketResolved(
        string indexed marketId,
        bool winningSide,
        uint256 yesVotes,
        uint256 noVotes
    );
    event MarketClosed(string indexed marketId);

    // Errors
    error EmptyVideoId();
    error EmptyQuestion();
    error MarketNotFound();
    error MarketExpired();
    error MarketNotExpired();
    error MarketAlreadyResolved();
    error InvalidVoteAmount();
    error Unauthorized();

    constructor(address _pointsRegistry) {
        pointsRegistry = PointsRegistry(_pointsRegistry);
    }

    /**
     * @notice Create a new prediction market
     * @param videoId Associated video ID
     * @param question Market question (e.g., "Is this video authentic?")
     * @return marketId Unique identifier for the created market
     */
    function createMarket(
        string memory videoId,
        string memory question
    ) external returns (string memory) {
        if (bytes(videoId).length == 0) revert EmptyVideoId();
        if (bytes(question).length == 0) revert EmptyQuestion();

        marketCounter++;
        string memory marketId = string(
            abi.encodePacked("market_", _uint2str(marketCounter))
        );

        uint256 createdAt = block.timestamp;
        uint256 expiresAt = createdAt + MARKET_DURATION;

        markets[marketId] = Market({
            id: marketId,
            videoId: videoId,
            question: question,
            creator: msg.sender,
            createdAt: createdAt,
            expiresAt: expiresAt,
            yesVotes: 0,
            noVotes: 0,
            resolved: false,
            winningSide: false,
            status: MarketStatus.Active
        });

        marketIds.push(marketId);

        // Record activity
        Activity memory activity = Activity({
            activityType: ActivityType.MarketCreated,
            user: msg.sender,
            marketId: marketId,
            isYes: false,
            timestamp: block.timestamp
        });
        marketActivities[marketId].push(activity);
        allActivities.push(activity);

        emit MarketCreated(marketId, videoId, question, msg.sender, expiresAt);

        return marketId;
    }

    /**
     * @notice Vote YES on a market
     * @param marketId Market to vote on
     */
    function voteYes(string memory marketId) external {
        _vote(marketId, true, 1);
    }

    /**
     * @notice Vote NO on a market
     * @param marketId Market to vote on
     */
    function voteNo(string memory marketId) external {
        _vote(marketId, false, 1);
    }

    /**
     * @notice Internal function to cast a vote
     * @param marketId Market to vote on
     * @param isYes true for YES, false for NO
     * @param amount Number of votes (always 1 for MVP)
     */
    function _vote(string memory marketId, bool isYes, uint256 amount) internal {
        Market storage market = markets[marketId];
        if (bytes(market.id).length == 0) revert MarketNotFound();
        if (block.timestamp >= market.expiresAt) revert MarketExpired();
        if (market.resolved) revert MarketAlreadyResolved();
        if (amount == 0) revert InvalidVoteAmount();

        Position storage position = positions[marketId][msg.sender];

        // Track if this is a new voter
        bool isNewVoter = (position.yesVotes == 0 && position.noVotes == 0);

        if (isYes) {
            position.yesVotes += amount;
            market.yesVotes += amount;
        } else {
            position.noVotes += amount;
            market.noVotes += amount;
        }

        // Add to voters list if first time voting
        if (isNewVoter) {
            marketVoters[marketId].push(msg.sender);
        }

        // Record activity
        Activity memory activity = Activity({
            activityType: ActivityType.VoteCast,
            user: msg.sender,
            marketId: marketId,
            isYes: isYes,
            timestamp: block.timestamp
        });
        marketActivities[marketId].push(activity);
        allActivities.push(activity);

        emit VoteCast(marketId, msg.sender, isYes, amount);
    }

    /**
     * @notice Close a market after it expires
     * @param marketId Market to close
     */
    function closeMarket(string memory marketId) external {
        Market storage market = markets[marketId];
        if (bytes(market.id).length == 0) revert MarketNotFound();
        if (block.timestamp < market.expiresAt) revert MarketNotExpired();
        if (market.status != MarketStatus.Active) revert MarketAlreadyResolved();

        market.status = MarketStatus.Closed;

        // Record activity
        Activity memory activity = Activity({
            activityType: ActivityType.MarketClosed,
            user: msg.sender,
            marketId: marketId,
            isYes: false,
            timestamp: block.timestamp
        });
        marketActivities[marketId].push(activity);
        allActivities.push(activity);

        emit MarketClosed(marketId);
    }

    /**
     * @notice Resolve a market and award points to winners
     * @dev For MVP, anyone can resolve. In production, would be oracle-based
     * @param marketId Market to resolve
     * @param winningSide true for YES wins, false for NO wins
     */
    function resolveMarket(string memory marketId, bool winningSide) external {
        Market storage market = markets[marketId];
        if (bytes(market.id).length == 0) revert MarketNotFound();
        if (block.timestamp < market.expiresAt) revert MarketNotExpired();
        if (market.resolved) revert MarketAlreadyResolved();

        market.resolved = true;
        market.winningSide = winningSide;
        market.status = MarketStatus.Resolved;

        // Award points to winners
        address[] memory voters = marketVoters[marketId];
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
            Position memory position = positions[marketId][voter];

            // Check if voter voted for the winning side
            bool isWinner = winningSide ? (position.yesVotes > 0) : (position.noVotes > 0);
            if (isWinner) {
                pointsRegistry.awardPoints(voter, WINNER_POINTS);
            }
        }

        // Record activity
        Activity memory activity = Activity({
            activityType: ActivityType.MarketResolved,
            user: msg.sender,
            marketId: marketId,
            isYes: winningSide,
            timestamp: block.timestamp
        });
        marketActivities[marketId].push(activity);
        allActivities.push(activity);

        emit MarketResolved(marketId, winningSide, market.yesVotes, market.noVotes);
    }

    /**
     * @notice Get market details
     * @param marketId Market to query
     * @return Market struct with all data
     */
    function getMarket(string memory marketId) external view returns (Market memory) {
        Market memory market = markets[marketId];
        if (bytes(market.id).length == 0) revert MarketNotFound();
        return market;
    }

    /**
     * @notice Get user's position in a market
     * @param marketId Market to query
     * @param user User address
     * @return Position struct with vote counts
     */
    function getPosition(
        string memory marketId,
        address user
    ) external view returns (Position memory) {
        return positions[marketId][user];
    }

    /**
     * @notice Get all market IDs
     * @return Array of all market IDs
     */
    function getAllMarketIds() external view returns (string[] memory) {
        return marketIds;
    }

    /**
     * @notice Get total number of markets
     * @return Total count
     */
    function getMarketCount() external view returns (uint256) {
        return marketIds.length;
    }

    /**
     * @notice Get all voters for a market
     * @param marketId Market to query
     * @return Array of voter addresses
     */
    function getMarketVoters(
        string memory marketId
    ) external view returns (address[] memory) {
        return marketVoters[marketId];
    }

    /**
     * @notice Get current odds for a market
     * @param marketId Market to query
     * @return yesPercentage Percentage for YES (0-100)
     * @return noPercentage Percentage for NO (0-100)
     */
    function getMarketOdds(
        string memory marketId
    ) external view returns (uint256 yesPercentage, uint256 noPercentage) {
        Market memory market = markets[marketId];
        if (bytes(market.id).length == 0) revert MarketNotFound();

        uint256 totalVotes = market.yesVotes + market.noVotes;
        if (totalVotes == 0) {
            return (50, 50); // Default to 50/50 if no votes
        }

        yesPercentage = (market.yesVotes * 100) / totalVotes;
        noPercentage = 100 - yesPercentage;
    }

    /**
     * @notice Check if market has expired
     * @param marketId Market to check
     * @return True if market has expired
     */
    function isMarketExpired(string memory marketId) external view returns (bool) {
        Market memory market = markets[marketId];
        if (bytes(market.id).length == 0) return false;
        return block.timestamp >= market.expiresAt;
    }

    /**
     * @notice Get all activities for a specific market
     * @param marketId Market to query
     * @return Array of Activity structs
     */
    function getMarketActivities(
        string memory marketId
    ) external view returns (Activity[] memory) {
        return marketActivities[marketId];
    }

    /**
     * @notice Get global activity feed (all activities across all markets)
     * @return Array of Activity structs
     */
    function getAllActivities() external view returns (Activity[] memory) {
        return allActivities;
    }

    /**
     * @notice Get recent activities (last N activities)
     * @param count Number of recent activities to retrieve
     * @return Array of Activity structs
     */
    function getRecentActivities(uint256 count) external view returns (Activity[] memory) {
        uint256 totalActivities = allActivities.length;
        if (count > totalActivities) {
            count = totalActivities;
        }

        Activity[] memory recent = new Activity[](count);
        uint256 startIndex = totalActivities - count;

        for (uint256 i = 0; i < count; i++) {
            recent[i] = allActivities[startIndex + i];
        }

        return recent;
    }

    /**
     * @notice Get total number of activities
     * @return Total count
     */
    function getActivityCount() external view returns (uint256) {
        return allActivities.length;
    }

    /**
     * @dev Helper function to convert uint to string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
