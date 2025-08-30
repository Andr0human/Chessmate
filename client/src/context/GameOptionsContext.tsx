"use client";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";

import { DEFAULT_START_OPTIONS } from "../lib/constants";
import { GameOptions, Side } from "@/types";

interface GameOptionsContextType {
  gameOptions: GameOptions;
  setGameOptions: Dispatch<SetStateAction<GameOptions>>;
  updateFen: (fen: string) => void;
}

const GameOptionsContext = createContext<GameOptionsContextType | undefined>(
  undefined
);

export const GameOptionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [gameOptions, setGameOptions] = useState<GameOptions>(
    DEFAULT_START_OPTIONS
  );

  const updateFen = (fen: string) => {
    setGameOptions((prev) => ({
      ...prev,
      board: {
        ...prev.board,
        side: prev.board.side === Side.white ? Side.black : Side.white,
        fen,
      },
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
