interface IServerConfig {
  devMode: string;
  frontendUrl: string;
  port: number;
  cors: {
    origin: string;
    credentials: boolean;
  };
  adminPass: string;
}

export default IServerConfig;
