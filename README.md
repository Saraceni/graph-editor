# Interactive 3D Graph Editor

This project is an app that allows a user visually manage a graph — adding/removing nodes and edges, searching for nodes,
and saving/loading the graph for later use.

## Description

Create, edit and remove nodes and edges. Search for nodes and edges. Support for directed and wighted graphs. Run pathfinding algorithms and visualise all the nodes and edges trasversed and the path for node and source destination. Configure how your editor looks: change colors of nodes, edges and labels and edge thickness.

## Getting started

### Dependencies
This projects relies on [React 19](https://react.dev/blog/2024/12/05/react-19), [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/), [Shadcn](https://ui.shadcn.com/) and [Three.js](https://threejs.org/) for it's core functionality.


### Installing

#### Frontend
For installing the frontend dependencies, first you need to enter the frontend folder from the root of the project:

```
cd frontend
```

Once you are on the frontend project you can run:

```
npm install
```

After the installation succeds you can run the project:

```
npm run dev
```

## Graph Representation Rationale
In order to represent the graph structure, instead of using an Adjacency List or an Adjacency Matrix, I decided to use an hybrid model consisting of
a Node List (or array/map of node objects) and an Edge List (or array/map of edge objects).

```
const graphState = {
  nodes: [
    { id: 'n1', label: 'Node A', position: { x: 100, y: 100, z: 100 } },
    // ...
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2' },
    // ...
  ]
};
```

### Why Node/Edge Lists are Excellent for the UI/Frontend?
**UI Integration:** The core idea is building a Single-Page Web Application (SPA) that lets users visually manage the graph. Frontend visualization libraries (like React Flow or D3.js) are almost universally optimized to consume data in this format: a separate list of objects for nodes and edges.

**Storing Metadata:** This structure allows you to easily attach rich metadata essential for the UI, which a standard Adjacency Matrix or pure Adjacency List cannot store as neatly:

* **Node Object:** Stores visual coordinates (e.g., _position: {x, y}_), labels, and potentially UI state (e.g., isSelected).

* **Edge Object:** Stores visual characteristics or weights (if using weighted graphs).

**Simplicity for CRUD (Create, Read, Update, Delete):** Adding/removing a node or edge simply means pushing/splicing an object in one of two flat arrays, which is simple for state management libraries (like Redux or Zustand) to track.

### Trade-offs of the data structure
While the Node/Edge List is great for the UI, it's often inefficient for pure algorithm execution (like pathfinding, traversals, or cycle detection).

For future implementation, when a user runs a graph algorithm (like BFS or Dijkstra's), it could be pre-processed or derived a classical Adjacency List to ensure the algorithm runs with the most efficient _O(|V| + |E|)_ complexity.