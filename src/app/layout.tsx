import "@/env";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { PageTransition } from "@/components/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";

// Design system (design.md) : Clash Display pour les titres, Plus Jakarta Sans
// (arrondie, chaleureuse) pour le texte, Geist Mono pour les codes.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Suit APP_BASE_URL (déjà utilisée pour les liens email et les QR codes de
  // voucher) plutôt qu'un domaine en dur, pour que les aperçus Open Graph
  // pointent vers le bon domaine sans avoir à toucher au code lors d'un
  // changement de domaine — seule la variable d'env doit changer.
  metadataBase: new URL(process.env.APP_BASE_URL || "https://game-myassin.vercel.app"),
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
  themeColor: "#FF6B47",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${jakarta.variable} ${clashDisplay.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink-900 flex flex-col">
        <Providers>
          <ToastProvider>
            <PageTransition>{children}</PageTransition>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
