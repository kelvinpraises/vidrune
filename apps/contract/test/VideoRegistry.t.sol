// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {VideoRegistry} from "../src/VideoRegistry.sol";
import {PointsRegistry} from "../src/PointsRegistry.sol";

contract VideoRegistryTest is Test {
    VideoRegistry public videoRegistry;
    PointsRegistry public pointsRegistry;

    address public user1 = address(0x100);
    address public user2 = address(0x200);

    function setUp() public {
        pointsRegistry = new PointsRegistry();
        videoRegistry = new VideoRegistry(address(pointsRegistry));

        // Authorize VideoRegistry to award points (use dummy addresses for others)
        pointsRegistry.setContracts(address(videoRegistry), address(0x999), address(0x888));
    }

    function test_SubmitIndex() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        VideoRegistry.VideoIndex memory video = videoRegistry.getVideo("video_1");

        assertEq(video.id, "video_1");
        assertEq(video.walrusBlobId, "blob_abc");
        assertEq(video.uploader, user1);
        assertEq(uint(video.status), uint(VideoRegistry.VideoStatus.Pending));

        // Check points awarded
        assertEq(pointsRegistry.getPoints(user1), 10);
    }

    function test_SubmitIndex_ConvictionPeriod() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        VideoRegistry.VideoIndex memory video = videoRegistry.getVideo("video_1");

        // Conviction period should be 15 minutes (900 seconds)
        assertEq(video.convictionPeriodEnd, block.timestamp + 900);

        // Should be in conviction period
        assertTrue(videoRegistry.isInConvictionPeriod("video_1"));
    }

    function test_RevertIf_SubmitIndex_EmptyVideoId() public {
        vm.prank(user1);
        vm.expectRevert(VideoRegistry.EmptyVideoId.selector);
        videoRegistry.submitIndex("", "blob_abc");
    }

    function test_RevertIf_SubmitIndex_EmptyBlobId() public {
        vm.prank(user1);
        vm.expectRevert(VideoRegistry.EmptyBlobId.selector);
        videoRegistry.submitIndex("video_1", "");
    }

    function test_RevertIf_SubmitIndex_Duplicate() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        vm.prank(user2);
        vm.expectRevert(VideoRegistry.VideoAlreadyExists.selector);
        videoRegistry.submitIndex("video_1", "blob_xyz");
    }

    function test_SubmitConviction() public {
        // Submit video
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        // Submit conviction
        vm.prank(user2);
        videoRegistry.submitConviction("video_1", "proof_blob");

        VideoRegistry.VideoIndex memory video = videoRegistry.getVideo("video_1");

        // Video should be marked as challenged
        assertEq(uint(video.status), uint(VideoRegistry.VideoStatus.Challenged));

        // Should have 1 conviction
        assertEq(video.convictions.length, 1);
        assertEq(videoRegistry.getConvictionCount("video_1"), 1);

        // Check conviction details
        VideoRegistry.Conviction memory conviction = videoRegistry.getConviction(
            "video_1",
            0
        );
        assertEq(conviction.challenger, user2);
        assertEq(conviction.walrusBlobId, "proof_blob");
        assertEq(uint(conviction.status), uint(VideoRegistry.ConvictionStatus.Active));
    }

    function test_SubmitConviction_Multiple() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        vm.prank(user2);
        videoRegistry.submitConviction("video_1", "proof_1");

        vm.prank(address(0x300));
        videoRegistry.submitConviction("video_1", "proof_2");

        assertEq(videoRegistry.getConvictionCount("video_1"), 2);
    }

    function test_RevertIf_SubmitConviction_AfterPeriod() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        // Fast forward past conviction period
        vm.warp(block.timestamp + 901);

        vm.prank(user2);
        vm.expectRevert(VideoRegistry.ConvictionPeriodEnded.selector);
        videoRegistry.submitConviction("video_1", "proof_blob");
    }

    function test_FinalizeVideo() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        // Fast forward past conviction period
        vm.warp(block.timestamp + 901);

        videoRegistry.finalizeVideo("video_1");

        VideoRegistry.VideoIndex memory video = videoRegistry.getVideo("video_1");
        assertEq(uint(video.status), uint(VideoRegistry.VideoStatus.Finalized));
    }

    function test_RevertIf_FinalizeVideo_DuringPeriod() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        // Try to finalize immediately (should fail)
        vm.expectRevert(VideoRegistry.ConvictionPeriodActive.selector);
        videoRegistry.finalizeVideo("video_1");
    }

    function test_ResolveConviction() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        vm.prank(user2);
        videoRegistry.submitConviction("video_1", "proof_blob");

        videoRegistry.resolveConviction("video_1", 0, true);

        VideoRegistry.Conviction memory conviction = videoRegistry.getConviction(
            "video_1",
            0
        );
        assertEq(uint(conviction.status), uint(VideoRegistry.ConvictionStatus.Resolved));
    }

    function test_DismissConviction() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_abc");

        vm.prank(user2);
        videoRegistry.submitConviction("video_1", "proof_blob");

        videoRegistry.dismissConviction("video_1", 0);

        VideoRegistry.Conviction memory conviction = videoRegistry.getConviction(
            "video_1",
            0
        );
        assertEq(uint(conviction.status), uint(VideoRegistry.ConvictionStatus.Dismissed));
    }

    function test_GetAllVideoIds() public {
        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_1");

        vm.prank(user2);
        videoRegistry.submitIndex("video_2", "blob_2");

        string[] memory ids = videoRegistry.getAllVideoIds();
        assertEq(ids.length, 2);
        assertEq(ids[0], "video_1");
        assertEq(ids[1], "video_2");
    }

    function test_GetVideoCount() public {
        assertEq(videoRegistry.getVideoCount(), 0);

        vm.prank(user1);
        videoRegistry.submitIndex("video_1", "blob_1");

        assertEq(videoRegistry.getVideoCount(), 1);

        vm.prank(user2);
        videoRegistry.submitIndex("video_2", "blob_2");

        assertEq(videoRegistry.getVideoCount(), 2);
    }
}
