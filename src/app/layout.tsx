import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getSiteBase } from "@/lib/link-metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteBase = getSiteBase();

export const metadata: Metadata = {
  metadataBase: new URL(siteBase),
  title: {
    default: "Playlist Bridge",
    template: "%s | Playlist Bridge",
  },
  description:
    "Convert between Spotify and Apple Music — songs, albums, artists & playlists",
  openGraph: {
    siteName: "Playlist Bridge",
    type: "website",
    locale: "en_US",
    url: siteBase,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full glow-bg">{children}</body>
    </html>
  );
}
