# Real-time Collaboration

## Backend Setup

### 1. Dependencies

- Built with `express` and `ws`
- CORS support with `cors` and `@types/cors`

### 2. Create Backend

- `src/index.ts` - Main server entry point
- `src/types/graph.ts` - Shared TypeScript types for GraphNode and GraphEdge (matching frontend)
- `src/server.ts` - Express server setup
- `src/websocket.ts` - WebSocket server and state management

### 3. Shared State Management

- In-memory shared state store containing only `nodes` and `edges` arrays
- Track connected clients
- When first client connects: initialize shared state with their graph state
- When subsequent clients connect: send them current shared state
- Broadcast state changes to all connected clients (except sender)

### 4. WebSocket Message Protocol

- `JOIN` - Client connects, sends their current state
- `STATE_SYNC` - Server sends current shared state to new client
- `NODE_ADD` - Add node operation
- `NODE_UPDATE` - Update node operation  
- `NODE_REMOVE` - Remove node operation
- `EDGE_ADD` - Add edge operation
- `EDGE_UPDATE` - Update edge operation
- `EDGE_REMOVE` - Remove edge operation
- `FULL_STATE` - Full state update (for initial sync)

## Frontend Setup

### 5. WebSocket Client Hook

- Create `src/lib/collaboration.ts` - WebSocket client utilities
- Create `src/hooks/use-collaboration.ts` - React hook for managing collaboration state
- Handle connection, disconnection, sending/receiving messages
- Integrate with Redux to dispatch actions on remote changes

### 6. UI Components

- Add collaboration button to header in `App.tsx` (next to Export/Import buttons)
- Show connection status indicator (connected/disconnected)
- Toggle collaboration on/off
- Use `Users` or `Network` icon from lucide-react

### 7. Redux Integration

- Create middleware or hook to intercept Redux actions for nodes/edges
- When collaboration is active:
- Send local changes (add/update/remove node/edge) to server via WebSocket
- Apply remote changes received from server to local Redux store
- Only sync nodes and edges (ignore selections, pathfinding results, settings)

### 8. State Synchronization Logic

- On collaboration start: send current nodes/edges to server
- On collaboration stop: disconnect WebSocket, continue local-only mode
- Handle incoming updates: merge remote changes into local state
- Simple conflict resolution: last write wins (server broadcasts to all)

## Implementation Details

### Backend Files to Create:

- `backend/src/index.ts` - Server entry point, starts Express + WebSocket on port 3001
- `backend/src/types/graph.ts` - Type definitions matching frontend GraphNode/GraphEdge
- `backend/src/server.ts` - Express server with CORS
- `backend/src/websocket.ts` - WebSocket server, shared state, message handling

### Frontend Files to Create/Modify:

- `frontend/src/lib/collaboration.ts` - WebSocket client class
- `frontend/src/hooks/use-collaboration.ts` - React hook for collaboration
- `frontend/src/App.tsx` - Add collaboration button and connection status
- `frontend/src/lib/redux/slices/graphSlice.ts` - May need to export action types for collaboration middleware

### Key Implementation Points:

- Server listens on port 3001
- WebSocket path: `/ws` or `/collaboration`
- Simple JSON message protocol
- No authentication/rooms for now (single shared state)
- Client sends full state on first connection
- Server broadcasts individual operations to all other clients