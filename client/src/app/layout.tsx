import { Geist, Geist_Mono } from "next/font/google";
import { GameOptionsProvider } from "@/context/GameOptionsContext";
import "./globals.css";
import { ReactNode } from "react";
import { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChessMate",
  description: "ChessMate - The Ultimate Chess Experience",
};

interface RootLayoutProps {
  children: ReactNode;
}

if (process.env.NODE_ENV === "production") {
  console.log = () => {};
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GameOptionsProvider>{children}</GameOptionsProvider>
      </body>
    </html>
  );
}
