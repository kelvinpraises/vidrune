// Canister ID management for different environments
export interface CanisterIds {
  viToken: string;
  accessControl: string;
  assets: string;
}

function getAssetsCanisterFromDomain(): string | null {
  const hostname = window.location.hostname;
  const search = window.location.search;
  
  // IC mainnet: extract canister ID from "canister-id.ic0.app"
  if (hostname.endsWith('.ic0.app')) {
    return hostname.replace('.ic0.app', '');
  }
  
  // Local recommended: extract canister ID from "canister-id.localhost"
  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '');
  }
  
  // Legacy local: extract from URL parameter "?canisterId=canister-id"
  if (hostname === '127.0.0.1' || hostname === 'localhost') {
    const urlParams = new URLSearchParams(search);
    const canisterId = urlParams.get('canisterId');
    if (canisterId) {
      return canisterId;
    }
  }
  
  // Return null if we can't determine from domain/URL (will fall back to reading from file)
  return null;
}

export async function getCanisterIds(): Promise<CanisterIds | null> {
  try {
    // Try to get assets canister from domain/URL first (most reliable)
    const assetsFromDomain = getAssetsCanisterFromDomain();
    
    // Try to get from environment variables (for production)
    const viTokenId = process.env.NEXT_PUBLIC_VI_TOKEN_CANISTER_ID;
    const accessControlId = process.env.NEXT_PUBLIC_ACCESS_CONTROL_CANISTER_ID;

    if (viTokenId && accessControlId && assetsFromDomain) {
      return { 
        viToken: viTokenId, 
        accessControl: accessControlId,
        assets: assetsFromDomain 
      };
    }

    // For local development, try to read from canister_ids.json
    const isLocal = !window.location.host.endsWith("ic0.app");
    if (isLocal) {
      try {
        // In development, we'll use a fetch to get the canister IDs
        const response = await fetch('/canister_ids.json');
        if (response.ok) {
          const canisterIds = await response.json();
          return {
            viToken: canisterIds.vi_token?.local,
            accessControl: canisterIds.vidrune_access_control?.local,
            assets: assetsFromDomain || canisterIds.vidrune_assets?.local,
          };
        }
      } catch (error) {
        // If fetching fails, fall back to hardcoded local IDs
        console.warn("Could not fetch canister IDs, using defaults:", error);
      }

      // Fallback to typical local development IDs
      return {
        viToken: "rrkah-fqaaa-aaaaa-aaaaq-cai",
        accessControl: "rdmx6-jaaaa-aaaaa-aaadq-cai", 
        assets: assetsFromDomain || "rno2w-sqaaa-aaaaa-aaacq-cai",
      };
    }

    // For IC mainnet, we need environment variables for other canisters
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
  
  // For assets, allow special development identifiers
  const isValidAssetsId = canisterIdRegex.test(ids.assets) || 
                         ids.assets === "localhost-assets" ||
                         ids.assets.startsWith("localhost");
  
  return (
    canisterIdRegex.test(ids.viToken) &&
    canisterIdRegex.test(ids.accessControl) &&
    isValidAssetsId
  );
}