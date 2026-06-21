import type { Move, Side } from "./chess";
import type { BoardState, Player } from "./game";

interface MoveReceived {
  move: string;
  board: BoardState;
  players: Player[];
}

interface MoveSent {
  move: Move;
}

// Authoritative flag-fall emitted by the server when a player's clock hits 0.
interface GameOverTimeout {
  winner: Side;
  loser: Side;
}

export type { GameOverTimeout, MoveReceived, MoveSent };
