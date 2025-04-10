"use client";

import { createContext, useContext, useState } from "react";

const GameOptionsContext = createContext();

export const GameOptionsProvider = ({ children }) => {
  const [gameOptions, setGameOptions] = useState({
    board: {
      side: "white",
      timeControl: 10,
      increment: 0,
      difficulty: "medium",
    },
    connection: {
      roomId: null,
      status: "connecting", // connecting | waiting | playing | ended
      roomCreated: false,
    },
  });

  return (
    <GameOptionsContext.Provider value={{ gameOptions, setGameOptions }}>
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
