import { Vector3 } from 'three';
import type { GraphNode } from '@/lib/redux/slices/graphSlice';

/**
 * Convert a Three.js Vector3 to a position object
 */
export function vector3ToPosition(vec: Vector3): { x: number; y: number; z: number } {
  return { x: vec.x, y: vec.y, z: vec.z };
}

/**
 * Convert a position object to a Three.js Vector3
 */
export function positionToVector3(pos: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(pos.x, pos.y, pos.z);
}

/**
 * Calculate distance between two nodes in 3D space
 */
export function distance3D(
  node1: GraphNode,
  node2: GraphNode
): number {
  const dx = node2.position.x - node1.position.x;
  const dy = node2.position.y - node1.position.y;
  const dz = node2.position.z - node1.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Generate random 3D position within bounds
 */
export function random3DPosition(bounds: number = 10): { x: number; y: number; z: number } {
  return {
    x: (Math.random() - 0.5) * bounds,
    y: (Math.random() - 0.5) * bounds,
    z: (Math.random() - 0.5) * bounds,
  };
}

