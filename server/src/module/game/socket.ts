import { Socket } from "socket.io";
import { gameRooms, inverseSide } from "./helpers";
import {
  IBoard,
  IMoveUpdate,
  IPlayer,
  IRoom,
  IStartGameOptions,
  IStatus,
} from "./entities";

export default function registerGameSocketHandlers(socket: Socket) {
  socket.on("room_create", (roomId: string, gameOptions: IStartGameOptions) => {
    const board: IBoard = {
      side2move: "white",
      timeControl: gameOptions.timeControl,
      increment: gameOptions.increment,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    };
    const players: [IPlayer, IPlayer] = [
      {
        id: socket.id,
        name: socket.id,
        side: gameOptions.side,
        timeLeft: gameOptions.timeControl,
      },
      {
        name: "Player 2",
        side: inverseSide(gameOptions.side),
        timeLeft: gameOptions.timeControl,
      },
    ];

    gameRooms.set(roomId, {
      id: roomId,
      status: IStatus.WAITING,
      players,
      board,
    });

    console.log(`Room created: ${roomId} by ${socket.id}`);
    socket.join(roomId);
    socket.emit("room_created", roomId, {
      board: board,
      players: players,
    });
  });

  socket.on("room_join", (roomId: string) => {
    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room || room?.status === IStatus.ENDED) {
      socket.emit("room_error", { message: "Room not found" });
      return;
    }

    room.players.forEach((player: IPlayer) => {
      if (!player.id) {
        player.id = socket.id;
        player.name = socket.id;
      }
    });

    room.status = IStatus.PLAYING;
    gameRooms.set(roomId, room);

    socket.join(roomId);
    socket.emit("room_joined", roomId, {
      board: room.board,
      players: room.players,
    });

    socket.to(roomId).emit("player_joined", { id: socket.id });
    console.log(`Room ${roomId} joined by ${socket.id}`);
  });

  socket.on("move_sent", (moveUpdate: IMoveUpdate) => {
    const { move, roomId, socketId, fenAfterMove, timeLeft } = moveUpdate;

    console.log(`move_sent: ${move} in room ${roomId}`);
    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room) {
      socket.emit("room_error", { message: "Room not found for move" });
      return;
    }

    if (room.status !== IStatus.PLAYING) {
      socket.emit("room_error", { message: "No game in progress" });
      return;
    }

    const player: IPlayer | undefined = room.players.find(
      (player) => player.id === socketId
    );

    if (!player) {
      socket.emit("room_error", { message: "Not a player in this room" });
      return;
    }

    // update board and players
    player.timeLeft = timeLeft;
    room.board = {
      ...room.board,
      fen: fenAfterMove,
      side2move: inverseSide(room.board.side2move),
    };
    gameRooms.set(roomId, room);

    console.log("sending move to room", roomId);
    socket.to(roomId).emit("move_received", move);
  });

  socket.on("disconnect", () => {
    console.log(`socket disconnected ${socket.id}`);

    for (const [roomId, room] of gameRooms.entries()) {
      const player: IPlayer | undefined = room.players.find(
        (player) => player.id === socket.id
      );

      if (player) {
        delete player?.id;
      }

      if (room.players.every((player) => !player.id)) {
        gameRooms.delete(roomId);
      } else {
        gameRooms.set(roomId, room);
        socket.to(roomId).emit("player_left", { id: socket.id });
      }
    }
  });
}
