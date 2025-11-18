import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  removeNode,
  updateNode,
  selectNode,
  addEdge as addEdgeToStore,
  removeEdge as removeEdgeFromStore,
  selectEdge,
} from '@/lib/redux/slices/graphSlice';
import { Node3D } from './node-3d';
import { Edge3D } from './edge-3d';

// Scene component that renders the graph
function GraphScene() {
  const dispatch = useAppDispatch();
  const graphState = useAppSelector((state) => state.graph);
  const selectedNodeId = useAppSelector((state) => state.graph.selectedNode);
  const selectedEdgeId = useAppSelector((state) => state.graph.selectedEdge);
  const pathfindingResult = useAppSelector((state) => state.graph.pathfindingResult);
  const settings = useAppSelector((state) => state.graph.settings);
  
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  // Handle keyboard shortcut for connection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        !target.isContentEditable
      ) {
        if (e.key === 'c' || e.key === 'C') {
          if (selectedNodeId && !connectionSource) {
            setConnectionSource(selectedNodeId);
          } else {
            setConnectionSource(null);
          }
        }
        if (e.key === 'Escape') {
          setConnectionSource(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, connectionSource]);

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (connectionSource && connectionSource !== nodeId) {
        // Create edge
        const newEdgeId = `e${Date.now()}`;
        dispatch(
          addEdgeToStore({
            id: newEdgeId,
            source: connectionSource,
            target: nodeId,
            weight: 1,
            isDirected: true,
          })
        );
        setConnectionSource(null);
      } else {
        dispatch(selectNode(nodeId));
        dispatch(selectEdge(null));
      }
    },
    [dispatch, connectionSource]
  );

  // Handle edge click
  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      dispatch(selectEdge(edgeId));
      dispatch(selectNode(null));
    },
    [dispatch]
  );

  // Handle node drag
  const handleNodeDrag = useCallback(
    (nodeId: string, position: Vector3) => {
      const node = graphState.nodes.find((n) => n.id === nodeId);
      if (node) {
        dispatch(
          updateNode({
            ...node,
            position: { x: position.x, y: position.y, z: position.z },
          })
        );
      }
    },
    [dispatch, graphState.nodes]
  );



  // Get pathfinding path node IDs
  const pathNodeIds = pathfindingResult?.path || [];
  const pathEdgeIds = useMemo(() => {
    if (!pathfindingResult?.path) return new Set<string>();
    const edgeIds = new Set<string>();
    for (let i = 0; i < pathfindingResult.path.length - 1; i++) {
      const sourceId = pathfindingResult.path[i];
      const targetId = pathfindingResult.path[i + 1];
      const edge = graphState.edges.find(
        (e) =>
          (e.source === sourceId && e.target === targetId) ||
          (!e.isDirected && e.source === targetId && e.target === sourceId)
      );
      if (edge) edgeIds.add(edge.id);
    }
    return edgeIds;
  }, [pathfindingResult, graphState.edges]);

  return (
    <>
      <OrbitControls
        enablePan={!isDraggingNode}
        enableZoom={true}
        enableRotate={!isDraggingNode}
        minDistance={5}
        maxDistance={50}
      />
      {/* @ts-ignore - React Three Fiber primitives */}
      <ambientLight intensity={0.5} />
      {/* @ts-ignore - React Three Fiber primitives */}
      <pointLight position={[10, 10, 10]} intensity={1} />
      {/* @ts-ignore - React Three Fiber primitives */}
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <Grid args={[20, 20]} cellColor="#6b7280" sectionColor="#9ca3af" />
      {/* @ts-ignore - React Three Fiber primitives */}
      <axesHelper args={[5]} />

          {graphState.nodes.map((node) => (
              <Node3D
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                isInPath={pathNodeIds.includes(node.id)}
                onClick={handleNodeClick}
                onDrag={handleNodeDrag}
                onDragStart={() => setIsDraggingNode(true)}
                onDragEnd={() => setIsDraggingNode(false)}
                canDrag={node.id === selectedNodeId}
                settings={settings}
              />
          ))}

      {graphState.edges.map((edge) => {
        const sourceNode = graphState.nodes.find((n) => n.id === edge.source);
        const targetNode = graphState.nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) return null;

        return (
          <Edge3D
            key={edge.id}
            edge={edge}
            sourceNode={sourceNode}
            targetNode={targetNode}
            isSelected={edge.id === selectedEdgeId}
            isInPath={pathEdgeIds.has(edge.id)}
            onClick={handleEdgeClick}
            settings={settings}
          />
        );
      })}
    </>
  );
}

// Main component
export function GraphCanvas() {
  const dispatch = useAppDispatch();
  const selectedNodeId = useAppSelector((state) => state.graph.selectedNode);
  const selectedEdgeId = useAppSelector((state) => state.graph.selectedEdge);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedEdgeId, dispatch]);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        onPointerMissed={() => {
          dispatch(selectNode(null));
          dispatch(selectEdge(null));
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />
        <GraphScene />
      </Canvas>
    </div>
  );
}

