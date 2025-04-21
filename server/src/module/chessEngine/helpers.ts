const parseEngineOutput = (output: string): string[] => {
  const lines: string[] = output.split("\n");
  const engineOutput: string[] = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return engineOutput;
};

export { parseEngineOutput };
