# ChessMate Backend Server

This is the WebSocket backend server for the ChessMate chess application.

## Features

- Real-time game updates using Socket.IO
- Game room creation and management
- Move validation and synchronization
- Player connection handling

## Getting Started

### Prerequisites

- Node.js 14+
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file with the following variables (or use the existing one):

```
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
ADMIN_PASS=your_secure_password
```

### Running the Server

Development mode with hot-reload:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will be running at http://localhost:8080

## WebSocket Events

### Client to Server

- `createGame`: Create a new game room
- `joinGame`: Join an existing game room
- `makeMove`: Make a chess move
- `gameOver`: Signal that the game has ended

### Server to Client

- `gameCreated`: Confirmation of game creation with room ID
- `gameJoined`: Confirmation that a player joined a game
- `opponentJoined`: Notification that an opponent joined
- `moveMade`: Notification of a move being made
- `gameEnded`: Notification that the game has ended
- `opponentDisconnected`: Notification that the opponent disconnected
- `error`: Error messages

## Chess Engine API Security

The Chess Engine API endpoints are protected by an admin password middleware. To access these endpoints, you must include the `adminPass` query parameter with your request:

```
GET /api/chess-engine/speed?adminPass=your_secure_password
```

Set the `ADMIN_PASS` environment variable to define your secure password. If this variable is not set, a default password is used (not recommended for production).

## License

This project is licensed under the ISC License. 