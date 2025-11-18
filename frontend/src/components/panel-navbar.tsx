import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { CircleDot, Network, Search, Edit, Settings, Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';

type PanelType = 'nodes' | 'edges' | 'search' | 'graph-algorithms' | 'edit' | 'settings';

interface PanelNavbarProps {
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
}

export function PanelNavbar({ activePanel, onPanelChange }: PanelNavbarProps) {
  const panels: { id: PanelType; icon: ReactNode; label: string }[] = [
    { id: 'nodes', icon: <CircleDot className="w-4 h-4" />, label: 'Nodes' },
    { id: 'edges', icon: <Network className="w-4 h-4" />, label: 'Edges' },
    { id: 'search', icon: <Search className="w-4 h-4" />, label: 'Search' },
    { id: 'graph-algorithms', icon: <Waypoints className="w-4 h-4" />, label: 'Graph Algorithms' },
    { id: 'edit', icon: <Edit className="w-4 h-4" />, label: 'Edit' },
    { id: 'settings', icon: <Settings className="w-4 h-4" />, label: 'Settings' },
  ];

  return (
    <Sidebar side="left" collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {panels.map(panel => (
              <SidebarMenuItem key={panel.id}>
                <SidebarMenuButton
                  isActive={activePanel === panel.id}
                  onClick={() => onPanelChange(panel.id)}
                  tooltip={panel.label}
                >
                  {panel.icon}
                  <span>{panel.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

