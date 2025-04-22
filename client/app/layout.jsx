import { Geist, Geist_Mono } from "next/font/google";
import { GameOptionsProvider } from "./context/GameOptionsContext";
import "./styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ChessMate",
  description: "ChessMate - The Ultimate Chess Experience",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GameOptionsProvider>
          {children}
        </GameOptionsProvider>
      </body>
    </html>
  );
}
