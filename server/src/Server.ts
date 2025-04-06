import { Server as SocketIOServer } from "socket.io";
import { IServerConfig } from "./config";
import http from "http";

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

  public run = () => {
    this.io.on("connection", (socket) => {
      console.log(`socket connected ${socket.id}`);

      socket.on("disconnect", () => {
        console.log(`socket disconnected ${socket.id}`);
      });

      socket.on("played-move", (move) => {
        console.log(`played-move: ${move}`);

        socket.broadcast.emit("received-move", move);
      });
    });

    this.httpServer.listen(this.config.port, () => {
      const { port } = this.config;
      console.log(`Server running on port ${port}`);
    });
  };
}

export default Server;
