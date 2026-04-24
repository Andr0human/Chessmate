"use client";

import { useGameOptions } from "@/context";
import { DEFAULT_START_OPTIONS } from "@/lib/constants";
import { connectSocket, socket } from "@/services";
import { GameOptions, Side } from "@/types";
import { MantineProvider } from "@mantine/core";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ChessBoard = dynamic(() => import("@/components/ChessBoard"), {
  ssr: false,
});

export default function SinglePlayerPage() {
  const { gameOptions, setGameOptions, updateFen } = useGameOptions();
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading game...");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    socket.on(
      "room_created_singleplayer",
      (roomId: string, startOptions: GameOptions) => {
        const { board, players } = startOptions;

        setRoomId(roomId);
        setGameOptions({
          board,
          connection: {
            roomId,
            status: "playing",
            mySocketId: socket.id || null,
          },
          players,
        });
        setLoading(false);
      }
    );

    socket.on("room_error", (error) => {
      console.log("#LOG Room error event:", error);
      alert(`Error: ${error.message}`);
      setLoading(false);
      setGameOptions(DEFAULT_START_OPTIONS);
      router.push("/");
    });

    // Clean up event listeners on unmount
    return () => {
      socket.off("room_created_singleplayer");
      socket.off("room_error");
    };
  }, [router]);

  useEffect(() => {
    const { side } = gameOptions?.board || {};

    const startingSide =
      side === "random"
        ? Math.random() < 0.5
          ? Side.white
          : Side.black
        : side;

    const newBoard = { ...gameOptions?.board, side: startingSide };
    setGameOptions((prev: GameOptions) => ({
      ...prev,
      board: newBoard,
    }));

    const startGame = async () => {
      setConnectionError(null);
      setLoadingMessage("Waking server (this may take up to a minute)...");
      try {
        await connectSocket();
      } catch (error) {
        console.warn("#LOG Failed to wake server:", error);
        setConnectionError(
          "Couldn't reach the server. It may be starting up — please retry."
        );
        return;
      }

      setLoadingMessage("Loading game...");

      if (socket.connected) {
        socket.emit("room_create_singleplayer", newBoard);
      } else {
        socket.once("connect", () => {
          socket.emit("room_create_singleplayer", newBoard);
        });
      }
    };

    startGame();
  }, [retryKey]);

  return (
    <MantineProvider>
      <div className="min-h-screen bg-gray-900 py-4 px-2 sm:py-6 sm:px-4">
        <div className="max-w-full xl:max-w-7xl mx-auto">
          <div className="flex justify-center items-center">
            {connectionError ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-red-400 text-lg max-w-md">
                  {connectionError}
                </p>
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                    onClick={() => setRetryKey((k) => k + 1)}
                  >
                    Retry
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      setGameOptions(DEFAULT_START_OPTIONS);
                      router.push("/");
                    }}
                  >
                    Back to menu
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="text-white text-lg">{loadingMessage}</div>
            ) : (
              <ChessBoard
                gameOptions={gameOptions}
                updateFen={updateFen}
                isGameReady
                roomId={roomId}
                gameType="singleplayer"
              />
            )}
          </div>
        </div>
      </div>
    </MantineProvider>
  );
}
