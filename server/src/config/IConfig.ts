interface IServerConfig {
  devMode: string;
  frontendUrl: string;
  port: number;
  cors: {
    origin: string;
    credentials: boolean;
  };
}

export default IServerConfig;
