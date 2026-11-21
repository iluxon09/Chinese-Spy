import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import AppFrame from "@/components/app-frame";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";
import { TiltDataProvider } from "@/features/shared/tilt-provider";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-ibm-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: "TILT | Financial Universe",
  description: "A hands-on financial market simulator for learning investment decisions, risk and trading behaviour.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <Script id="tilt-theme-bootstrap" strategy="beforeInteractive">{"(() => {\n  try {\n    const saved = window.localStorage.getItem(\"tilt-theme\");\n    document.documentElement.dataset.theme = saved === \"light\" ? \"light\" : \"dark\";\n  } catch {\n    document.documentElement.dataset.theme = \"dark\";\n  }\n})();"}</Script>
      </head>
      <body className={`${manrope.variable} ${ibmPlexMono.variable} min-h-screen antialiased`}>
        <TiltDataProvider>
          <ThemeProvider>
            <AppFrame>{children}</AppFrame>
          </ThemeProvider>
        </TiltDataProvider>
      </body>
    </html>
  );
}
