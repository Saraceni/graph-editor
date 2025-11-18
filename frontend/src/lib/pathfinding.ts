import type { GraphNode, GraphEdge } from '@/lib/redux/slices/graphSlice';

interface PathfindingResult {
  path: string[];
  distance: number;
}

/**
 * Dijkstra's algorithm for weighted shortest path
 * Works with both directed and undirected graphs
 */
export function dijkstra(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): PathfindingResult | null {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  // Initialize
  nodes.forEach(node => {
    distances[node.id] = node.id === startId ? 0 : Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let minDistance = Infinity;

    // Find unvisited node with minimum distance
    unvisited.forEach(id => {
      if (distances[id] < minDistance) {
        minDistance = distances[id];
        currentId = id;
      }
    });

    if (currentId === null || distances[currentId] === Infinity) break;

    unvisited.delete(currentId);

    // Check neighbors
    const outgoingEdges = edges.filter(e => e.source === currentId);
    const incomingEdges = edges.filter(
      e => e.target === currentId && !e.isDirected
    );
    const allEdges = [...outgoingEdges, ...incomingEdges];

    allEdges.forEach(edge => {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      if (unvisited.has(neighborId)) {
        const weight = edge.weight || 1;
        const newDistance = distances[currentId!] + weight;
        if (newDistance < distances[neighborId]) {
          distances[neighborId] = newDistance;
          previous[neighborId] = currentId;
        }
      }
    });
  }

  // Reconstruct path
  if (distances[endId] === Infinity) return null;

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  return {
    path,
    distance: distances[endId],
  };
}

/**
 * BFS for unweighted shortest path
 */
export function bfs(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): PathfindingResult | null {
  const visited = new Set<string>();
  const queue: string[] = [startId];
  const parent: Record<string, string | null> = {};
  parent[startId] = null;

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === endId) break;

    // Find neighbors
    const outgoingEdges = edges.filter(e => e.source === currentId);
    const incomingEdges = edges.filter(
      e => e.target === currentId && !e.isDirected
    );
    const allEdges = [...outgoingEdges, ...incomingEdges];

    allEdges.forEach(edge => {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      if (!visited.has(neighborId)) {
        parent[neighborId] = currentId;
        queue.push(neighborId);
      }
    });
  }

  if (!visited.has(endId)) return null;

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = parent[current] || null;
  }

  return {
    path,
    distance: path.length - 1,
  };
}

/**
 * DFS to find all connected nodes from a start node
 */
export function dfs(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string
): string[] {
  const visited = new Set<string>();
  const stack: string[] = [startId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || visited.has(currentId)) continue;

    visited.add(currentId);

    const outgoingEdges = edges.filter(e => e.source === currentId);
    const incomingEdges = edges.filter(
      e => e.target === currentId && !e.isDirected
    );
    const allEdges = [...outgoingEdges, ...incomingEdges];

    allEdges.forEach(edge => {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      if (!visited.has(neighborId)) {
        stack.push(neighborId);
      }
    });
  }

  return Array.from(visited);
}

/**
 * DFS for pathfinding from start to end node
 * Returns a path if one exists (not necessarily shortest)
 */
export function dfsPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): PathfindingResult | null {
  const visited = new Set<string>();
  const stack: { nodeId: string; path: string[] }[] = [{ nodeId: startId, path: [startId] }];

  while (stack.length > 0) {
    const { nodeId: currentId, path } = stack.pop()!;
    
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === endId) {
      return {
        path,
        distance: path.length - 1,
      };
    }

    // Find neighbors
    const outgoingEdges = edges.filter(e => e.source === currentId);
    const incomingEdges = edges.filter(
      e => e.target === currentId && !e.isDirected
    );
    const allEdges = [...outgoingEdges, ...incomingEdges];

    allEdges.forEach(edge => {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      if (!visited.has(neighborId)) {
        stack.push({ nodeId: neighborId, path: [...path, neighborId] });
      }
    });
  }

  return null;
}
