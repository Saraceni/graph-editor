import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { addNode, removeNode, selectNode } from '@/lib/redux/slices/graphSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Shuffle } from 'lucide-react';

export function NodePanel() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(state => state.graph.nodes);
  const selectedNode = useAppSelector(state => state.graph.selectedNode);
  const [nodeName, setNodeName] = useState('');
  const [position, setPosition] = useState({ x: '0', y: '0', z: '0' });

  const generateRandomPosition = () => {
    setPosition({
      x: ((Math.random() - 0.5) * 10).toFixed(2),
      y: ((Math.random() - 0.5) * 10).toFixed(2),
      z: ((Math.random() - 0.5) * 10).toFixed(2),
    });
  };

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
            x: parseFloat(position.x) || 0,
            y: parseFloat(position.y) || 0,
            z: parseFloat(position.z) || 0,
          },
        })
      );
      setNodeName('');
      setPosition({ x: '0', y: '0', z: '0' });
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    dispatch(removeNode(nodeId));
  };

  const handleSelectNode = (nodeId: string) => {
    dispatch(selectNode(nodeId));
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-lg font-semibold mb-4">Nodes</h2>
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
        <div className="space-y-3 shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Node label..."
              value={nodeName}
              onChange={e => setNodeName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddNode()}
            />
            <Button
              onClick={handleAddNode}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Position (x, y, z)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateRandomPosition}
                className="gap-1 h-7"
              >
                <Shuffle className="w-3 h-3" />
                Random
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="X"
                value={position.x}
                onChange={e => setPosition({ ...position, x: e.target.value })}
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Y"
                value={position.y}
                onChange={e => setPosition({ ...position, y: e.target.value })}
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Z"
                value={position.z}
                onChange={e => setPosition({ ...position, z: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
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
      </div>
    </div>
  );
}
