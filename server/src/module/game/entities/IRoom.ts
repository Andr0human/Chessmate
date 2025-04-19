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
}

export default IRoom;
