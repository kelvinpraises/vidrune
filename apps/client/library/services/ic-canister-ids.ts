// Canister ID management for different environments
export interface CanisterIds {
  viToken: string;
  accessControl: string;
  assets: string;
}

export async function getCanisterIds(): Promise<CanisterIds | null> {
  try {
    // Try to get from environment variables first (for production)
    const viTokenId = process.env.NEXT_PUBLIC_VI_TOKEN_CANISTER_ID;
    const accessControlId = process.env.NEXT_PUBLIC_ACCESS_CONTROL_CANISTER_ID;
    const assetsId = process.env.NEXT_PUBLIC_ASSETS_CANISTER_ID;

    if (viTokenId && accessControlId && assetsId) {
      return { 
        viToken: viTokenId, 
        accessControl: accessControlId,
        assets: assetsId 
      };
    }

    // For local development, try to read from .dfx/local/canister_ids.json
    const isLocal = !window.location.host.endsWith("ic0.app");
    if (isLocal) {
      try {
        // In development, we'll use a fetch to get the canister IDs
        // This assumes the .dfx/local/canister_ids.json is served by the dev server
        const response = await fetch('/canister_ids.json');
        if (response.ok) {
          const canisterIds = await response.json();
          return {
            viToken: canisterIds.vi_token?.local,
            accessControl: canisterIds.vidrune_access_control?.local,
            assets: canisterIds.vidrune_assets?.local,
          };
        }
      } catch (error) {
        // If fetching fails, fall back to hardcoded local IDs
        console.warn("Could not fetch canister IDs, using defaults:", error);
      }

      // Fallback to typical local development IDs
      // These will be replaced when the deployment script runs
      return {
        viToken: "rrkah-fqaaa-aaaaa-aaaaq-cai",
        accessControl: "rdmx6-jaaaa-aaaaa-aaadq-cai", 
        assets: "rno2w-sqaaa-aaaaa-aaacq-cai",
      };
    }

    // For IC mainnet, we need environment variables
    console.error("No canister IDs found for mainnet deployment");
    return null;
  } catch (error) {
    console.error("Failed to get canister IDs:", error);
    return null;
  }
}

// Utility to validate canister IDs
export function validateCanisterIds(ids: CanisterIds | null): boolean {
  if (!ids) return false;
  
  // Basic validation - canister IDs should be valid principals
  const canisterIdRegex = /^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/;
  
  return (
    canisterIdRegex.test(ids.viToken) &&
    canisterIdRegex.test(ids.accessControl) &&
    canisterIdRegex.test(ids.assets)
  );
}