import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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

export interface GraphSettings {
  nodeColor: string;
  nodeLabelColor: string;
  edgeColor: string;
  edgeLabelColor: string;
  edgeThickness: number;
}

export type AnimationStep = {
  visitedNodes: string[];
  visitedEdges: string[];
  currentNode?: string;
  currentNodeNeighbors?: string[];
  path?: string[];
  distance?: number;
  isComplete: boolean;
  description?: string;
  // For cycle detection
  currentPath?: string[];
  discoveredCycles?: string[][];
};

export interface AnimationState {
  isAnimating: boolean;
  animationSteps: AnimationStep[];
  currentStepIndex: number;
  animationSpeed: number; // milliseconds between steps
  isPaused: boolean;
  startNode?: string;
  endNode?: string;
  algorithmType?: 'pathfinding' | 'cycle-detection';
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  selectedEdge: string | null;
  pathfindingResult?: {
    path: string[];
    distance: number;
    visitedNodes: string[];
    visitedEdges: string[];
    startNode: string;
    endNode: string;
  } | null;
  cycleResult?: {
    cycles: string[][];
    cycleMap: Record<string, number[]>;
    selectedCycles: number[]; // Indices of selected cycles to highlight
  } | null;
  animationState?: AnimationState | null;
  settings: GraphSettings;
}

const defaultSettings: GraphSettings = {
  nodeColor: '#b7c1fb',
  nodeLabelColor: '#636363',
  edgeColor: '#d4d4d4',
  edgeLabelColor: '#000000',
  edgeThickness: 0.02,
};

const initialState: GraphState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  pathfindingResult: null,
  cycleResult: null,
  animationState: null,
  settings: defaultSettings,
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
      action: PayloadAction<{
        path: string[];
        distance: number;
        visitedNodes: string[];
        visitedEdges: string[];
        startNode: string;
        endNode: string;
      } | null>
    ) => {
      state.pathfindingResult = action.payload;
    },
    clearPathfindingResult: (state) => {
      state.pathfindingResult = null;
      state.animationState = null;
    },
    setCycleResult: (
      state,
      action: PayloadAction<{ cycles: string[][]; cycleMap: Record<string, number[]> } | null>
    ) => {
      if (action.payload) {
        // Automatically select all cycles by default
        state.cycleResult = {
          ...action.payload,
          selectedCycles: action.payload.cycles.map((_, index) => index),
        };
      } else {
        state.cycleResult = null;
      }
    },
    clearCycleResult: (state) => {
      state.cycleResult = null;
      state.animationState = null;
    },
    toggleCycleSelection: (state, action: PayloadAction<number>) => {
      if (state.cycleResult) {
        const index = state.cycleResult.selectedCycles.indexOf(action.payload);
        if (index === -1) {
          state.cycleResult.selectedCycles.push(action.payload);
        } else {
          state.cycleResult.selectedCycles.splice(index, 1);
        }
      }
    },
    selectAllCycles: (state) => {
      if (state.cycleResult) {
        state.cycleResult.selectedCycles = state.cycleResult.cycles.map((_, index) => index);
      }
    },
    deselectAllCycles: (state) => {
      if (state.cycleResult) {
        state.cycleResult.selectedCycles = [];
      }
    },
    resetGraph: (state) => {
      state.nodes = [];
      state.edges = [];
      state.selectedNode = null;
      state.selectedEdge = null;
      state.pathfindingResult = null;
      state.cycleResult = null;
      state.animationState = null;
    },
    setGraphState: (_state, action: PayloadAction<GraphState>) => {
      // Ensure settings exist when loading from storage (migration for old saved states)
      const newState = {
        ...action.payload,
        settings: action.payload.settings || defaultSettings,
      };
      return newState;
    },
    updateSettings: (state, action: PayloadAction<Partial<GraphSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    resetSettings: (state) => {
      state.settings = defaultSettings;
    },
    // Animation actions
    setAnimationSteps: (
      state,
      action: PayloadAction<{
        steps: AnimationStep[];
        startNode?: string;
        endNode?: string;
        algorithmType: 'pathfinding' | 'cycle-detection';
      }>
    ) => {
      state.animationState = {
        isAnimating: true,
        animationSteps: action.payload.steps,
        currentStepIndex: 0,
        animationSpeed: 500, // default 500ms per step
        isPaused: false,
        startNode: action.payload.startNode,
        endNode: action.payload.endNode,
        algorithmType: action.payload.algorithmType,
      };
    },
    setCurrentStepIndex: (state, action: PayloadAction<number>) => {
      if (state.animationState) {
        const maxIndex = state.animationState.animationSteps.length - 1;
        state.animationState.currentStepIndex = Math.max(0, Math.min(action.payload, maxIndex));
      }
    },
    setAnimationSpeed: (state, action: PayloadAction<number>) => {
      if (state.animationState) {
        state.animationState.animationSpeed = action.payload;
      }
    },
    toggleAnimation: (state) => {
      if (state.animationState) {
        state.animationState.isPaused = !state.animationState.isPaused;
        state.animationState.isAnimating = !state.animationState.isPaused;
      }
    },
    playAnimation: (state) => {
      if (state.animationState) {
        state.animationState.isPaused = false;
        state.animationState.isAnimating = true;
      }
    },
    pauseAnimation: (state) => {
      if (state.animationState) {
        state.animationState.isPaused = true;
        state.animationState.isAnimating = false;
      }
    },
    clearAnimation: (state) => {
      state.animationState = null;
    },
    stepAnimationForward: (state) => {
      if (state.animationState) {
        const maxIndex = state.animationState.animationSteps.length - 1;
        if (state.animationState.currentStepIndex < maxIndex) {
          state.animationState.currentStepIndex += 1;
        }
      }
    },
    stepAnimationBackward: (state) => {
      if (state.animationState) {
        if (state.animationState.currentStepIndex > 0) {
          state.animationState.currentStepIndex -= 1;
        }
      }
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
  setCycleResult,
  clearCycleResult,
  toggleCycleSelection,
  selectAllCycles,
  deselectAllCycles,
  resetGraph,
  setGraphState,
  updateSettings,
  resetSettings,
  setAnimationSteps,
  setCurrentStepIndex,
  setAnimationSpeed,
  toggleAnimation,
  playAnimation,
  pauseAnimation,
  clearAnimation,
  stepAnimationForward,
  stepAnimationBackward,
} = graphSlice.actions;

export default graphSlice.reducer;
