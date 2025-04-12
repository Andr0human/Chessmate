"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { generateStars } from "./lib/helpers";
// Dynamic import to avoid SSR issues
const MainMenu = dynamic(() => import("./components/home/MainMenu"), {
  ssr: false,
});

export default function Home() {
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
      <MainMenu />
    </main>
  );
}
