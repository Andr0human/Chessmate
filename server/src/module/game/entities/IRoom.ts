import IBoard from "./IBoard";
import IGameType from "./IGameType";
import IPlayer from "./IPlayer";
import IStatus from "./IStatus";

interface IRoom {
  id: string;
  players: [IPlayer, IPlayer];
  board: IBoard;
  status: IStatus;
  lastTimeStamp: number;
  gameType: IGameType;
  // socket.id of the player with an outstanding draw offer, if any.
  drawOfferedBy?: string;
  // In-memory flag-fall timer for the active player; cleared/rescheduled on
  // each move and cleared when the game ends. Never serialized.
  timeoutHandle?: NodeJS.Timeout;
}

export default IRoom;
