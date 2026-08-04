import type { Metadata, Viewport } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SplashProvider } from "../components/splash/splash-provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui-english",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui-arabic",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "El-bannawy Platform",
  description: "AI-Powered English Learning Platform",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "El-bannawy",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#6366f1",
    "msapplication-TileImage": "/icons/icon-144.png",
    "application-name": "El-bannawy",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <html lang="ar" dir="rtl" className={`dark ${inter.variable} ${cairo.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="El-bannawy" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />
        <meta name="application-name" content="El-bannawy" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="192x192" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="32x32" />
      </head>
      <body>
        <SplashProvider>
          <Providers>{children}</Providers>
        </SplashProvider>
      </body>
    </html>
  );
}
