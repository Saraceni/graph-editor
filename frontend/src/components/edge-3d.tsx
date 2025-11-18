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
  onClick: (edgeId: string) => void;
  settings: GraphSettings;
}

export function Edge3D({ edge, sourceNode, targetNode, isSelected, isInPath, onClick, settings }: Edge3DProps) {
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
  const baseColor = useMemo(() => {
    return isSelected ? '#3b82f6' : isInPath ? '#f59e0b' : settings.edgeColor;
  }, [isSelected, isInPath, settings.edgeColor]);
  
  const edgeColor = useMemo(() => {
    return hovered ? '#3b82f6' : baseColor;
  }, [hovered, baseColor]);
  
  const baseRadius = useMemo(() => {
    return isSelected ? settings.edgeThickness * 1.6 : isInPath ? settings.edgeThickness * 1.2 : settings.edgeThickness;
  }, [isSelected, isInPath, settings.edgeThickness]);
  
  const edgeRadius = useMemo(() => {
    return hovered ? baseRadius * 1.8 : baseRadius;
  }, [hovered, baseRadius]);
  
  // Calculate edge length and midpoint
  const edgeLength = useMemo(() => {
    return start.distanceTo(end);
  }, [start, end]);

  // Calculate midpoint for label positioning
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
    const edgeVector = new Vector3().subVectors(end, start).normalize();
    const up = new Vector3(0, 1, 0);
    const quat = new Quaternion();
    
    // Handle edge case where edge is parallel to up vector
    if (Math.abs(edgeVector.dot(up)) > 0.99) {
      // Edge is parallel to Y axis, no rotation needed
      return [0, 0, 0, 1];
    }
    
    // Create quaternion that rotates from up vector to edge vector
    quat.setFromUnitVectors(up, edgeVector);
    return [quat.x, quat.y, quat.z, quat.w];
  }, [start, end]);

  return (
    // @ts-ignore - React Three Fiber primitives
    <group renderOrder={0}>
      {/* Edge as cylinder for thickness */}
      {/* @ts-ignore */}
      <mesh
        position={[midpoint.x, midpoint.y, midpoint.z]}
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
