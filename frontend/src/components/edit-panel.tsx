import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { updateNode, updateEdge, removeNode, removeEdge, selectNode, selectEdge } from '@/lib/redux/slices/graphSlice';
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
import { ArrowLeftRight, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function EditPanel() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(state => state.graph.nodes);
  const edges = useAppSelector(state => state.graph.edges);
  const selectedNode = useAppSelector(state => state.graph.selectedNode);
  const selectedEdge = useAppSelector(state => state.graph.selectedEdge);

  // Node editing state
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodePosition, setNodePosition] = useState({ x: '0', y: '0', z: '0' });

  // Edge editing state
  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const [weight, setWeight] = useState('');
  const [isDirected, setIsDirected] = useState(true);

  // Sync node form when node selection changes (not when nodes array changes)
  useEffect(() => {
    if (selectedNode) {
      const node = nodes.find(n => n.id === selectedNode);
      if (node) {
        setNodeLabel(node.label);
        setNodePosition({
          x: node.position.x.toString(),
          y: node.position.y.toString(),
          z: node.position.z.toString(),
        });
      }
    } else {
      setNodeLabel('');
      setNodePosition({ x: '0', y: '0', z: '0' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  // Sync edge form when edge selection changes (not when edges array changes)
  useEffect(() => {
    if (selectedEdge) {
      const edge = edges.find(e => e.id === selectedEdge);
      if (edge) {
        setSourceNode(edge.source);
        setTargetNode(edge.target);
        setWeight(edge.weight?.toString() || '');
        setIsDirected(edge.isDirected);
      }
    } else {
      setSourceNode('');
      setTargetNode('');
      setWeight('');
      setIsDirected(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEdge]);

  const currentNode = nodes.find(n => n.id === selectedNode);
  const currentEdge = edges.find(e => e.id === selectedEdge);

  const handleUpdateNode = () => {
    if (!currentNode) return;

    if (!nodeLabel.trim()) {
      toast.error('Node label cannot be empty');
      return;
    }

    const existingNode = nodes.find(
      n => n.id !== currentNode.id && n.label.toLowerCase() === nodeLabel.toLowerCase()
    );
    if (existingNode) {
      toast.error('Node with this label already exists');
      return;
    }

    dispatch(
      updateNode({
        ...currentNode,
        label: nodeLabel.trim(),
        position: {
          x: parseFloat(nodePosition.x) || 0,
          y: parseFloat(nodePosition.y) || 0,
          z: parseFloat(nodePosition.z) || 0,
        },
      })
    );
    toast.success('Node updated successfully');
  };

  const handleUpdateEdge = () => {
    if (!currentEdge) return;

    if (sourceNode === targetNode) {
      toast.error('Source and target nodes must be different');
      return;
    }

    const edgeExists = edges.some(
      e => e.id !== currentEdge.id && e.source === sourceNode && e.target === targetNode
    );
    if (edgeExists) {
      toast.error('Edge between these nodes already exists');
      return;
    }

    dispatch(
      updateEdge({
        ...currentEdge,
        source: sourceNode,
        target: targetNode,
        weight: weight ? parseInt(weight) : undefined,
        isDirected,
      })
    );
    toast.success('Edge updated successfully');
  };

  const handleSwapDirection = () => {
    const temp = sourceNode;
    setSourceNode(targetNode);
    setTargetNode(temp);
  };

  const handleDeleteNode = () => {
    if (!currentNode) return;
    dispatch(removeNode(currentNode.id));
    dispatch(selectNode(null));
    toast.success('Node deleted successfully');
  };

  const handleDeleteEdge = () => {
    if (!currentEdge) return;
    dispatch(removeEdge(currentEdge.id));
    dispatch(selectEdge(null));
    toast.success('Edge deleted successfully');
  };

  const handleDeselect = () => {
    if (currentNode) {
      dispatch(selectNode(null));
    } else if (currentEdge) {
      dispatch(selectEdge(null));
    }
  };

  if (!currentNode && !currentEdge) {
    return (
      <div className="h-full flex flex-col p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Edit
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select a node or edge to edit
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Edit {currentNode ? 'Node' : 'Edge'}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeselect}
          className="h-6 px-2 text-xs"
        >
          Cancel
        </Button>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {currentNode ? (
          // Node editing form
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="node-label" className="text-sm font-medium">
                Node Label
              </label>
              <Input
                id="node-label"
                placeholder="Enter node label"
                value={nodeLabel}
                onChange={e => setNodeLabel(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleUpdateNode()}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Position (x, y, z)</label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="X"
                  value={nodePosition.x}
                  onChange={e => setNodePosition({ ...nodePosition, x: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Y"
                  value={nodePosition.y}
                  onChange={e => setNodePosition({ ...nodePosition, y: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Z"
                  value={nodePosition.z}
                  onChange={e => setNodePosition({ ...nodePosition, z: e.target.value })}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>ID: {currentNode.id}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpdateNode} className="flex-1">
                Update Node
              </Button>
              <Button
                onClick={handleDeleteNode}
                variant="destructive"
                className="shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : currentEdge ? (
          // Edge editing form
          <div className="space-y-4">
            <div className="flex gap-2 items-center w-full">
              <div className="flex-1 min-w-0 space-y-1.5">
                <label className="text-sm font-medium">Source Node</label>
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
                <div className="pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwapDirection}
                    className="shrink-0"
                    title="Swap direction"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <label className="text-sm font-medium">Target Node</label>
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
              <label htmlFor="edit-weight" className="text-sm font-medium">
                Weight (optional)
              </label>
              <Input
                id="edit-weight"
                type="number"
                placeholder="Enter weight"
                value={weight}
                onChange={e => setWeight(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-directed"
                checked={isDirected}
                onCheckedChange={setIsDirected as any}
              />
              <label htmlFor="edit-directed" className="text-sm font-medium cursor-pointer">
                Directed Edge
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpdateEdge} className="flex-1">
                Update Edge
              </Button>
              <Button
                onClick={handleDeleteEdge}
                variant="destructive"
                className="shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

