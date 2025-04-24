import { IGoRequest } from "./entities";

const parseEngineOutput = (output: string): string[] => {
  const lines: string[] = output.split("\n");
  const engineOutput: string[] = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return engineOutput;
};

const buildGoCommand = (enginePath: string, options: IGoRequest): string => {
  let command = `${enginePath} go`;

  for (const [key, value] of Object.entries(options)) {
    if (key == "debug" && value) {
      command += ` debug`;
    } else if (key == "fen" && value) {
      command += ` fen "${value}"`;
    } else if (value) {
      command += ` ${key} ${value}`;
    }
  }

  return command;
};

export { parseEngineOutput, buildGoCommand };
