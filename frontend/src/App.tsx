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
import { SettingsPanel } from '@/components/settings-panel';
import { PanelNavbar } from '@/components/panel-navbar';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2, FileText } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';

type PanelType = 'nodes' | 'edges' | 'search' | 'graph-algorithms' | 'edit' | 'settings';

type AlgorithmMode = 'shortest-path' | 'cycle-detection';
type PathAlgorithm = 'dijkstra' | 'bfs' | 'astar';

interface PathfindingPanelState {
  mode: AlgorithmMode;
  startNode: string;
  endNode: string;
  pathAlgorithm: PathAlgorithm;
  error: string | null;
}

function GraphAppContent({ 
  activePanel, 
  setActivePanel,
  pathfindingState,
  setPathfindingState
}: { 
  activePanel: PanelType;
  setActivePanel: (panel: PanelType) => void;
  pathfindingState: PathfindingPanelState;
  setPathfindingState: (state: PathfindingPanelState | ((prev: PathfindingPanelState) => PathfindingPanelState)) => void;
}) {
  const dispatch = useDispatch();
  const graphState = useSelector((state: any) => state.graph);
  const selectedNode = useSelector((state: any) => state.graph.selectedNode);
  const selectedEdge = useSelector((state: any) => state.graph.selectedEdge);
  const [isMounted, setIsMounted] = useState(false);
  const [sampleSheetOpen, setSampleSheetOpen] = useState(false);

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

  const handleLoadSample = async (sampleName: 'scc' | 'pathfind') => {
    try {
      // Use dynamic import for Vite compatibility
      const sample = sampleName === 'scc' 
        ? await import('@/samples/scc.json')
        : await import('@/samples/pathfind.json');
      
      const importedGraph = importGraphFromJSON(JSON.stringify(sample.default || sample));
      if (importedGraph) {
        dispatch(setGraphState(importedGraph));
        setSampleSheetOpen(false);
      } else {
        alert('Failed to load sample. Invalid JSON format.');
      }
    } catch (error) {
      console.error('Error loading sample:', error);
      alert('Failed to load sample. Please try again.');
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
      case 'graph-algorithms':
        return <PathfindingPanel 
          mode={pathfindingState.mode}
          setMode={(mode) => setPathfindingState(prev => ({ ...prev, mode }))}
          startNode={pathfindingState.startNode}
          setStartNode={(startNode) => setPathfindingState(prev => ({ ...prev, startNode }))}
          endNode={pathfindingState.endNode}
          setEndNode={(endNode) => setPathfindingState(prev => ({ ...prev, endNode }))}
          pathAlgorithm={pathfindingState.pathAlgorithm}
          setPathAlgorithm={(pathAlgorithm) => setPathfindingState(prev => ({ ...prev, pathAlgorithm }))}
          error={pathfindingState.error}
          setError={(error) => setPathfindingState(prev => ({ ...prev, error }))}
        />;
      case 'edit':
        return <EditPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <SearchPanel />;
    }
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Panel Container - Left side */}
      <div className="w-80 bg-card border-r border-border flex shrink-0">
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderPanel()}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
            <Sheet open={sampleSheetOpen} onOpenChange={setSampleSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Load Sample
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Load Sample Graph</SheetTitle>
                  <SheetDescription>
                    Choose a sample graph to load. Each sample is optimized for different use cases.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4 p-4">
                  <Card 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleLoadSample('scc')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">Cycle Detection Sample</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Optimized for testing cycle detection algorithm. 
                          Contains well-defined cycles with multiple nodes per cycle.
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <div>Best for: Cycle Detection</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleLoadSample('pathfind')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">Pathfinding Sample</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Optimized for pathfinding algorithms. Contains more nodes with 
                          less distribution, ideal for testing shortest path algorithms like Dijkstra and BFS.
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <div>Best for: Shortest Path Algorithms</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </SheetContent>
            </Sheet>
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
        <div className="flex-1 bg-background min-w-0 min-h-0 overflow-hidden">
          <GraphCanvas />
        </div>
      </div>
    </div>
  );
}

export default function RootPage() {
  const [activePanel, setActivePanel] = useState<PanelType>('nodes');
  const [pathfindingState, setPathfindingState] = useState<PathfindingPanelState>({
    mode: 'shortest-path',
    startNode: '',
    endNode: '',
    pathAlgorithm: 'astar',
    error: null,
  });
  
  return (
    <Provider store={store}>
      <SidebarProvider>
        <PanelNavbar activePanel={activePanel} onPanelChange={setActivePanel} />
        <SidebarInset className="h-screen overflow-hidden">
          <GraphAppContent 
            activePanel={activePanel} 
            setActivePanel={setActivePanel}
            pathfindingState={pathfindingState}
            setPathfindingState={setPathfindingState}
          />
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </Provider>
  );
}