// Time Control Types
export type {
  TimeControlOption,
  TimeControlValue,
  TimeControlType,
} from "./timeControl";

// Difficulty Types
export type { DifficultyOption, DifficultyLevel } from "./difficulty";

// Chess Types
export type {
  File,
  Rank,
  Square,
  PieceType,
  PieceName,
  PieceSymbol,
  PieceNameMapping,
  Piece,
  Move,
  FENString,
  ChessJsMove,
  ChessJsPiece,
  DraggingPiece,
} from "./chess";

export { Side } from "./chess";

// Game Types
export type {
  Player,
  BoardState,
  ConnectionState,
  GameStatus,
  GameOptions,
  GameState,
  GameResult,
  GameWinner,
} from "./game";

export { DrawReason } from "./game";

export type {
  GameOverTimeout,
  MoveReceived,
  AnalysisResult,
  AnalysisUpdate,
  AnalysisError,
} from "./socket";

export type { Star } from "./star";
