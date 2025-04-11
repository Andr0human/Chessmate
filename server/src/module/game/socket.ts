import { Socket } from "socket.io";
import { GameRoom } from "./entities";
import { inverseSide } from "./helpers";

const gameRooms: Map<string, GameRoom> = new Map();

export default function registerGameSocketHandlers(socket: Socket) {
  socket.on("room_create", (roomId: string, gameOptions: any) => {
    socket.join(roomId);
    console.log(`${socket.id} created room ${roomId}`);

    gameRooms.set(roomId, {
      id: roomId,
      creatorId: socket.id,
      status: "waiting",
      playerSides: [gameOptions.side, inverseSide(gameOptions.side)],
      gameOptions,
    });

    console.log(`Room created: ${roomId} by ${socket.id}`);
    socket.emit("room_created", roomId);
  });

  socket.on("room_join", (roomId: string) => {
    const room = gameRooms.get(roomId);

    if (!room) {
      socket.emit("room_error", { message: "Room not found" });
      return;
    }

    socket.join(roomId);
    room.joinerId = socket.id;
    room.status = "playing";
    gameRooms.set(roomId, room);

    const gameOptions = {
      ...room.gameOptions,
      side:
        socket.id === room.creatorId
          ? room.playerSides[0]
          : room.playerSides[1],
    };

    socket.emit("room_joined", {
      roomId,
      boardOptions: {
        side:
          socket.id === room.creatorId
            ? room.playerSides[0]
            : room.playerSides[1],
        timeControl: gameOptions.timeControl,
        increment: gameOptions.increment,
      },
    });
    socket.to(roomId).emit("player_joined", { id: socket.id });

    console.log(`Room ${roomId} joined by ${socket.id}`);
  });

  socket.on("move_sent", (move: any, roomId: string) => {
    console.log(`move_sent: ${move} in room ${roomId}`);

    const room = gameRooms.get(roomId);

    if (!room) {
      socket.emit("room_error", { message: "Room not found for move" });
      return;
    }

    if (room.status !== "playing") {
      socket.emit("room_error", { message: "No game in progress" });
      return;
    }

    if (room.creatorId !== socket.id && room.joinerId !== socket.id) {
      socket.emit("room_error", { message: "Not a player in this room" });
      return;
    }

    console.log("sending move to room", roomId);
    socket.to(roomId).emit("move_received", move);
  });

  socket.on("disconnect", () => {
    console.log(`socket disconnected ${socket.id}`);

    for (const [roomId, room] of gameRooms.entries()) {
      if (room?.creatorId === socket.id) {
        delete room.creatorId;
      }
      if (room.joinerId === socket.id) {
        delete room.joinerId;
      }

      if (!room?.creatorId && room?.joinerId) gameRooms.delete(roomId);
      else gameRooms.set(roomId, room);
    }
  });
}
