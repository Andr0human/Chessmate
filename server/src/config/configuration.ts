import dotenv from "dotenv";
import IServerConfig from "./IConfig";

dotenv.config();

// CORS_ORIGIN may be JSON (e.g. '["http://localhost:3000"]') or a bare value
// like "*". Parse it as JSON when possible; otherwise treat it as a literal
// origin string. Avoids crashing on boot when the value isn't valid JSON.
const parseCorsOrigin = (raw: string): string | string[] => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const config: IServerConfig = {
  devMode: process.env.DEV_MODE || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  port: parseInt(process.env.PORT || "8080"),
  cors: {
    origin: parseCorsOrigin(process.env.CORS_ORIGIN || "*"),
    credentials: process.env.CORS_CREDENTIALS === "true",
  },
  adminPass: process.env.ADMIN_PASS || "admin",
};

export default config;
