/**
 * Test utilities for verifying IC integration
 * Run these tests after deployment to ensure everything works
 */

import { icCanisterService } from "../services/ic-canister";
import { icStorage } from "../services/ic-storage";

export interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration?: number;
}

export class ICIntegrationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    
    console.log("🧪 Starting IC Integration Tests...");
    
    await this.testCanisterService();
    await this.testTokenOperations();
    await this.testStorageService();
    await this.testEndToEndFlow();
    
    console.log("✅ IC Integration Tests Complete");
    return this.results;
  }

  private async testCanisterService(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test service initialization
      const isInitialized = icCanisterService.isInitialized();
      const canisterInfo = icCanisterService.getCanisterInfo();
      
      if (!isInitialized) {
        throw new Error("IC Canister Service failed to initialize");
      }
      
      if (!canisterInfo.canisterIds) {
        throw new Error("Canister IDs not loaded");
      }
      
      this.results.push({
        name: "Canister Service Initialization",
        success: true,
        message: `Initialized with IDs: ${JSON.stringify(canisterInfo.canisterIds)}`,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.results.push({
        name: "Canister Service Initialization",
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      });
    }
  }

  private async testTokenOperations(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test token balance query
      const balance = await icCanisterService.getTokenBalance();
      
      if (typeof balance !== 'number' || balance < 0) {
        throw new Error(`Invalid balance returned: ${balance}`);
      }
      
      // Test faucet (if balance is low)
      if (balance < 10) {
        const faucetResult = await icCanisterService.getTestnetTokens();
        if (!faucetResult.success) {
          console.warn("Faucet test failed:", faucetResult.message);
        }
      }
      
      this.results.push({
        name: "Token Operations",
        success: true,
        message: `Balance: ${balance} VI tokens`,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.results.push({
        name: "Token Operations",
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      });
    }
  }

  private async testStorageService(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test storage service initialization
      const isInitialized = icStorage.isInitialized();
      const canisterInfo = icStorage.getCanisterInfo();
      
      if (!isInitialized) {
        throw new Error("IC Storage Service failed to initialize");
      }
      
      // Test list videos (should not fail even if empty)
      const videos = await icStorage.listVideos();
      
      this.results.push({
        name: "Storage Service",
        success: true,
        message: `Initialized, found ${videos.length} videos`,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.results.push({
        name: "Storage Service",
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      });
    }
  }

  private async testEndToEndFlow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test the complete flow without actually uploading
      const canUpload = await icCanisterService.canUpload();
      const balance = await icCanisterService.getTokenBalance();
      
      const hasEnoughTokens = balance >= 2;
      const canCompleteFlow = canUpload && hasEnoughTokens;
      
      this.results.push({
        name: "End-to-End Flow Check",
        success: canCompleteFlow,
        message: canCompleteFlow 
          ? `Ready for uploads (${balance} VI tokens, upload permission: ${canUpload})`
          : `Not ready: Balance=${balance}, CanUpload=${canUpload}`,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.results.push({
        name: "End-to-End Flow Check",
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      });
    }
  }

  printResults(): void {
    console.log("\n📊 IC Integration Test Results:");
    console.log("================================");
    
    this.results.forEach((result, index) => {
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      const duration = result.duration ? ` (${result.duration}ms)` : "";
      
      console.log(`${index + 1}. ${result.name}: ${status}${duration}`);
      console.log(`   ${result.message}`);
    });
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log("================================");
    console.log(`Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log("🎉 All tests passed! IC integration is working correctly.");
    } else {
      console.log("⚠️  Some tests failed. Check the deployment and configuration.");
    }
  }
}

// Convenience function to run tests
export async function testICIntegration(): Promise<boolean> {
  const tester = new ICIntegrationTester();
  const results = await tester.runAllTests();
  tester.printResults();
  
  return results.every(r => r.success);
}

// Browser console helper
if (typeof window !== 'undefined') {
  (window as any).testICIntegration = testICIntegration;
}