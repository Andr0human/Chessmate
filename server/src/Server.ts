import express from "express";
import http from "http";
import { Socket, Server as SocketIOServer } from "socket.io";
import { IServerConfig } from "./config";
import { registerGameSocketHandlers } from "./module/game";
import router from "./routes";

class Server {
  private static instance: Server;

  private readonly config: IServerConfig;

  private readonly io: SocketIOServer;
  private readonly httpServer: http.Server;
  private readonly app: express.Application;

  private constructor(config: IServerConfig) {
    this.config = config;

    const { cors } = this.config;

    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.setupRoutes();

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

  private setupRoutes = () => {
    this.app.use(express.json());
    this.app.use(router);
  };

  public run = () => {
    this.io.on("connection", (socket: Socket) => {
      console.log(`socket connected ${socket.id}`);

      registerGameSocketHandlers(socket);
    });

    this.httpServer.listen(this.config.port, () => {
      const { port } = this.config;
      console.log(`Server running on port ${port}`);
    });
  };
}

export default Server;
