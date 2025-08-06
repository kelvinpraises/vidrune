"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";

import { cn } from "@/library/utils";

interface StandbyButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

const StandbyButton = ({ onClick, isLoading = false }: StandbyButtonProps) => {
  return (
    <button
      className={cn(
        "w-[136px] min-h-[136px] flex items-center justify-center rounded-full border-[6px] border-solid",
        "border-[#138FA8] dark:border-[#0D4B58]",
        "hover:bg-[#F1FDFF] dark:hover:bg-transparent",
        "shadow-[0_0px_10px_#AEF2FF,0_1px_5px_#AEF2FF] dark:shadow-[0_0px_10px_#0B282F,0_1px_8px_#0B282F]",
        "hover:shadow-[0_0px_10px_#AEF2FF,0_1px_20px_#AEF2FF] dark:hover:shadow-[0_0px_10px_#0B282F,0_1px_20px_#0B282F]",
        "active:shadow-[0_0px_1px_#AEF2FF] dark:active:shadow-[0_0px_1px_#0B282F]",
        "active:translate-y-[1px]",
        "bg-[linear-gradient(110deg,#fafeff,30%,#ddf9ff,50%,#fafeff)]",
        "dark:bg-[linear-gradient(110deg,#1A1F20,30%,#0B282F,50%,#1A1F20)]",
        "bg-[length:200%_100%] animate-shimmer transition-colors",
        isLoading ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      )}
      onClick={isLoading ? undefined : onClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-10 w-10 text-primary animate-spin dark:text-gray-300" />
      ) : (
        <Image
          src="/Standby.svg"
          width={54}
          height={58}
          className="dark:invert"
          alt="standby icon"
          priority
        />
      )}
    </button>
  );
};

export default StandbyButton;
