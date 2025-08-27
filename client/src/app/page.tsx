"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { generateStars } from "@/lib/helpers";
import type { Star } from "@/types";

const MainMenu = dynamic(() => import("@/components/home/MainMenu"), {
  ssr: false,
});

export default function Home() {
  const [stars, setStars] = useState<Star[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStars(generateStars(100));
  }, []);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        {mounted &&
          stars.map(({ id, left, top, size, animationDuration }) => (
            <div
              key={id}
              className="absolute rounded-full bg-blue-200 opacity-70 animate-pulse"
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
