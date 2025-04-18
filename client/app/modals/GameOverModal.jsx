"use client";

import React from "react";
import { SIDES } from "../lib/constants";

const GameOverModal = ({ isOpen, result, winner, onMainMenu }) => {
  if (!isOpen) return null;

  const getResultMessage = () => {
    if (result === "checkmate") {
      return `Checkmate! ${winner === SIDES.WHITE ? "White" : "Black"} wins`;
    } else if (result === "draw") {
      switch (winner) {
        case "stalemate":
          return "Draw by stalemate";
        case "insufficient":
          return "Draw by insufficient material";
        case "threefold":
          return "Draw by threefold repetition";
        case "fifty":
          return "Draw by fifty-move rule";
        case "agreement":
          return "Draw by agreement";
        default:
          return "Draw";
      }
    } else if (result === "timeout") {
      return `Time's up! ${winner === SIDES.WHITE ? "White" : "Black"} wins`;
    } else if (result === "resignation") {
      return `${winner === SIDES.WHITE ? "Black" : "White"} resigned. ${
        winner === SIDES.WHITE ? "White" : "Black"
      } wins!`;
    }
    return "Game Over";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-white text-2xl font-bold mb-4 text-center">
          Game Over
        </h2>
        <div className="text-white text-xl mb-6 text-center">
          {getResultMessage()}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onMainMenu}
            className="py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal; 