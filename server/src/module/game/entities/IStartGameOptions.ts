import IColor from "./IColor";

interface IStartGameOptions {
  side: IColor;
  timeControl: number;
  increment: number;
  difficulty?: string;
}

export default IStartGameOptions;
