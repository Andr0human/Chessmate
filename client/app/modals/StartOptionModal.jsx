"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIFFICULTY_LEVELS, TIME_CONTROLS } from "../lib/constants";
import { useGameOptions } from "../context/GameOptionsContext";
import { generateRoomId } from "../lib/helpers";

const StartOptionModal = ({ isOpen, onClose, gameType, basePath }) => {
  const router = useRouter();
  const { gameOptions, setGameOptions } = useGameOptions();
  const [roomId, setRoomId] = useState("");

  const startGame = () => {
    onClose();
    let path = `${basePath}`;

    if (gameType === "multiplayer") {
      const newRoomId = generateRoomId();
      path += `?roomId=${newRoomId}`;

      setGameOptions({
        ...gameOptions,
        connection: {
          roomId: newRoomId,
          status: "waiting",
          roomCreated: false,
        },
      });
    }

    router.push(path);
  };

  const joinGame = async () => {
    onClose();

    setGameOptions({
      ...gameOptions,
      connection: {
        ...gameOptions.connection,
        status: "waiting",
        roomCreated: true,
      },
    });

    router.push(`${basePath}/?roomId=${roomId}`);
  };

  return (
    isOpen && (
      <div className="modal-backdrop">
        <div className="modal-container">
          <div className="modal-header">
            <h3 className="modal-title">Game Options</h3>
          </div>
          <div className="modal-body">
            {gameType === "multiplayer" && (
              <div className="modal-section">
                <label className="modal-label">Join Existing Game</label>
                <div
                  className="join-game-container"
                  style={{ display: "flex", gap: "10px", marginBottom: "15px" }}
                >
                  <input
                    type="text"
                    className="text-field"
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    style={{
                      flex: "1",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      color: "#333",
                      backgroundColor: "#fff",
                    }}
                  />
                  <button
                    className="button-join"
                    onClick={joinGame}
                    disabled={!roomId.trim()}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: roomId.trim() ? "#4d7cff" : "#ccc",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: roomId.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Join Game
                  </button>
                </div>
                <div
                  className="divider"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    margin: "20px 0",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  <div
                    style={{ flex: 1, height: "1px", backgroundColor: "#ddd" }}
                  ></div>
                  <span style={{ margin: "0 10px" }}>OR CREATE A NEW GAME</span>
                  <div
                    style={{ flex: 1, height: "1px", backgroundColor: "#ddd" }}
                  ></div>
                </div>
              </div>
            )}

            <div className="modal-section">
              <label className="modal-label">Choose your side</label>
              <div className="segment-control">
                {["white", "black", "random"].map((side) => (
                  <button
                    key={side}
                    className={`segment-button ${
                      gameOptions.board.side === side ? "active" : ""
                    }`}
                    onClick={() =>
                      setGameOptions({
                        ...gameOptions,
                        board: { ...gameOptions.board, side },
                      })
                    }
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
                value={gameOptions.board.timeControl}
                onChange={(e) =>
                  setGameOptions({
                    ...gameOptions,
                    board: {
                      ...gameOptions.board,
                      timeControl: e.target.value,
                    },
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
                value={gameOptions.board.increment}
                onChange={(e) =>
                  setGameOptions({
                    ...gameOptions,
                    board: {
                      ...gameOptions.board,
                      increment: parseInt(e.target.value),
                    },
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
                  value={gameOptions?.board?.difficulty}
                  onChange={(e) =>
                    setGameOptions({
                      ...gameOptions,
                      board: {
                        ...gameOptions.board,
                        difficulty: e.target.value,
                      },
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
              {gameType === "multiplayer" ? "Create Game" : "Start Game"}
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default StartOptionModal;
