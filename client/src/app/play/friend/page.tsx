"use client";

import { GameStatusModal } from "@/components/modals";
import { useGameOptions } from "@/context";
import { apiInstance, connectSocket, socket } from "@/services";
import { BoardState, GameOptions, Side } from "@/types";
import { MantineProvider } from "@mantine/core";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

const ChessBoard = dynamic(() => import("@/components/ChessBoard"), {
  ssr: false,
});

const MultiplayerContent = () => {
  const searchParams = useSearchParams();
  const { gameOptions, setGameOptions, updateFen } = useGameOptions();
  const router = useRouter();
  const roomId = searchParams.get("roomId");

  const setStartPosition = (
    roomId: string,
    socketId: string,
    startOptions: GameOptions,
    joined = false
  ) => {
    const { board, players } = startOptions;

    setGameOptions({
      board,
      connection: {
        roomId,
        status: joined ? "playing" : "waiting",
        mySocketId: socketId,
      },
      players,
    });
  };

  useEffect(() => {
    // Socket event listeners
    socket.on("room_created", (roomId: string, startOptions: GameOptions) => {
      console.log("#LOG Room created:", { roomId, startOptions });

      setStartPosition(roomId, socket.id || "", startOptions);
    });

    socket.on("room_joined", (roomId: string, startOptions: GameOptions) => {
      console.log("#LOG Room joined:", { roomId, startOptions });

      setStartPosition(roomId, socket.id || "", startOptions, true);
    });

    socket.on("player_joined", (startOptions: GameOptions) => {
      console.log("#LOG Player joined:", { myID: socket.id, startOptions });

      setStartPosition(
        gameOptions.connection.roomId || "",
        socket.id || "",
        startOptions,
        true
      );
    });

    socket.on("room_error", (error) => {
      console.log("#LOG Room error event:", error);
      alert(`Error: ${error.message}`);
      router.push("/");
    });

    return () => {
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("player_joined");
      socket.off("room_error");
      socket.off("connect");
    };
  }, []);

  useEffect(() => {
    const checkRoomStatus = async () => {
      try {
        const response = await apiInstance.get(`/api/game/available/${roomId}`);
        console.log("#LOG Room status:", response.data);
        return response.data?.data?.available;
      } catch (error) {
        console.error("#LOG Error checking room status:", error);
        return false;
      }
    };

    const createOrJoinRoom = (
      roomId: string,
      roomAvailable: boolean,
      boardOptions: BoardState
    ) => {
      if (roomAvailable) {
        console.log("#LOG Attempting to join room:", roomId);
        socket.emit("room_join", roomId);
      } else {
        if (gameOptions.connection.status === "waiting") {
          socket.emit("room_create", roomId, boardOptions);
        } else {
          alert(`Room "${roomId}" is not available! Please try again.`);
          router.push("/");
        }
      }
    };

    checkRoomStatus().then(async (roomAvailable) => {
      console.log("#LOG Room status checked:", roomAvailable);

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

      try {
        await connectSocket();
      } catch (error) {
        console.error("#LOG Failed to wake server:", error);
        alert("Server is unavailable. Please try again in a moment.");
        router.push("/");
        return;
      }

      if (socket.connected) {
        createOrJoinRoom(roomId || "", roomAvailable, newBoard);
      } else {
        socket.once("connect", () => {
          createOrJoinRoom(roomId || "", roomAvailable, newBoard);
        });
      }
    });
  }, []);

  return (
    <MantineProvider>
      <div className="min-h-screen bg-gray-900 py-4 px-2 sm:py-6 sm:px-4">
        <div className="max-w-full xl:max-w-7xl mx-auto">
          <div className="flex justify-center items-center">
            <ChessBoard
              gameOptions={gameOptions}
              updateFen={updateFen}
              isGameReady={gameOptions?.connection?.status === "playing"}
              roomId={roomId}
              gameType="multiplayer"
            />
            <GameStatusModal
              status={gameOptions?.connection?.status}
              roomId={roomId || ""}
            />
          </div>
        </div>
      </div>
    </MantineProvider>
  );
};

export default function MultiplayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <p className="text-white text-xl">Loading game...</p>
        </div>
      }
    >
      <MultiplayerContent />
    </Suspense>
  );
}
