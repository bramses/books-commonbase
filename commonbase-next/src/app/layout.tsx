import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ClientProviders } from "@/components/client-providers";
import { DevUserSwitcher } from "@/components/dev-user-switcher";
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
  title: "Commonbase",
  description: "A simple knowledge management system with semantic search",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          <Navigation />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <Footer />
          <DevUserSwitcher className="fixed bottom-4 left-4 w-64 z-50" />
        </ClientProviders>
      </body>
    </html>
  );
}
