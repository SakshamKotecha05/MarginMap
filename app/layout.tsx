import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portfolio Intelligence | Mosaic Wellness",
  description: "D2C product portfolio analysis — 600 SKUs, 5 channels, 3 brands",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:ml-64 pb-16 lg:pb-0 min-w-0">
            {children}
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
