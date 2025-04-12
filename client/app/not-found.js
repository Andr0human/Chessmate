"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHESS_PIECES } from "./lib/constants";
import { generateStars } from "./lib/helpers";

export default function NotFound() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    setStars(generateStars(100));
  }, [generateStars]);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        {stars.map(({ id, left, top, size, animationDuration }) => (
          <div
            key={id}
            className="absolute rounded-full bg-white opacity-50 animate-pulse"
            style={{
              left,
              top,
              width: size,
              height: size,
              animationDuration,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow text-center px-4">
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-6">404</h1>
        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">Checkmate! Page Not Found</h2>
        <p className="text-lg text-gray-300 mb-8 max-w-md">
          The page you're looking for has made an illegal move and disappeared from the board.
        </p>
        
        <div className="flex space-x-6 text-6xl mb-8">
          {CHESS_PIECES.map((piece, i) => (
            <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
              {piece}
            </span>
          ))}
        </div>
        
        <Link href="/" className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Back to Home
        </Link>
      </div>
    </main>
  );
} 