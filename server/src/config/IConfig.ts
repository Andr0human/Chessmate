interface IServerConfig {
  devMode: string;
  frontendUrl: string;
  port: number;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  adminPass: string;
}

export default IServerConfig;
