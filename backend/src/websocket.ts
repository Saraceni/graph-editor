import { WebSocketServer, WebSocket } from 'ws';
import { SharedGraphState, GraphNode, GraphEdge, WebSocketMessage } from './types/graph';

class CollaborationServer {
  private wss: WebSocketServer;
  private sharedState: SharedGraphState;
  private clients: Set<WebSocket>;
  private isInitialized: boolean;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.sharedState = { nodes: [], edges: [] };
    this.clients = new Set();
    this.isInitialized = false;

    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');
      this.clients.add(ws);

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
        
        // If no clients are connected, reset the shared state
        if (this.clients.size === 0) {
          console.log('No clients connected, resetting shared state');
          this.sharedState = { nodes: [], edges: [] };
          this.isInitialized = false;
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'JOIN':
        this.handleJoin(ws, message.payload);
        break;
      case 'NODE_ADD':
        this.handleNodeAdd(message.payload);
        break;
      case 'NODE_UPDATE':
        this.handleNodeUpdate(message.payload);
        break;
      case 'NODE_REMOVE':
        this.handleNodeRemove(message.payload);
        break;
      case 'EDGE_ADD':
        this.handleEdgeAdd(message.payload);
        break;
      case 'EDGE_UPDATE':
        this.handleEdgeUpdate(message.payload);
        break;
      case 'EDGE_REMOVE':
        this.handleEdgeRemove(message.payload);
        break;
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private handleJoin(ws: WebSocket, clientState: SharedGraphState | null) {
    // If this is the only client (or first after reset), use their state
    // If shared state is not initialized and client has state, use their state
    if (!this.isInitialized && clientState) {
      this.sharedState = {
        nodes: [...clientState.nodes],
        edges: [...clientState.edges],
      };
      this.isInitialized = true;
      console.log('Shared state initialized with client\'s state');
    } else if (this.clients.size === 1 && clientState) {
      // If this is the only client and shared state was reset, use their state
      this.sharedState = {
        nodes: [...clientState.nodes],
        edges: [...clientState.edges],
      };
      this.isInitialized = true;
      console.log('Shared state replaced with only client\'s state');
    }

    // Send current shared state to the new client
    this.sendMessage(ws, {
      type: 'STATE_SYNC',
      payload: this.sharedState,
    });
  }

  private handleNodeAdd(node: GraphNode) {
    // Check if node already exists
    if (!this.sharedState.nodes.find(n => n.id === node.id)) {
      this.sharedState.nodes.push(node);
      this.broadcast({ type: 'NODE_ADD', payload: node }, null);
    }
  }

  private handleNodeUpdate(node: GraphNode) {
    const index = this.sharedState.nodes.findIndex(n => n.id === node.id);
    if (index !== -1) {
      this.sharedState.nodes[index] = node;
      this.broadcast({ type: 'NODE_UPDATE', payload: node }, null);
    }
  }

  private handleNodeRemove(nodeId: string) {
    this.sharedState.nodes = this.sharedState.nodes.filter(n => n.id !== nodeId);
    // Also remove edges connected to this node
    this.sharedState.edges = this.sharedState.edges.filter(
      e => e.source !== nodeId && e.target !== nodeId
    );
    this.broadcast({ type: 'NODE_REMOVE', payload: nodeId }, null);
  }

  private handleEdgeAdd(edge: GraphEdge) {
    // Check if edge already exists
    if (!this.sharedState.edges.find(e => e.id === edge.id)) {
      this.sharedState.edges.push(edge);
      this.broadcast({ type: 'EDGE_ADD', payload: edge }, null);
    }
  }

  private handleEdgeUpdate(edge: GraphEdge) {
    const index = this.sharedState.edges.findIndex(e => e.id === edge.id);
    if (index !== -1) {
      this.sharedState.edges[index] = edge;
      this.broadcast({ type: 'EDGE_UPDATE', payload: edge }, null);
    }
  }

  private handleEdgeRemove(edgeId: string) {
    this.sharedState.edges = this.sharedState.edges.filter(e => e.id !== edgeId);
    this.broadcast({ type: 'EDGE_REMOVE', payload: edgeId }, null);
  }

  private broadcast(message: WebSocketMessage, excludeClient: WebSocket | null) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    // Send error message (not in MessageType enum, but handled by client)
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { error },
    }));
  }
}

export function setupWebSocket(server: any) {
  return new CollaborationServer(server);
}

