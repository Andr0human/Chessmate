import cors from "cors";
import express from "express";
import http from "http";
import morgan from "morgan";
import { Socket, Server as SocketIOServer } from "socket.io";
import { IServerConfig } from "./config";
import logger from "./lib/logger";
import { registerEngineSocketHandlers } from "./module/chessEngine";
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
    this.configureMiddlewares();
    this.setupRoutes();

    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: cors.origin,
        credentials: false,
      },
    });
  }

  public static getInstance(config: IServerConfig): Server {
    if (!Server.instance) {
      Server.instance = new Server(config);
    }

    return Server.instance;
  }

  private configureMiddlewares(): void {
    this.app.use(express.json());
    // Apply the same configured origin to the REST API as Socket.IO uses, so
    // /api/* isn't allow-all while the realtime layer is locked down.
    this.app.use(
      cors({
        origin: this.config.cors.origin,
        credentials: this.config.cors.credentials,
      })
    );
    this.app.use(morgan("dev"));
  }

  private setupRoutes = () => {
    this.app.use(router);
  };

  public run = () => {
    this.io.on("connection", (socket: Socket) => {
      logger.info(`socket connected ${socket.id}`);

      registerGameSocketHandlers(socket);
      registerEngineSocketHandlers(socket);
    });

    this.httpServer.listen(this.config.port, () => {
      const { port } = this.config;
      logger.info(`Server running on port ${port}`);
    });
  };
}

export default Server;
