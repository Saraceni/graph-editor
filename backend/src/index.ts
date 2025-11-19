import { createServer } from './server';
import { setupWebSocket } from './websocket';

const PORT = process.env.PORT || 3001;

const app = createServer();
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

// Setup WebSocket server
setupWebSocket(server);

