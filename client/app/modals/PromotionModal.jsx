"use client";

import React, { useRef } from "react";
import { SIDES } from "../lib/constants";
import { getPieceSymbol } from "../lib/helpers";

const PromotionModal = ({ isOpen, onClose, onSelectPiece, playerColor }) => {
  if (!isOpen) return null;

  const modalRef = useRef(null);

  // Promotion piece options (Queen, Rook, Bishop, Knight)
  const promotionPieces = ["q", "r", "b", "n"];

  // Use different background colors based on player color
  const isBlack = playerColor === SIDES.BLACK;
  const modalBg = isBlack ? "bg-gray-200" : "bg-gray-800";
  const buttonBg = isBlack ? "bg-gray-300" : "bg-gray-700";
  const buttonHoverBg = isBlack ? "hover:bg-gray-400" : "hover:bg-gray-600";
  const textColor = isBlack ? "text-black" : "text-white";

  // Handle click outside modal to cancel the move
  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleOutsideClick}
    >
      <div ref={modalRef} className={`${modalBg} p-8 rounded-lg shadow-lg`}>
        <h2 className={`${textColor} text-2xl font-bold mb-6 text-center`}>
          Promote Pawn
        </h2>
        <div className="flex gap-6">
          {promotionPieces.map((pieceType) => {
            // Create piece object format that matches chess.js piece format
            const piece = {
              type: pieceType,
              color: playerColor === SIDES.WHITE ? "w" : "b",
            };

            return (
              <button
                key={pieceType}
                className={`w-24 h-24 flex items-center justify-center ${buttonBg} ${buttonHoverBg} rounded-lg transition-colors cursor-pointer`}
                onClick={() => onSelectPiece(pieceType)}
              >
                <img
                  src={getPieceSymbol(piece)}
                  alt={`${piece.color === 'w' ? 'White' : 'Black'} ${pieceType}`}
                  style={{
                    width: "90%",
                    height: "90%",
                    objectFit: "contain"
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;
