import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const PORT: number = parseInt(process.env.PORT || "8080");

const io: Server = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log(`socket connected ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`socket disconnected ${socket.id}`);
  });

  socket.on("played-move", (move) => {
    console.log(`played-move: ${move}`);

    socket.broadcast.emit("received-move", move);
  });
});


console.log(`Server running on port ${PORT}`);

