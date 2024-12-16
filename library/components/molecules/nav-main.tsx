import Link from "next/link";

import { cn } from "@/utils";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/explore"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Explore
      </Link>
    </nav>
  );
}
