import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
  setLayoutMode,
} from '@/lib/redux/slices/graphSlice';
import { Node3D } from './node-3d';
import { Edge3D } from './edge-3d';
import { ForceLayout3D } from '@/lib/3d-layout';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Layout, Hand, Info } from 'lucide-react';

// Scene component that renders the graph
function GraphScene() {
  const dispatch = useAppDispatch();
  const graphState = useAppSelector((state) => state.graph);
  const selectedNodeId = useAppSelector((state) => state.graph.selectedNode);
  const selectedEdgeId = useAppSelector((state) => state.graph.selectedEdge);
  const pathfindingResult = useAppSelector((state) => state.graph.pathfindingResult);
  const layoutMode = useAppSelector((state) => state.graph.layoutMode || 'manual');
  const settings = useAppSelector((state) => state.graph.settings);
  
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const layoutRef = useRef<ForceLayout3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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


  // Initialize layout
  useEffect(() => {
    if (layoutMode === 'auto' && graphState.nodes.length > 0) {
      layoutRef.current = new ForceLayout3D(graphState.nodes, graphState.edges);
      layoutRef.current.start();
    } else {
      if (layoutRef.current) {
        layoutRef.current.destroy();
        layoutRef.current = null;
      }
    }

    return () => {
      if (layoutRef.current) {
        layoutRef.current.destroy();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [layoutMode, graphState.nodes.length]);

  // Update layout when nodes/edges change
  useEffect(() => {
    if (layoutRef.current && layoutMode === 'auto') {
      layoutRef.current.update(graphState.nodes, graphState.edges);
    }
  }, [graphState.nodes, graphState.edges, layoutMode]);

  // Run layout simulation
  useFrame(() => {
    if (layoutRef.current && layoutMode === 'auto') {
      const updatedNodes = layoutRef.current.tick();
      updatedNodes.forEach((node) => {
        const existingNode = graphState.nodes.find((n) => n.id === node.id);
        if (existingNode && (
          existingNode.position.x !== node.position.x ||
          existingNode.position.y !== node.position.y ||
          existingNode.position.z !== node.position.z
        )) {
          dispatch(updateNode(node));
        }
      });
    }
  });

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

  // Handle node drag (only in manual mode)
  const handleNodeDrag = useCallback(
    (nodeId: string, position: Vector3) => {
      if (layoutMode === 'manual') {
        const node = graphState.nodes.find((n) => n.id === nodeId);
        if (node) {
          dispatch(
            updateNode({
              ...node,
              position: { x: position.x, y: position.y, z: position.z },
            })
          );
        }
      }
    },
    [dispatch, graphState.nodes, layoutMode]
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
                canDrag={layoutMode === 'manual' && node.id === selectedNodeId}
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
  const layoutMode = useAppSelector((state) => state.graph.layoutMode || 'manual');

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

  const toggleLayoutMode = () => {
    const newMode = layoutMode === 'manual' ? 'auto' : 'manual';
    dispatch(setLayoutMode(newMode));
  };

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
      
      {/* Layout mode toggle button */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Current mode indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-md text-sm">
            {layoutMode === 'manual' ? (
              <>
                <Hand className="w-4 h-4 text-primary" />
                <span className="font-medium">Manual Mode</span>
              </>
            ) : (
              <>
                <Layout className="w-4 h-4 text-primary" />
                <span className="font-medium">Auto Layout</span>
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                {layoutMode === 'manual' ? (
                  <div className="space-y-1">
                    <p className="font-semibold">Manual Mode</p>
                    <p className="text-xs">
                      You control node positions. Drag nodes to reposition them, or set positions when creating/editing nodes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-semibold">Auto Layout</p>
                    <p className="text-xs">
                      Nodes are automatically positioned using a force-directed algorithm. Connected nodes stay close, unconnected nodes repel each other.
                    </p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Switch button */}
          <Button
            onClick={toggleLayoutMode}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {layoutMode === 'manual' ? (
              <>
                <Layout className="w-4 h-4" />
                Switch to Auto
              </>
            ) : (
              <>
                <Hand className="w-4 h-4" />
                Switch to Manual
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

