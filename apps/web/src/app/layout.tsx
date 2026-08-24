import type { Metadata, Viewport } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SplashProvider } from "../components/splash/splash-provider";
import { PlatformOrientation } from "../components/screen-orientation";

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
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1a" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.elbannawy.online/"),
  title: "منصة البناوي | تعلم الإنجليزية بطريقة تفاعلية",
  description:
    "منصة البناوي (El-Bannawy) منصة تعليمية تفاعلية لتعلم اللغة الإنجليزية، تقدم للطلاب دروسًا وأنشطة تفاعلية، اختبارات وواجبات، متابعة للتقدم، تعلمًا من الأخطاء، حصصًا مباشرة وأدوات ذكاء اصطناعي لدعم رحلة التعلم.",
  applicationName: "منصة البناوي",
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://www.elbannawy.online/",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "منصة البناوي",
  },
  openGraph: {
    type: "website",
    url: "https://www.elbannawy.online/",
    siteName: "منصة البناوي | El-Bannawy",
    title: "منصة البناوي | تعلم الإنجليزية بطريقة تفاعلية",
    description:
      "منصة البناوي (El-Bannawy) منصة تعليمية تفاعلية لتعلم اللغة الإنجليزية، تقدم للطلاب دروسًا وأنشطة تفاعلية، اختبارات وواجبات، متابعة للتقدم، تعلمًا من الأخطاء، حصصًا مباشرة وأدوات ذكاء اصطناعي لدعم رحلة التعلم.",
    locale: "ar_EG",
  },
  twitter: {
    card: "summary_large_image",
    title: "منصة البناوي | تعلم الإنجليزية بطريقة تفاعلية",
    description:
      "منصة البناوي (El-Bannawy) منصة تعليمية تفاعلية لتعلم اللغة الإنجليزية، تقدم دروسًا وأنشطة تفاعلية، اختبارات وواجبات، متابعة للتقدم وحصصًا مباشرة.",
  },
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
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
    "msapplication-TileColor": "#6366f1",
    "msapplication-TileImage": "/icons/icon-144.png",
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
        <meta name="theme-color" content="#0a0e1a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="192x192" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="32x32" />
      </head>
      <body>
        <PlatformOrientation />
        <SplashProvider>
          <Providers>{children}</Providers>
        </SplashProvider>
      </body>
    </html>
  );
}
