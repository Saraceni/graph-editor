import type { GraphNode, GraphEdge } from '@/lib/redux/slices/graphSlice';

export type MessageType =
  | 'JOIN'
  | 'STATE_SYNC'
  | 'NODE_ADD'
  | 'NODE_UPDATE'
  | 'NODE_REMOVE'
  | 'EDGE_ADD'
  | 'EDGE_UPDATE'
  | 'EDGE_REMOVE'
  | 'FULL_STATE'
  | 'ERROR';

export interface WebSocketMessage {
  type: MessageType;
  payload?: any;
}

export interface SharedGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class CollaborationClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManuallyDisconnected = false;
  private onMessageHandlers: Set<(message: WebSocketMessage) => void> = new Set();
  private onConnectionChangeHandlers: Set<(connected: boolean) => void> = new Set();

  constructor(url: string = 'ws://localhost:3001/ws') {
    this.url = url;
  }

  connect(initialState: SharedGraphState) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Reset manual disconnect flag when connecting
    this.isManuallyDisconnected = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
        
        // Send JOIN message with initial state
        this.send({
          type: 'JOIN',
          payload: initialState,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyConnectionChange(false);
        // Only attempt reconnect if not manually disconnected
        if (!this.isManuallyDisconnected) {
          this.attemptReconnect(initialState);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect(initialState);
    }
  }

  private attemptReconnect(initialState: SharedGraphState) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(initialState);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    this.isManuallyDisconnected = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.notifyConnectionChange(false);
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open. Message not sent:', message);
    }
  }

  onMessage(handler: (message: WebSocketMessage) => void) {
    this.onMessageHandlers.add(handler);
    return () => {
      this.onMessageHandlers.delete(handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.onConnectionChangeHandlers.add(handler);
    return () => {
      this.onConnectionChangeHandlers.delete(handler);
    };
  }

  private handleMessage(message: WebSocketMessage) {
    this.onMessageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private notifyConnectionChange(connected: boolean) {
    this.onConnectionChangeHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection change handler:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Convenience methods for sending graph operations
  sendNodeAdd(node: GraphNode) {
    this.send({ type: 'NODE_ADD', payload: node });
  }

  sendNodeUpdate(node: GraphNode) {
    this.send({ type: 'NODE_UPDATE', payload: node });
  }

  sendNodeRemove(nodeId: string) {
    this.send({ type: 'NODE_REMOVE', payload: nodeId });
  }

  sendEdgeAdd(edge: GraphEdge) {
    this.send({ type: 'EDGE_ADD', payload: edge });
  }

  sendEdgeUpdate(edge: GraphEdge) {
    this.send({ type: 'EDGE_UPDATE', payload: edge });
  }

  sendEdgeRemove(edgeId: string) {
    this.send({ type: 'EDGE_REMOVE', payload: edgeId });
  }
}

