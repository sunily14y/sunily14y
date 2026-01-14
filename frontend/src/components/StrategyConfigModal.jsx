import { useState, useEffect } from "react";
import { useTradingStore } from "../store/tradingStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { Play, Settings, AlertTriangle } from "lucide-react";

const StrategyConfigModal = ({ open, onOpenChange, onStart }) => {
  const { config, updateConfig, spotPrice } = useTradingStore();
  
  const [localConfig, setLocalConfig] = useState({
    lot_size: 1,
    strike_distance: 200,
    adjustment_zone: 50,
    max_daily_loss: ''
  });
  
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    setLocalConfig({
      lot_size: config.lot_size || 1,
      strike_distance: config.strike_distance || 200,
      adjustment_zone: config.adjustment_zone || 50,
      max_daily_loss: config.max_daily_loss || ''
    });
  }, [config, open]);

  const handleChange = (field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      // Save config first
      const configToSave = {
        ...config,
        lot_size: parseInt(localConfig.lot_size) || 1,
        strike_distance: parseInt(localConfig.strike_distance) || 200,
        adjustment_zone: parseInt(localConfig.adjustment_zone) || 50,
        max_daily_loss: localConfig.max_daily_loss ? parseFloat(localConfig.max_daily_loss) : null
      };
      
      await updateConfig(configToSave);
      
      // Then start strategy
      await onStart();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to start strategy:', error);
    } finally {
      setIsStarting(false);
    }
  };

  // Calculate preview strikes
  const atmStrike = Math.round(spotPrice / 50) * 50;
  const ceStrike = atmStrike + parseInt(localConfig.strike_distance || 200);
  const peStrike = atmStrike - parseInt(localConfig.strike_distance || 200);
  const lotUnits = (parseInt(localConfig.lot_size) || 1) * 25;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configure Strategy
          </DialogTitle>
          <DialogDescription>
            Set your parameters before starting the Short Strangle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Spot Info */}
          <div className="p-4 bg-secondary/30 rounded-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">NIFTY 50 Spot</span>
              <span className="font-mono text-xl font-bold text-primary">
                {spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ATM Strike</span>
              <span className="font-mono">{atmStrike}</span>
            </div>
          </div>

          {/* Configuration Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lot_size" className="text-sm font-medium">
                Lot Size
              </Label>
              <Input
                id="lot_size"
                data-testid="modal-lot-size"
                type="number"
                min={1}
                value={localConfig.lot_size}
                onChange={(e) => handleChange('lot_size', e.target.value)}
                className="font-mono"
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                = {lotUnits} units (₹{(lotUnits * 100).toLocaleString()} margin approx)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strike_distance" className="text-sm font-medium">
                Strike Distance (pts)
              </Label>
              <Input
                id="strike_distance"
                data-testid="modal-strike-distance"
                type="number"
                min={50}
                step={50}
                value={localConfig.strike_distance}
                onChange={(e) => handleChange('strike_distance', e.target.value)}
                className="font-mono"
                placeholder="200"
              />
              <p className="text-xs text-muted-foreground">
                Distance from ATM
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment_zone" className="text-sm font-medium">
                Adjustment Zone (pts)
              </Label>
              <Input
                id="adjustment_zone"
                data-testid="modal-adjustment-zone"
                type="number"
                min={10}
                step={10}
                value={localConfig.adjustment_zone}
                onChange={(e) => handleChange('adjustment_zone', e.target.value)}
                className="font-mono"
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Shift when spot within this range
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_daily_loss" className="text-sm font-medium">
                Max Daily Loss (₹)
              </Label>
              <Input
                id="max_daily_loss"
                data-testid="modal-max-loss"
                type="number"
                min={0}
                value={localConfig.max_daily_loss}
                onChange={(e) => handleChange('max_daily_loss', e.target.value)}
                className="font-mono"
                placeholder="Optional"
              />
              <p className="text-xs text-muted-foreground">
                Auto-exit if breached
              </p>
            </div>
          </div>

          {/* Preview Box */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Strategy Preview</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sell CE</span>
                <Badge variant="outline" className="text-blue-500 border-blue-500/30 font-mono">
                  {ceStrike}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sell PE</span>
                <Badge variant="outline" className="text-amber-500 border-amber-500/30 font-mono">
                  {peStrike}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-mono">{lotUnits} units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Adjust at</span>
                <span className="font-mono">±{localConfig.adjustment_zone || 50} pts</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            data-testid="confirm-start-strategy"
            onClick={handleStart}
            disabled={isStarting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Start Strategy
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StrategyConfigModal;
