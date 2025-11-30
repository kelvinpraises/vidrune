// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {PointsRegistry} from "../src/PointsRegistry.sol";

contract PredictionMarketTest is Test {
    PredictionMarket public predictionMarket;
    PointsRegistry public pointsRegistry;

    address public user1 = address(0x100);
    address public user2 = address(0x200);
    address public user3 = address(0x300);

    function setUp() public {
        pointsRegistry = new PointsRegistry();
        predictionMarket = new PredictionMarket(address(pointsRegistry));

        // Authorize PredictionMarket to award points (use dummy addresses for others)
        pointsRegistry.setContracts(
            address(0x999),
            address(predictionMarket),
            address(0x888)
        );
    }

    function test_CreateMarket() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        PredictionMarket.Market memory market = predictionMarket.getMarket(marketId);

        assertEq(market.id, marketId);
        assertEq(market.videoId, "video_1");
        assertEq(market.question, "Is this authentic?");
        assertEq(market.creator, user1);
        assertEq(uint(market.status), uint(PredictionMarket.MarketStatus.Active));
        assertEq(market.yesVotes, 0);
        assertEq(market.noVotes, 0);
        assertFalse(market.resolved);
    }

    function test_CreateMarket_ExpiresAt() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        PredictionMarket.Market memory market = predictionMarket.getMarket(marketId);

        // Market should expire in 45 minutes (2700 seconds)
        assertEq(market.expiresAt, block.timestamp + 2700);
    }

    function test_RevertIf_CreateMarket_EmptyVideoId() public {
        vm.prank(user1);
        vm.expectRevert(PredictionMarket.EmptyVideoId.selector);
        predictionMarket.createMarket("", "Is this authentic?");
    }

    function test_RevertIf_CreateMarket_EmptyQuestion() public {
        vm.prank(user1);
        vm.expectRevert(PredictionMarket.EmptyQuestion.selector);
        predictionMarket.createMarket("video_1", "");
    }

    function test_VoteYes() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.prank(user2);
        predictionMarket.voteYes(marketId);

        PredictionMarket.Market memory market = predictionMarket.getMarket(marketId);
        assertEq(market.yesVotes, 1);
        assertEq(market.noVotes, 0);

        PredictionMarket.Position memory position = predictionMarket.getPosition(
            marketId,
            user2
        );
        assertEq(position.yesVotes, 1);
        assertEq(position.noVotes, 0);
    }

    function test_VoteNo() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.prank(user2);
        predictionMarket.voteNo(marketId);

        PredictionMarket.Market memory market = predictionMarket.getMarket(marketId);
        assertEq(market.yesVotes, 0);
        assertEq(market.noVotes, 1);
    }

    function test_Vote_Multiple() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.prank(user2);
        predictionMarket.voteYes(marketId);

        vm.prank(user3);
        predictionMarket.voteNo(marketId);

        PredictionMarket.Market memory market = predictionMarket.getMarket(marketId);
        assertEq(market.yesVotes, 1);
        assertEq(market.noVotes, 1);
    }

    function test_Vote_SameUserMultipleSides() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.prank(user2);
        predictionMarket.voteYes(marketId);

        vm.prank(user2);
        predictionMarket.voteNo(marketId);

        PredictionMarket.Position memory position = predictionMarket.getPosition(
            marketId,
            user2
        );
        assertEq(position.yesVotes, 1);
        assertEq(position.noVotes, 1);
    }

    function test_RevertIf_Vote_AfterExpiry() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        // Fast forward past market expiry
        vm.warp(block.timestamp + 2701);

        vm.prank(user2);
        vm.expectRevert(PredictionMarket.MarketExpired.selector);
        predictionMarket.voteYes(marketId);
    }

    function test_GetMarketOdds_NoVotes() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        (uint256 yesPercentage, uint256 noPercentage) = predictionMarket.getMarketOdds(
            marketId
        );

        // Should default to 50/50
        assertEq(yesPercentage, 50);
        assertEq(noPercentage, 50);
    }

    function test_GetMarketOdds_WithVotes() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.prank(user2);
        predictionMarket.voteYes(marketId);

        vm.prank(user3);
        predictionMarket.voteYes(marketId);

        vm.prank(address(0x400));
        predictionMarket.voteNo(marketId);

        (uint256 yesPercentage, uint256 noPercentage) = predictionMarket.getMarketOdds(
            marketId
        );

        // 2 YES, 1 NO = 66% YES, 33% NO
        assertEq(yesPercentage, 66);
        assertEq(noPercentage, 34);
    }

    function test_ResolveMarket_YesWins() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.prank(user2);
        predictionMarket.voteYes(marketId);

        vm.prank(user3);
        predictionMarket.voteNo(marketId);

        // Fast forward past expiry
        vm.warp(block.timestamp + 2701);

        // Resolve with YES winning
        predictionMarket.resolveMarket(marketId, true);

        PredictionMarket.Market memory market = predictionMarket.getMarket(marketId);
        assertTrue(market.resolved);
        assertTrue(market.winningSide);
        assertEq(uint(market.status), uint(PredictionMarket.MarketStatus.Resolved));

        // Winner should get 5 points
        assertEq(pointsRegistry.getPoints(user2), 5);
        assertEq(pointsRegistry.getPoints(user3), 0);
    }

    function test_ResolveMarket_NoWins() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.prank(user2);
        predictionMarket.voteYes(marketId);

        vm.prank(user3);
        predictionMarket.voteNo(marketId);

        vm.warp(block.timestamp + 2701);

        // Resolve with NO winning
        predictionMarket.resolveMarket(marketId, false);

        // NO voter should get points
        assertEq(pointsRegistry.getPoints(user2), 0);
        assertEq(pointsRegistry.getPoints(user3), 5);
    }

    function test_RevertIf_ResolveMarket_BeforeExpiry() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        // Try to resolve immediately (should fail)
        vm.expectRevert(PredictionMarket.MarketNotExpired.selector);
        predictionMarket.resolveMarket(marketId, true);
    }

    function test_RevertIf_ResolveMarket_AlreadyResolved() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.warp(block.timestamp + 2701);

        predictionMarket.resolveMarket(marketId, true);

        vm.expectRevert(PredictionMarket.MarketAlreadyResolved.selector);
        predictionMarket.resolveMarket(marketId, false);
    }

    function test_GetMarketActivities() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        vm.prank(user2);
        predictionMarket.voteYes(marketId);

        vm.prank(user3);
        predictionMarket.voteNo(marketId);

        PredictionMarket.Activity[] memory activities = predictionMarket
            .getMarketActivities(marketId);

        // Should have 3 activities: 1 creation + 2 votes
        assertEq(activities.length, 3);

        // First should be market creation
        assertEq(
            uint(activities[0].activityType),
            uint(PredictionMarket.ActivityType.MarketCreated)
        );
        assertEq(activities[0].user, user1);

        // Second should be YES vote
        assertEq(
            uint(activities[1].activityType),
            uint(PredictionMarket.ActivityType.VoteCast)
        );
        assertEq(activities[1].user, user2);
        assertTrue(activities[1].isYes);

        // Third should be NO vote
        assertEq(
            uint(activities[2].activityType),
            uint(PredictionMarket.ActivityType.VoteCast)
        );
        assertEq(activities[2].user, user3);
        assertFalse(activities[2].isYes);
    }

    function test_GetAllActivities() public {
        vm.prank(user1);
        string memory marketId1 = predictionMarket.createMarket("video_1", "Question 1");

        vm.prank(user2);
        predictionMarket.createMarket("video_2", "Question 2");

        vm.prank(user3);
        predictionMarket.voteYes(marketId1);

        PredictionMarket.Activity[] memory activities = predictionMarket.getAllActivities();

        // Should have 3 activities total
        assertEq(activities.length, 3);
    }

    function test_GetRecentActivities() public {
        vm.prank(user1);
        predictionMarket.createMarket("video_1", "Question 1");

        vm.prank(user2);
        predictionMarket.createMarket("video_2", "Question 2");

        vm.prank(user3);
        predictionMarket.createMarket("video_3", "Question 3");

        PredictionMarket.Activity[] memory recent = predictionMarket.getRecentActivities(2);

        // Should return last 2 activities
        assertEq(recent.length, 2);
        assertEq(recent[0].user, user2);
        assertEq(recent[1].user, user3);
    }

    function test_GetMarketCount() public {
        assertEq(predictionMarket.getMarketCount(), 0);

        vm.prank(user1);
        predictionMarket.createMarket("video_1", "Question 1");

        assertEq(predictionMarket.getMarketCount(), 1);

        vm.prank(user2);
        predictionMarket.createMarket("video_2", "Question 2");

        assertEq(predictionMarket.getMarketCount(), 2);
    }

    function test_IsMarketExpired() public {
        vm.prank(user1);
        string memory marketId = predictionMarket.createMarket(
            "video_1",
            "Is this authentic?"
        );

        assertFalse(predictionMarket.isMarketExpired(marketId));

        vm.warp(block.timestamp + 2701);

        assertTrue(predictionMarket.isMarketExpired(marketId));
    }
}
