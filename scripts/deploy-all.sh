#!/usr/bin/env bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up IC replica...${NC}"
    
    echo -e "${BLUE}Stopping IC replica...${NC}"
    dfx stop 2>/dev/null || true
    
    echo -e "${GREEN}✅ IC replica stopped${NC}"
}

# Set trap for cleanup on exit
trap cleanup EXIT INT TERM

echo -e "${GREEN}🚀 Complete Vidrune System Deployment Pipeline${NC}"
echo -e "${CYAN}💡 This script will manage multiple terminals automatically${NC}"
echo -e "${CYAN}💡 Press Ctrl+C to stop all processes and cleanup${NC}"
echo ""

# Clean start
echo -e "${BLUE}🧹 Step 1: Clean slate${NC}"

# Kill any existing processes
pkill -f "pocket-ic" 2>/dev/null || true
pkill -f "dfx start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
dfx stop 2>/dev/null || true
sleep 2

# Remove state
rm -rf .dfx 2>/dev/null || true

echo -e "${BLUE}⚡ Step 2: Start IC replica in background${NC}"

# Start dfx in background
dfx start --background --clean
# Don't capture PID since dfx manages its own processes

echo -e "${YELLOW}IC Replica started in background${NC}"

# Wait for replica to be ready with timeout
echo "Waiting for replica to be healthy..."
for i in {1..60}; do
    if dfx ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ IC replica is healthy${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}❌ Replica failed to start properly${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""

# Get current principal
OWNER=$(dfx identity get-principal)
echo -e "${YELLOW}Owner Principal: ${OWNER}${NC}"

echo -e "${BLUE}📦 Step 3: Deploy VI Token (ICRC-1/ICRC-2)${NC}"
echo -e "${YELLOW}⏳ This may take a while - downloading WASM from DFINITY...${NC}"

# First try to deploy without timeout to see the actual error
dfx deploy vi_token --argument "(variant {
    Init = record {
      token_name = \"Vidrune Indexing Token\";
      token_symbol = \"VI\";
      minting_account = record {
        owner = principal \"${OWNER}\";
      };
      initial_balances = vec {
        record {
          record {
            owner = principal \"${OWNER}\";
          };
          1_000_000_000_000_000;
        };
      };
      metadata = vec {
        record { \"description\"; variant { Text = \"Vidrune Indexing Token - Powers video indexing on the vidrune platform\" } };
        record { \"website\"; variant { Text = \"https://vidrune.com\" } };
      };
      transfer_fee = 10_000;
      archive_options = record {
        trigger_threshold = 2000;
        num_blocks_to_archive = 1000;
        controller_id = principal \"${OWNER}\";
      };
      feature_flags = opt record {
        icrc2 = true;
      };
    }
  })"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ VI Token deployment failed${NC}"
    echo -e "${YELLOW}💡 This can happen due to:${NC}"
    echo -e "${YELLOW}   - Network issues downloading the WASM${NC}"
    echo -e "${YELLOW}   - DFINITY servers being slow${NC}"
    echo -e "${YELLOW}   - Invalid arguments format${NC}"
    echo -e "${BLUE}🔄 Try running: dfx deploy vi_token --help${NC}"
    exit 1
fi

VI_TOKEN_ID=$(dfx canister id vi_token)
echo -e "${GREEN}✅ VI Token deployed: ${VI_TOKEN_ID}${NC}"

echo -e "${BLUE}📦 Step 4: Deploy Access Control Canister${NC}"
dfx deploy vidrune_access_control

ACCESS_CONTROL_ID=$(dfx canister id vidrune_access_control)
echo -e "${GREEN}✅ Access Control deployed: ${ACCESS_CONTROL_ID}${NC}"

echo -e "${BLUE}📦 Step 5: Setup Frontend Canister IDs & Build${NC}"
echo -e "${YELLOW}Setting up canister IDs in public...${NC}"

# Copy canister IDs to public directory for frontend access
cp .dfx/local/canister_ids.json apps/client/public/canister_ids.json
echo -e "${GREEN}✅ Canister IDs copied to apps/client/public/canister_ids.json${NC}"

echo -e "${YELLOW}Building frontend...${NC}"
cd apps/client
npm run out
cd ../..

echo -e "${BLUE}📦 Step 6: Deploy Assets Canister${NC}"
dfx deploy vidrune_assets

ASSETS_ID=$(dfx canister id vidrune_assets)
echo -e "${GREEN}✅ Assets deployed: ${ASSETS_ID}${NC}"

echo -e "${BLUE}🔗 Step 7: Connect Access Control to VI Token${NC}"
dfx canister call vidrune_access_control setVITokenCanister "(principal \"${VI_TOKEN_ID}\")"
echo -e "${GREEN}✅ Canisters connected${NC}"

echo -e "${BLUE}💰 Step 8: Fund Access Control with VI Tokens${NC}"
dfx canister call vi_token icrc1_transfer "(record {
  from_subaccount = null;
  to = record {
    owner = principal \"${ACCESS_CONTROL_ID}\";
    subaccount = null;
  };
  amount = 100_000_000_000_000;
  fee = null;
  memo = null;
  created_at_time = null;
})"
echo -e "${GREEN}✅ Access Control funded with 1M VI tokens${NC}"

echo -e "${BLUE}🧪 Step 9: System Integration Tests${NC}"

echo "• Token name and symbol:"
dfx canister call vi_token icrc1_name
dfx canister call vi_token icrc1_symbol

echo "• Owner VI token balance:"
dfx canister call vi_token icrc1_balance_of "(record { owner = principal \"${OWNER}\"; })"

echo "• Access Control token balance:"
dfx canister call vi_token icrc1_balance_of "(record { owner = principal \"${ACCESS_CONTROL_ID}\"; })"

echo "• System stats:"
dfx canister call vidrune_access_control getStats

echo "• Can user upload check:"
dfx canister call vidrune_access_control canUpload

echo -e "${GREEN}🎉 COMPLETE SYSTEM DEPLOYED!${NC}"
echo -e "${YELLOW}=== SYSTEM SUMMARY ===${NC}"
echo -e "VI Token (ICRC-1/ICRC-2): ${VI_TOKEN_ID}"
echo -e "Access Control:           ${ACCESS_CONTROL_ID}"
echo -e "Assets:                   ${ASSETS_ID}"
echo -e "IC Replica:               http://127.0.0.1:4943"
echo -e "Assets URL:               http://${ASSETS_ID}.localhost:4943/"
echo -e ""
echo -e "${YELLOW}=== QUICK TEST COMMANDS ===${NC}"
echo -e "1. Get testnet tokens:"
echo -e "   dfx canister call vidrune_access_control getTestnetTokens"
echo -e ""
echo -e "2. Approve spending for uploads:"
echo -e "   dfx canister call vi_token icrc2_approve '(record { amount = 200_000_000; spender = record { owner = principal \"${ACCESS_CONTROL_ID}\" }; })'"
echo -e ""
echo -e "3. Start development server:"
echo -e "   cd apps/client && npm run dev"
echo -e ""
echo -e "4. Test in browser console (at http://localhost:3000):"
echo -e "   testICIntegration()"
echo -e ""
echo -e "${GREEN}✨ System deployed successfully!${NC}"
echo -e "${CYAN}💡 Frontend build is ready in apps/client/dist${NC}"
echo -e "${CYAN}💡 Run 'dfx stop' to stop the IC replica${NC}"