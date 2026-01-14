import { useState, useEffect } from "react";
import { useTradingStore } from "../store/tradingStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";
import { 
  Save, 
  RefreshCw,
  AlertTriangle,
  Settings as SettingsIcon,
  Clock,
  Shield,
  Zap
} from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const { config, updateConfig, strategyState, isLoading } = useTradingStore();
  
  const [localConfig, setLocalConfig] = useState({
    lot_size: 1,
    adjustment_zone: 50,
    strike_distance: 200,
    max_daily_loss: '',
    max_trades_per_day: '',
    entry_time: "09:20",
    exit_time: "15:15",
    no_entry_after: "15:00",
    trading_mode: "paper"
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalConfig({
      ...config,
      max_daily_loss: config.max_daily_loss || '',
      max_trades_per_day: config.max_trades_per_day || ''
    });
  }, [config]);

  const handleChange = (field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configToSave = {
        ...localConfig,
        lot_size: parseInt(localConfig.lot_size) || 1,
        adjustment_zone: parseInt(localConfig.adjustment_zone) || 50,
        strike_distance: parseInt(localConfig.strike_distance) || 200,
        max_daily_loss: localConfig.max_daily_loss ? parseFloat(localConfig.max_daily_loss) : null,
        max_trades_per_day: localConfig.max_trades_per_day ? parseInt(localConfig.max_trades_per_day) : null
      };
      
      await updateConfig(configToSave);
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const isStrategyActive = strategyState.is_active;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your trading strategy parameters
        </p>
      </div>

      {/* Warning if strategy is active */}
      {isStrategyActive && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-500">Strategy is Active</p>
            <p className="text-sm text-muted-foreground">
              Some settings cannot be changed while the strategy is running. Stop the strategy first to modify these settings.
            </p>
          </div>
        </div>
      )}

      {/* Position Sizing */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Position Sizing</CardTitle>
          </div>
          <CardDescription>
            Configure lot size and strike distances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lot_size">Lot Size</Label>
              <Input
                id="lot_size"
                data-testid="lot-size-input"
                type="number"
                min={1}
                max={100}
                value={localConfig.lot_size}
                onChange={(e) => handleChange('lot_size', e.target.value)}
                disabled={isStrategyActive}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                1 lot = 25 units (NIFTY)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strike_distance">Strike Distance (pts)</Label>
              <Input
                id="strike_distance"
                data-testid="strike-distance-input"
                type="number"
                min={50}
                max={500}
                step={50}
                value={localConfig.strike_distance}
                onChange={(e) => handleChange('strike_distance', e.target.value)}
                disabled={isStrategyActive}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Distance from ATM for initial CE/PE
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment_zone">Adjustment Zone (pts)</Label>
              <Input
                id="adjustment_zone"
                data-testid="adjustment-zone-input"
                type="number"
                min={10}
                max={200}
                step={10}
                value={localConfig.adjustment_zone}
                onChange={(e) => handleChange('adjustment_zone', e.target.value)}
                disabled={isStrategyActive}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Trigger adjustment when spot approaches strike
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Risk Management</CardTitle>
          </div>
          <CardDescription>
            Set loss limits and trade restrictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max_daily_loss">Max Daily Loss (₹)</Label>
              <Input
                id="max_daily_loss"
                data-testid="max-daily-loss-input"
                type="number"
                min={0}
                placeholder="Optional"
                value={localConfig.max_daily_loss}
                onChange={(e) => handleChange('max_daily_loss', e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Auto-exit all positions if loss exceeds this
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_trades_per_day">Max Trades Per Day</Label>
              <Input
                id="max_trades_per_day"
                data-testid="max-trades-input"
                type="number"
                min={0}
                placeholder="Optional (unlimited)"
                value={localConfig.max_trades_per_day}
                onChange={(e) => handleChange('max_trades_per_day', e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for unlimited trades
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Schedule */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Trading Schedule</CardTitle>
          </div>
          <CardDescription>
            Set entry and exit timings (IST)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="entry_time">Entry Time</Label>
              <Input
                id="entry_time"
                data-testid="entry-time-input"
                type="time"
                value={localConfig.entry_time}
                onChange={(e) => handleChange('entry_time', e.target.value)}
                disabled={isStrategyActive}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Start trading after market stabilizes
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="no_entry_after">No Entry After</Label>
              <Input
                id="no_entry_after"
                data-testid="no-entry-after-input"
                type="time"
                value={localConfig.no_entry_after}
                onChange={(e) => handleChange('no_entry_after', e.target.value)}
                disabled={isStrategyActive}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                No new positions after this time
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_time">Exit Time</Label>
              <Input
                id="exit_time"
                data-testid="exit-time-input"
                type="time"
                value={localConfig.exit_time}
                onChange={(e) => handleChange('exit_time', e.target.value)}
                disabled={isStrategyActive}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Auto-exit all positions at this time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Mode */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Trading Mode</CardTitle>
          </div>
          <CardDescription>
            Switch between paper trading and live trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Trading Mode</span>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    localConfig.trading_mode === 'paper' 
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  )}
                >
                  {localConfig.trading_mode === 'paper' ? 'Paper' : 'Live'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {localConfig.trading_mode === 'paper' 
                  ? "Simulated trading - no real money at risk"
                  : "Real trading with Zerodha - requires authentication"
                }
              </p>
            </div>
            <Switch
              data-testid="trading-mode-switch"
              checked={localConfig.trading_mode === 'live'}
              onCheckedChange={(checked) => handleChange('trading_mode', checked ? 'live' : 'paper')}
              disabled={isStrategyActive || true} // Disabled for now - live trading coming soon
            />
          </div>
          
          <p className="text-xs text-muted-foreground mt-3">
            Live trading requires Zerodha Kite Connect authentication. Coming soon.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setLocalConfig({
            ...config,
            max_daily_loss: config.max_daily_loss || '',
            max_trades_per_day: config.max_trades_per_day || ''
          })}
        >
          Reset
        </Button>
        <Button
          data-testid="save-settings-btn"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="bg-primary hover:bg-primary/90"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
