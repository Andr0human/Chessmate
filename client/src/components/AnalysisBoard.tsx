"use client";

import { PromotionModal } from "@/components/modals";
import { getPieceSymbol, squareToAlgebraic } from "@/lib/helpers";
import { ChessJsPiece, DraggingPiece, Move, PieceType, Side, Square } from "@/types";
import { Chess } from "chess.js";
import {
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AnalysisBoardProps {
  fen: string;
  boardFlipped: boolean;
  lastMove: Move | null;
  // Called after a legal move is played on the board. The parent owns the
  // canonical position (and undo history) and feeds the new FEN back down.
  onMove: (fenAfter: string, move: { from: Square; to: Square; san: string }) => void;
}

const AnalysisBoard = ({
  fen,
  boardFlipped,
  lastMove,
  onMove,
}: AnalysisBoardProps) => {
  // Position authority: a fresh chess.js instance per FEN. Unlike ChessBoard
  // there's no turn-to-player gating — chess.js only allows the side to move,
  // so both colours become movable as the turn alternates (correct for
  // free analysis). The parent owns the canonical FEN; we re-derive on change.
  const game = useMemo(() => new Chess(fen), [fen]);

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [draggingPiece, setDraggingPiece] = useState<DraggingPiece | null>(null);
  const [squareSize, setSquareSize] = useState(100);

  // Promotion modal state
  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // Clear any in-progress selection when the position changes (move, load,
  // undo, reset) so highlights never linger on a stale square.
  useEffect(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
    setDraggingPiece(null);
  }, [fen]);

  // Responsive square sizing (mirrors ChessBoard).
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      if (width < 400) setSquareSize(48);
      else if (width < 640) setSquareSize(60);
      else if (width < 768) setSquareSize(70);
      else if (width < 1024) setSquareSize(80);
      else setSquareSize(100);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const getLegalMovesForSquare = useCallback(
    (square: Square): Square[] =>
      game.moves({ square, verbose: true }).map((move) => move.to as Square),
    [game]
  );

  // Apply a (legal) move and notify the parent with SAN + resulting FEN.
  const applyMove = useCallback(
    (from: Square, to: Square, promotion?: PieceType) => {
      try {
        const move = game.move({ from, to, promotion });
        if (move) {
          onMove(game.fen(), {
            from: move.from as Square,
            to: move.to as Square,
            san: move.san,
          });
        }
      } catch {
        // Illegal move — ignore (chess.js throws on rejection).
      } finally {
        setSelectedSquare(null);
        setLegalMoves([]);
        setDraggingPiece(null);
      }
    },
    [game, onMove]
  );

  const isPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      const piece = game.get(from);
      return (
        !!piece &&
        piece.type === "p" &&
        ((piece.color === "w" && to[1] === "8") ||
          (piece.color === "b" && to[1] === "1"))
      );
    },
    [game]
  );

  // Move (via click or drag): open the promotion picker first if needed.
  const tryMove = useCallback(
    (from: Square, to: Square) => {
      if (isPromotion(from, to)) {
        setPromotionMove({ from, to });
        setShowPromotionModal(true);
        return;
      }
      applyMove(from, to);
    },
    [applyMove, isPromotion]
  );

  const handlePieceSelect = useCallback(
    (piece: ChessJsPiece, square: Square) => {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      // Only the side to move can be selected (chess.js owns the turn).
      if (piece?.color !== game.turn()) {
        return;
      }
      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(square));
    },
    [game, getLegalMovesForSquare, selectedSquare]
  );

  const handleSquareClick = useCallback(
    (targetSquare: Square) => {
      if (selectedSquare && legalMoves.includes(targetSquare)) {
        tryMove(selectedSquare, targetSquare);
      }
    },
    [legalMoves, selectedSquare, tryMove]
  );

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, piece: ChessJsPiece, square: Square) => {
      if (piece?.color !== game.turn()) {
        return;
      }
      setDraggingPiece({ piece, square });
      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(square));
      e.dataTransfer.effectAllowed = "move";
    },
    [game, getLegalMovesForSquare]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetSquare: Square) => {
      e.preventDefault();
      if (!draggingPiece) {
        return;
      }
      tryMove(draggingPiece.square, targetSquare);
    },
    [draggingPiece, tryMove]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handlePromotionSelect = useCallback(
    (pieceType: PieceType) => {
      if (promotionMove) {
        applyMove(promotionMove.from, promotionMove.to, pieceType);
      }
      setShowPromotionModal(false);
      setPromotionMove(null);
    },
    [applyMove, promotionMove]
  );

  const handleCancelPromotion = useCallback(() => {
    setShowPromotionModal(false);
    setPromotionMove(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    setDraggingPiece(null);
  }, []);

  const boardPosition = game.board();

  const renderSquare = (row: number, col: number) => {
    const boardRow = boardFlipped ? 7 - row : row;
    const boardCol = boardFlipped ? 7 - col : col;
    const algebraicSquare = squareToAlgebraic(row, col, boardFlipped);
    const isDark = (row + col) % 2 === 1;
    const piece: ChessJsPiece = boardPosition[boardRow][boardCol];

    const isSelected = selectedSquare === algebraicSquare;
    const isLegalMove = legalMoves.includes(algebraicSquare);
    const isLastMoveFrom = lastMove?.from === algebraicSquare;
    const isLastMoveTo = lastMove?.to === algebraicSquare;

    return (
      <div
        key={`${row}-${col}`}
        className={`flex items-center justify-center relative ${
          isDark ? "bg-[#B58863]" : "bg-[#F0D9B5]"
        }`}
        style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
        onClick={() => {
          if (piece && piece.color === game.turn() && !isLegalMove) {
            return; // Let the piece handler select it.
          }
          handleSquareClick(algebraicSquare);
        }}
        onDrop={(e) => handleDrop(e, algebraicSquare)}
        onDragOver={handleDragOver}
      >
        {col === 0 && (
          <div className="absolute top-0 left-0 text-xs p-0.5 opacity-60">
            {boardFlipped ? row + 1 : 8 - row}
          </div>
        )}
        {row === 7 && (
          <div className="absolute bottom-0 right-0 text-xs p-0.5 opacity-60">
            {["a", "b", "c", "d", "e", "f", "g", "h"][boardFlipped ? 7 - col : col]}
          </div>
        )}

        {(isLastMoveFrom || isLastMoveTo) && (
          <div className="absolute inset-0 bg-amber-500 opacity-25 z-0 ring-2 ring-amber-500 ring-inset" />
        )}
        {isSelected && (
          <div className="absolute inset-0 bg-yellow-400 opacity-40 z-0" />
        )}
        {isLegalMove && !piece && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-1/3 h-1/3 rounded-full bg-gray-600 opacity-40" />
          </div>
        )}
        {isLegalMove && piece && (
          <div className="absolute inset-0 border-2 border-gray-600 opacity-80 z-10" />
        )}

        {piece && (
          <div
            className={`chess-piece cursor-grab z-20 ${isSelected ? "scale-110" : ""}`}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, piece, algebraicSquare)}
            onClick={(e) => {
              e.stopPropagation();
              if (isLegalMove) {
                handleSquareClick(algebraicSquare);
              } else {
                handlePieceSelect(piece, algebraicSquare);
              }
            }}
            style={{
              transition: "transform 0.15s ease-in-out",
              width: `${squareSize * 0.8}px`,
              height: `${squareSize * 0.8}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={getPieceSymbol(piece)}
              alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              draggable="false"
            />
          </div>
        )}
      </div>
    );
  };

  const promotingColor: Side =
    game.turn() === "w" ? Side.white : Side.black;

  return (
    <>
      <div className="chess-board border-4 border-gray-800 shadow-xl rounded-sm overflow-hidden">
        {Array.from({ length: 8 }, (_, row) => (
          <div key={row} className="flex">
            {Array.from({ length: 8 }, (_, col) => renderSquare(row, col))}
          </div>
        ))}
      </div>

      <PromotionModal
        isOpen={showPromotionModal}
        onClose={handleCancelPromotion}
        onSelectPiece={handlePromotionSelect}
        playerColor={promotingColor}
      />
    </>
  );
};

export default AnalysisBoard;
