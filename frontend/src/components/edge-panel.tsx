import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { addEdge, removeEdge, selectEdge } from '@/lib/redux/slices/graphSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

export function EdgePanel() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(state => state.graph.nodes);
  const edges = useAppSelector(state => state.graph.edges);
  const selectedEdge = useAppSelector(state => state.graph.selectedEdge);

  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const [weight, setWeight] = useState('1');
  const [isDirected, setIsDirected] = useState(true);

  const handleAddEdge = () => {
    if (!sourceNode || !targetNode) {
      toast.error('Please select both source and target nodes');
      return;
    }

    if (sourceNode === targetNode) {
      toast.error('Source and target nodes must be different');
      return;
    }

    const edgeExists = edges.some(
      e => e.source === sourceNode && e.target === targetNode
    );
    if (edgeExists) {
      toast.error('Edge between these nodes already exists');
      return;
    }

    const newEdgeId = `e${Date.now()}`;
    dispatch(
      addEdge({
        id: newEdgeId,
        source: sourceNode,
        target: targetNode,
        weight: weight ? parseInt(weight) : undefined,
        isDirected,
      })
    );

    setSourceNode('');
    setTargetNode('');
    setWeight('1');
  };

  const handleRemoveEdge = (edgeId: string) => {
    dispatch(removeEdge(edgeId));
  };

  const handleSelectEdge = (edgeId: string) => {
    dispatch(selectEdge(edgeId));
  };

  const handleSwapDirection = () => {
    const temp = sourceNode;
    setSourceNode(targetNode);
    setTargetNode(temp);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-lg font-semibold mb-4">Edges</h2>
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
        {/* Add new edge */}
        <div className="space-y-3 border-b pb-4 shrink-0">
          <h3 className="text-sm font-semibold">Add Edge</h3>
          <div className="space-y-3">
            <div className="flex gap-2 items-center w-full">
              <div className="flex-1 min-w-0">
                <Select value={sourceNode} onValueChange={setSourceNode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Source node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isDirected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwapDirection}
                  className="shrink-0"
                  title="Swap direction"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <Select value={targetNode} onValueChange={setTargetNode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Target node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="add-weight" className="text-sm font-medium">
                Weight (optional)
              </label>
              <div className="flex gap-2">
                <Input
                  id="add-weight"
                  type="number"
                  placeholder="Enter weight"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddEdge} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="directed"
                checked={isDirected}
                onCheckedChange={setIsDirected as any}
              />
              <label htmlFor="directed" className="text-sm font-medium cursor-pointer">
                Directed Edge
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {edges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No edges yet</p>
          ) : (
            edges.map(edge => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              return (
                <div
                  key={edge.id}
                  className={`flex items-center justify-between p-2 rounded border cursor-pointer transition ${
                    selectedEdge === edge.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-border hover:bg-muted'
                  }`}
                  onClick={() => handleSelectEdge(edge.id)}
                >
                  <span className="text-xs font-medium">
                    {source?.label} {edge.isDirected ? '→' : '↔'} {target?.label}
                    {edge.weight && ` (${edge.weight})`}
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveEdge(edge.id);
                    }}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
