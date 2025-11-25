import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginModal } from "./login-modal";
import { useZkLogin } from "@/providers/zklogin-provider";

// Mock the provider
vi.mock("@/providers/zklogin-provider", () => ({
  useZkLogin: vi.fn(),
}));

// Mock media query hook
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(() => true), // Default to desktop
}));

describe("LoginModal", () => {
  const mockInitiateLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useZkLogin as any).mockReturnValue({
      isLoading: false,
      error: null,
      initiateLogin: mockInitiateLogin,
    });
  });

  it("should render trigger button", () => {
    render(
      <LoginModal>
        <button>Login</button>
      </LoginModal>
    );

    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("should open modal when trigger is clicked", async () => {
    render(
      <LoginModal>
        <button>Login</button>
      </LoginModal>
    );

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByText("Connect with Google")).toBeInTheDocument();
    });
  });

  it("should call initiateLogin when sign in button is clicked", async () => {
    mockInitiateLogin.mockResolvedValue("https://accounts.google.com/oauth");

    render(
      <LoginModal>
        <button>Login</button>
      </LoginModal>
    );

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sign in with Google"));

    await waitFor(() => {
      expect(mockInitiateLogin).toHaveBeenCalled();
    });
  });

  it("should show loading state during login", async () => {
    (useZkLogin as any).mockReturnValue({
      isLoading: true,
      error: null,
      initiateLogin: mockInitiateLogin,
    });

    render(
      <LoginModal>
        <button>Login</button>
      </LoginModal>
    );

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });
  });

  it("should display error message when login fails", async () => {
    (useZkLogin as any).mockReturnValue({
      isLoading: false,
      error: "Failed to connect",
      initiateLogin: mockInitiateLogin,
    });

    render(
      <LoginModal>
        <button>Login</button>
      </LoginModal>
    );

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByText("Failed to connect")).toBeInTheDocument();
    });
  });
});
