import { ConnectKitProvider as _ConnectKitProvider } from "connectkit";

export const ConnectKitProvider = ({ children }: { children: React.ReactNode }) => (
  <_ConnectKitProvider>{children}</_ConnectKitProvider>
);
