import { GameRoom } from "./entities";

export const gameRooms: Map<string, GameRoom> = new Map();

export const inverseSide = (side: string): string => {
  return side === "white" ? "black" : "white";
};

export const checkGameRoomExists = (roomId: string): boolean => {
  const room = gameRooms.get(roomId);
  if (!room) return false;

  return !(room.creatorId && room.joinerId);
};
