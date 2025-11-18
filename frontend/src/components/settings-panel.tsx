import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { updateSettings, resetSettings } from '@/lib/redux/slices/graphSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, RotateCcw } from 'lucide-react';

export function SettingsPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.graph.settings);

  const handleSettingChange = (key: keyof typeof settings, value: string | number) => {
    dispatch(updateSettings({ [key]: value }));
  };

  const handleReset = () => {
    if (confirm('Reset all settings to default values?')) {
      dispatch(resetSettings());
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Node Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Nodes
          </h3>
          
          <div className="space-y-2">
            <Label htmlFor="node-color">Node Color</Label>
            <div className="flex gap-2">
              <Input
                id="node-color"
                type="color"
                value={settings.nodeColor}
                onChange={(e) => handleSettingChange('nodeColor', e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.nodeColor}
                onChange={(e) => handleSettingChange('nodeColor', e.target.value)}
                placeholder="#10b981"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-label-color">Node Label Color</Label>
            <div className="flex gap-2">
              <Input
                id="node-label-color"
                type="color"
                value={settings.nodeLabelColor}
                onChange={(e) => handleSettingChange('nodeLabelColor', e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.nodeLabelColor}
                onChange={(e) => handleSettingChange('nodeLabelColor', e.target.value)}
                placeholder="#374151"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Edge Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Edges
          </h3>
          
          <div className="space-y-2">
            <Label htmlFor="edge-color">Edge Color</Label>
            <div className="flex gap-2">
              <Input
                id="edge-color"
                type="color"
                value={settings.edgeColor}
                onChange={(e) => handleSettingChange('edgeColor', e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.edgeColor}
                onChange={(e) => handleSettingChange('edgeColor', e.target.value)}
                placeholder="#6b7280"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edge-label-color">Edge Label Color</Label>
            <div className="flex gap-2">
              <Input
                id="edge-label-color"
                type="color"
                value={settings.edgeLabelColor}
                onChange={(e) => handleSettingChange('edgeLabelColor', e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.edgeLabelColor}
                onChange={(e) => handleSettingChange('edgeLabelColor', e.target.value)}
                placeholder="#374151"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edge-thickness">
              Edge Thickness: {settings.edgeThickness.toFixed(2)}
            </Label>
            <Input
              id="edge-thickness"
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              value={settings.edgeThickness}
              onChange={(e) => handleSettingChange('edgeThickness', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Thin</span>
              <span>Thick</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

