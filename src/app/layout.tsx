import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BravoPilot",
  description:
    "AI-drafted Microsoft consulting deliverables — security & compliance, cloud migration, app modernization, SharePoint, and analytics/AI.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The CSP set in proxy.ts is nonce-based (script-src has no 'unsafe-inline'),
  // so this inline script needs the same nonce the middleware generated for
  // this request or the browser blocks it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
