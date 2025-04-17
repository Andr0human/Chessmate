import IColor from "./IColor";

interface IPlayer {
  id?: string;
  name: string;
  side: IColor;
  timeLeft: number;
}

export default IPlayer;
