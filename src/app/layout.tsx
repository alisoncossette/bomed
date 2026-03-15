import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoMed — Smart Scheduling for PT",
  description: "Privacy-first scheduling. The practice asks, the patient answers yes or no.",
  icons: { icon: "/logo-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#f8f9fc] text-[#1a1a2e]`}
      >
        {children}
      </body>
    </html>
  );
}
