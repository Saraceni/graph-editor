import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface GraphNode {
  id: string;
  label: string;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  isDirected: boolean;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  selectedEdge: string | null;
  pathfindingResult?: {
    path: string[];
    distance: number;
  } | null;
}

const initialState: GraphState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  pathfindingResult: null,
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    // Node actions
    addNode: (state, action: PayloadAction<GraphNode>) => {
      const nodeExists = state.nodes.some(n => n.id === action.payload.id);
      if (!nodeExists) {
        state.nodes.push(action.payload);
        state.selectedNode = action.payload.id;
      }
    },
    removeNode: (state, action: PayloadAction<string>) => {
      state.nodes = state.nodes.filter(n => n.id !== action.payload);
      state.edges = state.edges.filter(
        e => e.source !== action.payload && e.target !== action.payload
      );
      if (state.selectedNode === action.payload) {
        state.selectedNode = null;
      }
    },
    updateNode: (state, action: PayloadAction<GraphNode>) => {
      const node = state.nodes.find(n => n.id === action.payload.id);
      if (node) {
        Object.assign(node, action.payload);
      }
    },
    selectNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNode = action.payload;
    },

    // Edge actions
    addEdge: (state, action: PayloadAction<GraphEdge>) => {
      const edgeExists = state.edges.some(e => e.id === action.payload.id);
      if (!edgeExists) {
        state.edges.push(action.payload);
        state.selectedEdge = action.payload.id;
      }
    },
    removeEdge: (state, action: PayloadAction<string>) => {
      state.edges = state.edges.filter(e => e.id !== action.payload);
      if (state.selectedEdge === action.payload) {
        state.selectedEdge = null;
      }
    },
    updateEdge: (state, action: PayloadAction<GraphEdge>) => {
      const edge = state.edges.find(e => e.id === action.payload.id);
      if (edge) {
        Object.assign(edge, action.payload);
      }
    },
    selectEdge: (state, action: PayloadAction<string | null>) => {
      state.selectedEdge = action.payload;
    },

    // Graph-level actions
    setPathfindingResult: (
      state,
      action: PayloadAction<{ path: string[]; distance: number } | null>
    ) => {
      state.pathfindingResult = action.payload;
    },
    clearPathfindingResult: (state) => {
      state.pathfindingResult = null;
    },
    resetGraph: (state) => {
      state.nodes = [];
      state.edges = [];
      state.selectedNode = null;
      state.selectedEdge = null;
      state.pathfindingResult = null;
    },
    setGraphState: (state, action: PayloadAction<GraphState>) => {
      return action.payload;
    },
  },
});

export const {
  addNode,
  removeNode,
  updateNode,
  selectNode,
  addEdge,
  removeEdge,
  updateEdge,
  selectEdge,
  setPathfindingResult,
  clearPathfindingResult,
  resetGraph,
  setGraphState,
} = graphSlice.actions;

export default graphSlice.reducer;
