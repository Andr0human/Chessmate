import IBoard from "./IBoard";
import IPlayer from "./IPlayer";
import IStatus from "./IStatus";

interface IRoom {
  id: string;
  players: [IPlayer, IPlayer];
  board: IBoard;
  status: IStatus;
  lastTimeStamp: number;
}

export default IRoom;
