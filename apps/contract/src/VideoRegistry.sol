// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PointsRegistry.sol";

/**
 * @title VideoRegistry
 * @notice Unified registry for videos and convictions on Vidrune
 * @dev Videos enter a 15-minute conviction period before being finalized
 * Convictions (challenges) are nested within each video for simpler queries
 */
contract VideoRegistry {
    // Constants
    uint256 public constant UPLOAD_POINTS = 10;
    uint256 public constant CONVICTION_PERIOD = 900; // 15 minutes in seconds

    // Structs
    struct Conviction {
        address challenger;
        string walrusBlobId; // Walrus blob ID containing proof/evidence
        uint256 timestamp;
        ConvictionStatus status;
    }

    struct VideoIndex {
        string id;
        string walrusBlobId; // Zipped package with video + metadata
        address uploader;
        uint256 uploadTime;
        uint256 convictionPeriodEnd;
        VideoStatus status;
        Conviction[] convictions; // All convictions for this video
    }

    enum VideoStatus {
        Pending, // In conviction period
        Finalized, // Conviction period passed, no challenges
        Challenged // Has active challenges
    }

    enum ConvictionStatus {
        Active, // Conviction is active
        Resolved, // Conviction has been resolved
        Dismissed // Conviction was dismissed
    }

    // State variables
    mapping(string => VideoIndex) private videos;
    string[] private videoIds;
    PointsRegistry public pointsRegistry;

    // Events
    event VideoIndexed(
        string indexed videoId,
        address indexed uploader,
        string walrusBlobId,
        uint256 uploadTime,
        uint256 convictionPeriodEnd
    );
    event VideoFinalized(string indexed videoId);
    event VideoChallenged(string indexed videoId);

    event ConvictionSubmitted(
        string indexed videoId,
        uint256 convictionIndex,
        address indexed challenger,
        string walrusBlobId,
        uint256 timestamp
    );
    event ConvictionResolved(string indexed videoId, uint256 convictionIndex, bool upheld);
    event ConvictionDismissed(string indexed videoId, uint256 convictionIndex);

    // Errors
    error VideoAlreadyExists();
    error VideoNotFound();
    error EmptyVideoId();
    error EmptyBlobId();
    error Unauthorized();
    error InvalidStatus();
    error ConvictionPeriodActive();
    error ConvictionPeriodEnded();
    error ConvictionNotFound();

    constructor(address _pointsRegistry) {
        pointsRegistry = PointsRegistry(_pointsRegistry);
    }

    /**
     * @notice Submit a new video index to the platform
     * @dev Awards points to uploader and starts conviction period
     * @param videoId Unique identifier for the video
     * @param walrusBlobId Walrus blob ID containing the zipped video package
     */
    function submitIndex(string memory videoId, string memory walrusBlobId) external {
        if (bytes(videoId).length == 0) revert EmptyVideoId();
        if (bytes(walrusBlobId).length == 0) revert EmptyBlobId();
        if (bytes(videos[videoId].id).length != 0) revert VideoAlreadyExists();

        uint256 currentTime = block.timestamp;
        uint256 convictionEnd = currentTime + CONVICTION_PERIOD;

        // Create new video with empty convictions array
        VideoIndex storage video = videos[videoId];
        video.id = videoId;
        video.walrusBlobId = walrusBlobId;
        video.uploader = msg.sender;
        video.uploadTime = currentTime;
        video.convictionPeriodEnd = convictionEnd;
        video.status = VideoStatus.Pending;

        videoIds.push(videoId);

        // Award points for upload
        pointsRegistry.awardPoints(msg.sender, UPLOAD_POINTS);

        emit VideoIndexed(videoId, msg.sender, walrusBlobId, currentTime, convictionEnd);
    }

    /**
     * @notice Submit a conviction (challenge) against a video
     * @dev Can only be submitted during conviction period
     * @param videoId Video being challenged
     * @param proofBlobId Walrus blob ID containing evidence/proof
     */
    function submitConviction(string memory videoId, string memory proofBlobId) external {
        if (bytes(proofBlobId).length == 0) revert EmptyBlobId();

        VideoIndex storage video = videos[videoId];
        if (bytes(video.id).length == 0) revert VideoNotFound();
        if (block.timestamp >= video.convictionPeriodEnd) revert ConvictionPeriodEnded();

        // Create and add conviction
        Conviction memory newConviction = Conviction({
            challenger: msg.sender,
            walrusBlobId: proofBlobId,
            timestamp: block.timestamp,
            status: ConvictionStatus.Active
        });

        video.convictions.push(newConviction);
        uint256 convictionIndex = video.convictions.length - 1;

        // Mark video as challenged
        if (video.status == VideoStatus.Pending) {
            video.status = VideoStatus.Challenged;
            emit VideoChallenged(videoId);
        }

        emit ConvictionSubmitted(
            videoId,
            convictionIndex,
            msg.sender,
            proofBlobId,
            block.timestamp
        );
    }

    /**
     * @notice Resolve a conviction
     * @param videoId Video with the conviction
     * @param convictionIndex Index of conviction in the array
     * @param upheld Whether the conviction was upheld
     */
    function resolveConviction(
        string memory videoId,
        uint256 convictionIndex,
        bool upheld
    ) external {
        VideoIndex storage video = videos[videoId];
        if (bytes(video.id).length == 0) revert VideoNotFound();
        if (convictionIndex >= video.convictions.length) revert ConvictionNotFound();

        Conviction storage conviction = video.convictions[convictionIndex];
        if (conviction.status != ConvictionStatus.Active) revert InvalidStatus();

        conviction.status = ConvictionStatus.Resolved;
        emit ConvictionResolved(videoId, convictionIndex, upheld);
    }

    /**
     * @notice Dismiss a conviction
     * @param videoId Video with the conviction
     * @param convictionIndex Index of conviction in the array
     */
    function dismissConviction(string memory videoId, uint256 convictionIndex) external {
        VideoIndex storage video = videos[videoId];
        if (bytes(video.id).length == 0) revert VideoNotFound();
        if (convictionIndex >= video.convictions.length) revert ConvictionNotFound();

        Conviction storage conviction = video.convictions[convictionIndex];
        if (conviction.status != ConvictionStatus.Active) revert InvalidStatus();

        conviction.status = ConvictionStatus.Dismissed;
        emit ConvictionDismissed(videoId, convictionIndex);
    }

    /**
     * @notice Finalize a video after conviction period
     * @param videoId Video to finalize
     */
    function finalizeVideo(string memory videoId) external {
        VideoIndex storage video = videos[videoId];
        if (bytes(video.id).length == 0) revert VideoNotFound();
        if (video.status != VideoStatus.Pending) revert InvalidStatus();
        if (block.timestamp < video.convictionPeriodEnd) revert ConvictionPeriodActive();

        video.status = VideoStatus.Finalized;
        emit VideoFinalized(videoId);
    }

    /**
     * @notice Get video details including all convictions
     * @param videoId Video to query
     * @return VideoIndex struct with all video data and convictions
     */
    function getVideo(string memory videoId) external view returns (VideoIndex memory) {
        VideoIndex memory video = videos[videoId];
        if (bytes(video.id).length == 0) revert VideoNotFound();
        return video;
    }

    /**
     * @notice Get specific conviction for a video
     * @param videoId Video to query
     * @param convictionIndex Index of conviction
     * @return Conviction struct
     */
    function getConviction(
        string memory videoId,
        uint256 convictionIndex
    ) external view returns (Conviction memory) {
        VideoIndex storage video = videos[videoId];
        if (bytes(video.id).length == 0) revert VideoNotFound();
        if (convictionIndex >= video.convictions.length) revert ConvictionNotFound();
        return video.convictions[convictionIndex];
    }

    /**
     * @notice Get number of convictions for a video
     * @param videoId Video to query
     * @return Number of convictions
     */
    function getConvictionCount(string memory videoId) external view returns (uint256) {
        VideoIndex storage video = videos[videoId];
        if (bytes(video.id).length == 0) revert VideoNotFound();
        return video.convictions.length;
    }

    /**
     * @notice Get all video IDs
     * @return Array of all video IDs
     */
    function getAllVideoIds() external view returns (string[] memory) {
        return videoIds;
    }

    /**
     * @notice Get total number of videos
     * @return Total count
     */
    function getVideoCount() external view returns (uint256) {
        return videoIds.length;
    }

    /**
     * @notice Check if video is in conviction period
     * @param videoId Video to check
     * @return True if still in conviction period
     */
    function isInConvictionPeriod(string memory videoId) external view returns (bool) {
        VideoIndex storage video = videos[videoId];
        if (bytes(video.id).length == 0) return false;
        return block.timestamp < video.convictionPeriodEnd;
    }
}
