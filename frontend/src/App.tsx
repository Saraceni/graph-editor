import React, { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from '@/lib/redux/store';
import { setGraphState, resetGraph } from '@/lib/redux/slices/graphSlice';
import { saveGraphToStorage, loadGraphFromStorage, clearGraphStorage, exportGraphAsJSON, importGraphFromJSON } from '@/lib/storage';
import { GraphCanvas } from '@/components/graph-canvas';
import { NodePanel } from '@/components/node-panel';
import { EdgePanel } from '@/components/edge-panel';
import { PathfindingPanel } from '@/components/pathfinding-panel';
import { SearchPanel } from '@/components/search-panel';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2 } from 'lucide-react';

function GraphAppContent() {
  const dispatch = useDispatch();
  const graphState = useSelector((state: any) => state.graph);
  const [isMounted, setIsMounted] = useState(false);

  // Load graph from storage on mount
  useEffect(() => {
    const savedGraph = loadGraphFromStorage();
    if (savedGraph) {
      dispatch(setGraphState(savedGraph));
    }
    setIsMounted(true);
  }, [dispatch]);

  // Auto-save to localStorage whenever graph changes
  useEffect(() => {
    if (isMounted) {
      saveGraphToStorage(graphState);
    }
  }, [graphState, isMounted]);

  const handleExport = () => {
    const json = exportGraphAsJSON(graphState);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const content = event.target.result;
          const importedGraph = importGraphFromJSON(content);
          if (importedGraph) {
            dispatch(setGraphState(importedGraph));
          } else {
            alert('Failed to import graph. Invalid JSON format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire graph?')) {
      dispatch(resetGraph());
      clearGraphStorage();
    }
  };

  if (!isMounted) {
    return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Graph Visualizer</h1>
            <p className="text-xs text-muted-foreground">
              Nodes: {graphState.nodes.length} | Edges: {graphState.edges.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImport}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClear}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>
        <div className="flex-1 bg-background">
          <GraphCanvas />
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-80 bg-card border-l border-border flex flex-col gap-4 p-4 overflow-y-auto">
        <NodePanel />
        <EdgePanel />
        <SearchPanel />
        <PathfindingPanel />
      </div>
    </div>
  );
}

export default function RootPage() {
  return (
    <Provider store={store}>
      <GraphAppContent />
    </Provider>
  );
}