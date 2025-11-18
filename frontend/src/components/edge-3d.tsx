import { useMemo, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';
import { Text } from '@react-three/drei';
import type { GraphEdge, GraphNode, GraphSettings } from '@/lib/redux/slices/graphSlice';

interface Edge3DProps {
  edge: GraphEdge;
  sourceNode: GraphNode;
  targetNode: GraphNode;
  isSelected: boolean;
  isInPath?: boolean;
  isVisited?: boolean;
  cycleIndex?: number | null;
  isCycleMode?: boolean;
  isInCycle?: boolean;
  onClick: (edgeId: string) => void;
  settings: GraphSettings;
}

// Color palette for cycles (same as node-3d)
const CYCLE_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange-red
  '#6366f1', // indigo
];

export function Edge3D({ edge, sourceNode, targetNode, isSelected, isInPath, isVisited, cycleIndex, isCycleMode = false, isInCycle = false, onClick, settings }: Edge3DProps) {
  const [hovered, setHovered] = useState(false);

  // Edge connects to node centers for visual connection
  const start = useMemo(
    () => new Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z),
    [sourceNode.position]
  );
  const end = useMemo(
    () => new Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z),
    [targetNode.position]
  );

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(edge.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
  };

  // Edge styling with hover effects - memoized to update when settings change
  // Color priority when in cycle mode: selected > cycle color > non-cycle (dimmed)
  // Color priority when in pathfinding mode: selected > path > visited > default
  // Color priority when neither: selected > visited > default
  // All edges in the same selected cycle get the same color as their nodes
  const cycleColor = cycleIndex !== null && cycleIndex !== undefined
    ? CYCLE_COLORS[cycleIndex % CYCLE_COLORS.length]
    : null;

  const baseColor = useMemo(() => {
    return isSelected 
      ? '#3b82f6' // Selected edges always blue
      : isCycleMode
      ? (isInCycle && cycleColor 
          ? cycleColor // Same color for all edges in the same selected cycle
          : '#9ca3af') // Dimmed gray for non-cycle edges
      : isInPath 
      ? '#f59e0b' // orange for path
      : isVisited 
      ? '#60a5fa' // light blue for visited
      : settings.edgeColor;
  }, [isSelected, isCycleMode, isInCycle, cycleColor, isInPath, isVisited, settings.edgeColor]);
  
  // Opacity for non-cycle edges in cycle mode
  const edgeOpacity = useMemo(() => {
    return isCycleMode && !isInCycle ? 0.3 : 1.0;
  }, [isCycleMode, isInCycle]);
  
  const edgeColor = useMemo(() => {
    return hovered ? '#3b82f6' : baseColor;
  }, [hovered, baseColor]);
  
  const baseRadius = useMemo(() => {
    if (isSelected) return settings.edgeThickness * 1.6;
    if (isInPath) return settings.edgeThickness * 1.2;
    if (isCycleMode && !isInCycle) return settings.edgeThickness * 0.6; // Thinner for non-cycle edges
    return settings.edgeThickness;
  }, [isSelected, isInPath, isCycleMode, isInCycle, settings.edgeThickness]);
  
  const edgeRadius = useMemo(() => {
    return hovered ? baseRadius * 1.8 : baseRadius;
  }, [hovered, baseRadius]);
  
  // Calculate shortened end position for cylinder when arrowhead is present
  const cylinderEnd = useMemo(() => {
    if (!edge.isDirected) return end;
    const edgeVector = new Vector3().subVectors(end, start).normalize();
    const nodeRadius = 0.5;
    // Use baseRadius for calculation (before hover effect) to maintain consistency
    const arrowheadHeight = baseRadius * 4;
    const arrowheadOffset = nodeRadius + arrowheadHeight / 2;
    return new Vector3()
      .copy(end)
      .sub(edgeVector.clone().multiplyScalar(arrowheadOffset));
  }, [start, end, edge.isDirected, baseRadius]);

  // Calculate edge length (shortened for directed edges to leave room for arrowhead)
  const edgeLength = useMemo(() => {
    const targetEnd = cylinderEnd;
    const length = start.distanceTo(targetEnd);
    return Math.max(0.1, length);
  }, [start, cylinderEnd]);

  // Calculate midpoint for label positioning (using full edge length, not shortened)
  const midpoint = useMemo(() => {
    return new Vector3().addVectors(start, end).multiplyScalar(0.5);
  }, [start, end]);


  // Calculate perpendicular offset for label to appear above the edge
  const labelOffset = useMemo(() => {
    const edgeVector = new Vector3().subVectors(end, start).normalize();
    const up = new Vector3(0, 1, 0);
    // Calculate a perpendicular vector
    const perpendicular = new Vector3().crossVectors(edgeVector, up).normalize();
    // If edge is parallel to up, use a different perpendicular
    if (perpendicular.length() < 0.1) {
      const right = new Vector3(1, 0, 0);
      perpendicular.crossVectors(edgeVector, right).normalize();
    }
    // Offset by edge radius plus a small margin
    return perpendicular.multiplyScalar(edgeRadius + 0.15);
  }, [start, end, edgeRadius]);

  // Calculate rotation to align cylinder with edge
  const quaternion = useMemo(() => {
    const cylinderVector = new Vector3().subVectors(cylinderEnd, start).normalize();
    const up = new Vector3(0, 1, 0);
    const quat = new Quaternion();
    
    // Handle edge case where edge is parallel to up vector
    if (Math.abs(cylinderVector.dot(up)) > 0.99) {
      // Edge is parallel to Y axis, no rotation needed
      return [0, 0, 0, 1];
    }
    
    // Create quaternion that rotates from up vector to edge vector
    quat.setFromUnitVectors(up, cylinderVector);
    return [quat.x, quat.y, quat.z, quat.w];
  }, [start, cylinderEnd]);

  // Calculate midpoint of shortened cylinder for positioning
  const cylinderMidpoint = useMemo(() => {
    return new Vector3().addVectors(start, cylinderEnd).multiplyScalar(0.5);
  }, [start, cylinderEnd]);

  // Calculate arrowhead position and rotation for directed edges
  const arrowheadData = useMemo(() => {
    if (!edge.isDirected) return null;
    
    const edgeVector = new Vector3().subVectors(end, start).normalize();
    const nodeRadius = 0.5; // Maximum node radius to ensure arrow doesn't overlap
    // Use baseRadius for consistency (before hover effect)
    const arrowheadHeight = baseRadius * 4; // Arrowhead height proportional to edge thickness
    const arrowheadRadius = baseRadius * 2; // Arrowhead base radius
    
    // Position arrowhead at target node, offset by node radius + half arrowhead height
    const offsetDistance = nodeRadius + arrowheadHeight / 2;
    const arrowheadPosition = new Vector3()
      .copy(end)
      .sub(edgeVector.clone().multiplyScalar(offsetDistance));
    
    // Calculate rotation for arrowhead (cone points along edge vector)
    const up = new Vector3(0, 1, 0);
    const quat = new Quaternion();
    
    if (Math.abs(edgeVector.dot(up)) > 0.99) {
      return {
        position: arrowheadPosition,
        quaternion: [0, 0, 0, 1],
        height: arrowheadHeight,
        radius: arrowheadRadius,
      };
    }
    
    quat.setFromUnitVectors(up, edgeVector);
    return {
      position: arrowheadPosition,
      quaternion: [quat.x, quat.y, quat.z, quat.w],
      height: arrowheadHeight,
      radius: arrowheadRadius,
    };
  }, [start, end, edge.isDirected, baseRadius]);

  return (
    // @ts-ignore - React Three Fiber primitives
    <group renderOrder={0}>
      {/* Edge as cylinder for thickness */}
      {/* @ts-ignore */}
      <mesh
        position={[cylinderMidpoint.x, cylinderMidpoint.y, cylinderMidpoint.z]}
        quaternion={quaternion}
        renderOrder={0}
        // @ts-ignore
        onPointerOver={handlePointerOver}
        // @ts-ignore
        onPointerOut={handlePointerOut}
        // @ts-ignore
        onClick={handleClick}
      >
        {/* @ts-ignore */}
        <cylinderGeometry args={[edgeRadius, edgeRadius, edgeLength, 8]} />
        {/* @ts-ignore */}
        <meshStandardMaterial 
          color={edgeColor}
          emissive={edgeColor}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : isCycleMode && isInCycle ? 0.15 : 0.1}
          metalness={0.3}
          roughness={0.4}
          transparent={edgeOpacity < 1.0}
          opacity={edgeOpacity}
        />
      </mesh>

      {/* Arrowhead for directed edges */}
      {arrowheadData && (
        // @ts-ignore - React Three Fiber primitives
        <mesh
          position={[arrowheadData.position.x, arrowheadData.position.y, arrowheadData.position.z]}
          quaternion={arrowheadData.quaternion}
          renderOrder={0}
        >
          {/* @ts-ignore */}
          <coneGeometry args={[arrowheadData.radius, arrowheadData.height, 8]} />
          {/* @ts-ignore */}
          <meshStandardMaterial 
            color={edgeColor}
            emissive={edgeColor}
            emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : isCycleMode && isInCycle ? 0.15 : 0.1}
            metalness={0.3}
            roughness={0.4}
            transparent={edgeOpacity < 1.0}
            opacity={edgeOpacity}
          />
        </mesh>
      )}

      {/* Edge weight label */}
      {edge.weight !== undefined && (
        <group renderOrder={2}>
          <Text
            position={[
              midpoint.x + labelOffset.x,
              midpoint.y + labelOffset.y,
              midpoint.z + labelOffset.z
            ]}
            fontSize={0.2}
            color={settings.edgeLabelColor}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#ffffff"
          >
            {edge.weight}
          </Text>
        </group>
      )}
    </group>
  );
}
