import React, { useCallback } from 'react';
import type { Node, Edge, Connection } from 'reactflow';
import ReactFlow, { useNodesState, useEdgesState, Background, Controls, MiniMap, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  removeNode,
  updateNode,
  selectNode,
  addEdge as addEdgeToStore,
  removeEdge as removeEdgeFromStore,
  selectEdge,
} from '@/lib/redux/slices/graphSlice';

export function GraphCanvas() {
  const dispatch = useAppDispatch();
  const graphState = useAppSelector(state => state.graph);
  const selectedNodeId = useAppSelector(state => state.graph.selectedNode);
  const selectedEdgeId = useAppSelector(state => state.graph.selectedEdge);

  // Convert Redux state to React Flow nodes and edges
  const rfNodes: Node[] = graphState.nodes.map(node => ({
    id: node.id,
    data: {
      label: node.label,
      isSelected: node.id === selectedNodeId,
    },
    position: node.position,
    selected: node.id === selectedNodeId,
    style: {
      background: node.id === selectedNodeId ? '#3b82f6' : '#10b981',
      color: '#fff',
      border: node.id === selectedNodeId ? '3px solid #1e40af' : '2px solid #047857',
      borderRadius: '8px',
      padding: '10px 15px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      minWidth: '60px',
      textAlign: 'center',
    },
  }));

  const rfEdges: Edge[] = graphState.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.weight !== undefined ? `${edge.weight}` : undefined,
    animated: edge.id === selectedEdgeId,
    style: {
      stroke: edge.id === selectedEdgeId ? '#3b82f6' : '#6b7280',
      strokeWidth: edge.id === selectedEdgeId ? 3 : 2,
    },
    markerEnd: edge.isDirected
      ? {
          type: MarkerType.ArrowClosed,
          color: edge.id === selectedEdgeId ? '#3b82f6' : '#6b7280',
        }
      : undefined,
    labelStyle: {
      fill: '#374151',
      fontSize: '12px',
      fontWeight: '600',
      background: '#fff',
      padding: '2px 6px',
      borderRadius: '4px',
    },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Update React Flow state when Redux state changes
  React.useEffect(() => {
    setNodes(rfNodes);
  }, [graphState.nodes, selectedNodeId, setNodes]);

  React.useEffect(() => {
    setEdges(rfEdges);
  }, [graphState.edges, selectedEdgeId, setEdges]);

  // Handle node position changes
  const onNodesChangeWithDispatch = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);
      changes.forEach(change => {
        if (change.type === 'position' && change.positionAbsolute) {
          const node = graphState.nodes.find(n => n.id === change.id);
          if (node) {
            dispatch(
              updateNode({
                ...node,
                position: change.positionAbsolute,
              })
            );
          }
        }
      });
    },
    [onNodesChange, dispatch, graphState.nodes]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      dispatch(selectNode(node.id));
      dispatch(selectEdge(null));
    },
    [dispatch]
  );

  // Handle edge selection
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      dispatch(selectEdge(edge.id));
      dispatch(selectNode(null));
    },
    [dispatch]
  );

  // Handle canvas click to deselect
  const onPaneClick = useCallback(() => {
    dispatch(selectNode(null));
    dispatch(selectEdge(null));
  }, [dispatch]);

  // Handle new edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdgeId = `e${Date.now()}`;
      dispatch(
        addEdgeToStore({
          id: newEdgeId,
          source: connection.source || '',
          target: connection.target || '',
          weight: 1,
          isDirected: true,
        })
      );
    },
    [dispatch]
  );

  // Handle node/edge deletion
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't delete if user is typing in an input, textarea, or contenteditable element
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeId) {
          dispatch(removeNode(selectedNodeId));
        } else if (selectedEdgeId) {
          dispatch(removeEdgeFromStore(selectedEdgeId));
        }
      }
    },
    [selectedNodeId, selectedEdgeId, dispatch]
  );

  React.useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChangeWithDispatch}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
