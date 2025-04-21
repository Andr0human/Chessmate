"use client";

import { createContext, useContext, useState } from "react";
import { DEFAULT_START_OPTIONS } from "../lib/constants";
import { inverseSide } from "../lib/helpers";

const GameOptionsContext = createContext();

export const GameOptionsProvider = ({ children }) => {
  const [gameOptions, setGameOptions] = useState(DEFAULT_START_OPTIONS);

  const updateFen = (fen) => {
    setGameOptions((prev) => ({
      ...prev,
      board: { ...prev.board, side: inverseSide(prev.board.side), fen },
    }));
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
