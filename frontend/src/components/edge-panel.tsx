import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { addEdge, removeEdge, updateEdge, selectEdge } from '@/lib/redux/slices/graphSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus } from 'lucide-react';

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
      alert('Please select both source and target nodes');
      return;
    }

    if (sourceNode === targetNode) {
      alert('Source and target nodes must be different');
      return;
    }

    const edgeExists = edges.some(
      e => e.source === sourceNode && e.target === targetNode
    );
    if (edgeExists) {
      alert('Edge between these nodes already exists');
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

  const currentSelectedEdge = edges.find(e => e.id === selectedEdge);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Edges</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="space-y-3">
          <Select value={sourceNode} onValueChange={setSourceNode}>
            <SelectTrigger>
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

          <Select value={targetNode} onValueChange={setTargetNode}>
            <SelectTrigger>
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

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Weight (optional)"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddEdge} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add
            </Button>
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

        <div className="flex-1 overflow-y-auto space-y-2">
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
      </CardContent>
    </Card>
  );
}
