import { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from '@/lib/redux/store';
import { setGraphState, resetGraph } from '@/lib/redux/slices/graphSlice';
import { saveGraphToStorage, loadGraphFromStorage, clearGraphStorage, exportGraphAsJSON, importGraphFromJSON } from '@/lib/storage';
import { GraphCanvas } from '@/components/graph-canvas';
import { NodePanel } from '@/components/node-panel';
import { EdgePanel } from '@/components/edge-panel';
import { PathfindingPanel } from '@/components/pathfinding-panel';
import { SearchPanel } from '@/components/search-panel';
import { EditPanel } from '@/components/edit-panel';
import { PanelNavbar } from '@/components/panel-navbar';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2 } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

type PanelType = 'nodes' | 'edges' | 'search' | 'pathfinding' | 'edit';

function GraphAppContent({ activePanel, setActivePanel }: { activePanel: PanelType, setActivePanel: (panel: PanelType) => void }) {
  const dispatch = useDispatch();
  const graphState = useSelector((state: any) => state.graph);
  const selectedNode = useSelector((state: any) => state.graph.selectedNode);
  const selectedEdge = useSelector((state: any) => state.graph.selectedEdge);
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

  // Auto-switch panel when node or edge is selected
  useEffect(() => {
    if (selectedNode || selectedEdge) {
      setActivePanel('edit');
    }
  }, [selectedNode, selectedEdge]);

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

  const renderPanel = () => {
    switch (activePanel) {
      case 'nodes':
        return <NodePanel />;
      case 'edges':
        return <EdgePanel />;
      case 'search':
        return <SearchPanel />;
      case 'pathfinding':
        return <PathfindingPanel />;
      case 'edit':
        return <EditPanel />;
      default:
        return <SearchPanel />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Panel Container - Left side */}
      <div className="w-80 bg-card border-r border-border flex">
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderPanel()}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div className="flex gap-2">
            <SidebarTrigger />
            <div>
              <h1 className="text-lg font-bold">Graph Visualizer</h1>
              <p className="text-xs text-muted-foreground">
                Nodes: {graphState.nodes.length} | Edges: {graphState.edges.length}
              </p>
            </div>
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
    </div>
  );
}

export default function RootPage() {
  const [activePanel, setActivePanel] = useState<PanelType>('nodes');
  return (
    <Provider store={store}>
      <SidebarProvider>
        <PanelNavbar activePanel={activePanel} onPanelChange={setActivePanel} />
        <main className="flex-1">
          <GraphAppContent activePanel={activePanel} setActivePanel={setActivePanel} />
        </main>
      </SidebarProvider>
      <Toaster />
    </Provider>
  );
}