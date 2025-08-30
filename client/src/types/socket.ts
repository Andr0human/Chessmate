import type { Move } from "./chess";
import type { BoardState, Player } from "./game";

interface MoveReceived {
  move: string;
  board: BoardState;
  players: Player[];
}

interface MoveSent {
  move: Move;
}

export type { MoveReceived, MoveSent };
