import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppFrame from "@/components/app-frame";
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
          <AppFrame>{children}</AppFrame>
        </TiltDataProvider>
      </body>
    </html>
  );
}
