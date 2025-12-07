#!/bin/bash

# Somnia Testnet Deployment Script
# Uses forge create (forge script not supported on Somnia)

set -e

RPC_URL="https://dream-rpc.somnia.network"
CHAIN_ID="50312"

# Check if private key is set
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "Error: DEPLOYER_PRIVATE_KEY environment variable not set"
    echo "Usage: export DEPLOYER_PRIVATE_KEY=0x... && ./scripts/deploy.sh"
    exit 1
fi

echo "=== Deploying to Somnia Testnet ==="
echo ""

# 1. Deploy PointsRegistry
echo "Deploying PointsRegistry..."
POINTS_OUTPUT=$(forge create src/PointsRegistry.sol:PointsRegistry \
    --rpc-url "$RPC_URL" \
    --chain-id "$CHAIN_ID" \
    --private-key "$DEPLOYER_PRIVATE_KEY" \
    --broadcast 2>&1)

echo "$POINTS_OUTPUT"
POINTS_REGISTRY=$(echo "$POINTS_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$POINTS_REGISTRY" ]; then
    echo "Failed to deploy PointsRegistry"
    exit 1
fi

echo ""
echo "PointsRegistry deployed at: $POINTS_REGISTRY"
echo ""

sleep 2

# 2. Deploy VideoRegistry
echo "Deploying VideoRegistry..."
VIDEO_OUTPUT=$(forge create src/VideoRegistry.sol:VideoRegistry \
    --rpc-url "$RPC_URL" \
    --chain-id "$CHAIN_ID" \
    --private-key "$DEPLOYER_PRIVATE_KEY" \
    --broadcast \
    --constructor-args "$POINTS_REGISTRY" 2>&1)

echo "$VIDEO_OUTPUT"
VIDEO_REGISTRY=$(echo "$VIDEO_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$VIDEO_REGISTRY" ]; then
    echo "Failed to deploy VideoRegistry"
    exit 1
fi

echo ""
echo "VideoRegistry deployed at: $VIDEO_REGISTRY"
echo ""

sleep 2

# 3. Deploy PredictionMarket
echo "Deploying PredictionMarket..."
MARKET_OUTPUT=$(forge create src/PredictionMarket.sol:PredictionMarket \
    --rpc-url "$RPC_URL" \
    --chain-id "$CHAIN_ID" \
    --private-key "$DEPLOYER_PRIVATE_KEY" \
    --broadcast \
    --constructor-args "$POINTS_REGISTRY" 2>&1)

echo "$MARKET_OUTPUT"
PREDICTION_MARKET=$(echo "$MARKET_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$PREDICTION_MARKET" ]; then
    echo "Failed to deploy PredictionMarket"
    exit 1
fi

echo ""
echo "PredictionMarket deployed at: $PREDICTION_MARKET"
echo ""

sleep 2

# 4. Link contracts
echo "Linking contracts (setContracts)..."
cast send "$POINTS_REGISTRY" \
    "setContracts(address,address,address)" \
    "$VIDEO_REGISTRY" \
    "$PREDICTION_MARKET" \
    "0x0000000000000000000000000000000000000000" \
    --rpc-url "$RPC_URL" \
    --chain-id "$CHAIN_ID" \
    --private-key "$DEPLOYER_PRIVATE_KEY"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Copy these to your .env files:"
echo "POINTS_REGISTRY_ADDRESS=$POINTS_REGISTRY"
echo "VIDEO_REGISTRY_ADDRESS=$VIDEO_REGISTRY"
echo "PREDICTION_MARKET_ADDRESS=$PREDICTION_MARKET"
echo "VITE_PREDICTION_MARKET_ADDRESS=$PREDICTION_MARKET"
