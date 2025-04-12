"use client";

import { MantineProvider } from "@mantine/core";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const ChessBoard = dynamic(() => import("../../components/ChessBoard"), {
  ssr: false,
});

export default function SinglePlayerPage() {
  const searchParams = useSearchParams();
  const [gameOptions, setGameOptions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const side = searchParams.get("side") || "white";
    const timeControl = searchParams.get("timeControl") || "0";
    const increment = searchParams.get("increment");
    const difficulty = searchParams.get("difficulty") || "medium";

    const options = {
      ...generateBoardOptions({ side, timeControl, increment }),
      difficulty,
    };

    setGameOptions(options);
    setLoading(false);
  }, [searchParams]);

  return (
    <MantineProvider>
      <div className="min-h-screen bg-gray-900 py-4 px-2 sm:py-6 sm:px-4">
        <div className="max-w-full xl:max-w-7xl mx-auto">
          <div className="flex justify-center items-center">
            {loading ? (
              <div className="text-white text-lg">Loading game...</div>
            ) : (
              <ChessBoard gameOptions={gameOptions} />
            )}
          </div>
        </div>
      </div>
    </MantineProvider>
  );
}
