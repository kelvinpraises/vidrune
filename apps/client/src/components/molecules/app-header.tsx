import { ThemeSwitcher } from "@/components/molecules/theme-switcher";
import { ConnectButton } from "@/components/molecules/connect-button";
import { Link } from "@tanstack/react-router";

interface AppHeaderProps {
  currentPage?: "datasets" | "markets";
  showConnectWallet?: boolean;
}

export function AppHeader({ currentPage, showConnectWallet = false }: AppHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/10 dark:bg-[#0a0a0a]/10 flex items-center p-4 gap-4">
      <Link to="/">
        <img
          alt="vidrune logo"
          src="/logo-light.png"
          width={40}
          height={40}
          className="relative z-10 dark:hidden"
        />
        <img
          alt="vidrune logo"
          src="/logo-dark.png"
          width={40}
          height={40}
          className="relative z-10 hidden dark:block"
        />
      </Link>
      <nav className="flex items-center space-x-4 lg:space-x-6">
        <Link
          to="/datasets"
          className={`text-sm font-medium transition-colors hover:text-primary ${
            currentPage === "datasets" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Datasets
        </Link>
        <Link
          to="/markets"
          className={`text-sm font-medium transition-colors hover:text-primary ${
            currentPage === "markets" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Markets
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <ThemeSwitcher />
        {showConnectWallet ? (
          <ConnectButton />
        ) : (
          <Link
            to="/console"
            className="bg-[#33CB82] hover:bg-[#33CB82]/80 w-[18ch] flex items-center justify-center font-semibold px-6 py-4 transition-colors duration-200 whitespace-nowrap text-black"
          >
            Index a Video
          </Link>
        )}
      </div>
    </header>
  );
}
