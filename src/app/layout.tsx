import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TILT · Simulator Engine",
  description: "TILT Member 1 simulator and market engine workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
