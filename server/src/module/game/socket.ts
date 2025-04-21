import { Socket } from "socket.io";
import logger from "../../lib/logger";
import { ChessEngine } from "../chessEngine";
import {
  IBoard,
  IColor,
  IGameType,
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
      side: IColor.WHITE,
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
      status: IStatus.PLAYING,
      players,
      board,
      lastTimeStamp: Date.now(),
      gameType: IGameType.MULTIPLAYER,
    });

    // TODO: Add checks if the computer chess engine is available
    // before creating the room

    logger.info(`Room created: ${roomId} by ${socket.id}`);
    socket.join(roomId);
    socket.emit("room_created", roomId, {
      board,
      players,
    });
  });

  socket.on(
    "room_create_singleplayer",
    async (gameOptions: IStartGameOptions) => {
      const roomId = `single_${socket.id}_${Date.now()}`;

      const board: IBoard = {
        side: IColor.WHITE,
        timeControl: gameOptions.timeControl,
        increment: gameOptions.increment,
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        difficulty: gameOptions?.difficulty,
      };

      const players: [IPlayer, IPlayer] = [
        {
          id: socket.id,
          name: socket.id,
          side: gameOptions.side,
          timeLeft: gameOptions.timeControl,
        },
        {
          id: "computer",
          name: "Computer",
          side: inverseSide(gameOptions.side),
          timeLeft: gameOptions.timeControl,
        },
      ];

      gameRooms.set(roomId, {
        id: roomId,
        status: IStatus.PLAYING,
        players,
        board,
        lastTimeStamp: Date.now(),
        gameType: IGameType.SINGLEPLAYER,
      });

      const engine = ChessEngine.getInstance();
      const engineReady = await engine.engineReady();

      if (!engineReady) {
        logger.error(`Engine not ready for room ${roomId}`);
        socket.emit("room_error", { message: "Computer not available!" });
        return;
      }

      logger.info(`Room created: ${roomId} by ${socket.id}`);
      socket.join(roomId);
      socket.emit("room_created_singleplayer", roomId, {
        board,
        players,
      });
    }
  );

  socket.on("room_join", (roomId: string) => {
    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room || room?.status === IStatus.ENDED) {
      logger.error(`Room "${roomId}" not found when joining!`);
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
      if (newOptions.board.side === player.side) {
        const elapsedSeconds = (currentTime - room.lastTimeStamp) / 1000;
        player.timeLeft = Math.max(0, player.timeLeft - elapsedSeconds);
        room.lastTimeStamp = currentTime;
      }
    });

    socket.join(roomId);
    socket.emit("room_joined", roomId, newOptions);

    socket.to(roomId).emit("player_joined", newOptions);
    logger.info(`Room ${roomId} joined by ${socket.id}`);
  });

  socket.on("move_sent", (roomId: string, moveUpdate: IMoveUpdate) => {
    const { move, socketId, fenAfterMove }: IMoveUpdate = moveUpdate;

    logger.info(`move: ${move} sent in room ${roomId}`);

    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room) {
      logger.error(`Room "${roomId}" not found for move`);
      socket.emit("room_error", { message: "Room not found for move" });
      return;
    }

    if (room.status !== IStatus.PLAYING) {
      logger.error(`Room "${roomId}" not in playing state for move`);
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
      side: inverseSide(room.board.side),
    };
    gameRooms.set(roomId, room);

    logger.info(`sending move ${move} to room ${roomId}`);
    socket.to(roomId).emit("move_received", {
      move,
      board: room.board,
      players: room.players,
    });
  });

  // Handle draw offer
  socket.on("offer_draw", (roomId: string) => {
    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room) {
      logger.error(`Room "${roomId}" not found when offering draw!`);
      socket.emit("room_error", { message: "Room not found" });
      return;
    }

    if (room.status !== IStatus.PLAYING) {
      logger.error(`Room "${roomId}" not in playing state when offering draw`);
      socket.emit("room_error", { message: "No game in progress" });
      return;
    }

    logger.info(`Draw offered in room ${roomId} by ${socket.id}`);
    socket.to(roomId).emit("draw_offered", socket.id);
  });

  // Handle draw acceptance
  socket.on("accept_draw", (roomId: string) => {
    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room) {
      logger.error(`Room "${roomId}" not found when accepting draw!`);
      socket.emit("room_error", { message: "Room not found" });
      return;
    }

    if (room.status !== IStatus.PLAYING) {
      logger.error(`Room "${roomId}" not in playing state when accepting draw`);
      socket.emit("room_error", { message: "No game in progress" });
      return;
    }

    logger.info(`Draw accepted in room ${roomId}`);
    gameRooms.delete(roomId);

    // Notify all clients in the room about the draw
    socket.to(roomId).emit("draw_accepted");
  });

  // Handle draw rejection
  socket.on("reject_draw", (roomId: string) => {
    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room) {
      logger.error(`Room "${roomId}" not found when rejecting draw!`);
      socket.emit("room_error", { message: "Room not found" });
      return;
    }

    if (room.status !== IStatus.PLAYING) {
      logger.error(`Room "${roomId}" not in playing state when rejecting draw`);
      socket.emit("room_error", { message: "No game in progress" });
      return;
    }

    logger.info(`Draw rejected in room ${roomId}`);
    socket.to(roomId).emit("draw_rejected");
  });

  // Handle resignation
  socket.on("resign_game", (roomId: string) => {
    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room) {
      logger.error(`Room "${roomId}" not found when resigning!`);
      socket.emit("room_error", { message: "Room not found" });
      return;
    }

    if (room.status !== IStatus.PLAYING) {
      logger.error(`Room "${roomId}" not in playing state when resigning`);
      socket.emit("room_error", { message: "No game in progress" });
      return;
    }

    logger.info(`Game resigned in room ${roomId} by ${socket.id}`);
    gameRooms.delete(roomId);

    // Notify all clients in the room about the resignation
    socket.to(roomId).emit("game_resigned", socket.id);
  });

  socket.on("disconnect", () => {
    logger.info(`socket disconnected ${socket.id}`);

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

  socket.on("request_engine_move", async (roomId: string) => {
    const room: IRoom | undefined = gameRooms.get(roomId);

    if (!room) {
      logger.error(`Room "${roomId}" not found when requesting engine move!`);
      socket.emit("room_error", { message: "Room not found" });
      return;
    }

    if (room.status !== IStatus.PLAYING) {
      logger.error(
        `Room "${roomId}" not in playing state when requesting engine move`
      );
      socket.emit("room_error", { message: "No game in progress" });
      return;
    }

    const player: IPlayer | undefined = room.players.find(
      (player) => player.id === "computer" && player.side === room.board.side
    );

    if (!player) {
      socket.emit("room_error", { message: "Not the computer's turn!" });
      return;
    }

    const engine: ChessEngine = ChessEngine.getInstance();
    const { move, fenAfterMove } = await engine.getMoveObject(room.board.fen, room.board.difficulty || "expert");

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
      side: inverseSide(room.board.side),
    };
    gameRooms.set(roomId, room);

    logger.info(`sending move ${move} to room ${roomId}`);
    socket.nsp.to(roomId).emit("move_received", {
      move,
      board: room.board,
      players: room.players,
    });
  });
}
