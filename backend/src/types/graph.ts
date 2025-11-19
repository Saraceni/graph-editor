// Type definitions matching frontend GraphNode and GraphEdge
export interface GraphNode {
  id: string;
  label: string;
  position: { x: number; y: number; z: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  isDirected: boolean;
}

export interface SharedGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// WebSocket message types
export type MessageType =
  | 'JOIN'
  | 'STATE_SYNC'
  | 'NODE_ADD'
  | 'NODE_UPDATE'
  | 'NODE_REMOVE'
  | 'EDGE_ADD'
  | 'EDGE_UPDATE'
  | 'EDGE_REMOVE'
  | 'FULL_STATE';

export interface WebSocketMessage {
  type: MessageType;
  payload?: any;
}

