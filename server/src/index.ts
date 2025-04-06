import Server from "./Server";
import { serverConfig } from "./config";

const server = Server.getInstance(serverConfig);

server.run();
