import type { GraphNode, GraphEdge } from '@/lib/redux/slices/graphSlice';

export interface PathfindingResult {
  path: string[];
  distance: number;
  visitedNodes: string[];
  visitedEdges: string[];
  startNode: string;
  endNode: string;
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
  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();

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
    visitedNodes.add(currentId);

    // Check neighbors
    const outgoingEdges = edges.filter(e => e.source === currentId);
    const incomingEdges = edges.filter(
      e => e.target === currentId && !e.isDirected
    );
    const allEdges = [...outgoingEdges, ...incomingEdges];

    allEdges.forEach(edge => {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      // Mark edge as visited when we explore it
      visitedEdges.add(edge.id);
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
    visitedNodes: Array.from(visitedNodes),
    visitedEdges: Array.from(visitedEdges), // All edges explored during algorithm
    startNode: startId,
    endNode: endId,
  };
}

/**
 * BFS for unweighted shortest path
 */
export function bfs(
  _nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): PathfindingResult | null {
  const visited = new Set<string>();
  const visitedEdges = new Set<string>();
  const queue: string[] = [startId];
  const discovered = new Set<string>([startId]); // Track discovered nodes
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
      // Mark edge as visited when we explore it
      visitedEdges.add(edge.id);
      // Only set parent and add to queue if node hasn't been discovered yet
      if (!discovered.has(neighborId)) {
        discovered.add(neighborId);
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
    visitedNodes: Array.from(visited),
    visitedEdges: Array.from(visitedEdges), // All edges explored during algorithm
    startNode: startId,
    endNode: endId,
  };
}

/**
 * Cycle Detection - Finds all cycles in a graph
 * Works with both directed and undirected edges
 * Undirected edges are treated as bidirectional connections
 * Returns all cycles found in the graph
 */
export interface CycleResult {
  cycles: string[][]; // Array of cycles, each cycle is an array of node IDs forming a cycle
  cycleMap: Record<string, number[]>; // Maps node ID to array of cycle indices it belongs to
}

export function findCycles(
  nodes: GraphNode[],
  edges: GraphEdge[]
): CycleResult {
  // Build adjacency list
  // For directed edges: only add source -> target
  // For undirected edges: add both directions (source -> target and target -> source)
  const adjList: Record<string, string[]> = {};
  
  nodes.forEach(node => {
    adjList[node.id] = [];
  });
  
  edges.forEach(edge => {
    if (edge.isDirected) {
      // Directed edge: only one direction
      adjList[edge.source].push(edge.target);
    } else {
      // Undirected edge: both directions
      adjList[edge.source].push(edge.target);
      adjList[edge.target].push(edge.source);
    }
  });
  
  const cycles: string[][] = [];
  const cycleMap: Record<string, number[]> = {};
  
  // Initialize cycle map
  nodes.forEach(node => {
    cycleMap[node.id] = [];
  });
  
  // DFS to find cycles
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = adjList[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Found a cycle - extract the cycle from the path
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = [...path.slice(cycleStart), neighbor];
          // Only add if cycle has at least 2 nodes (to avoid self-loops as cycles)
          if (cycle.length >= 2) {
            const cycleIndex = cycles.length;
            cycles.push(cycle);
            
            // Mark all nodes in this cycle
            const uniqueNodes = new Set(cycle);
            uniqueNodes.forEach(n => {
              if (!cycleMap[n].includes(cycleIndex)) {
                cycleMap[n].push(cycleIndex);
              }
            });
          }
        }
      }
    }
    
    recStack.delete(nodeId);
    path.pop();
  }
  
  // Find cycles starting from each unvisited node
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });
  
  // Remove duplicate cycles (same cycle but different starting points)
  const uniqueCycles: string[][] = [];
  const cycleSet = new Set<string>();
  
  cycles.forEach(cycle => {
    // Normalize cycle by starting from the smallest node ID
    const minIndex = cycle.indexOf(cycle.reduce((min, node) => 
      node < min ? node : min, cycle[0]));
    const normalized = [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)].join(',');
    
    if (!cycleSet.has(normalized)) {
      cycleSet.add(normalized);
      uniqueCycles.push(cycle);
    }
  });
  
  // Rebuild cycleMap with unique cycles
  const newCycleMap: Record<string, number[]> = {};
  nodes.forEach(node => {
    newCycleMap[node.id] = [];
  });
  
  uniqueCycles.forEach((cycle, index) => {
    const uniqueNodes = new Set(cycle);
    uniqueNodes.forEach(nodeId => {
      if (!newCycleMap[nodeId].includes(index)) {
        newCycleMap[nodeId].push(index);
      }
    });
  });
  
  return {
    cycles: uniqueCycles,
    cycleMap: newCycleMap,
  };
}
