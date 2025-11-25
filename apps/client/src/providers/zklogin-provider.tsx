import React, { createContext, useContext } from "react";
import { useZkLoginStore, type ZkLoginStore } from "@/store/zklogin-store";

/**
 * ZkLogin Context Type
 * Re-exports the Zustand store type for convenience
 */
type ZkLoginContextType = ZkLoginStore;

/**
 * ZkLogin React Context
 * Wraps our Zustand store for consistency with React patterns
 */
const ZkLoginContext = createContext<ZkLoginContextType | undefined>(
  undefined
);

/**
 * ZkLogin Provider Component
 *
 * Provides SUI zkLogin authentication state and actions to all child components.
 * Uses Zustand store internally but exposes via React Context for consistency.
 *
 * Features:
 * - Auto-restores session from localStorage on mount
 * - Manages SUI and ROHR token balances
 * - Handles Google OAuth zkLogin flow
 * - Signs and executes SUI transactions
 *
 * @example
 * ```tsx
 * <ZkLoginProvider>
 *   <App />
 * </ZkLoginProvider>
 * ```
 */
export const ZkLoginProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const store = useZkLoginStore();

  // Auto-restore session from localStorage on mount
  // TODO: Re-enable after debugging why it hangs
  // useEffect(() => {
  //   store.restoreSession();
  // }, []); // Only run once on mount

  return (
    <ZkLoginContext.Provider value={store}>
      {children}
    </ZkLoginContext.Provider>
  );
};

/**
 * useZkLogin Hook
 *
 * Access zkLogin authentication state and actions from any component.
 * Must be used within a ZkLoginProvider.
 *
 * @throws {Error} If used outside ZkLoginProvider
 *
 * @example
 * ```tsx
 * const Component = () => {
 *   const { isAuthenticated, account, initiateLogin, logout } = useZkLogin();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={initiateLogin}>Login</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Address: {account?.userAddr}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * };
 * ```
 */
export const useZkLogin = () => {
  const context = useContext(ZkLoginContext);

  if (context === undefined) {
    throw new Error("useZkLogin must be used within a ZkLoginProvider");
  }

  return context;
};

/**
 * Convenience selectors for common use cases
 * These can be used directly without extracting from the full store
 */
export const useZkLoginAccount = () => {
  const store = useZkLogin();
  return store?.account ?? null;
};

export const useZkLoginAuth = () => {
  const store = useZkLogin();
  return {
    isAuthenticated: store?.isAuthenticated ?? false,
    isLoading: store?.isLoading ?? false,
  };
};

// Note: Balance management removed from store - fetch balances directly in components using SUI SDK
