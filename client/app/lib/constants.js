export const TIME_CONTROLS = [
  { value: "60", label: "Bullet (1 min)" },
  { value: "180", label: "Blitz (3 min)" },
  { value: "300", label: "Blitz (5 min)" },
  { value: "600", label: "Rapid (10 min)" },
  { value: "1800", label: "Classical (30 min)" },
  { value: "0", label: "No Time Limit" },
];

export const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export const SIDES = {
  WHITE: "white",
  BLACK: "black",
};

export const PIECE_NAMES = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export const CHESS_PIECES = ["♟", "♞", "♝", "♜", "♛", "♚"];

export const DEFAULT_START_OPTIONS = {
  board: {
    side: SIDES.WHITE,
    timeControl: 600,
    increment: 0,
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    difficulty: "medium",
  },
  connection: {
    roomId: null,
    mySocketId: null,
    status: "", // waiting | playing | ended
  },
  players: [
    {
      id: null,
      name: "Player 1",
      side: SIDES.WHITE,
      timeLeft: 600,
    },
    {
      id: null,
      name: "Player 2",
      side: SIDES.BLACK,
      timeLeft: 600,
    },
  ],
};
