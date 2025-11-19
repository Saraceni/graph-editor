// This file exports helper functions for setting up collaboration listeners
// The actual listeners are registered in use-collaboration.ts

import type { GraphNode, GraphEdge } from '../slices/graphSlice';
import type { AppDispatch, RootState } from '../store';
import type { TypedStartListening } from '@reduxjs/toolkit';

export type CollaborationMethods = {
  sendNodeAdd: (node: GraphNode) => void;
  sendNodeUpdate: (node: GraphNode) => void;
  sendNodeRemove: (nodeId: string) => void;
  sendEdgeAdd: (edge: GraphEdge) => void;
  sendEdgeUpdate: (edge: GraphEdge) => void;
  sendEdgeRemove: (edgeId: string) => void;
  isCollaborating: () => boolean;
};

export type StartListening = TypedStartListening<RootState, AppDispatch>;
