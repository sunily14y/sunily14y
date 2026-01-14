import { useEffect, useState } from "react";
import { useTradingStore } from "../store/tradingStore";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { 
  Play, 
  Square, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { toast } from "sonner";

const DashboardPage = () => {
  const {
    config,
    strategyState,
    spotPrice,
    spotHistory,
    positions,
    trades,
    stats,
    isLoading,
    fetchSpotHistory,
    fetchPositions,
    fetchTrades,
    fetchStats,
    startStrategy,
    stopStrategy
  } = useTradingStore();

  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    fetchSpotHistory(60);
    fetchPositions();
    fetchTrades(10);
    fetchStats();
  }, []);

  const handleStartStrategy = async () => {
    setIsStarting(true);
    try {
      await startStrategy();
      toast.success("Strategy started successfully!");
    } catch (error) {
      toast.error("Failed to start strategy");
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopStrategy = async () => {
    setIsStopping(true);
    try {
      await stopStrategy();
      toast.success("Strategy stopped successfully!");
    } catch (error) {
      toast.error("Failed to stop strategy");
    } finally {
      setIsStopping(false);
    }
  };

  const totalPnL = positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
  const isProfitable = totalPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your NIFTY 50 Short Strangle strategy
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!strategyState.is_active ? (
            <Button
              data-testid="start-strategy-btn"
              onClick={handleStartStrategy}
              disabled={isStarting || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
            >
              {isStarting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Start Strategy
            </Button>
          ) : (
            <Button
              data-testid="stop-strategy-btn"
              onClick={handleStopStrategy}
              disabled={isStopping || isLoading}
              variant="destructive"
              className="shadow-lg shadow-red-600/20"
            >
              {isStopping ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Square className="w-4 h-4 mr-2" />
              )}
              Stop Strategy
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NIFTY Spot */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">NIFTY 50</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="font-mono text-2xl font-bold tracking-tight">
              {spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        {/* P&L */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Unrealized P&L</span>
              {isProfitable ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className={cn(
              "font-mono text-2xl font-bold tracking-tight",
              isProfitable ? "text-emerald-500" : "text-red-500"
            )}>
              {isProfitable ? "+" : ""}₹{totalPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        {/* Adjustment Count */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Adjustments</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="font-mono text-2xl font-bold tracking-tight">
              {strategyState.adjustment_count}
            </div>
          </CardContent>
        </Card>

        {/* Total Trades */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Trades</span>
              <RefreshCw className="w-4 h-4 text-primary" />
            </div>
            <div className="font-mono text-2xl font-bold tracking-tight">
              {stats.total_trades}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-8 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">NIFTY 50 Price Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spotHistory}>
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    domain={['dataMin - 50', 'dataMax + 50']}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(value) => value.toFixed(0)}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleTimeString('en-IN')}
                    formatter={(value) => [value.toFixed(2), 'Price']}
                  />
                  {strategyState.ce_strike && (
                    <ReferenceLine 
                      y={strategyState.ce_strike} 
                      stroke="hsl(217, 91%, 60%)" 
                      strokeDasharray="5 5"
                      label={{ value: `CE ${strategyState.ce_strike}`, fill: 'hsl(217, 91%, 60%)', fontSize: 10 }}
                    />
                  )}
                  {strategyState.pe_strike && (
                    <ReferenceLine 
                      y={strategyState.pe_strike} 
                      stroke="hsl(38, 92%, 50%)" 
                      strokeDasharray="5 5"
                      label={{ value: `PE ${strategyState.pe_strike}`, fill: 'hsl(38, 92%, 50%)', fontSize: 10 }}
                    />
                  )}
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Current Positions */}
        <Card className="lg:col-span-4 bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Current Positions</CardTitle>
              <Badge 
                variant={strategyState.is_active ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  strategyState.is_active && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}
              >
                {strategyState.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {positions.length > 0 ? (
              positions.map((position, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-4 rounded-sm border",
                    position.position_type === 'CE' 
                      ? "bg-blue-500/5 border-blue-500/20" 
                      : "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs",
                          position.position_type === 'CE' 
                            ? "text-blue-500 border-blue-500/30" 
                            : "text-amber-500 border-amber-500/30"
                        )}
                      >
                        {position.position_type}
                      </Badge>
                      <span className="font-mono font-medium">{position.strike}</span>
                    </div>
                    {position.position_type === 'CE' ? (
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Entry</span>
                      <div className="font-mono">₹{position.entry_price?.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current</span>
                      <div className="font-mono">₹{position.current_price?.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Qty</span>
                      <div className="font-mono">{position.quantity}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P&L</span>
                      <div className={cn(
                        "font-mono font-medium",
                        position.pnl >= 0 ? "text-emerald-500" : "text-red-500"
                      )}>
                        {position.pnl >= 0 ? "+" : ""}₹{position.pnl?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No active positions</p>
                <p className="text-sm">Start the strategy to open positions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strategy Config Summary & Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Config */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Strategy Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-secondary/30 rounded-sm">
                <span className="text-xs text-muted-foreground">Lot Size</span>
                <div className="font-mono text-lg font-medium">{config.lot_size}</div>
              </div>
              <div className="p-3 bg-secondary/30 rounded-sm">
                <span className="text-xs text-muted-foreground">Strike Distance</span>
                <div className="font-mono text-lg font-medium">{config.strike_distance} pts</div>
              </div>
              <div className="p-3 bg-secondary/30 rounded-sm">
                <span className="text-xs text-muted-foreground">Adjustment Zone</span>
                <div className="font-mono text-lg font-medium">{config.adjustment_zone} pts</div>
              </div>
              <div className="p-3 bg-secondary/30 rounded-sm">
                <span className="text-xs text-muted-foreground">Max Daily Loss</span>
                <div className="font-mono text-lg font-medium">
                  {config.max_daily_loss ? `₹${config.max_daily_loss}` : 'None'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <a href="/history">View All</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trades.slice(0, 5).map((trade, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 bg-secondary/30 rounded-sm text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        trade.action === 'SELL' 
                          ? "text-red-500 border-red-500/30" 
                          : "text-emerald-500 border-emerald-500/30"
                      )}
                    >
                      {trade.action}
                    </Badge>
                    <span className="font-mono">{trade.symbol}</span>
                  </div>
                  <div className="font-mono">₹{trade.price?.toFixed(2)}</div>
                </div>
              ))}
              {trades.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No trades yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
