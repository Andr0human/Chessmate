"use client";

import { createContext, useContext, useState } from "react";
import { SIDES } from "../lib/constants";

const GameOptionsContext = createContext();

export const GameOptionsProvider = ({ children }) => {
  const [gameOptions, setGameOptions] = useState({
    board: {
      side: SIDES.WHITE,
      timeControl: 600,
      increment: 0,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    },
    connection: {
      roomId: null,
      mySocketId: null,
      status: "", // waiting | playing | ended
    },
    players: [
      {
        id: null,
        name: "Player 1",
        side: SIDES.WHITE,
        timeLeft: 600,
      },
      {
        id: null,
        name: "Player 2",
        side: SIDES.BLACK,
        timeLeft: 600,
      },
    ],
  });

  const updateFen = (fen) => {
    setGameOptions({ ...gameOptions, board: { ...gameOptions.board, fen } });
  };

  return (
    <GameOptionsContext.Provider
      value={{ gameOptions, setGameOptions, updateFen }}
    >
      {children}
    </GameOptionsContext.Provider>
  );
};

export const useGameOptions = () => {
  const context = useContext(GameOptionsContext);
  if (!context) {
    throw new Error("useGameOptions must be used within a GameOptionsProvider");
  }
  return context;
};
