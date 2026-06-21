import { Namespace } from "socket.io";
import logger from "../../lib/logger";
import { VALID_DIFFICULTIES } from "../chessEngine";
import { IColor, IPlayer, IRoom, IStartGameOptions, IStatus } from "./entities";

export const gameRooms: Map<string, IRoom> = new Map();

export const inverseSide = (side: IColor): IColor => {
  return side === IColor.WHITE ? IColor.BLACK : IColor.WHITE;
};

// Bounds for client-supplied clock values. The UI only offers up to 1800s
// (30 min) time control and 30s increment; these caps leave generous headroom
// while staying far under setTimeout's ~24.8-day ceiling, which a huge
// timeControl would otherwise overflow in scheduleRoomTimeout. timeControl 0 is
// the legitimate "No Time Limit" option, so the floor is 0, not 1.
const MAX_TIME_CONTROL = 86_400; // 24h in seconds
const MAX_INCREMENT = 300; // 5 min per move

// Validate the game parameters a client supplies on room creation. The client
// is the chess-rules authority but these values feed the server's clock math
// and (for difficulty) the engine, so they're checked here at the boundary.
// Returns an error message when invalid, or null when the options are sound.
// `requireDifficulty` is set for single-player, where the engine needs it.
export const validateGameOptions = (
  options: IStartGameOptions,
  { requireDifficulty = false }: { requireDifficulty?: boolean } = {}
): string | null => {
  if (!options || typeof options !== "object") {
    return "Missing game options.";
  }

  // "random" is resolved to white/black client-side before emit, so only the
  // two concrete colors are valid here.
  if (options.side !== IColor.WHITE && options.side !== IColor.BLACK) {
    return "Invalid side.";
  }

  if (
    !Number.isInteger(options.timeControl) ||
    options.timeControl < 0 ||
    options.timeControl > MAX_TIME_CONTROL
  ) {
    return "Invalid time control.";
  }

  if (
    !Number.isInteger(options.increment) ||
    options.increment < 0 ||
    options.increment > MAX_INCREMENT
  ) {
    return "Invalid increment.";
  }

  if (options.difficulty === undefined) {
    if (requireDifficulty) return "Missing difficulty.";
  } else if (!VALID_DIFFICULTIES.has(options.difficulty)) {
    return "Invalid difficulty.";
  }

  return null;
};

// Cancel a room's pending flag-fall timer, if any.
export const clearRoomTimeout = (room: IRoom): void => {
  if (room.timeoutHandle) {
    clearTimeout(room.timeoutHandle);
    room.timeoutHandle = undefined;
  }
};

// (Re)schedule the authoritative flag-fall for the room's active player.
// Only human players are timed — the engine answers on its own turn, so the
// human is never on the clock while it thinks. Called on game start and after
// every move; the previous timer is always cleared first.
export const scheduleRoomTimeout = (room: IRoom, nsp: Namespace): void => {
  clearRoomTimeout(room);

  if (room.status !== IStatus.PLAYING) return;
  if (!(room.board.timeControl > 0)) return;

  const active: IPlayer | undefined = room.players.find(
    (player) => player.side === room.board.side
  );
  if (!active || !active.id || active.id === "computer") return;

  const remainingMs = Math.max(0, active.timeLeft * 1000);

  room.timeoutHandle = setTimeout(() => {
    const current: IRoom | undefined = gameRooms.get(room.id);
    if (!current || current.status !== IStatus.PLAYING) return;

    const player: IPlayer | undefined = current.players.find(
      (p) => p.side === current.board.side
    );
    if (!player) return;

    // Re-verify against the wall clock: the timer may have fired early, or the
    // clock may have been topped up since it was scheduled.
    const elapsedSeconds = (Date.now() - current.lastTimeStamp) / 1000;
    if (player.timeLeft - elapsedSeconds > 0) {
      scheduleRoomTimeout(current, nsp);
      return;
    }

    player.timeLeft = 0;
    current.status = IStatus.ENDED;
    clearRoomTimeout(current);
    gameRooms.delete(current.id);

    const winner = inverseSide(player.side);
    logger.info(`Room ${current.id}: ${player.side} flagged, ${winner} wins`);
    nsp.to(current.id).emit("game_over_timeout", {
      winner,
      loser: player.side,
    });
  }, remainingMs);
};

export const checkGameRoomExists = (roomId: string): boolean => {
  const room: IRoom | undefined = gameRooms.get(roomId);
  if (!room) return false;
  if (room.status === IStatus.ENDED) return false;

  return room.players.some(({ id }) => !!id);
};

export const isPlayerInRoom = (room: IRoom, socketId: string): boolean => {
  return room.players.some((player) => player.id === socketId);
};

export const getAllGameRooms = (): IRoom[] => {
  return Array.from(gameRooms.values());
};
