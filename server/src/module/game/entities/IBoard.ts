import IColor from "./IColor";

interface IBoard {
  side2move: IColor;
  timeControl: number;
  increment: number;
  fen: string;
}

export default IBoard;
