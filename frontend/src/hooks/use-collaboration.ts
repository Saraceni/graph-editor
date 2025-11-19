import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  addNode,
  updateNode,
  removeNode,
  addEdge,
  updateEdge,
  removeEdge,
  setGraphState,
} from '@/lib/redux/slices/graphSlice';
import { CollaborationClient, type WebSocketMessage, type SharedGraphState } from '@/lib/collaboration';
import { listenerMiddleware } from '@/lib/redux/store';
import type { StartListening } from '@/lib/redux/middleware/collaborationMiddleware';

export function useCollaboration() {
  const dispatch = useAppDispatch();
  const graphState = useAppSelector((state) => state.graph);
  const clientRef = useRef<CollaborationClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const isApplyingRemoteChangeRef = useRef(false);

  // Initialize client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new CollaborationClient();
    }

    const client = clientRef.current;

    // Handle incoming messages
    const unsubscribeMessage = client.onMessage((message: WebSocketMessage) => {
      handleRemoteMessage(message);
    });

    // Handle connection changes
    const unsubscribeConnection = client.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const handleRemoteMessage = useCallback(
    (message: WebSocketMessage) => {
      // Prevent applying our own changes that we sent
      if (isApplyingRemoteChangeRef.current) {
        return;
      }

      switch (message.type) {
        case 'STATE_SYNC':
          // Initial state sync when joining
          if (message.payload) {
            const remoteState: SharedGraphState = message.payload;
            isApplyingRemoteChangeRef.current = true;
            dispatch(
              setGraphState({
                ...graphState,
                nodes: remoteState.nodes,
                edges: remoteState.edges,
              })
            );
            // Reset flag after a short delay to allow state update
            setTimeout(() => {
              isApplyingRemoteChangeRef.current = false;
            }, 100);
          }
          break;

        case 'NODE_ADD':
          if (message.payload) {
            isApplyingRemoteChangeRef.current = true;
            dispatch(addNode(message.payload));
            setTimeout(() => {
              isApplyingRemoteChangeRef.current = false;
            }, 100);
          }
          break;

        case 'NODE_UPDATE':
          if (message.payload) {
            isApplyingRemoteChangeRef.current = true;
            dispatch(updateNode(message.payload));
            setTimeout(() => {
              isApplyingRemoteChangeRef.current = false;
            }, 100);
          }
          break;

        case 'NODE_REMOVE':
          if (message.payload) {
            isApplyingRemoteChangeRef.current = true;
            dispatch(removeNode(message.payload));
            setTimeout(() => {
              isApplyingRemoteChangeRef.current = false;
            }, 100);
          }
          break;

        case 'EDGE_ADD':
          if (message.payload) {
            isApplyingRemoteChangeRef.current = true;
            dispatch(addEdge(message.payload));
            setTimeout(() => {
              isApplyingRemoteChangeRef.current = false;
            }, 100);
          }
          break;

        case 'EDGE_UPDATE':
          if (message.payload) {
            isApplyingRemoteChangeRef.current = true;
            dispatch(updateEdge(message.payload));
            setTimeout(() => {
              isApplyingRemoteChangeRef.current = false;
            }, 100);
          }
          break;

        case 'EDGE_REMOVE':
          if (message.payload) {
            isApplyingRemoteChangeRef.current = true;
            dispatch(removeEdge(message.payload));
            setTimeout(() => {
              isApplyingRemoteChangeRef.current = false;
            }, 100);
          }
          break;

        default:
          break;
      }
    },
    [dispatch, graphState]
  );

  const startCollaboration = useCallback(() => {
    if (!clientRef.current || isCollaborating) {
      return;
    }

    const initialState: SharedGraphState = {
      nodes: graphState.nodes,
      edges: graphState.edges,
    };

    clientRef.current.connect(initialState);
    setIsCollaborating(true);
  }, [graphState.nodes, graphState.edges, isCollaborating]);

  const stopCollaboration = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    setIsCollaborating(false);
    setIsConnected(false); // Immediately set connected to false when stopping
  }, []);

  // Register/unregister listeners for Redux actions when collaboration starts/stops
  useEffect(() => {
    if (!isCollaborating || !clientRef.current) {
      return;
    }

    const client = clientRef.current;
    const startListening = listenerMiddleware.startListening as StartListening;

    // Listen for node/edge actions and send them via WebSocket
    const unsubscribeAddNode = startListening({
      actionCreator: addNode,
      effect: async (action) => {
        if (client.isConnected() && !isApplyingRemoteChangeRef.current && action.payload) {
          client.sendNodeAdd(action.payload);
        }
      },
    });

    const unsubscribeUpdateNode = startListening({
      actionCreator: updateNode,
      effect: async (action) => {
        if (client.isConnected() && !isApplyingRemoteChangeRef.current && action.payload) {
          client.sendNodeUpdate(action.payload);
        }
      },
    });

    const unsubscribeRemoveNode = startListening({
      actionCreator: removeNode,
      effect: async (action) => {
        if (client.isConnected() && !isApplyingRemoteChangeRef.current && action.payload) {
          client.sendNodeRemove(action.payload);
        }
      },
    });

    const unsubscribeAddEdge = startListening({
      actionCreator: addEdge,
      effect: async (action) => {
        if (client.isConnected() && !isApplyingRemoteChangeRef.current && action.payload) {
          client.sendEdgeAdd(action.payload);
        }
      },
    });

    const unsubscribeUpdateEdge = startListening({
      actionCreator: updateEdge,
      effect: async (action) => {
        if (client.isConnected() && !isApplyingRemoteChangeRef.current && action.payload) {
          client.sendEdgeUpdate(action.payload);
        }
      },
    });

    const unsubscribeRemoveEdge = startListening({
      actionCreator: removeEdge,
      effect: async (action) => {
        if (client.isConnected() && !isApplyingRemoteChangeRef.current && action.payload) {
          client.sendEdgeRemove(action.payload);
        }
      },
    });

    // Cleanup: unsubscribe all listeners when collaboration stops
    return () => {
      unsubscribeAddNode();
      unsubscribeUpdateNode();
      unsubscribeRemoveNode();
      unsubscribeAddEdge();
      unsubscribeUpdateEdge();
      unsubscribeRemoveEdge();
    };
  }, [isCollaborating]);

  return {
    isConnected,
    isCollaborating,
    startCollaboration,
    stopCollaboration,
  };
}

