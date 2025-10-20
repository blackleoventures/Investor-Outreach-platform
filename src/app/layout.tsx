import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import NextTopLoader from "nextjs-toploader";
import { startAutoCronScheduler } from "@/lib/cron/auto-cron-scheduler";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Send Email - Email Campaign Management",
  description:
    "Modern email campaign management platform built with Next.js and React",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

// ============================================
// AUTO CRON SCHEDULER INITIALIZATION
// Start cron jobs automatically (server-side only)
// ============================================
if (typeof window === "undefined") {
  // Only run on server side
  startAutoCronScheduler();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${poppins.className} antialiased`}
        style={{ overflowX: "hidden" }}
      >
        <NextTopLoader
          showSpinner={false}
          color="#3b82f6"
          height={2}
          crawlSpeed={200}
          speed={200}
        />
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
