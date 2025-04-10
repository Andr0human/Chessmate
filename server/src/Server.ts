import { Server as SocketIOServer, Socket } from "socket.io";
import { IServerConfig } from "./config";
import http from "http";

interface GameRoom {
  id: string;
  creatorId?: string;
  joinerId?: string;
  playerSides: [string, string];
  status: "waiting" | "playing" | "ended";
  gameOptions: any;
}

const gameRooms: Map<string, GameRoom> = new Map();

class Server {
  private static instance: Server;

  private readonly config: IServerConfig;

  private readonly io: SocketIOServer;
  private readonly httpServer: http.Server;

  private constructor(config: IServerConfig) {
    this.config = config;

    const { cors } = this.config;

    this.httpServer = http.createServer();

    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: JSON.parse(cors.origin),
        credentials: cors.credentials,
      },
    });
  }

  public static getInstance(config: IServerConfig): Server {
    if (!Server.instance) {
      Server.instance = new Server(config);
    }

    return Server.instance;
  }

  static inverseSide = (side: string): string => {
    return side === "white" ? "black" : "white";
  };

  public run = () => {
    this.io.on("connection", (socket: Socket) => {
      console.log(`socket connected ${socket.id}`);

      socket.on("room_create", (roomId: string, gameOptions: any) => {
        socket.join(roomId);
        console.log(`${socket.id} created room ${roomId}`);

        gameRooms.set(roomId, {
          id: roomId,
          creatorId: socket.id,
          status: "waiting",
          playerSides: [gameOptions.side, Server.inverseSide(gameOptions.side)],
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

      socket.on("disconnect", () => {
        console.log(`socket disconnected ${socket.id}`);

        for (const [roomId, room] of gameRooms.entries()) {
          if (room?.creatorId === socket.id) {
            delete room.creatorId;
          }
          if (room.joinerId === socket.id) {
            delete room.joinerId;
          }

          if (!room?.creatorId && room?.joinerId)
            gameRooms.delete(roomId);
          else
            gameRooms.set(roomId, room);
        }
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
    });

    this.httpServer.listen(this.config.port, () => {
      const { port } = this.config;
      console.log(`Server running on port ${port}`);
    });
  };
}

export default Server;
