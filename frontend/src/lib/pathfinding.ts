import type { GraphNode, GraphEdge } from '@/lib/redux/slices/graphSlice';

export interface PathfindingResult {
  path: string[];
  distance: number;
  visitedNodes: string[];
  visitedEdges: string[];
  startNode: string;
  endNode: string;
}

export interface AnimationStep {
  visitedNodes: string[];
  visitedEdges: string[];
  currentNode?: string;
  currentNodeNeighbors?: string[];
  path?: string[];
  distance?: number;
  isComplete: boolean;
  description?: string;
}

/**
 * Dijkstra's algorithm for weighted shortest path (Generator version for animation)
 * Works with both directed and undirected graphs
 * Yields intermediate states for animation
 */
export function* dijkstraGenerator(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): Generator<AnimationStep, PathfindingResult | null, unknown> {
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

  // Yield initial state
  yield {
    visitedNodes: [],
    visitedEdges: [],
    isComplete: false,
    description: 'Initializing Dijkstra\'s algorithm',
  };

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
    const neighborIds: string[] = [];

    allEdges.forEach(edge => {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      neighborIds.push(neighborId);
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

    // Yield state after processing current node
    yield {
      visitedNodes: Array.from(visitedNodes),
      visitedEdges: Array.from(visitedEdges),
      currentNode: currentId,
      currentNodeNeighbors: neighborIds,
      isComplete: false,
      description: currentId === endId 
        ? `Reached target node ${currentId}` 
        : `Processing node ${currentId}`,
    };

    if (currentId === endId) break;
  }

  // Reconstruct path
  if (distances[endId] === Infinity) {
    yield {
      visitedNodes: Array.from(visitedNodes),
      visitedEdges: Array.from(visitedEdges),
      isComplete: true,
      description: 'No path found',
    };
    return null;
  }

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  const result: PathfindingResult = {
    path,
    distance: distances[endId],
    visitedNodes: Array.from(visitedNodes),
    visitedEdges: Array.from(visitedEdges),
    startNode: startId,
    endNode: endId,
  };

  // Yield final state with path
  yield {
    visitedNodes: Array.from(visitedNodes),
    visitedEdges: Array.from(visitedEdges),
    path,
    distance: distances[endId],
    isComplete: true,
    description: `Path found: ${path.length} nodes, distance ${distances[endId]}`,
  };

  return result;
}

/**
 * Dijkstra's algorithm for weighted shortest path (synchronous version)
 * Works with both directed and undirected graphs
 */
export function dijkstra(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): PathfindingResult | null {
  const generator = dijkstraGenerator(nodes, edges, startId, endId);
  let result: PathfindingResult | null = null;
  let value;
  do {
    value = generator.next();
    if (value.value && 'isComplete' in value.value && value.value.isComplete && value.value.path) {
      result = {
        path: value.value.path,
        distance: value.value.distance!,
        visitedNodes: value.value.visitedNodes,
        visitedEdges: value.value.visitedEdges,
        startNode: startId,
        endNode: endId,
      };
    }
  } while (!value.done);
  return result;
}

/**
 * A* algorithm for weighted shortest path with heuristic (Generator version for animation)
 * Uses Euclidean distance as heuristic based on node positions
 * Works with both directed and undirected graphs
 * Yields intermediate states for animation
 */
export function* astarGenerator(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): Generator<AnimationStep, PathfindingResult | null, unknown> {
  // Create node lookup map
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });

  const startNode = nodeMap.get(startId);
  const endNode = nodeMap.get(endId);
  if (!startNode || !endNode) return null;

  // Heuristic function: Euclidean distance in 3D space
  const heuristic = (nodeId: string): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return Infinity;
    const dx = node.position.x - endNode.position.x;
    const dy = node.position.y - endNode.position.y;
    const dz = node.position.z - endNode.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // gScore: cost from start to node
  const gScore: Record<string, number> = {};
  // fScore: gScore + heuristic (estimated total cost)
  const fScore: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();
  
  // Priority queue: array of [nodeId, fScore]
  const openSet: Array<[string, number]> = [];
  const inOpenSet = new Set<string>();

  // Initialize
  nodes.forEach(node => {
    gScore[node.id] = node.id === startId ? 0 : Infinity;
    fScore[node.id] = node.id === startId ? heuristic(startId) : Infinity;
    previous[node.id] = null;
  });

  // Add start node to open set
  openSet.push([startId, fScore[startId]]);
  inOpenSet.add(startId);

  // Helper to maintain priority queue (min-heap)
  const insertIntoQueue = (nodeId: string, score: number) => {
    openSet.push([nodeId, score]);
    inOpenSet.add(nodeId);
    // Simple insertion - could be optimized with a proper heap
    openSet.sort((a, b) => a[1] - b[1]);
  };

  const removeFromQueue = (): string | null => {
    if (openSet.length === 0) return null;
    const [nodeId] = openSet.shift()!;
    inOpenSet.delete(nodeId);
    return nodeId;
  };

  // Yield initial state
  yield {
    visitedNodes: [],
    visitedEdges: [],
    currentNode: startId,
    isComplete: false,
    description: 'Initializing A* algorithm',
  };

  while (openSet.length > 0) {
    const currentId = removeFromQueue();
    if (!currentId) break;

    visitedNodes.add(currentId);

    if (currentId === endId) {
      // Reconstruct path
      const path: string[] = [];
      let current: string | null = endId;
      while (current !== null) {
        path.unshift(current);
        current = previous[current];
      }

      const result: PathfindingResult = {
        path,
        distance: gScore[endId],
        visitedNodes: Array.from(visitedNodes),
        visitedEdges: Array.from(visitedEdges),
        startNode: startId,
        endNode: endId,
      };

      yield {
        visitedNodes: Array.from(visitedNodes),
        visitedEdges: Array.from(visitedEdges),
        path,
        distance: gScore[endId],
        isComplete: true,
        description: `Path found: ${path.length} nodes, distance ${gScore[endId]}`,
      };

      return result;
    }

    // Check neighbors
    const outgoingEdges = edges.filter(e => e.source === currentId);
    const incomingEdges = edges.filter(
      e => e.target === currentId && !e.isDirected
    );
    const allEdges = [...outgoingEdges, ...incomingEdges];
    const neighborIds: string[] = [];

    allEdges.forEach(edge => {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      neighborIds.push(neighborId);
      visitedEdges.add(edge.id);

      const weight = edge.weight || 1;
      const tentativeGScore = gScore[currentId] + weight;

      if (tentativeGScore < gScore[neighborId]) {
        previous[neighborId] = currentId;
        gScore[neighborId] = tentativeGScore;
        fScore[neighborId] = tentativeGScore + heuristic(neighborId);

        if (!inOpenSet.has(neighborId)) {
          insertIntoQueue(neighborId, fScore[neighborId]);
        } else {
          // Update existing entry in queue
          const index = openSet.findIndex(([id]) => id === neighborId);
          if (index !== -1) {
            openSet[index][1] = fScore[neighborId];
            openSet.sort((a, b) => a[1] - b[1]);
          }
        }
      }
    });

    // Yield state after processing current node
    yield {
      visitedNodes: Array.from(visitedNodes),
      visitedEdges: Array.from(visitedEdges),
      currentNode: currentId,
      currentNodeNeighbors: neighborIds,
      isComplete: false,
      description: `Processing node ${currentId} (heuristic: ${fScore[currentId].toFixed(2)})`,
    };
  }

  // No path found
  yield {
    visitedNodes: Array.from(visitedNodes),
    visitedEdges: Array.from(visitedEdges),
    isComplete: true,
    description: 'No path found',
  };
  return null;
}

/**
 * A* algorithm for weighted shortest path with heuristic (synchronous version)
 * Uses Euclidean distance as heuristic based on node positions
 * Works with both directed and undirected graphs
 */
export function astar(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): PathfindingResult | null {
  const generator = astarGenerator(nodes, edges, startId, endId);
  let result: PathfindingResult | null = null;
  let value;
  do {
    value = generator.next();
    if (value.value && 'isComplete' in value.value && value.value.isComplete && value.value.path) {
      result = {
        path: value.value.path,
        distance: value.value.distance!,
        visitedNodes: value.value.visitedNodes,
        visitedEdges: value.value.visitedEdges,
        startNode: startId,
        endNode: endId,
      };
    }
  } while (!value.done);
  return result;
}

/**
 * BFS for unweighted shortest path (Generator version for animation)
 * Yields intermediate states for animation
 */
export function* bfsGenerator(
  _nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): Generator<AnimationStep, PathfindingResult | null, unknown> {
  const visited = new Set<string>();
  const visitedEdges = new Set<string>();
  const queue: string[] = [startId];
  const discovered = new Set<string>([startId]); // Track discovered nodes
  const parent: Record<string, string | null> = {};
  parent[startId] = null;

  // Yield initial state
  yield {
    visitedNodes: [],
    visitedEdges: [],
    currentNode: startId,
    isComplete: false,
    description: 'Initializing BFS algorithm',
  };

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === endId) {
      // Reconstruct path
      const path: string[] = [];
      let current: string | null = endId;
      while (current !== null) {
        path.unshift(current);
        current = parent[current] || null;
      }

      const result: PathfindingResult = {
        path,
        distance: path.length - 1,
        visitedNodes: Array.from(visited),
        visitedEdges: Array.from(visitedEdges),
        startNode: startId,
        endNode: endId,
      };

      yield {
        visitedNodes: Array.from(visited),
        visitedEdges: Array.from(visitedEdges),
        path,
        distance: path.length - 1,
        isComplete: true,
        description: `Path found: ${path.length} nodes, distance ${path.length - 1}`,
      };

      return result;
    }

    // Find neighbors
    const outgoingEdges = edges.filter(e => e.source === currentId);
    const incomingEdges = edges.filter(
      e => e.target === currentId && !e.isDirected
    );
    const allEdges = [...outgoingEdges, ...incomingEdges];
    const neighborIds: string[] = [];

    allEdges.forEach(edge => {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      neighborIds.push(neighborId);
      // Mark edge as visited when we explore it
      visitedEdges.add(edge.id);
      // Only set parent and add to queue if node hasn't been discovered yet
      if (!discovered.has(neighborId)) {
        discovered.add(neighborId);
        parent[neighborId] = currentId;
        queue.push(neighborId);
      }
    });

    // Yield state after processing current node
    yield {
      visitedNodes: Array.from(visited),
      visitedEdges: Array.from(visitedEdges),
      currentNode: currentId,
      currentNodeNeighbors: neighborIds,
      isComplete: false,
      description: `Processing node ${currentId}`,
    };
  }

  // No path found
  yield {
    visitedNodes: Array.from(visited),
    visitedEdges: Array.from(visitedEdges),
    isComplete: true,
    description: 'No path found',
  };
  return null;
}

/**
 * BFS for unweighted shortest path (synchronous version)
 */
export function bfs(
  _nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): PathfindingResult | null {
  const generator = bfsGenerator(_nodes, edges, startId, endId);
  let result: PathfindingResult | null = null;
  let value;
  do {
    value = generator.next();
    if (value.value && 'isComplete' in value.value && value.value.isComplete && value.value.path) {
      result = {
        path: value.value.path,
        distance: value.value.distance!,
        visitedNodes: value.value.visitedNodes,
        visitedEdges: value.value.visitedEdges,
        startNode: startId,
        endNode: endId,
      };
    }
  } while (!value.done);
  return result;
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

export interface CycleAnimationStep {
  visitedNodes: string[];
  visitedEdges: string[];
  currentNode?: string;
  currentPath: string[];
  discoveredCycles: string[][];
  isComplete: boolean;
  description?: string;
}

/**
 * Cycle Detection Generator (for animation)
 * Yields intermediate states as cycles are discovered
 */
export function* findCyclesGenerator(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Generator<CycleAnimationStep, CycleResult, unknown> {
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
  const visitedEdges = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];
  
  // Create edge map for tracking which edges are explored
  const edgeMap = new Map<string, GraphEdge>();
  edges.forEach(edge => {
    const key = `${edge.source}-${edge.target}`;
    edgeMap.set(key, edge);
    if (!edge.isDirected) {
      edgeMap.set(`${edge.target}-${edge.source}`, edge);
    }
  });

  function* dfs(nodeId: string): Generator<CycleAnimationStep, void, unknown> {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);
    
    // Yield state when entering node
    yield {
      visitedNodes: Array.from(visited),
      visitedEdges: Array.from(visitedEdges),
      currentNode: nodeId,
      currentPath: [...path],
      discoveredCycles: [...cycles],
      isComplete: false,
      description: `Exploring node ${nodeId}`,
    };
    
    const neighbors = adjList[nodeId] || [];
    for (const neighbor of neighbors) {
      // Mark edge as visited
      const edgeKey = `${nodeId}-${neighbor}`;
      const edge = edgeMap.get(edgeKey);
      if (edge) {
        visitedEdges.add(edge.id);
      }

      if (!visited.has(neighbor)) {
        yield* dfs(neighbor);
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

            yield {
              visitedNodes: Array.from(visited),
              visitedEdges: Array.from(visitedEdges),
              currentNode: nodeId,
              currentPath: [...path],
              discoveredCycles: [...cycles],
              isComplete: false,
              description: `Cycle found: ${cycle.length - 1} nodes`,
            };
          }
        }
      }
    }
    
    recStack.delete(nodeId);
    path.pop();
  }
  
  // Find cycles starting from each unvisited node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      // Yield initial state for each new DFS
      yield {
        visitedNodes: Array.from(visited),
        visitedEdges: Array.from(visitedEdges),
        currentNode: node.id,
        currentPath: [],
        discoveredCycles: [...cycles],
        isComplete: false,
        description: `Starting DFS from node ${node.id}`,
      };

      const dfsGen = dfs(node.id);
      for (const step of dfsGen) {
        yield step;
      }
    }
  }
  
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
  
  const result: CycleResult = {
    cycles: uniqueCycles,
    cycleMap: newCycleMap,
  };

  // Yield final state
  yield {
    visitedNodes: Array.from(visited),
    visitedEdges: Array.from(visitedEdges),
    currentPath: [],
    discoveredCycles: uniqueCycles,
    isComplete: true,
    description: `Found ${uniqueCycles.length} cycle${uniqueCycles.length !== 1 ? 's' : ''}`,
  };

  return result;
}

/**
 * Cycle Detection (synchronous version)
 * Finds all cycles in a graph
 */
export function findCycles(
  nodes: GraphNode[],
  edges: GraphEdge[]
): CycleResult {
  const generator = findCyclesGenerator(nodes, edges);
  let result: CycleResult | null = null;
  let value;
  do {
    value = generator.next();
    if (value.value && 'isComplete' in value.value && value.value.isComplete) {
      result = {
        cycles: value.value.discoveredCycles,
        cycleMap: {},
      };
      // Rebuild cycleMap for synchronous version
      nodes.forEach(node => {
        result!.cycleMap[node.id] = [];
      });
      result.cycles.forEach((cycle, index) => {
        const uniqueNodes = new Set(cycle);
        uniqueNodes.forEach(nodeId => {
          if (!result!.cycleMap[nodeId].includes(index)) {
            result!.cycleMap[nodeId].push(index);
          }
        });
      });
    }
  } while (!value.done);
  return result!;
}
