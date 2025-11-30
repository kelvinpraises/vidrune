// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PointsRegistry} from "../src/PointsRegistry.sol";

contract PointsRegistryTest is Test {
    PointsRegistry public pointsRegistry;

    address public videoRegistry = address(0x1);
    address public predictionMarket = address(0x2);
    address public convictionRegistry = address(0x3);

    address public user1 = address(0x100);
    address public user2 = address(0x200);

    function setUp() public {
        pointsRegistry = new PointsRegistry();

        // Set authorized contracts
        pointsRegistry.setContracts(videoRegistry, predictionMarket, convictionRegistry);
    }

    function test_SetContracts() public view {
        assertEq(pointsRegistry.videoRegistry(), videoRegistry);
        assertEq(pointsRegistry.predictionMarket(), predictionMarket);
        assertEq(pointsRegistry.convictionRegistry(), convictionRegistry);
    }

    function test_AwardPoints_FromVideoRegistry() public {
        vm.prank(videoRegistry);
        pointsRegistry.awardPoints(user1, 10);

        assertEq(pointsRegistry.getPoints(user1), 10);
    }

    function test_AwardPoints_FromPredictionMarket() public {
        vm.prank(predictionMarket);
        pointsRegistry.awardPoints(user1, 5);

        assertEq(pointsRegistry.getPoints(user1), 5);
    }

    function test_AwardPoints_Multiple() public {
        vm.prank(videoRegistry);
        pointsRegistry.awardPoints(user1, 10);

        vm.prank(predictionMarket);
        pointsRegistry.awardPoints(user1, 5);

        assertEq(pointsRegistry.getPoints(user1), 15);
    }

    function test_AwardPoints_MultipleUsers() public {
        vm.prank(videoRegistry);
        pointsRegistry.awardPoints(user1, 10);

        vm.prank(videoRegistry);
        pointsRegistry.awardPoints(user2, 10);

        assertEq(pointsRegistry.getPoints(user1), 10);
        assertEq(pointsRegistry.getPoints(user2), 10);
    }

    function test_RevertIf_AwardPoints_Unauthorized() public {
        // Should fail - not an authorized contract
        vm.prank(user1);
        vm.expectRevert(PointsRegistry.Unauthorized.selector);
        pointsRegistry.awardPoints(user2, 10);
    }

    function test_RevertIf_SetContracts_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert(PointsRegistry.Unauthorized.selector);
        pointsRegistry.setContracts(address(0x4), address(0x5), address(0x6));
    }

    function test_GetPoints_NoPoints() public view {
        assertEq(pointsRegistry.getPoints(user1), 0);
    }
}
