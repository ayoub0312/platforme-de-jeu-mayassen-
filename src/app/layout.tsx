import "@/env";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { BackToTopButton } from "@/components/BackToTopButton";
import { CustomCursor } from "@/components/CustomCursor";
import { PageTransition } from "@/components/PageTransition";
import { GlobalBackgroundLayer } from "@/components/GlobalBackgroundLayer";
import { ToastProvider } from "@/components/ui/Toast";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Design system Obooking Gift: Inter (corps, tout le site) + Clash Display
// (titres, via `font-display` utility) — remplace l'ancien pairing
// Fraunces/DM Sans qui n'était scopé qu'au homepage public.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const clashDisplay = localFont({
  variable: "--font-clash-display",
  display: "swap",
  src: [
    { path: "../fonts/ClashDisplay-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/ClashDisplay-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://game-myassin.vercel.app"),
  title: "Obooking Gift | Jeux-Concours & Cadeaux Obooking",
  description: "Participez aux jeux-concours Obooking Gift et tentez de remporter voyages, séjours et bons d'achat exclusifs.",
  openGraph: {
    title: "Obooking Gift",
    description: "Voyages de rêve, séjours de luxe et bons d'achat exclusifs à gagner — tentez votre chance dès maintenant.",
    images: ["/obooking-logo.png"],
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Obooking Gift",
    description: "Voyages de rêve, séjours de luxe et bons d'achat exclusifs à gagner.",
    images: ["/obooking-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F58220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${geistMono.variable} ${clashDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#FAFAFA] text-[#1A1A1A] flex flex-col">
        <GlobalBackgroundLayer />
        <CustomCursor />
        <ScrollProgressBar />
        <Providers>
          <ToastProvider>
            <PageTransition>{children}</PageTransition>
          </ToastProvider>
        </Providers>
        <BackToTopButton />
      </body>
    </html>
  );
}
