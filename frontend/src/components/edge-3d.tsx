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
  onClick: (edgeId: string) => void;
  settings: GraphSettings;
}

export function Edge3D({ edge, sourceNode, targetNode, isSelected, isInPath, isVisited, onClick, settings }: Edge3DProps) {
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
  // Color priority: selected > path > visited > default
  const baseColor = useMemo(() => {
    return isSelected 
      ? '#3b82f6' 
      : isInPath 
      ? '#f59e0b' // orange for path
      : isVisited 
      ? '#60a5fa' // light blue for visited
      : settings.edgeColor;
  }, [isSelected, isInPath, isVisited, settings.edgeColor]);
  
  const edgeColor = useMemo(() => {
    return hovered ? '#3b82f6' : baseColor;
  }, [hovered, baseColor]);
  
  const baseRadius = useMemo(() => {
    return isSelected ? settings.edgeThickness * 1.6 : isInPath ? settings.edgeThickness * 1.2 : settings.edgeThickness;
  }, [isSelected, isInPath, settings.edgeThickness]);
  
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
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : 0.1}
          metalness={0.3}
          roughness={0.4}
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
            emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : 0.1}
            metalness={0.3}
            roughness={0.4}
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
