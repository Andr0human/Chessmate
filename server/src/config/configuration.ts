import dotenv from "dotenv";
import IServerConfig from "./IConfig";

dotenv.config();

const config: IServerConfig = {
  devMode: process.env.DEV_MODE || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  port: parseInt(process.env.PORT || "8080"),
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: process.env.CORS_CREDENTIALS === "true",
  },
  adminPass: process.env.ADMIN_PASS || "admin",
};

export default config;
