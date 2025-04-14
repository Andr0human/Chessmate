interface IMoveUpdate {
  move: string;
  roomId: string;
  socketId: string;
  fenAfterMove: string;
  timeLeft: number;
}

export default IMoveUpdate;
