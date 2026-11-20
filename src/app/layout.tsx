import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppSidebar from "@/components/app-sidebar";
import { TiltDataProvider } from "@/features/shared/tilt-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TILT | Financial Universe",
  description: "Practise investing with a deterministic fictional market.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080D19] text-slate-100 antialiased">
        <TiltDataProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </TiltDataProvider>
      </body>
    </html>
  );
}
