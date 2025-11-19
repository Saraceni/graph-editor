import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import { SharedGraphState, GraphNode, GraphEdge, WebSocketMessage } from './types/graph';

class CollaborationServer {
  private wss: WebSocketServer;
  private doc: Y.Doc;
  private clients: Set<WebSocket>;
  private isInitialized: boolean;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.doc = new Y.Doc();
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
          this.doc = new Y.Doc();
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
    if (!clientState) {
      // Send current shared state even if client has no state
      const currentState = this.getStateFromDoc();
      this.sendMessage(ws, {
        type: 'STATE_SYNC',
        payload: currentState,
      });
      return;
    }

    let stateWasMerged = false;

    if (!this.isInitialized) {
      // First client: initialize Y.Doc with their state
      this.initializeDocWithState(clientState);
      this.isInitialized = true;
      console.log(`Shared state initialized with first client's state: ${clientState.nodes.length} nodes, ${clientState.edges.length} edges`);
    } else {
      // Subsequent client: merge their state into existing Y.Doc
      const stateBeforeMerge = this.getStateFromDoc();
      this.mergeStateIntoDoc(clientState);
      const stateAfterMerge = this.getStateFromDoc();
      stateWasMerged = true;
      console.log(`Merged new client's state into shared state. Before: ${stateBeforeMerge.nodes.length} nodes, ${stateBeforeMerge.edges.length} edges. After: ${stateAfterMerge.nodes.length} nodes, ${stateAfterMerge.edges.length} edges. Client had: ${clientState.nodes.length} nodes, ${clientState.edges.length} edges`);
    }

    // Send current shared state to the new client
    const currentState = this.getStateFromDoc();
    this.sendMessage(ws, {
      type: 'STATE_SYNC',
      payload: currentState,
    });

    // If state was merged, broadcast the merged state to all other clients
    if (stateWasMerged) {
      this.broadcast({
        type: 'STATE_SYNC',
        payload: currentState,
      }, ws);
    }
  }

  private initializeDocWithState(state: SharedGraphState) {
    // Use Y.js transaction to ensure atomic initialization
    this.doc.transact(() => {
      const nodesMap = this.doc.getMap('nodes');
      const edgesMap = this.doc.getMap('edges');

      // Clear existing state
      nodesMap.clear();
      edgesMap.clear();

      // Add all nodes
      state.nodes.forEach((node) => {
        // Create a fresh copy to ensure proper serialization
        nodesMap.set(node.id, { ...node });
      });

      // Add all edges
      state.edges.forEach((edge) => {
        // Create a fresh copy to ensure proper serialization
        edgesMap.set(edge.id, { ...edge });
      });
    });
  }

  private mergeStateIntoDoc(state: SharedGraphState) {
    // Use Y.js transaction to ensure atomic merge
    this.doc.transact(() => {
      const nodesMap = this.doc.getMap('nodes');
      const edgesMap = this.doc.getMap('edges');

      // Merge nodes: Y.js will handle conflicts (same ID = last write wins)
      state.nodes.forEach((node) => {
        // Create a fresh copy to ensure proper serialization
        nodesMap.set(node.id, { ...node });
      });

      // Merge edges: Y.js will handle conflicts (same ID = last write wins)
      state.edges.forEach((edge) => {
        // Create a fresh copy to ensure proper serialization
        edgesMap.set(edge.id, { ...edge });
      });
    });
  }

  private getStateFromDoc(): SharedGraphState {
    const nodesMap = this.doc.getMap('nodes');
    const edgesMap = this.doc.getMap('edges');

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Convert Y.Map to arrays - forEach signature is (value, key)
    nodesMap.forEach((node) => {
      if (node) {
        nodes.push(node as GraphNode);
      }
    });

    edgesMap.forEach((edge) => {
      if (edge) {
        edges.push(edge as GraphEdge);
      }
    });

    return { nodes, edges };
  }

  private handleNodeAdd(node: GraphNode) {
    const nodesMap = this.doc.getMap('nodes');
    // Check if node already exists
    if (!nodesMap.has(node.id)) {
      nodesMap.set(node.id, node);
      this.broadcast({ type: 'NODE_ADD', payload: node }, null);
    }
  }

  private handleNodeUpdate(node: GraphNode) {
    const nodesMap = this.doc.getMap('nodes');
    if (nodesMap.has(node.id)) {
      nodesMap.set(node.id, node);
      this.broadcast({ type: 'NODE_UPDATE', payload: node }, null);
    }
  }

  private handleNodeRemove(nodeId: string) {
    const nodesMap = this.doc.getMap('nodes');
    const edgesMap = this.doc.getMap('edges');
    
    if (nodesMap.has(nodeId)) {
      nodesMap.delete(nodeId);
      
      // Also remove edges connected to this node
      const edgesToRemove: string[] = [];
      edgesMap.forEach((edge, edgeId) => {
        const e = edge as GraphEdge;
        if (e.source === nodeId || e.target === nodeId) {
          edgesToRemove.push(edgeId);
        }
      });
      
      edgesToRemove.forEach((edgeId) => {
        edgesMap.delete(edgeId);
      });
      
      this.broadcast({ type: 'NODE_REMOVE', payload: nodeId }, null);
    }
  }

  private handleEdgeAdd(edge: GraphEdge) {
    const edgesMap = this.doc.getMap('edges');
    // Check if edge already exists
    if (!edgesMap.has(edge.id)) {
      edgesMap.set(edge.id, edge);
      this.broadcast({ type: 'EDGE_ADD', payload: edge }, null);
    }
  }

  private handleEdgeUpdate(edge: GraphEdge) {
    const edgesMap = this.doc.getMap('edges');
    if (edgesMap.has(edge.id)) {
      edgesMap.set(edge.id, edge);
      this.broadcast({ type: 'EDGE_UPDATE', payload: edge }, null);
    }
  }

  private handleEdgeRemove(edgeId: string) {
    const edgesMap = this.doc.getMap('edges');
    if (edgesMap.has(edgeId)) {
      edgesMap.delete(edgeId);
      this.broadcast({ type: 'EDGE_REMOVE', payload: edgeId }, null);
    }
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

