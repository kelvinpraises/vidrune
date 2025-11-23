import { useEffect, useState } from "react";
import { cn } from "@/utils";

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

  return (
    <main className="flex w-screen h-screen font-jetbrains-mono">
      {children}
    </main>
  );
};

export default CoreLayout;
