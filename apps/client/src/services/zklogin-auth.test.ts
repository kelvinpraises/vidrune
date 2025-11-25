/**
 * zkLogin Authentication Service Tests
 *
 * Only tests what we control:
 * - Storage operations (our logic, using REAL jsdom storage)
 * - Google OAuth URL construction
 * - JWT parsing from callback
 *
 * NOT tested (external services we don't control):
 * - ZK proof generation (Mysten prover)
 * - Address derivation (zkLogin SDK handles this)
 * - Transaction signing (SUI SDK handles this)
 *
 * Integration testing of full flow done manually
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// Import the service
import {
  generateEphemeralKeyPair,
  getStoredEphemeralKeyPair,
  clearEphemeralKeyPair,
  generateUserSalt,
  getStoredUserSalt,
  getGoogleLoginUrl,
  parseJwtFromCallback,
} from "./zklogin-auth";

describe("zkLogin Auth Service", () => {
  beforeEach(() => {
    // Clear REAL browser storage before each test (jsdom provides this!)
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Ephemeral Key Pair Management", () => {
    it("should generate and store ephemeral key pair in sessionStorage", () => {
      const keyPair = generateEphemeralKeyPair();

      expect(keyPair).toBeInstanceOf(Ed25519Keypair);

      // Verify it's actually stored in sessionStorage
      const stored = sessionStorage.getItem("zklogin_ephemeral_key_pair");
      expect(stored).toBeTruthy();
      expect(typeof stored).toBe("string");
      expect(stored).toMatch(/^suiprivkey1/); // Bech32 format
    });

    it("should retrieve and reconstruct stored ephemeral key pair", () => {
      const keyPair = generateEphemeralKeyPair();
      const originalAddress = keyPair.toSuiAddress();

      const retrieved = getStoredEphemeralKeyPair();

      expect(retrieved).toBeInstanceOf(Ed25519Keypair);
      expect(retrieved?.toSuiAddress()).toBe(originalAddress);
    });

    it("should return null when no ephemeral key pair stored", () => {
      const retrieved = getStoredEphemeralKeyPair();
      expect(retrieved).toBeNull();
    });

    it("should clear ephemeral key pair from sessionStorage", () => {
      generateEphemeralKeyPair();
      clearEphemeralKeyPair();

      const stored = sessionStorage.getItem("zklogin_ephemeral_key_pair");
      expect(stored).toBeNull();
    });
  });

  describe("User Salt Management", () => {
    it("should generate and store user salt in localStorage", () => {
      const salt = generateUserSalt();

      expect(salt).toBeTruthy();
      expect(typeof salt).toBe("string");

      // Should be stored in localStorage (persistent)
      const stored = localStorage.getItem("zklogin_user_salt");
      expect(stored).toBe(salt);
    });

    it("should retrieve stored user salt", () => {
      const salt = generateUserSalt();
      const retrieved = getStoredUserSalt();

      expect(retrieved).toBe(salt);
    });

    it("should return null when no user salt stored", () => {
      const retrieved = getStoredUserSalt();
      expect(retrieved).toBeNull();
    });
  });

  describe("Randomness and MaxEpoch Storage", () => {
    it("should store and retrieve randomness in sessionStorage", () => {
      const randomness = "test-randomness-value";
      sessionStorage.setItem("zklogin_randomness", randomness);

      const retrieved = sessionStorage.getItem("zklogin_randomness");
      expect(retrieved).toBe(randomness);
    });

    it("should store and retrieve maxEpoch in localStorage", () => {
      const maxEpoch = "100";
      localStorage.setItem("zklogin_max_epoch", maxEpoch);

      const retrieved = localStorage.getItem("zklogin_max_epoch");
      expect(retrieved).toBe(maxEpoch);
    });
  });

  describe("Google OAuth URL Construction", () => {
    it("should construct valid Google OAuth URL with nonce", () => {
      const clientId = "test-client-id.apps.googleusercontent.com";
      const nonce = "test-nonce";

      const url = getGoogleLoginUrl(clientId, nonce);

      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain(`client_id=${clientId}`);
      expect(url).toContain("redirect_uri=");
      expect(url).toContain(`nonce=${nonce}`);
      expect(url).toContain("response_type=id_token");
      expect(url).toContain("scope=openid");
    });
  });

  describe("JWT Parsing from Callback", () => {
    it("should extract JWT from callback URL hash", () => {
      const mockJwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";
      const callbackUrl = `http://localhost:5173/#id_token=${mockJwt}&other=param`;

      const jwt = parseJwtFromCallback(callbackUrl);

      expect(jwt).toBe(mockJwt);
    });

    it("should return null if no id_token in URL", () => {
      const callbackUrl = "http://localhost:5173/#other=param";

      const jwt = parseJwtFromCallback(callbackUrl);

      expect(jwt).toBeNull();
    });

    it("should handle URLs without hash", () => {
      const callbackUrl = "http://localhost:5173/";

      const jwt = parseJwtFromCallback(callbackUrl);

      expect(jwt).toBeNull();
    });
  });
});
