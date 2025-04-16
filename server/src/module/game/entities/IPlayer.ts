import IColor from "./IColor";

interface IPlayer {
  id?: string;
  name: string;
  side: IColor;
  lastTimeStamped: number;
  timeLeft: number;
}

export default IPlayer;
