import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./providers/theme-provider";
import { ReactQueryProvider } from "./providers/react-query-provider";
import { PayKitToaster } from "@/components/paykit/paykit-toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PayKit — x402 payments on Stellar",
  description:
    "Agent smart wallets, HTTP 402 (x402) settlement, and verifiable receipts. One API and dashboard for the agentic web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="paykit-theme">
          <ReactQueryProvider>{children}</ReactQueryProvider>
          <PayKitToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
