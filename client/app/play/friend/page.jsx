"use client";

import { MantineProvider } from "@mantine/core";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useGameOptions } from "../../context";
import { SIDES } from "../../lib/constants";
import { generateBoardOptions } from "../../lib/helpers";
import { GameStatusModal } from "../../modals";
import { apiInstance, socket } from "../../services";

const ChessBoard = dynamic(() => import("../../components/ChessBoard"), {
  ssr: false,
});

export default function MultiplayerPage() {
  const searchParams = useSearchParams();
  const { gameOptions, setGameOptions } = useGameOptions();
  const router = useRouter();
  const roomId = searchParams.get("roomId");

  const setStartPosition = (roomId, startOptions, joined = false) => {
    const { board, players } = startOptions;

    setGameOptions({
      board: generateBoardOptions({ ...board, side: board.side2move }),
      connection: {
        roomId,
        status: joined ? "playing" : "waiting",
      },
      players,
    });
  };

  useEffect(() => {
    // Socket event listeners
    socket.on("room_created", (roomId, startOptions) => {
      console.log("#LOG Room created:", { roomId, startOptions });

      setStartPosition(roomId, startOptions);
    });

    socket.on("room_joined", (roomId, startOptions) => {
      console.log("#LOG Room joined:", { roomId, startOptions });

      setStartPosition(roomId, startOptions, true);
    });

    socket.on("player_joined", ({ id }) => {
      console.log("#LOG Player joined:", { id });
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

    const createOrJoinRoom = (roomId, roomAvailable, boardOptions) => {
      if (roomAvailable) {
        console.log("#LOG Attempting to join room:", roomId);
        socket.emit("room_join", roomId);
      } else {
        if (gameOptions.connection.status === "waiting") {
          socket.emit("room_create", roomId, boardOptions);
        } else {
          alert("Cannot create a new room due to no game parameters");
          router.push("/");
        }
      }
    };

    checkRoomStatus().then((roomAvailable) => {
      console.log("#LOG Room status checked:", roomAvailable);

      const { side, timeControl, increment, fen } = gameOptions?.board || {};

      const startingSide =
        side === "random"
          ? Math.random() < 0.5
            ? SIDES.WHITE
            : SIDES.BLACK
          : side;

      const newBoardOptions = generateBoardOptions({
        side: startingSide,
        timeControl,
        increment,
        fen,
      });

      setGameOptions((prev) => ({
        ...prev,
        board: newBoardOptions,
      }));

      if (socket.connected) {
        createOrJoinRoom(roomId, roomAvailable, newBoardOptions);
      } else {
        socket.once("connect", () => {
          createOrJoinRoom(roomId, roomAvailable, newBoardOptions);
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
              isGameReady={gameOptions?.connection?.status === "playing"}
              roomId={roomId}
            />
            <GameStatusModal
              status={gameOptions?.connection?.status}
              roomId={roomId}
            />
          </div>
        </div>
      </div>
    </MantineProvider>
  );
}
