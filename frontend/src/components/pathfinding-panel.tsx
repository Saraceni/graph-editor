import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { setPathfindingResult, clearPathfindingResult } from '@/lib/redux/slices/graphSlice';
import { dijkstra, bfs, dfsPath } from '@/lib/pathfinding';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Navigation } from 'lucide-react';

type Algorithm = 'dijkstra' | 'bfs' | 'dfs';

export function PathfindingPanel() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(state => state.graph.nodes);
  const graphState = useAppSelector(state => state.graph);
  const pathResult = useAppSelector(state => state.graph.pathfindingResult);

  const [startNode, setStartNode] = useState('');
  const [endNode, setEndNode] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('dijkstra');
  const [error, setError] = useState<string | null>(null);

  const handleFindPath = () => {
    setError(null);

    if (!startNode || !endNode) {
      setError('Please select both start and end nodes');
      return;
    }

    if (startNode === endNode) {
      setError('Start and end nodes must be different');
      return;
    }

    let result: any = null;

    if (algorithm === 'dijkstra') {
      result = dijkstra(graphState.nodes, graphState.edges, startNode, endNode);
    } else if (algorithm === 'bfs') {
      result = bfs(graphState.nodes, graphState.edges, startNode, endNode);
    } else if (algorithm === 'dfs') {
      result = dfsPath(graphState.nodes, graphState.edges, startNode, endNode);
    }

    if (result && result.path) {
      dispatch(setPathfindingResult(result));
    } else {
      setError('No path found between these nodes');
      dispatch(clearPathfindingResult());
    }
  };

  const handleClear = () => {
    dispatch(clearPathfindingResult());
    setError(null);
  };

  const resultPath = pathResult?.path.map(id => nodes.find(n => n.id === id)?.label).join(' → ');

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Navigation className="w-4 h-4" />
        Pathfinding
      </h2>
      <div className="flex-1 flex flex-col gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Algorithm</label>
            <Select value={algorithm} onValueChange={setAlgorithm as any}>
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

          <div className="flex gap-2">
            <Button onClick={handleFindPath} className="flex-1">
              Find Path
            </Button>
            <Button onClick={handleClear} variant="outline">
              Clear
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex gap-2 items-start p-2 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {pathResult && (
          <div className="bg-primary/10 border border-primary rounded p-3 space-y-2">
            <div className="text-xs font-semibold text-primary">Path Found</div>
            <div className="text-sm font-mono wrap-break-word max-h-[200px] overflow-y-auto">
              {resultPath}
            </div>
            <div className="text-xs text-muted-foreground">
              Distance: {pathResult.distance}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
