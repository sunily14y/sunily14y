import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { cn } from "../lib/utils";
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OptionChainPage = () => {
  const [sessionId, setSessionId] = useState(null);
  const [optionsData, setOptionsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLots, setSelectedLots] = useState({});
  const [isPlacingOrder, setIsPlacingOrder] = useState({});
  const [tradingMode, setTradingMode] = useState("paper");

  // Get session from localStorage
  useEffect(() => {
    const storedSession = localStorage.getItem('niftyalgo_session_id');
    if (storedSession) {
      setSessionId(storedSession);
      fetchSessionConfig(storedSession);
    }
  }, []);

  const fetchSessionConfig = async (sid) => {
    try {
      const response = await axios.get(`${API_URL}/session/${sid}`);
      setTradingMode(response.data.config?.trading_mode || "paper");
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  };

  const fetchOptionsChain = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/market/options-chain`, {
        params: { session_id: sessionId }
      });
      setOptionsData(response.data);
      
      // Initialize lots for each strike
      const lots = {};
      response.data.chain?.forEach(item => {
        lots[`${item.strike}_CE`] = 1;
        lots[`${item.strike}_PE`] = 1;
      });
      setSelectedLots(lots);
    } catch (error) {
      toast.error("Failed to fetch options chain");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchOptionsChain();
      // Auto-refresh every 5 seconds
      const interval = setInterval(fetchOptionsChain, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId, fetchOptionsChain]);

  const placeOrder = async (strike, optionType, action, symbol) => {
    const key = `${strike}_${optionType}`;
    const lots = selectedLots[key] || 1;
    
    setIsPlacingOrder(prev => ({ ...prev, [key + action]: true }));
    
    try {
      const response = await axios.post(`${API_URL}/orders/place`, null, {
        params: {
          session_id: sessionId,
          symbol: symbol,
          strike: strike,
          option_type: optionType,
          action: action,
          lots: lots
        }
      });
      
      toast.success(response.data.message);
      fetchOptionsChain();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Order failed");
    } finally {
      setIsPlacingOrder(prev => ({ ...prev, [key + action]: false }));
    }
  };

  const updateLots = (strike, optionType, value) => {
    const key = `${strike}_${optionType}`;
    const lots = Math.max(1, parseInt(value) || 1);
    setSelectedLots(prev => ({ ...prev, [key]: lots }));
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="bg-card border-border p-8">
          <p className="text-muted-foreground">Please login to view option chain</p>
          <Button className="mt-4" onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NIFTY Option Chain</h1>
          <p className="text-muted-foreground">
            Live options data with order placement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className={cn(
              "text-sm px-3 py-1",
              tradingMode === "live" 
                ? "bg-red-500/20 text-red-500 border-red-500/30" 
                : "bg-amber-500/20 text-amber-500 border-amber-500/30"
            )}
          >
            {tradingMode === "live" ? "LIVE TRADING" : "PAPER TRADING"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchOptionsChain}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Spot Price & Info */}
      {optionsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">NIFTY 50 SPOT</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="font-mono text-2xl font-bold">
                {optionsData.spot_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">ATM STRIKE</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="font-mono text-2xl font-bold">
                {optionsData.atm_strike}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">EXPIRY</span>
              </div>
              <div className="font-mono text-lg font-bold">
                {optionsData.expiry || "--"}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">LOT SIZE</span>
              </div>
              <div className="font-mono text-2xl font-bold">
                {optionsData.nifty_lot_size || 75}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Option Chain Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Option Chain - Weekly Expiry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-blue-500" colSpan={4}>CALLS (CE)</th>
                  <th className="text-center p-2 bg-secondary/50 font-bold">STRIKE</th>
                  <th className="text-right p-2 text-amber-500" colSpan={4}>PUTS (PE)</th>
                </tr>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left p-2">Lots</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-right p-2">LTP</th>
                  <th className="text-right p-2">Symbol</th>
                  <th className="text-center p-2 bg-secondary/50"></th>
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">LTP</th>
                  <th className="text-right p-2">Action</th>
                  <th className="text-right p-2">Lots</th>
                </tr>
              </thead>
              <tbody>
                {optionsData?.chain?.map((item) => (
                  <tr 
                    key={item.strike}
                    className={cn(
                      "border-b border-border/50 hover:bg-secondary/20 transition-colors",
                      item.is_atm && "bg-primary/10 border-primary/30"
                    )}
                  >
                    {/* CE Lots */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min={1}
                        value={selectedLots[`${item.strike}_CE`] || 1}
                        onChange={(e) => updateLots(item.strike, "CE", e.target.value)}
                        className="w-16 h-7 text-xs font-mono"
                      />
                    </td>
                    
                    {/* CE Actions */}
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                          onClick={() => placeOrder(item.strike, "CE", "BUY", item.ce_symbol)}
                          disabled={isPlacingOrder[`${item.strike}_CEBUY`]}
                        >
                          {isPlacingOrder[`${item.strike}_CEBUY`] ? "..." : "B"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                          onClick={() => placeOrder(item.strike, "CE", "SELL", item.ce_symbol)}
                          disabled={isPlacingOrder[`${item.strike}_CESELL`]}
                        >
                          {isPlacingOrder[`${item.strike}_CESELL`] ? "..." : "S"}
                        </Button>
                      </div>
                    </td>
                    
                    {/* CE LTP */}
                    <td className={cn(
                      "p-2 text-right font-mono",
                      item.is_itm_ce ? "text-blue-400 bg-blue-500/5" : ""
                    )}>
                      {item.ce_ltp > 0 ? item.ce_ltp.toFixed(2) : "--"}
                    </td>
                    
                    {/* CE Symbol */}
                    <td className="p-2 text-right text-xs text-muted-foreground font-mono">
                      {item.ce_symbol?.slice(-10)}
                    </td>
                    
                    {/* Strike */}
                    <td className={cn(
                      "p-2 text-center font-mono font-bold",
                      item.is_atm ? "bg-primary/20 text-primary" : "bg-secondary/50"
                    )}>
                      {item.strike}
                      {item.is_atm && <span className="ml-1 text-xs">ATM</span>}
                    </td>
                    
                    {/* PE Symbol */}
                    <td className="p-2 text-left text-xs text-muted-foreground font-mono">
                      {item.pe_symbol?.slice(-10)}
                    </td>
                    
                    {/* PE LTP */}
                    <td className={cn(
                      "p-2 text-left font-mono",
                      item.is_itm_pe ? "text-amber-400 bg-amber-500/5" : ""
                    )}>
                      {item.pe_ltp > 0 ? item.pe_ltp.toFixed(2) : "--"}
                    </td>
                    
                    {/* PE Actions */}
                    <td className="p-2">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                          onClick={() => placeOrder(item.strike, "PE", "BUY", item.pe_symbol)}
                          disabled={isPlacingOrder[`${item.strike}_PEBUY`]}
                        >
                          {isPlacingOrder[`${item.strike}_PEBUY`] ? "..." : "B"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                          onClick={() => placeOrder(item.strike, "PE", "SELL", item.pe_symbol)}
                          disabled={isPlacingOrder[`${item.strike}_PESELL`]}
                        >
                          {isPlacingOrder[`${item.strike}_PESELL`] ? "..." : "S"}
                        </Button>
                      </div>
                    </td>
                    
                    {/* PE Lots */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min={1}
                        value={selectedLots[`${item.strike}_PE`] || 1}
                        onChange={(e) => updateLots(item.strike, "PE", e.target.value)}
                        className="w-16 h-7 text-xs font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500/20 rounded"></div>
          <span>ITM Call</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500/20 rounded"></div>
          <span>ITM Put</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary/20 rounded"></div>
          <span>ATM Strike</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-5 px-1 text-[10px] bg-emerald-500/10 text-emerald-500">B</Button>
          <span>Buy</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-5 px-1 text-[10px] bg-red-500/10 text-red-500">S</Button>
          <span>Sell</span>
        </div>
      </div>
    </div>
  );
};

export default OptionChainPage;
