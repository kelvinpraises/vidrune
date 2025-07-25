"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";

import { ThemeSwitcher } from "@/library/components/molecules/theme-switcher";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <div className="flex flex-col w-full h-full">
      <header className="flex items-center p-4 gap-4">
        <Image
          alt="vidrune logo"
          src={currentTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
          width={40}
          height={40}
          className="relative z-10"
        />

        <nav className={"flex items-center space-x-4 lg:space-x-6"}>
          <Link
            href="/explore"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Explore
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <ThemeSwitcher />
          <Link
            href="/console"
            className={
              "bg-[#33CB82] hover:bg-[#33CB82]/80 w-[18ch] flex items-center justify-center font-medium px-6 rounded-[0] py-4 transition-colors duration-200 whitespace-nowrap"
            }
          >
            Index a Video
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
