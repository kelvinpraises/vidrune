// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PointsRegistry
 * @notice Global points tracking system for Vidrune platform
 * @dev Awards points for various platform activities (uploads, challenges, market wins)
 */
contract PointsRegistry {
    // State variables
    mapping(address => uint256) private points;

    address public videoRegistry;
    address public predictionMarket;
    address public convictionRegistry;
    address public owner;

    // Events
    event PointsAwarded(address indexed user, uint256 amount, string reason);
    event ContractsSet(
        address videoRegistry,
        address predictionMarket,
        address convictionRegistry
    );

    // Errors
    error Unauthorized();
    error InvalidAddress();

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Set authorized contracts that can award points
     * @dev Only owner can call this function
     * @param _videoRegistry Address of VideoRegistry contract
     * @param _predictionMarket Address of PredictionMarket contract
     * @param _convictionRegistry Address of ConvictionRegistry contract
     */
    function setContracts(
        address _videoRegistry,
        address _predictionMarket,
        address _convictionRegistry
    ) external {
        if (msg.sender != owner) revert Unauthorized();
        if (_videoRegistry == address(0) || _predictionMarket == address(0)) {
            revert InvalidAddress();
        }

        videoRegistry = _videoRegistry;
        predictionMarket = _predictionMarket;
        convictionRegistry = _convictionRegistry;

        emit ContractsSet(_videoRegistry, _predictionMarket, _convictionRegistry);
    }

    /**
     * @notice Award points to a user
     * @dev Only authorized contracts can call this
     * @param user Address of user to award points to
     * @param amount Number of points to award
     */
    function awardPoints(address user, uint256 amount) external {
        if (
            msg.sender != videoRegistry &&
            msg.sender != predictionMarket &&
            msg.sender != convictionRegistry
        ) {
            revert Unauthorized();
        }

        points[user] += amount;
        emit PointsAwarded(user, amount, "Platform activity");
    }

    /**
     * @notice Get points balance for a user
     * @param user Address to query
     * @return Number of points the user has
     */
    function getPoints(address user) external view returns (uint256) {
        return points[user];
    }
}
