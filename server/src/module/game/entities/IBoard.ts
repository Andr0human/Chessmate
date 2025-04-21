import IColor from "./IColor";

interface IBoard {
  side: IColor;
  timeControl: number;
  increment: number;
  fen: string;
}

export default IBoard;
