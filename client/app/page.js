"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamic import to avoid SSR issues
const MainMenu = dynamic(() => import("./components/home/MainMenu"), {
  ssr: false,
});

export default function Home() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate random stars for background
    const generateStars = () => {
      const newStars = [];
      for (let i = 0; i < 100; i++) {
        newStars.push({
          id: i,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          size: `${Math.random() * 2 + 1}px`,
          animationDuration: `${Math.random() * 5 + 5}s`,
        });
      }
      setStars(newStars);
    };

    generateStars();
  }, []);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white opacity-50 animate-pulse"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animationDuration: star.animationDuration,
            }}
          />
        ))}
      </div>
      <MainMenu />
    </main>
  );
}
