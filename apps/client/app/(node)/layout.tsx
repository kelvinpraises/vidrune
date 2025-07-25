"use client";

import { useTheme } from "next-themes";
import Image from "next/image";

import { ConnectButton } from "@/library/components/molecules/connect-button";
import { ThemeSwitcher } from "@/library/components/molecules/theme-switcher";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme, systemTheme, resolvedTheme } = useTheme();

  return (
    <div className="relative flex w-full flex-col items-center gap-8 h-screen bg-dot-pattern overflow-scroll">
      <div className="fixed pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      <div className="relative z-10 flex flex-col items-center gap-8 flex-1 w-full">
        <header className="flex items-center p-4 gap-4 w-full">
          <Image
            alt="vidrune logo"
            src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
            width={40}
            height={40}
            className="relative z-10"
          />
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitcher />
            <ConnectButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
