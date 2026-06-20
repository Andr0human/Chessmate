import { IGoRequest } from "./entities";

const parseEngineOutput = (output: string): string[] => {
  const lines: string[] = output.split("\n");
  const engineOutput: string[] = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return engineOutput;
};

// Build the argv array for `elsa go ...` (no shell). Each element becomes a
// distinct argv token, so space-containing values like the FEN are passed
// verbatim with no shell interpretation — see execFile in Engine.ts.
const buildGoArgs = (options: IGoRequest): string[] => {
  const args: string[] = ["go"];

  for (const [key, value] of Object.entries(options)) {
    if (key === "debug" && value) {
      args.push("debug");
    } else if (key === "fen" && value) {
      args.push("fen", String(value));
    } else if (value) {
      args.push(key, String(value));
    }
  }

  return args;
};

export { parseEngineOutput, buildGoArgs };
