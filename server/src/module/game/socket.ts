import { Socket } from "socket.io";
import {
  IBoard,
  IColor,
  IMoveUpdate,
  IPlayer,
  IRoom,
  IStartGameOptions,
  IStatus,
} from "./entities";
import { gameRooms, inverseSide } from "./helpers";

export default function registerGameSocketHandlers(socket: Socket) {
  socket.on("room_create", (roomId: string, gameOptions: IStartGameOptions) => {
    const board: IBoard = {
      side2move: IColor.WHITE,
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
      lastTimeStamp: Date.now(),
    });

    console.log(`Room created: ${roomId} by ${socket.id}`);
    socket.join(roomId);
    socket.emit("room_created", roomId, {
      board,
      players,
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

    if (room.status === IStatus.WAITING) {
      room.lastTimeStamp = Date.now();
    }
    room.status = IStatus.PLAYING;
    gameRooms.set(roomId, room);

    const newOptions = {
      board: room.board,
      players: room.players,
    };

    const currentTime = Date.now();
    newOptions.players.forEach((player: IPlayer) => {
      if (newOptions.board.side2move === player.side) {
        const elapsedSeconds = (currentTime - room.lastTimeStamp) / 1000;
        player.timeLeft = Math.max(0, player.timeLeft - elapsedSeconds);
        room.lastTimeStamp = currentTime;
      }
    });

    socket.join(roomId);
    socket.emit("room_joined", roomId, newOptions);

    socket.to(roomId).emit("player_joined", newOptions);
    console.log(`Room ${roomId} joined by ${socket.id}`);
  });

  socket.on("move_sent", (roomId: string, moveUpdate: IMoveUpdate) => {
    const { move, socketId, fenAfterMove }: IMoveUpdate = moveUpdate;

    console.log(`move_sent: ${move} in room ${roomId}`);
    console.log("moveUpdate", moveUpdate);

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

    const currentTime: number = Date.now();
    const elapsedSeconds: number = (currentTime - room.lastTimeStamp) / 1000;
    let timeLeft: number = Math.max(0, player.timeLeft - elapsedSeconds);

    if (room.board.increment > 0) {
      timeLeft += room.board.increment;
    }

    room.lastTimeStamp = currentTime;
    player.timeLeft = timeLeft;

    room.board = {
      ...room.board,
      fen: fenAfterMove,
      side2move: inverseSide(room.board.side2move),
    };
    gameRooms.set(roomId, room);

    console.log(`sending move ${move} to room ${roomId}`);
    socket.to(roomId).emit("move_received", {
      move,
      board: room.board,
      players: room.players,
    });
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
