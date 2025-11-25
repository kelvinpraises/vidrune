/**
 * zkLogin Authentication Service
 *
 * Core zkLogin operations for SUI network authentication via Google OAuth.
 * This service handles:
 * - Ephemeral key pair management (sessionStorage - temporary)
 * - User salt management (localStorage - persistent)
 * - Google OAuth URL construction
 * - JWT parsing from OAuth callback
 * - ZK proof fetching from Mysten prover
 * - Address derivation and transaction signing
 *
 * Storage Strategy:
 * - ephemeralKeyPair: sessionStorage (cleared on browser close)
 * - userSalt: localStorage (persistent across sessions - same address)
 * - randomness: sessionStorage (tied to ephemeral key)
 * - maxEpoch: localStorage (reused across sessions)
 * - jwt: localStorage (persistent for session restoration)
 */

import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import {
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
} from "@mysten/zklogin";
import axios from "axios";
import { jwtDecode, type JwtPayload } from "jwt-decode";

// Storage keys
const STORAGE_KEYS = {
  EPHEMERAL_KEY_PAIR: "zklogin_ephemeral_key_pair",
  USER_SALT: "zklogin_user_salt",
  RANDOMNESS: "zklogin_randomness",
  MAX_EPOCH: "zklogin_max_epoch",
  JWT: "zklogin_jwt",
} as const;

// Configuration (will be overridden by env vars)
const DEFAULT_CONFIG = {
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  REDIRECT_PATH: import.meta.env.VITE_GOOGLE_REDIRECT_PATH || "/auth/google/callback",
  SUI_PROVER_ENDPOINT:
    import.meta.env.VITE_SUI_PROVER_ENDPOINT || "https://prover-dev.mystenlabs.com/v1",
  SUI_RPC_URL: import.meta.env.VITE_SUI_RPC_URL || "https://fullnode.devnet.sui.io",
};

// Helper to get full redirect URI
function getRedirectUri(): string {
  return `${window.location.origin}${DEFAULT_CONFIG.REDIRECT_PATH}`;
}

// Types
export interface ZkLoginAccount {
  address: string;
  jwt: string;
  decodedJwt: JwtPayload;
  salt: string;
  ephemeralKeyPair: Ed25519Keypair;
  zkProof: PartialZkLoginSignature | null;
}

export type PartialZkLoginSignature = Omit<
  Parameters<typeof getZkLoginSignature>["0"]["inputs"],
  "addressSeed"
>;

/**
 * Ephemeral Key Pair Management (sessionStorage)
 */

export function generateEphemeralKeyPair(): Ed25519Keypair {
  const keyPair = Ed25519Keypair.generate();
  // Store using getSecretKey() which returns Bech32 encoded string (suiprivkey1...)
  const secretKey = keyPair.getSecretKey();
  window.sessionStorage.setItem(STORAGE_KEYS.EPHEMERAL_KEY_PAIR, secretKey);
  return keyPair;
}

export function getStoredEphemeralKeyPair(): Ed25519Keypair | null {
  const secretKey = window.sessionStorage.getItem(STORAGE_KEYS.EPHEMERAL_KEY_PAIR);
  if (!secretKey) return null;

  try {
    // Reconstruct keypair from Bech32 encoded secret key
    return Ed25519Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("Failed to restore ephemeral key pair:", error);
    return null;
  }
}

export function clearEphemeralKeyPair(): void {
  window.sessionStorage.removeItem(STORAGE_KEYS.EPHEMERAL_KEY_PAIR);
}

/**
 * User Salt Management (localStorage - persistent)
 */

export function generateUserSalt(): string {
  const salt = generateRandomness();
  window.localStorage.setItem(STORAGE_KEYS.USER_SALT, salt);
  return salt;
}

export function getStoredUserSalt(): string | null {
  return window.localStorage.getItem(STORAGE_KEYS.USER_SALT);
}

export function clearUserSalt(): void {
  window.localStorage.removeItem(STORAGE_KEYS.USER_SALT);
}

/**
 * Randomness Management (sessionStorage)
 */

export function generateAndStoreRandomness(): string {
  const randomness = generateRandomness();
  window.sessionStorage.setItem(STORAGE_KEYS.RANDOMNESS, randomness);
  return randomness;
}

export function getStoredRandomness(): string | null {
  return window.sessionStorage.getItem(STORAGE_KEYS.RANDOMNESS);
}

/**
 * MaxEpoch Management (localStorage)
 */

export async function fetchAndStoreMaxEpoch(suiClient: SuiClient): Promise<number> {
  try {
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 10; // Valid for 10 epochs
    window.localStorage.setItem(STORAGE_KEYS.MAX_EPOCH, maxEpoch.toString());
    return maxEpoch;
  } catch (error) {
    console.error("Failed to fetch epoch from SUI network:", error);
    // Fallback: use stored value or default
    const stored = getStoredMaxEpoch();
    if (stored) {
      console.log("Using stored maxEpoch:", stored);
      return stored;
    }
    // Default fallback: current timestamp + reasonable buffer
    const fallbackEpoch = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    console.log("Using fallback maxEpoch:", fallbackEpoch);
    return fallbackEpoch;
  }
}

export function getStoredMaxEpoch(): number | null {
  const stored = window.localStorage.getItem(STORAGE_KEYS.MAX_EPOCH);
  return stored ? Number(stored) : null;
}

/**
 * JWT Management (localStorage)
 */

export function storeJwt(jwt: string): void {
  window.localStorage.setItem(STORAGE_KEYS.JWT, jwt);
}

export function getStoredJwt(): string | null {
  return window.localStorage.getItem(STORAGE_KEYS.JWT);
}

export function clearJwt(): void {
  window.localStorage.removeItem(STORAGE_KEYS.JWT);
}

/**
 * Google OAuth URL Construction
 */

export function getGoogleLoginUrl(
  clientId: string = DEFAULT_CONFIG.GOOGLE_CLIENT_ID,
  nonce: string,
): string {
  const redirectUri = getRedirectUri(); // Dynamic based on current origin

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: nonce,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Parse JWT from OAuth Callback URL
 */

export function parseJwtFromCallback(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let fragment = urlObj.hash.substring(1); // Remove leading #

    // Handle hash router adding "/" before the OAuth params
    // e.g., #/id_token=... or #/auth/google/callback&id_token=...
    if (fragment.startsWith("/")) {
      fragment = fragment.substring(1); // Remove leading /
    }

    const params = new URLSearchParams(fragment);
    return params.get("id_token");
  } catch (error) {
    console.error("Failed to parse JWT from callback URL:", error);
    return null;
  }
}

/**
 * Initiate zkLogin Flow
 * This prepares everything needed for Google OAuth
 */

export async function initiateZkLoginFlow(
  suiClient: SuiClient,
): Promise<{ loginUrl: string; nonce: string }> {
  // 1. Generate or get ephemeral key pair
  let ephemeralKeyPair = getStoredEphemeralKeyPair();
  if (!ephemeralKeyPair) {
    ephemeralKeyPair = generateEphemeralKeyPair();
  }

  // 2. Generate randomness
  const randomness = generateAndStoreRandomness();

  // 3. Fetch and store maxEpoch
  const maxEpoch = await fetchAndStoreMaxEpoch(suiClient);

  // 4. Generate nonce
  const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);

  // 5. Build Google OAuth URL
  const loginUrl = getGoogleLoginUrl(DEFAULT_CONFIG.GOOGLE_CLIENT_ID, nonce);

  return { loginUrl, nonce };
}

/**
 * Complete zkLogin Flow
 * This processes the OAuth callback and creates the zkLogin account
 */

export async function completeZkLoginFlow(callbackUrl: string): Promise<ZkLoginAccount> {
  // 1. Parse JWT from callback URL
  const jwt = parseJwtFromCallback(callbackUrl);
  if (!jwt) {
    throw new Error("No JWT found in callback URL");
  }

  // 2. Decode JWT
  const decodedJwt = jwtDecode<JwtPayload>(jwt);
  if (!decodedJwt.sub || !decodedJwt.aud) {
    throw new Error("Invalid JWT: missing sub or aud");
  }

  // 3. Get or generate user salt
  let salt = getStoredUserSalt();
  if (!salt) {
    salt = generateUserSalt();
  }

  // 4. Get stored ephemeral key pair
  const ephemeralKeyPair = getStoredEphemeralKeyPair();
  if (!ephemeralKeyPair) {
    throw new Error("Ephemeral key pair not found. Please restart the login flow.");
  }

  // 5. Derive zkLogin address
  const address = jwtToAddress(jwt, salt);

  // 6. Store JWT for session restoration
  storeJwt(jwt);

  return {
    address,
    jwt,
    decodedJwt,
    salt,
    ephemeralKeyPair,
    zkProof: null, // Will be fetched when needed for signing
  };
}

/**
 * Fetch ZK Proof from Mysten Prover
 * This is called when we need to sign a transaction
 */

export async function fetchZkProof(
  account: ZkLoginAccount,
): Promise<PartialZkLoginSignature> {
  const randomness = getStoredRandomness();
  const maxEpoch = getStoredMaxEpoch();

  if (!randomness || !maxEpoch) {
    throw new Error("Missing randomness or maxEpoch. Please restart the login flow.");
  }

  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
    account.ephemeralKeyPair.getPublicKey(),
  );

  try {
    const response = await axios.post(
      DEFAULT_CONFIG.SUI_PROVER_ENDPOINT,
      {
        jwt: account.jwt,
        extendedEphemeralPublicKey,
        maxEpoch,
        jwtRandomness: randomness,
        salt: account.salt,
        keyClaimName: "sub",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data as PartialZkLoginSignature;
  } catch (error) {
    console.error("Failed to fetch ZK proof:", error);
    throw new Error("Failed to fetch ZK proof from prover");
  }
}

/**
 * Sign and Execute Transaction
 */

export async function signAndExecuteTransaction(
  txb: Transaction,
  account: ZkLoginAccount,
  suiClient: SuiClient,
): Promise<string> {
  // 1. Fetch ZK proof if not already cached
  if (!account.zkProof) {
    account.zkProof = await fetchZkProof(account);
  }

  // 2. Set transaction sender
  txb.setSender(account.address);

  // 3. Sign transaction with ephemeral key pair
  const { bytes, signature: userSignature } = await txb.sign({
    client: suiClient,
    signer: account.ephemeralKeyPair,
  });

  // 4. Generate address seed
  const addressSeed = genAddressSeed(
    BigInt(account.salt),
    "sub",
    account.decodedJwt.sub!,
    account.decodedJwt.aud as string,
  ).toString();

  // 5. Build zkLogin signature
  const maxEpoch = getStoredMaxEpoch();
  if (!maxEpoch) {
    throw new Error("Missing maxEpoch");
  }

  const zkLoginSignature = getZkLoginSignature({
    inputs: {
      ...account.zkProof,
      addressSeed,
    },
    maxEpoch,
    userSignature,
  });

  // 6. Execute transaction
  const result = await suiClient.executeTransactionBlock({
    transactionBlock: bytes,
    signature: zkLoginSignature,
  });

  return result.digest;
}

/**
 * Clear All zkLogin Data
 */

export function clearAllZkLoginData(): void {
  clearEphemeralKeyPair();
  clearUserSalt();
  clearJwt();
  window.sessionStorage.removeItem(STORAGE_KEYS.RANDOMNESS);
  window.localStorage.removeItem(STORAGE_KEYS.MAX_EPOCH);
}

/**
 * Restore zkLogin Session
 * Attempts to restore a zkLogin session from stored data
 */

export async function restoreZkLoginSession(): Promise<ZkLoginAccount | null> {
  const jwt = getStoredJwt();
  const salt = getStoredUserSalt();
  const ephemeralKeyPair = getStoredEphemeralKeyPair();

  if (!jwt || !salt || !ephemeralKeyPair) {
    return null;
  }

  try {
    const decodedJwt = jwtDecode<JwtPayload>(jwt);
    if (!decodedJwt.sub || !decodedJwt.aud) {
      return null;
    }

    const address = jwtToAddress(jwt, salt);

    return {
      address,
      jwt,
      decodedJwt,
      salt,
      ephemeralKeyPair,
      zkProof: null,
    };
  } catch (error) {
    console.error("Failed to restore zkLogin session:", error);
    return null;
  }
}
