"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIFFICULTY_LEVELS, TIME_CONTROLS } from "../lib/constants";

const StartOptionModal = ({ isOpen, onClose, gameType }) => {
  const router = useRouter();

  const [gameOptions, setGameOptions] = useState({
    side: "white",
    timeControl: "10",
    increment: 0,
    difficulty: "medium",
  });

  const startGame = () => {
    onClose();
    const basePath =
      gameType === "singleplayer" ? "/play/single" : "/play/friend";
    const queryParams = new URLSearchParams(gameOptions).toString();

    router.push(`${basePath}?${queryParams}`);
  };

  return (
    isOpen && (
      <div className="modal-backdrop">
        <div className="modal-container">
          <div className="modal-header">
            <h3 className="modal-title">Game Options</h3>
          </div>
          <div className="modal-body">
            <div className="modal-section">
              <label className="modal-label">Choose your side</label>
              <div className="segment-control">
                {["white", "black", "random"].map((side) => (
                  <button
                    key={side}
                    className={`segment-button ${
                      gameOptions.side === side ? "active" : ""
                    }`}
                    onClick={() => setGameOptions({ ...gameOptions, side })}
                  >
                    {side.charAt(0).toUpperCase() + side.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <label className="modal-label">Time Control (minutes)</label>
              <select
                className="select-field"
                value={gameOptions.timeControl}
                onChange={(e) =>
                  setGameOptions({
                    ...gameOptions,
                    timeControl: e.target.value,
                  })
                }
              >
                {TIME_CONTROLS.map((control) => (
                  <option key={control.value} value={control.value}>
                    {control.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-section">
              <label className="modal-label">
                Increment (seconds per move)
              </label>
              <input
                type="number"
                className="number-field"
                value={gameOptions.increment}
                onChange={(e) =>
                  setGameOptions({
                    ...gameOptions,
                    increment: parseInt(e.target.value),
                  })
                }
                min={0}
                max={30}
              />
            </div>

            {gameType === "singleplayer" && (
              <div className="modal-section">
                <label className="modal-label">Bot Difficulty</label>
                <select
                  className="select-field"
                  value={gameOptions.difficulty}
                  onChange={(e) =>
                    setGameOptions({
                      ...gameOptions,
                      difficulty: e.target.value,
                    })
                  }
                >
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="button-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="button-start" onClick={startGame}>
              Start Game
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default StartOptionModal;
