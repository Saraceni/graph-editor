import type { GraphNode, GraphEdge } from '@/lib/redux/slices/graphSlice';

interface Node3D {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number; // velocity
  vy: number;
  vz: number;
  node: GraphNode;
}

/**
 * Simple 3D Force-directed layout
 * Uses basic physics simulation with repulsion and attraction forces
 */
export class ForceLayout3D {
  private nodes: Node3D[];
  private edges: GraphEdge[];
  private nodeMap: Map<string, Node3D>;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  // Force parameters
  private readonly repulsionStrength = 100;
  private readonly attractionStrength = 0.1;
  private readonly damping = 0.9;

  constructor(nodes: GraphNode[], edges: GraphEdge[]) {
    this.nodes = [];
    this.edges = edges;
    this.nodeMap = new Map();

    // Initialize 3D nodes
    nodes.forEach((node) => {
      const node3d: Node3D = {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        z: node.position.z,
        vx: 0,
        vy: 0,
        vz: 0,
        node,
      };
      this.nodes.push(node3d);
      this.nodeMap.set(node.id, node3d);
    });
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.simulate();
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main simulation loop
   */
  private simulate(): void {
    if (!this.isRunning) return;

    // Apply forces
    this.applyRepulsion();
    this.applyAttraction();

    // Update positions
    this.updatePositions();

    // Continue simulation
    this.animationFrameId = requestAnimationFrame(() => this.simulate());
  }

  /**
   * Apply repulsion force between all nodes
   */
  private applyRepulsion(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node1 = this.nodes[i];
      node1.vx = 0;
      node1.vy = 0;
      node1.vz = 0;

      for (let j = 0; j < this.nodes.length; j++) {
        if (i === j) continue;

        const node2 = this.nodes[j];
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        const dz = node1.z - node2.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

        // Repulsion force (inverse square law)
        const force = this.repulsionStrength / (distance * distance);
        node1.vx += (dx / distance) * force;
        node1.vy += (dy / distance) * force;
        node1.vz += (dz / distance) * force;
      }
    }
  }

  /**
   * Apply attraction force along edges
   */
  private applyAttraction(): void {
    this.edges.forEach((edge) => {
      const source = this.nodeMap.get(edge.source);
      const target = this.nodeMap.get(edge.target);

      if (!source || !target) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      // Desired distance based on edge weight
      const desiredDistance = (edge.weight || 1) * 2;
      const difference = distance - desiredDistance;

      // Attraction force
      const force = difference * this.attractionStrength;

      // Apply force to both nodes
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      const fz = (dz / distance) * force;

      source.vx += fx;
      source.vy += fy;
      source.vz += fz;

      target.vx -= fx;
      target.vy -= fy;
      target.vz -= fz;
    });
  }

  /**
   * Update node positions based on velocities
   */
  private updatePositions(): void {
    this.nodes.forEach((node) => {
      // Apply velocity with damping
      node.vx *= this.damping;
      node.vy *= this.damping;
      node.vz *= this.damping;

      // Update position
      node.x += node.vx * 0.1;
      node.y += node.vy * 0.1;
      node.z += node.vz * 0.1;

      // Keep nodes within reasonable bounds
      const maxBound = 20;
      node.x = Math.max(-maxBound, Math.min(maxBound, node.x));
      node.y = Math.max(-maxBound, Math.min(maxBound, node.y));
      node.z = Math.max(-maxBound, Math.min(maxBound, node.z));
    });
  }

  /**
   * Get updated node positions
   */
  tick(): GraphNode[] {
    // Return nodes with updated positions
    return this.nodes.map((node3d) => ({
      ...node3d.node,
      position: {
        x: node3d.x,
        y: node3d.y,
        z: node3d.z,
      },
    }));
  }

  /**
   * Get current positions from simulation
   */
  getPositions(): Map<string, { x: number; y: number; z: number }> {
    const positions = new Map();
    this.nodeMap.forEach((node3d) => {
      positions.set(node3d.id, {
        x: node3d.x,
        y: node3d.y,
        z: node3d.z,
      });
    });
    return positions;
  }

  /**
   * Pin a node (fix its position)
   */
  pinNode(nodeId: string, position?: { x: number; y: number; z: number }): void {
    const node3d = this.nodeMap.get(nodeId);
    if (node3d) {
      if (position) {
        node3d.x = position.x;
        node3d.y = position.y;
        node3d.z = position.z;
      }
      node3d.vx = 0;
      node3d.vy = 0;
      node3d.vz = 0;
    }
  }

  /**
   * Unpin a node (allow it to move)
   */
  unpinNode(_nodeId: string): void {
    // Nodes are unpinned by default in this implementation
  }

  /**
   * Update nodes and edges
   */
  update(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.edges = edges;

    // Update existing nodes or add new ones
    const existingIds = new Set(this.nodeMap.keys());
    const newIds = new Set(nodes.map((n) => n.id));

    nodes.forEach((node) => {
      const existing = this.nodeMap.get(node.id);
      if (existing) {
        // Update existing node reference but keep current position if it's been moved
        existing.node = node;
        // Only update position if it hasn't changed much (to preserve layout)
        const dx = Math.abs(existing.x - node.position.x);
        const dy = Math.abs(existing.y - node.position.y);
        const dz = Math.abs(existing.z - node.position.z);
        if (dx > 1 || dy > 1 || dz > 1) {
          existing.x = node.position.x;
          existing.y = node.position.y;
          existing.z = node.position.z;
        }
      } else {
        // Add new node
        const node3d: Node3D = {
          id: node.id,
          x: node.position.x,
          y: node.position.y,
          z: node.position.z,
          vx: 0,
          vy: 0,
          vz: 0,
          node,
        };
        this.nodes.push(node3d);
        this.nodeMap.set(node.id, node3d);
      }
    });

    // Remove nodes that no longer exist
    existingIds.forEach((id) => {
      if (!newIds.has(id)) {
        const index = this.nodes.findIndex((n) => n.id === id);
        if (index !== -1) {
          this.nodes.splice(index, 1);
        }
        this.nodeMap.delete(id);
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    this.nodeMap.clear();
    this.nodes = [];
  }
}
