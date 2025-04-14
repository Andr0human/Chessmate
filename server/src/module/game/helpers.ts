import { IRoom, IStatus } from "./entities";

export const gameRooms: Map<string, IRoom> = new Map();

export const inverseSide = (side: string): string => {
  return side === "white" ? "black" : "white";
};

export const checkGameRoomExists = (roomId: string): boolean => {
  const room: IRoom | undefined = gameRooms.get(roomId);
  if (!room) return false;
  if (room.status === IStatus.ENDED) return false;

  return room.players.some(({ id }) => !!id);
};
