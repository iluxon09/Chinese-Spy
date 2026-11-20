"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
