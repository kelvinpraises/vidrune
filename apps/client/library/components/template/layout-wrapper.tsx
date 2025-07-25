"use client";

import {
  JetBrains_Mono,
  Source_Code_Pro,
} from "next/font/google";

import { Toaster } from "@/library/components/atoms/sonner";
import RootProvider from "@/library/providers";
import "@/library/styles/globals.css";
import { cn } from "@/library/utils";

// Primary font for body text and general UI
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  preload: true,
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Alternative geometric font for headers and emphasis
const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  preload: true,
  variable: "--font-source-code-pro",
  display: "swap",
});

const CoreLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(jetBrainsMono.className, jetBrainsMono.variable, sourceCodePro.variable)}>
        <main className="flex w-screen h-screen">
          <RootProvider>{children}</RootProvider>
        </main>
        <Toaster />
      </body>
    </html>
  );
};

export default CoreLayout;
