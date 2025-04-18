"use client";

import React from "react";

const DrawOfferModal = ({ isOpen, onAccept, onReject, opponentName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-white text-2xl font-bold mb-4 text-center">
          Draw Offer
        </h2>
        <div className="text-white text-xl mb-6 text-center">
          {opponentName || "Your opponent"} has offered a draw.
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onAccept}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawOfferModal; 