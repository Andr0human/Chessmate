import IColor from "./IColor";

interface IBoard {
  side: IColor;
  timeControl: number;
  increment: number;
  fen: string;
  difficulty?: string;
}

export default IBoard;
