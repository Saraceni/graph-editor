import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { setPathfindingResult, clearPathfindingResult, setCycleResult, clearCycleResult, toggleCycleSelection, selectAllCycles, deselectAllCycles } from '@/lib/redux/slices/graphSlice';
import { dijkstra, bfs, dfsPath, findCycles } from '@/lib/pathfinding';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Waypoints } from 'lucide-react';

type AlgorithmMode = 'shortest-path' | 'cycle-detection';
type PathAlgorithm = 'dijkstra' | 'bfs' | 'dfs';

export function PathfindingPanel() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(state => state.graph.nodes);
  const graphState = useAppSelector(state => state.graph);
  const pathResult = useAppSelector(state => state.graph.pathfindingResult);
  const cycleResult = useAppSelector(state => state.graph.cycleResult);

  const [mode, setMode] = useState<AlgorithmMode>('shortest-path');
  const [startNode, setStartNode] = useState('');
  const [endNode, setEndNode] = useState('');
  const [pathAlgorithm, setPathAlgorithm] = useState<PathAlgorithm>('dijkstra');
  const [error, setError] = useState<string | null>(null);

  const handleRunAlgorithm = () => {
    setError(null);

    if (mode === 'shortest-path') {
      if (!startNode || !endNode) {
        setError('Please select both start and end nodes');
        return;
      }

      if (startNode === endNode) {
        setError('Start and end nodes must be different');
        return;
      }

      let result: any = null;

      if (pathAlgorithm === 'dijkstra') {
        result = dijkstra(graphState.nodes, graphState.edges, startNode, endNode);
      } else if (pathAlgorithm === 'bfs') {
        result = bfs(graphState.nodes, graphState.edges, startNode, endNode);
      } else if (pathAlgorithm === 'dfs') {
        result = dfsPath(graphState.nodes, graphState.edges, startNode, endNode);
      }

      if (result && result.path) {
        dispatch(setPathfindingResult(result));
        dispatch(clearCycleResult());
      } else {
        setError('No path found between these nodes');
        dispatch(clearPathfindingResult());
      }
    } else if (mode === 'cycle-detection') {
      // Check if graph has directed edges
      const hasDirectedEdges = graphState.edges.some(e => e.isDirected);
      if (!hasDirectedEdges) {
        setError('Cycle detection requires at least one directed edge');
        return;
      }

      const result = findCycles(graphState.nodes, graphState.edges);
      dispatch(setCycleResult(result));
      dispatch(clearPathfindingResult());
    }
  };

  const handleClear = () => {
    dispatch(clearPathfindingResult());
    dispatch(clearCycleResult());
    setError(null);
  };

  const resultPath = pathResult?.path.map(id => nodes.find(n => n.id === id)?.label).join(' → ');

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Waypoints className="w-4 h-4" />
        Graph Algorithms
      </h2>
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="space-y-3 shrink-0">
          <div>
            <label className="text-sm font-medium">Algorithm Mode</label>
            <Select value={mode} onValueChange={(value) => {
              setMode(value as AlgorithmMode);
              dispatch(clearPathfindingResult());
              dispatch(clearCycleResult());
              setError(null);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shortest-path">Shortest Path</SelectItem>
                <SelectItem value="cycle-detection">Cycle Detection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'shortest-path' && (
            <>
              <div>
                <label className="text-sm font-medium">Path Algorithm</label>
                <Select value={pathAlgorithm} onValueChange={setPathAlgorithm as any}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dijkstra">Dijkstra (Weighted)</SelectItem>
                    <SelectItem value="bfs">BFS (Unweighted)</SelectItem>
                    <SelectItem value="dfs">DFS (Connectivity)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={startNode} onValueChange={setStartNode}>
                <SelectTrigger>
                  <SelectValue placeholder="Start node" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={endNode} onValueChange={setEndNode}>
                <SelectTrigger>
                  <SelectValue placeholder="End node" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <div className="flex gap-2">
            <Button onClick={handleRunAlgorithm} className="flex-1">
              {mode === 'shortest-path' ? 'Find Path' : 'Detect Cycles'}
            </Button>
            <Button onClick={handleClear} variant="outline">
              Clear
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {error && (
            <div className="flex gap-2 items-start p-2 bg-destructive/10 border border-destructive rounded text-sm text-destructive shrink-0">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {pathResult && (
            <div className="bg-primary/10 border border-primary rounded p-3 space-y-2 shrink-0">
              <div className="text-xs font-semibold text-primary">Path Found</div>
              <div className="text-sm font-mono wrap-break-word">
                {resultPath}
              </div>
              <div className="text-xs text-muted-foreground">
                Distance: {pathResult.distance}
              </div>
            </div>
          )}

          {cycleResult && cycleResult.cycles.length > 0 && (
            <div className="bg-primary/10 border border-primary rounded p-3 space-y-2 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-primary">Detected Cycles</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch(selectAllCycles())}
                    className="h-6 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch(deselectAllCycles())}
                    className="h-6 text-xs"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Found {cycleResult.cycles.length} cycle{cycleResult.cycles.length !== 1 ? 's' : ''}
                {cycleResult.selectedCycles.length > 0 && (
                  <span className="text-primary">
                    {' '}({cycleResult.selectedCycles.length} selected)
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cycleResult.cycles.map((cycle, index) => {
                  const isSelected = cycleResult.selectedCycles.includes(index);
                  const cycleColors = [
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
                  const color = cycleColors[index % cycleColors.length];
                  
                  return (
                    <div 
                      key={index} 
                      className={`text-sm p-2 bg-background rounded border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary border-2' : ''
                      }`}
                      onClick={() => dispatch(toggleCycleSelection(index))}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => dispatch(toggleCycleSelection(index))}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="w-3 h-3 rounded border border-gray-300" 
                              style={{ backgroundColor: isSelected ? color : '#9ca3af' }}
                            />
                            <div className="font-semibold">
                              Cycle {index + 1} ({cycle.length} node{cycle.length !== 1 ? 's' : ''})
                            </div>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {cycle.map((id, idx) => {
                              const node = nodes.find(n => n.id === id);
                              return (
                                <span key={id}>
                                  {node?.label || id}
                                  {idx < cycle.length - 1 ? ' → ' : ''}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {cycleResult && cycleResult.cycles.length === 0 && (
            <div className="bg-muted/50 border border-muted rounded p-3 text-sm text-muted-foreground">
              No cycles detected in the graph.
            </div>
          )}

          {/* Color Legend */}
          <div className="border rounded p-3 space-y-2 shrink-0">
            <div className="text-xs font-semibold">Color Legend</div>
            {cycleResult && !pathResult && cycleResult.selectedCycles.length > 0 ? (
              // Cycle-specific color legend
              <div className="space-y-1.5 text-xs">
                <div className="text-xs text-muted-foreground mb-2">
                  Selected cycles are highlighted with distinct colors.
                </div>
                {cycleResult.selectedCycles.map((cycleIndex) => {
                  const cycle = cycleResult.cycles[cycleIndex];
                  const cycleColors = [
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
                  const color = cycleColors[cycleIndex % cycleColors.length];
                  return (
                    <div key={cycleIndex} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: color }} />
                      <span>Cycle {cycleIndex + 1} ({cycle.length} node{cycle.length !== 1 ? 's' : ''})</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                  <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#3b82f6' }} />
                  <span>Selected node/edge</span>
                </div>
              </div>
            ) : (
              // Pathfinding color legend
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#10b981' }} />
                  <span>Start node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#ef4444' }} />
                  <span>End node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#f59e0b' }} />
                  <span>Path node/edge</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#60a5fa' }} />
                  <span>Node/edge traversed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#9ca3af' }} />
                  <span>Node not traversed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#d4d4d4' }} />
                  <span>Edge not traversed</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
