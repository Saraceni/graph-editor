import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { addNode, removeNode, updateNode, selectNode } from '@/lib/redux/slices/graphSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

export function NodePanel() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(state => state.graph.nodes);
  const selectedNode = useAppSelector(state => state.graph.selectedNode);
  const [nodeName, setNodeName] = useState('');

  const handleAddNode = () => {
    if (nodeName.trim()) {
      const newNodeId = `node_${Date.now()}`;
      const existingNode = nodes.find(n => n.label.toLowerCase() === nodeName.toLowerCase());

      if (existingNode) {
        alert('Node with this label already exists');
        return;
      }

      dispatch(
        addNode({
          id: newNodeId,
          label: nodeName,
          position: {
            x: Math.random() * 400,
            y: Math.random() * 400,
          },
        })
      );
      setNodeName('');
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    dispatch(removeNode(nodeId));
  };

  const handleSelectNode = (nodeId: string) => {
    dispatch(selectNode(nodeId));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Nodes</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Node label..."
            value={nodeName}
            onChange={e => setNodeName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddNode()}
          />
          <Button
            onClick={handleAddNode}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No nodes yet</p>
          ) : (
            nodes.map(node => (
              <div
                key={node.id}
                className={`flex items-center justify-between p-2 rounded border cursor-pointer transition ${
                  selectedNode === node.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary border-border hover:bg-muted'
                }`}
                onClick={() => handleSelectNode(node.id)}
              >
                <span className="text-sm font-medium">{node.label}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleRemoveNode(node.id);
                  }}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
