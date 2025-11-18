import { useRef, useState, useEffect } from 'react';
import { useFrame, type ThreeEvent, useThree } from '@react-three/fiber';
import { Mesh, Vector3, Plane } from 'three';
import { Text } from '@react-three/drei';
import type { GraphNode, GraphSettings } from '@/lib/redux/slices/graphSlice';

interface Node3DProps {
  node: GraphNode;
  isSelected: boolean;
  isInPath?: boolean;
  isStartNode?: boolean;
  isEndNode?: boolean;
  isVisited?: boolean;
  onClick: (nodeId: string) => void;
  onDrag?: (nodeId: string, position: Vector3) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  canDrag?: boolean;
  settings: GraphSettings;
}

export function Node3D({ node, isSelected, isInPath, isStartNode, isEndNode, isVisited, onClick, onDrag, onDragStart, onDragEnd, canDrag = false, settings }: Node3DProps) {
  const meshRef = useRef<Mesh>(null);
  const { raycaster, camera, pointer } = useThree();
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlaneRef = useRef<Plane | null>(null);
  const isDraggingRef = useRef(false);

  // Handle click (only if not dragging)
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isDragging) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    onClick(node.id);
  };

  // Handle pointer down
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!canDrag || !onDrag) return;
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);
    
    // Create a plane perpendicular to camera direction at the node's position
    const nodePos = new Vector3(node.position.x, node.position.y, node.position.z);
    const cameraDirection = new Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Create plane with normal pointing toward camera
    dragPlaneRef.current = new Plane().setFromNormalAndCoplanarPoint(
      cameraDirection.clone().negate(),
      nodePos
    );
    
    onDragStart?.();
  };

  // Handle pointer up
  const handlePointerUp = (e?: ThreeEvent<PointerEvent>) => {
    if (!isDraggingRef.current) return;
    e?.stopPropagation();
    isDraggingRef.current = false;
    setIsDragging(false);
    dragPlaneRef.current = null;
    onDragEnd?.();
  };

  // Add global pointer up listener to stop dragging if pointer is released outside
  useEffect(() => {
    if (isDragging) {
      const handleGlobalPointerUp = () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          setIsDragging(false);
          dragPlaneRef.current = null;
          onDragEnd?.();
        }
      };
      
      window.addEventListener('pointerup', handleGlobalPointerUp);
      return () => {
        window.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
  }, [isDragging, onDragEnd]);

  // Update position during drag
  useFrame(() => {
    if (isDraggingRef.current && canDrag && onDrag && dragPlaneRef.current && meshRef.current) {
      // Update raycaster with current pointer position
      raycaster.setFromCamera(pointer, camera);
      
      // Find intersection with the drag plane
      const intersectPoint = new Vector3();
      raycaster.ray.intersectPlane(dragPlaneRef.current, intersectPoint);
      
      if (intersectPoint) {
        onDrag(node.id, intersectPoint);
      }
    }
  });



  // Color priority: selected > start > end > path > visited > default
  const nodeColor = isSelected 
    ? '#3b82f6' 
    : isStartNode 
    ? '#10b981' // green for start
    : isEndNode 
    ? '#ef4444' // red for end
    : isInPath 
    ? '#f59e0b' // orange for path
    : isVisited 
    ? '#60a5fa' // light blue for visited
    : settings.nodeColor;
  const nodeSize = isSelected ? 0.5 : hovered ? 0.45 : 0.4;

  return (
    <group position={[node.position.x, node.position.y, node.position.z]} renderOrder={1}>
      <mesh
        ref={meshRef}
        renderOrder={1}
        onClick={handleClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(false);
        }}
        onPointerDown={canDrag ? handlePointerDown : undefined}
        onPointerUp={canDrag ? handlePointerUp : undefined}
        onPointerMissed={canDrag ? () => handlePointerUp() : undefined}
      >
        <sphereGeometry args={[nodeSize, 32, 32]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      {node.label && (
        <Text
          position={[0, nodeSize + 0.3, 0]}
          fontSize={0.3}
          color={settings.nodeLabelColor}
          anchorX="center"
          anchorY="middle"
        >
          {node.label}
        </Text>
      )}
    </group>
  );
}

