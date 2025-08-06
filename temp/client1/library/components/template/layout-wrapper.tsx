"use client";

import { JetBrains_Mono, Source_Code_Pro } from "next/font/google";
import { useEffect, useState } from "react";

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onDeviceReady = () => {
      console.log("Running cordova-" + cordova.platformId + "@" + cordova.version);
      setReady(true);
    };

    // Timeout fallback in case cordova doesn't load
    const timeout = setTimeout(() => {
      console.log("Cordova timeout - proceeding without deviceready");
      setReady(true);
    }, 3000);

    if (typeof cordova !== 'undefined') {
      document.addEventListener("deviceready", onDeviceReady, false);
    } else {
      // If cordova isn't available immediately, wait a bit then fallback
      setTimeout(() => {
        if (typeof cordova !== 'undefined') {
          document.addEventListener("deviceready", onDeviceReady, false);
        } else {
          setReady(true);
        }
      }, 1000);
    }

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("deviceready", onDeviceReady, false);
    };
  }, []);

  // if (!ready) {
  //   return (
  //     <html>
  //       <p>Loading...</p>
  //     </html>
  //   );
  // }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="cordova.js"></script>
      </head>
      <body
        className={cn(
          jetBrainsMono.className,
          jetBrainsMono.variable,
          sourceCodePro.variable
        )}
      >
        <main className="flex w-screen h-screen">
          <RootProvider>{children}</RootProvider>
        </main>
        <Toaster />
      </body>
    </html>
  );
};

export default CoreLayout;
