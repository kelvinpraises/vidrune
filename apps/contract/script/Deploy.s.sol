// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PointsRegistry} from "../src/PointsRegistry.sol";
import {VideoRegistry} from "../src/VideoRegistry.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

/**
 * @title DeployVidrune
 * @notice Deployment script for all Vidrune contracts on Somnia testnet
 * @dev Deploys contracts in correct order and links them together
 */
contract DeployVidrune is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy PointsRegistry
        PointsRegistry pointsRegistry = new PointsRegistry();
        console.log("PointsRegistry:", address(pointsRegistry));

        // 2. Deploy VideoRegistry (includes convictions)
        VideoRegistry videoRegistry = new VideoRegistry(address(pointsRegistry));
        console.log("VideoRegistry:", address(videoRegistry));

        // 3. Deploy PredictionMarket
        PredictionMarket predictionMarket = new PredictionMarket(address(pointsRegistry));
        console.log("PredictionMarket:", address(predictionMarket));

        // 4. Link contracts - grant permissions to award points
        pointsRegistry.setContracts(
            address(videoRegistry),
            address(predictionMarket),
            address(0) // No conviction registry (merged into VideoRegistry)
        );

        console.log("\n=== Deployment Complete ===");
        console.log("Copy these addresses to your .env files:");
        console.log("VIDEO_REGISTRY_ADDRESS=%s", address(videoRegistry));
        console.log("PREDICTION_MARKET_ADDRESS=%s", address(predictionMarket));
        console.log("POINTS_REGISTRY_ADDRESS=%s", address(pointsRegistry));

        vm.stopBroadcast();
        console.log("VITE_PREDICTION_MARKET_ADDRESS=%s", address(predictionMarket));
        console.log("\n");
    }
}
