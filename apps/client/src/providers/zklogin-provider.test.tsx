import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZkLoginProvider, useZkLogin } from "./zklogin-provider";
import { useZkLoginStore } from "@/store/zklogin-store";

// Mock the store
vi.mock("@/store/zklogin-store", () => ({
  useZkLoginStore: vi.fn(),
}));

describe("ZkLoginProvider", () => {
  const mockStore = {
    account: null,
    isAuthenticated: false,
    suiBalance: 0,
    rohrBalance: 0,
    isLoading: false,
    error: null,
    initiateLogin: vi.fn(),
    completeLogin: vi.fn(),
    logout: vi.fn(),
    signAndExecute: vi.fn(),
    refreshBalances: vi.fn(),
    restoreSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useZkLoginStore as any).mockReturnValue(mockStore);
  });

  it("should render children", () => {
    render(
      <ZkLoginProvider>
        <div>Test Child</div>
      </ZkLoginProvider>
    );

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("should call restoreSession on mount", () => {
    render(
      <ZkLoginProvider>
        <div>Test</div>
      </ZkLoginProvider>
    );

    expect(mockStore.restoreSession).toHaveBeenCalledTimes(1);
  });

  it("should provide store via useZkLogin hook", () => {
    const TestComponent = () => {
      const store = useZkLogin();
      return (
        <div>
          {store?.isAuthenticated ? "Authenticated" : "Not Authenticated"}
        </div>
      );
    };

    render(
      <ZkLoginProvider>
        <TestComponent />
      </ZkLoginProvider>
    );

    expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
  });

  it("should throw error when useZkLogin is used outside provider", () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const TestComponent = () => {
      useZkLogin();
      return <div>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      "useZkLogin must be used within a ZkLoginProvider"
    );

    consoleError.mockRestore();
  });
});
