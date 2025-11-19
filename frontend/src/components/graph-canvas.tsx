import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  const cycleResult = useAppSelector((state) => state.graph.cycleResult);
  const animationState = useAppSelector((state) => state.graph.animationState);
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



  // Get pathfinding visualization data
  // Use animation state if available, otherwise fall back to final result
  const currentStep = animationState?.animationSteps[animationState.currentStepIndex];
  
  const pathNodeIds = useMemo(() => {
    // Prioritize pathfindingResult if it exists (animation completed)
    if (pathfindingResult?.path) {
      return pathfindingResult.path;
    }
    
    // During active animation, only show path when algorithm completes
    if (animationState && animationState.algorithmType === 'pathfinding' && currentStep) {
      if (currentStep.isComplete && currentStep.path) {
        return currentStep.path;
      }
      return [];
    }
    
    return [];
  }, [animationState, currentStep, pathfindingResult]);

  const visitedNodeIds = useMemo(() => {
    if (animationState && currentStep) {
      return new Set(currentStep.visitedNodes || []);
    }
    return pathfindingResult?.visitedNodes ? new Set(pathfindingResult.visitedNodes) : new Set<string>();
  }, [animationState, currentStep, pathfindingResult]);

  const visitedEdgeIds = useMemo(() => {
    if (animationState && currentStep) {
      return new Set(currentStep.visitedEdges || []);
    }
    return pathfindingResult?.visitedEdges ? new Set(pathfindingResult.visitedEdges) : new Set<string>();
  }, [animationState, currentStep, pathfindingResult]);

  const startNodeId = useMemo(() => {
    if (animationState?.algorithmType === 'pathfinding') {
      return animationState.startNode;
    }
    return pathfindingResult?.startNode;
  }, [animationState, pathfindingResult]);

  const endNodeId = useMemo(() => {
    if (animationState?.algorithmType === 'pathfinding') {
      return animationState.endNode;
    }
    return pathfindingResult?.endNode;
  }, [animationState, pathfindingResult]);
  
  const pathEdgeIds = useMemo(() => {

    // During active animation, only show path edges when algorithm completes
    if (animationState && animationState.algorithmType === 'pathfinding' && currentStep) {
      if (currentStep.isComplete && currentStep.path) {
        const edgeIds = new Set<string>();
        for (let i = 0; i < currentStep.path.length - 1; i++) {
          const sourceId = currentStep.path[i];
          const targetId = currentStep.path[i + 1];
          const edge = graphState.edges.find(
            (e) =>
              (e.source === sourceId && e.target === targetId) ||
              (!e.isDirected && e.source === targetId && e.target === sourceId)
          );
          if (edge) edgeIds.add(edge.id);
        }
        return edgeIds;
      }
      return new Set<string>();
    }

    // Prioritize pathfindingResult if it exists (animation completed)
    if (pathfindingResult?.path) {
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
    }
    
    
    
    return new Set<string>();
  }, [animationState, currentStep, pathfindingResult, graphState.edges]);

  // Determine if we're in cycle highlighting mode (cycles active and no pathfinding animation)
  const isCycleMode = useMemo(() => {
    if (animationState?.algorithmType === 'cycle-detection' && currentStep) {
      // During cycle detection animation, show discovered cycles progressively
      return true;
    }
    return Boolean(cycleResult && !pathfindingResult && !animationState);
  }, [animationState, currentStep, cycleResult, pathfindingResult]);

  // Get cycle index for a node (returns the first selected cycle the node belongs to)
  const getNodeCycleIndex = useMemo(() => {
    // During cycle detection animation, show discovered cycles
    if (animationState?.algorithmType === 'cycle-detection' && currentStep?.discoveredCycles) {
      return (nodeId: string): number | null => {
        const discoveredCycles = currentStep.discoveredCycles || [];
        for (let i = 0; i < discoveredCycles.length; i++) {
          if (discoveredCycles[i].includes(nodeId)) {
            return i;
          }
        }
        return null;
      };
    }
    
    if (!cycleResult) return () => null;
    return (nodeId: string): number | null => {
      const cycleIndices = cycleResult.cycleMap[nodeId] || [];
      // Find the first selected cycle this node belongs to
      for (const cycleIndex of cycleIndices) {
        if (cycleResult.selectedCycles.includes(cycleIndex)) {
          return cycleIndex;
        }
      }
      return null;
    };
  }, [animationState, currentStep, cycleResult]);

  return (
    <>
      <OrbitControls
        enablePan={!isDraggingNode}
        enableZoom={true}
        enableRotate={!isDraggingNode}
        minDistance={5}
        maxDistance={100}
      />
      {/* @ts-ignore - React Three Fiber primitives */}
      <ambientLight intensity={1} />
      {/* @ts-ignore - React Three Fiber primitives */}
      <pointLight position={[10, 10, 10]} intensity={1} />
      {/* @ts-ignore - React Three Fiber primitives */}
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <Grid args={[20, 20]} cellColor="#6b7280" sectionColor="#9ca3af" />
      {/* @ts-ignore - React Three Fiber primitives */}
      <axesHelper args={[5]} />

          {graphState.nodes.map((node) => {
            const isInPath = pathNodeIds.includes(node.id);
            const isVisited = visitedNodeIds.has(node.id) && !isInPath && node.id !== startNodeId && node.id !== endNodeId;
            const cycleIndex = getNodeCycleIndex(node.id);
            const isInSelectedCycle = cycleIndex !== null;
            return (
              <Node3D
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                isInPath={isInPath}
                isStartNode={node.id === startNodeId}
                isEndNode={node.id === endNodeId}
                isVisited={isVisited}
                cycleIndex={cycleIndex}
                isCycleMode={isCycleMode}
                isInCycle={isInSelectedCycle}
                onClick={handleNodeClick}
                onDrag={handleNodeDrag}
                onDragStart={() => setIsDraggingNode(true)}
                onDragEnd={() => setIsDraggingNode(false)}
                canDrag={node.id === selectedNodeId}
                settings={settings}
              />
            );
          })}

      {graphState.edges.map((edge) => {
        const sourceNode = graphState.nodes.find((n) => n.id === edge.source);
        const targetNode = graphState.nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) return null;

        const isInPath = pathEdgeIds.has(edge.id);
        const isVisited = visitedEdgeIds.has(edge.id) && !isInPath;
        
        // Determine if edge is part of a selected cycle
        // An edge is in a cycle if both source and target are in the same selected cycle
        let edgeCycleIndex: number | null = null;
        
        // During cycle detection animation, check discovered cycles
        if (animationState?.algorithmType === 'cycle-detection' && currentStep?.discoveredCycles) {
          const discoveredCycles = currentStep.discoveredCycles;
          for (let cycleIndex = 0; cycleIndex < discoveredCycles.length; cycleIndex++) {
            const cycle = discoveredCycles[cycleIndex];
            // Check if both source and target are in this cycle
            if (cycle.includes(edge.source) && cycle.includes(edge.target)) {
              // Check if this edge is actually part of the cycle (consecutive nodes in cycle)
              for (let i = 0; i < cycle.length - 1; i++) {
                if (edge.isDirected) {
                  if (cycle[i] === edge.source && cycle[i + 1] === edge.target) {
                    edgeCycleIndex = cycleIndex;
                    break;
                  }
                } else {
                  if ((cycle[i] === edge.source && cycle[i + 1] === edge.target) ||
                      (cycle[i] === edge.target && cycle[i + 1] === edge.source)) {
                    edgeCycleIndex = cycleIndex;
                    break;
                  }
                }
              }
              // Also check closing edge
              if (edgeCycleIndex === null && cycle.length > 0) {
                const lastIdx = cycle.length - 1;
                if (edge.isDirected) {
                  if (cycle[lastIdx] === edge.source && cycle[0] === edge.target) {
                    edgeCycleIndex = cycleIndex;
                  }
                } else {
                  if ((cycle[lastIdx] === edge.source && cycle[0] === edge.target) ||
                      (cycle[lastIdx] === edge.target && cycle[0] === edge.source)) {
                    edgeCycleIndex = cycleIndex;
                  }
                }
              }
              if (edgeCycleIndex !== null) break;
            }
          }
        } else if (cycleResult && cycleResult.selectedCycles.length > 0) {
          const sourceCycleIndices = cycleResult.cycleMap[edge.source] || [];
          const targetCycleIndices = cycleResult.cycleMap[edge.target] || [];
          
          // Find a selected cycle that contains both source and target
          for (const cycleIndex of cycleResult.selectedCycles) {
            if (sourceCycleIndices.includes(cycleIndex) && targetCycleIndices.includes(cycleIndex)) {
              const cycle = cycleResult.cycles[cycleIndex];
              // Check if this edge is actually part of the cycle (consecutive nodes in cycle)
              // For directed edges, only check forward direction
              // For undirected edges, check both directions
              for (let i = 0; i < cycle.length - 1; i++) {
                if (edge.isDirected) {
                  // Directed: only check source -> target
                  if (cycle[i] === edge.source && cycle[i + 1] === edge.target) {
                    edgeCycleIndex = cycleIndex;
                    break;
                  }
                } else {
                  // Undirected: check both directions
                  if ((cycle[i] === edge.source && cycle[i + 1] === edge.target) ||
                      (cycle[i] === edge.target && cycle[i + 1] === edge.source)) {
                    edgeCycleIndex = cycleIndex;
                    break;
                  }
                }
              }
              // Also check if it's the closing edge (last to first)
              if (edgeCycleIndex === null && cycle.length > 0) {
                const lastIdx = cycle.length - 1;
                if (edge.isDirected) {
                  // Directed: only check last -> first
                  if (cycle[lastIdx] === edge.source && cycle[0] === edge.target) {
                    edgeCycleIndex = cycleIndex;
                  }
                } else {
                  // Undirected: check both directions
                  if ((cycle[lastIdx] === edge.source && cycle[0] === edge.target) ||
                      (cycle[lastIdx] === edge.target && cycle[0] === edge.source)) {
                    edgeCycleIndex = cycleIndex;
                  }
                }
              }
              if (edgeCycleIndex !== null) break;
            }
          }
        }
        const isInSelectedCycle = edgeCycleIndex !== null;

        return (
          <Edge3D
            key={edge.id}
            edge={edge}
            sourceNode={sourceNode}
            targetNode={targetNode}
            isSelected={edge.id === selectedEdgeId}
            isInPath={isInPath}
            isVisited={isVisited}
            cycleIndex={edgeCycleIndex}
            isCycleMode={isCycleMode}
            isInCycle={isInSelectedCycle}
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  // React Three Fiber's Canvas has built-in ResizeObserver
  // We just need to ensure the container is properly constrained
  // The key is having min-w-0 and min-h-0 on the container to allow flex shrinking

  return (
    <div ref={containerRef} className="relative w-full h-full min-w-0 min-h-0">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        onPointerMissed={() => {
          dispatch(selectNode(null));
          dispatch(selectEdge(null));
        }}
        gl={{ antialias: true }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />
        <GraphScene />
      </Canvas>
    </div>
  );
}

