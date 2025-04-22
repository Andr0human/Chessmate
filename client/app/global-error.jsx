"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { generateStars } from "./lib/helpers";

export default function GlobalError({ error, reset }) {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Log the error to an error reporting service
    setStars(generateStars(100));
    console.error(error);
  }, [error, generateStars]);

  return (
    <html>
      <body>
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
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">Something went wrong!</h1>
            <p className="text-lg text-gray-300 mb-8 max-w-md">
              Oops! It seems we've encountered an unexpected error during your chess match.
            </p>
            
            <div className="flex space-x-4 mb-8">
              <button
                onClick={reset}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
              
              <Link href="/" className="px-6 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">
                Back to Home
              </Link>
            </div>
            
            <div className="mt-4 text-6xl">
              <span>♟</span>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
} 