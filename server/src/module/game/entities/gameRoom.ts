interface GameRoom {
  id: string;
  creatorId?: string;
  joinerId?: string;
  playerSides: [string, string];
  status: "waiting" | "playing" | "ended";
  gameOptions: any;
}

export default GameRoom;
