import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { selectNode, selectEdge } from '@/lib/redux/slices/graphSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

type FilterType = 'all' | 'nodes' | 'edges';

export function SearchPanel() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(state => state.graph.nodes);
  const edges = useAppSelector(state => state.graph.edges);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { nodes: [], edges: [] };

    const query = searchQuery.toLowerCase();
    const filteredNodes =
      filterType === 'all' || filterType === 'nodes'
        ? nodes.filter(n => n.label.toLowerCase().includes(query) || n.id.includes(query))
        : [];

    const filteredEdges =
      filterType === 'all' || filterType === 'edges'
        ? edges.filter(e => {
            const sourceName = nodes.find(n => n.id === e.source)?.label.toLowerCase() || '';
            const targetName = nodes.find(n => n.id === e.target)?.label.toLowerCase() || '';
            return (
              sourceName.includes(query) ||
              targetName.includes(query) ||
              e.id.includes(query) ||
              (e.weight && e.weight.toString().includes(query))
            );
          })
        : [];

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [searchQuery, filterType, nodes, edges]);

  const resultCount = searchResults.nodes.length + searchResults.edges.length;

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Search className="w-4 h-4" />
        Search
      </h2>
      <div className="flex-1 flex flex-col gap-4">
        <div className="space-y-3">
          <Input
            placeholder="Search nodes, edges..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="text-sm"
          />

          <div className="flex gap-2 flex-wrap">
            {(['all', 'nodes', 'edges'] as const).map(type => (
              <Button
                key={type}
                size="sm"
                variant={filterType === type ? 'default' : 'outline'}
                onClick={() => setFilterType(type)}
                className="text-xs"
              >
                <Filter className="w-3 h-3 mr-1" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>

          {searchQuery && (
            <div className="text-xs text-muted-foreground">
              {resultCount} result{resultCount !== 1 ? 's' : ''} found
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {searchQuery ? (
            <>
              {searchResults.nodes.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground">Nodes</div>
                  {searchResults.nodes.map(node => (
                    <button
                      key={node.id}
                      onClick={() => dispatch(selectNode(node.id))}
                      className="w-full text-left p-2 rounded bg-secondary border border-border hover:bg-muted transition text-sm font-medium"
                    >
                      {node.label}
                    </button>
                  ))}
                </>
              )}

              {searchResults.edges.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-3">Edges</div>
                  {searchResults.edges.map(edge => {
                    const source = nodes.find(n => n.id === edge.source);
                    const target = nodes.find(n => n.id === edge.target);
                    return (
                      <button
                        key={edge.id}
                        onClick={() => dispatch(selectEdge(edge.id))}
                        className="w-full text-left p-2 rounded bg-secondary border border-border hover:bg-muted transition text-xs font-medium"
                      >
                        {source?.label} {edge.isDirected ? '→' : '↔'} {target?.label}
                        {edge.weight && ` (${edge.weight})`}
                      </button>
                    );
                  })}
                </>
              )}

              {resultCount === 0 && (
                <p className="text-sm text-muted-foreground">No results found</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Enter search terms to find nodes and edges</p>
          )}
        </div>
      </div>
    </div>
  );
}
