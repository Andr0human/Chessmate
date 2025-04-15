"use client";

import { useEffect, useState } from "react";
import { CHESS_PIECES } from "../../lib/constants";
import { StartOptionModal } from "../../modals";
import "../../styles/MainMenu.css";

const MainMenu = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [gameType, setGameType] = useState("");
  const [basePath, setBasePath] = useState("");

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
              onClick={() => {
                setGameType("singleplayer");
                setBasePath("/play/single");
                setModalOpen(true);
              }}
            >
              Play vs Computer
            </button>

            <button
              className="button-primary button-blue"
              onClick={() => {
                setGameType("multiplayer");
                setBasePath("/play/friend");
                setModalOpen(true);
              }}
            >
              Play with Friend
            </button>
          </div>
        </div>

        <div className="chess-pieces-decoration">
          {CHESS_PIECES.map((piece) => (
            <span key={piece}>{piece}</span>
          ))}
        </div>

        <p className="footer-text">
          © {new Date().getFullYear()} ChessMate - The Ultimate Chess Experience
        </p>
      </div>

      <StartOptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        gameType={gameType}
        basePath={basePath}
      />
    </div>
  );
};

export default MainMenu;
