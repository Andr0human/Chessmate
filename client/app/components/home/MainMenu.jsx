"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const timeControls = [
  { value: "1", label: "Bullet (1 min)" },
  { value: "3", label: "Blitz (3 min)" },
  { value: "5", label: "Blitz (5 min)" },
  { value: "10", label: "Rapid (10 min)" },
  { value: "30", label: "Classical (30 min)" },
  { value: "0", label: "No Time Limit" },
];

const difficultyLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

const chessPieces = [
  "♟",
  "♞",
  "♝",
  "♜",
  "♛",
  "♚",
];

const MainMenu = () => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [singlePlayerModalOpen, setSinglePlayerModalOpen] = useState(false);
  const [gameOptions, setGameOptions] = useState({
    side: "white",
    timeControl: "10",
    increment: 0,
    difficulty: "medium",
  });

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    setTimeout(() => {
      setShowAnimation(true);
    }, 100);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const handlePlaySingle = () => {
    setSinglePlayerModalOpen(true);
  };

  const handlePlayFriend = () => {
    router.push("/play/friend");
  };

  const startSinglePlayerGame = () => {
    setSinglePlayerModalOpen(false);
    router.push(
      `/play/single?side=${gameOptions.side}&time=${gameOptions.timeControl}&increment=${gameOptions.increment}&difficulty=${gameOptions.difficulty}`
    );
  };

  return (
    <div className="main-container">
      <div className={`menu-container ${!showAnimation ? "hidden" : ""}`}>
        <div className="text-center mb-12">
          <h1 className={`game-title ${isMobile ? "mobile" : ""}`}>
            ChessMate
          </h1>
          <p className="game-tagline">Master your moves</p>
        </div>

        <div className="menu-panel">
          <div className="menu-header">
            <h2 className="menu-title">Choose your game mode</h2>
          </div>

          <div className="menu-buttons">
            <button
              className="button-primary button-green"
              onClick={handlePlaySingle}
            >
              Play vs Computer
            </button>

            <button
              className="button-primary button-blue"
              onClick={handlePlayFriend}
            >
              Play with Friend
            </button>
          </div>
        </div>

        <div className="chess-pieces-decoration">
          {chessPieces.map((piece) => (
            <span key={piece}>{piece}</span>
          ))}
        </div>

        <p className="footer-text">
          © 2025 ChessMate - The Ultimate Chess Experience
        </p>
      </div>

      {singlePlayerModalOpen && (
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
                  {timeControls.map((control) => (
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
                  {difficultyLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="button-cancel"
                onClick={() => setSinglePlayerModalOpen(false)}
              >
                Cancel
              </button>
              <button className="button-start" onClick={startSinglePlayerGame}>
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
