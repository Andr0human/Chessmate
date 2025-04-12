"use client";

import { MantineProvider } from "@mantine/core";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameOptions } from "../../context";
import { generateBoardOptions } from "../../lib/helpers";
import { GameStatusModal } from "../../modals";
import { socket } from "../../services";

const ChessBoard = dynamic(() => import("../../components/ChessBoard"), {
  ssr: false,
});

export default function MultiplayerPage() {
  const searchParams = useSearchParams();
  const { gameOptions, setGameOptions } = useGameOptions();
  const [loading, setLoading] = useState(true);

  const roomId = searchParams.get("roomId");

  useEffect(() => {
    const { side, timeControl, increment } = gameOptions?.board || {};

    const startingSide =
      side === "random" ? (Math.random() < 0.5 ? "white" : "black") : side;

    const newBoardOptions = generateBoardOptions({
      side: startingSide,
      timeControl: parseInt(timeControl),
      increment: parseInt(increment)
    });

    setGameOptions((prev) => ({
      ...prev,
      board: newBoardOptions,
    }));

    const createOrJoinRoom = () => {
      if (gameOptions?.connection?.roomCreated) {
        console.log("#LOG Attempting to join room:", roomId);
        socket.emit("room_join", roomId);
      } else {
        console.log("#LOG Creating new room:", roomId);
        socket.emit("room_create", roomId, newBoardOptions);
      }

      // By default it should try to join game first, if that fails it means there is no existing room thus it means we have to create the room.
      // Check for flag createRoom, if this flag is false, that suggest we have not arrived at this page from main menu but rather through direct link, avoid creating room because time controls, side to start has not setup.
      // If createRoom flag found, that means we have all the gameOptions available to us, create room in this case and wait  for other player to join.

    };

    if (socket.connected) {
      createOrJoinRoom();
    } else {
      socket.once("connect", () => {
        createOrJoinRoom();
      });
    }

    // Socket event listeners
    socket.on("room_created", (id) => {
      console.log("#LOG Room created event:", { id, gameOptions });
      setGameOptions((prev) => ({
        ...prev,
        connection: {
          ...prev.connection,
          status: "waiting",
          roomCreated: true,
        },
      }));
    });

    socket.on("room_joined", ({ roomId, boardOptions }) => {
      console.log("#LOG Room joined event:", { roomId, boardOptions });
      setGameOptions((prev) => ({
        board: generateBoardOptions(boardOptions),
        connection: {
          ...prev.connection,
          roomId,
          status: "playing",
        },
      }));
    });

    socket.on("player_joined", ({ id }) => {
      setGameOptions((prev) => ({
        ...prev,
        connection: {
          ...prev.connection,
          status: "playing",
        },
      }));
    });

    socket.on("room_error", (error) => {
      console.log("#LOG Room error event:", error);
      alert(`Error: ${error.message}`);
      router.push("/play");
    });

    setLoading(false);

    return () => {
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("player_joined");
      socket.off("room_error");
      socket.off("connect");
    };
  }, [roomId, setGameOptions]);

  return (
    <MantineProvider>
      <div className="min-h-screen bg-gray-900 py-4 px-2 sm:py-6 sm:px-4">
        <div className="max-w-full xl:max-w-7xl mx-auto">
          {loading ? (
            <div className="text-white text-lg flex justify-center">
              Loading game...
            </div>
          ) : (
            <div className="flex justify-center items-center">
              <ChessBoard
                gameOptions={gameOptions}
                isGameReady={gameOptions?.connection?.status === "playing"}
                roomId={roomId}
              />
              <GameStatusModal
                status={gameOptions?.connection?.status}
                roomId={roomId}
              />
            </div>
          )}
        </div>
      </div>
    </MantineProvider>
  );
}
