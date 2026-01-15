import { useState, useEffect, useRef } from "react";
import { useTradingStore } from "../store/tradingStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Slider } from "../components/ui/slider";
import { cn } from "../lib/utils";
import { 
  Play, 
  Pause, 
  Square, 
  FastForward, 
  SkipForward,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  Download,
  Search,
  FileSpreadsheet,
  Database,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  History,
  ListOrdered,
  Settings,
  Target,
  Shield,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BacktestPage = () => {
  const { sessionId } = useTradingStore();
  
  // Backtest state
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [speed, setSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [backtestState, setBacktestState] = useState(null);
  const [strategyActive, setStrategyActive] = useState(false);
  const [dataSource, setDataSource] = useState("");
  
  // Strategy Configuration for Backtest
  const [backtestConfig, setBacktestConfig] = useState({
    lot_size: 1,
    strike_distance: 200,
    adjustment_zone: 50,
    max_daily_loss: null
  });
  
  // P&L and History state
  const [pnl, setPnl] = useState({ realized_pnl: 0, unrealized_pnl: 0, total_pnl: 0 });
  const [trades, setTrades] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  
  // Download state
  const [stockSearch, setStockSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [timeframe, setTimeframe] = useState("5minute");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchAvailableDates();
    // Set default dates for download
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setToDate(format(today, "yyyy-MM-dd"));
    setFromDate(format(weekAgo, "yyyy-MM-dd"));
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchAvailableDates = async () => {
    try {
      const response = await axios.get(`${API_URL}/backtest/available-dates`);
      setAvailableDates(response.data.dates || []);
      setDataSource(response.data.source || "unknown");
      if (response.data.dates?.length > 0) {
        setSelectedDate(response.data.dates[0]);
      }
    } catch (error) {
      console.error("Failed to fetch dates:", error);
    }
  };

  const fetchHistoryData = async () => {
    try {
      const [tradesRes, adjustmentsRes] = await Promise.all([
        axios.get(`${API_URL}/backtest/trades`, { params: { session_id: sessionId } }),
        axios.get(`${API_URL}/backtest/adjustments`, { params: { session_id: sessionId } })
      ]);
      setTrades(tradesRes.data.trades || []);
      setAdjustments(adjustmentsRes.data.adjustments || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  // Stock search
  const searchStocks = async () => {
    if (!stockSearch || stockSearch.length < 2) {
      toast.error("Enter at least 2 characters");
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await axios.get(`${API_URL}/data/search-instruments`, {
        params: { query: stockSearch }
      });
      setSearchResults(response.data.instruments || []);
      if (response.data.instruments?.length === 0) {
        toast.info("No instruments found");
      }
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  // Download data
  const downloadData = async () => {
    if (!selectedStock) {
      toast.error("Please select a stock");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Please select date range");
      return;
    }
    
    setIsDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/data/historical`, {
        params: {
          instrument_token: selectedStock.instrument_token,
          from_date: fromDate,
          to_date: toDate,
          interval: timeframe
        }
      });
      
      const data = response.data.data;
      if (!data || data.length === 0) {
        toast.error("No data available for selected range");
        return;
      }
      
      // Convert to CSV
      const headers = ["Date", "Open", "High", "Low", "Close", "Volume"];
      const rows = data.map(row => [
        row.timestamp,
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");
      
      // Download
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedStock.tradingsymbol}_${timeframe}_${fromDate}_${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${data.length} candles`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  // Backtest functions
  const startBacktest = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/backtest/start`, null, {
        params: { 
          session_id: sessionId, 
          date: selectedDate, 
          speed,
          lot_size: backtestConfig.lot_size,
          strike_distance: backtestConfig.strike_distance,
          adjustment_zone: backtestConfig.adjustment_zone,
          max_daily_loss: backtestConfig.max_daily_loss || undefined
        }
      });
      
      setIsRunning(true);
      setIsPaused(false);
      setDataSource(response.data.data_source);
      setTrades([]);
      setAdjustments([]);
      setPnl({ realized_pnl: 0, unrealized_pnl: 0, total_pnl: 0 });
      toast.success(`Backtest started with Lot=${backtestConfig.lot_size}, Strike=${backtestConfig.strike_distance}, Zone=${backtestConfig.adjustment_zone}`);
      
      startAutoAdvance();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start backtest");
    } finally {
      setIsLoading(false);
    }
  };

  const stopBacktest = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    try {
      await axios.post(`${API_URL}/backtest/stop`, null, {
        params: { session_id: sessionId }
      });
      
      setIsRunning(false);
      setIsPaused(false);
      setBacktestState(null);
      setStrategyActive(false);
      toast.success("Backtest stopped");
    } catch (error) {
      toast.error("Failed to stop backtest");
    }
  };

  const togglePause = () => {
    if (isPaused) {
      startAutoAdvance();
      setIsPaused(false);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPaused(true);
    }
  };

  const startAutoAdvance = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    const intervalMs = Math.max(100, 1000 / speed);
    
    intervalRef.current = setInterval(async () => {
      try {
        const response = await axios.post(`${API_URL}/backtest/advance`, null, {
          params: { session_id: sessionId, steps: 1 }
        });
        
        setBacktestState(response.data);
        
        // Update P&L
        if (response.data.pnl) {
          setPnl(response.data.pnl);
        }
        
        if (response.data.adjustment_triggered && response.data.adjustment_info) {
          const adj = response.data.adjustment_info;
          toast.info(`Adjustment #${adj.number}: ${adj.direction} shift. CE=${response.data.ce_strike}, PE=${response.data.pe_strike}`);
          // Refresh history after adjustment
          fetchHistoryData();
        }
        
        if (response.data.progress?.is_complete) {
          clearInterval(intervalRef.current);
          setIsPaused(true);
          toast.success("Backtest completed!");
        }
      } catch (error) {
        console.error("Advance error:", error);
      }
    }, intervalMs);
  };

  const skipForward = async (steps = 10) => {
    try {
      const response = await axios.post(`${API_URL}/backtest/advance`, null, {
        params: { session_id: sessionId, steps }
      });
      setBacktestState(response.data);
      if (response.data.pnl) {
        setPnl(response.data.pnl);
      }
      fetchHistoryData();
    } catch (error) {
      console.error("Skip error:", error);
    }
  };

  const startStrategy = async () => {
    try {
      const response = await axios.post(`${API_URL}/backtest/start-strategy`, null, {
        params: { session_id: sessionId }
      });
      
      setStrategyActive(true);
      setBacktestState(prev => ({
        ...prev,
        ce_strike: response.data.ce_strike,
        pe_strike: response.data.pe_strike
      }));
      
      // Refresh history to show entry trades
      fetchHistoryData();
      
      toast.success(`Strategy started: CE=${response.data.ce_strike}, PE=${response.data.pe_strike}. Premium collected: ₹${response.data.total_premium_collected}`);
    } catch (error) {
      toast.error("Failed to start strategy");
    }
  };

  const stopStrategy = async () => {
    try {
      const response = await axios.post(`${API_URL}/backtest/stop-strategy`, null, {
        params: { session_id: sessionId }
      });
      
      setStrategyActive(false);
      
      // Refresh history to show exit trades
      fetchHistoryData();
      
      const pnlColor = response.data.total_pnl >= 0 ? "text-emerald-500" : "text-red-500";
      toast.success(`Strategy stopped. Total P&L: ₹${response.data.total_pnl}. Adjustments: ${response.data.adjustment_count}`);
    } catch (error) {
      toast.error("Failed to stop strategy");
    }
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    if (isRunning && !isPaused) {
      startAutoAdvance();
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "--:--";
    const date = new Date(ts);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatFullTimestamp = (ts) => {
    if (!ts) return "--";
    const date = new Date(ts);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const timeframes = [
    { value: "minute", label: "1 Minute" },
    { value: "3minute", label: "3 Minutes" },
    { value: "5minute", label: "5 Minutes" },
    { value: "15minute", label: "15 Minutes" },
    { value: "30minute", label: "30 Minutes" },
    { value: "60minute", label: "1 Hour" },
    { value: "day", label: "Daily" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Backtest & Data</h1>
        <p className="text-muted-foreground">
          Backtest strategies on historical data or download market data
        </p>
      </div>

      <Tabs defaultValue="backtest" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="backtest" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Backtest
          </TabsTrigger>
          <TabsTrigger value="download" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Data
          </TabsTrigger>
        </TabsList>

        {/* Backtest Tab */}
        <TabsContent value="backtest" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Controls */}
            <Card className="lg:col-span-3 bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Backtest Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isRunning ? (
                  <>
                    {/* Data Source Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Data Source</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          dataSource === "zerodha" 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}
                      >
                        {dataSource === "zerodha" ? "Zerodha Live" : "Yahoo Finance"}
                      </Badge>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs">Select Date</Label>
                      <Select value={selectedDate} onValueChange={setSelectedDate}>
                        <SelectTrigger data-testid="backtest-date-select">
                          <SelectValue placeholder="Select date" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDates.map((date) => (
                            <SelectItem key={date} value={date}>
                              {new Date(date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short"
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Strategy Configuration */}
                    <div className="p-3 bg-secondary/30 border border-border rounded-sm space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium">Strategy Config</span>
                      </div>
                      
                      {/* Lot Size */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Lot Size
                          </Label>
                          <span className="text-xs font-mono bg-primary/10 px-2 py-0.5 rounded">
                            {backtestConfig.lot_size} ({backtestConfig.lot_size * 25} qty)
                          </span>
                        </div>
                        <Slider
                          value={[backtestConfig.lot_size]}
                          onValueChange={([val]) => setBacktestConfig(prev => ({ ...prev, lot_size: val }))}
                          min={1}
                          max={10}
                          step={1}
                          className="py-2"
                        />
                      </div>
                      
                      {/* Strike Distance */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Strike Distance
                          </Label>
                          <span className="text-xs font-mono bg-primary/10 px-2 py-0.5 rounded">
                            ±{backtestConfig.strike_distance}
                          </span>
                        </div>
                        <Slider
                          value={[backtestConfig.strike_distance]}
                          onValueChange={([val]) => setBacktestConfig(prev => ({ ...prev, strike_distance: val }))}
                          min={50}
                          max={500}
                          step={50}
                          className="py-2"
                        />
                      </div>
                      
                      {/* Adjustment Zone */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Adjustment Zone
                          </Label>
                          <span className="text-xs font-mono bg-primary/10 px-2 py-0.5 rounded">
                            {backtestConfig.adjustment_zone} pts
                          </span>
                        </div>
                        <Slider
                          value={[backtestConfig.adjustment_zone]}
                          onValueChange={([val]) => setBacktestConfig(prev => ({ ...prev, adjustment_zone: val }))}
                          min={25}
                          max={100}
                          step={5}
                          className="py-2"
                        />
                      </div>
                      
                      {/* Max Daily Loss */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Max Daily Loss
                          </Label>
                          <span className="text-xs font-mono bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                            {backtestConfig.max_daily_loss ? `₹${backtestConfig.max_daily_loss}` : "Disabled"}
                          </span>
                        </div>
                        <Input
                          type="number"
                          placeholder="e.g., 5000 (0 = disabled)"
                          value={backtestConfig.max_daily_loss || ""}
                          onChange={(e) => setBacktestConfig(prev => ({ 
                            ...prev, 
                            max_daily_loss: e.target.value ? parseInt(e.target.value) : null 
                          }))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Speed Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Speed</Label>
                        <span className="text-xs font-mono">{speed}x</span>
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 5, 10].map((s) => (
                          <Button
                            key={s}
                            variant={speed === s ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSpeed(s)}
                            className="flex-1"
                          >
                            {s}x
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Start Button */}
                    <Button
                      data-testid="start-backtest-btn"
                      onClick={startBacktest}
                      disabled={isLoading || !selectedDate}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          Start Backtest
                        </span>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Running State */}
                    <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Date</span>
                        <span className="text-xs font-mono">{selectedDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Time</span>
                        <span className="text-sm font-mono font-bold">
                          {formatTimestamp(backtestState?.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-mono">{backtestState?.progress?.progress_percent || 0}%</span>
                      </div>
                      <Progress value={backtestState?.progress?.progress_percent || 0} className="h-2" />
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={togglePause} className="flex-1">
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => skipForward(10)} disabled={!isPaused}>
                        <SkipForward className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSpeedChange(Math.min(10, speed * 2))}>
                        <FastForward className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Strategy Controls */}
                    <div className="flex gap-2">
                      {!strategyActive ? (
                        <Button onClick={startStrategy} className="flex-1 bg-emerald-600 hover:bg-emerald-700" size="sm">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Start Strategy
                        </Button>
                      ) : (
                        <Button onClick={stopStrategy} variant="destructive" className="flex-1" size="sm">
                          <Square className="w-4 h-4 mr-1" />
                          Stop Strategy
                        </Button>
                      )}
                    </div>

                    {/* Stop Backtest */}
                    <Button variant="outline" onClick={stopBacktest} className="w-full" size="sm">
                      Exit Backtest
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Main Display Area */}
            <div className="lg:col-span-9 space-y-6">
              {/* Live Data & P&L Display */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Spot Price */}
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">NIFTY 50</span>
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div className="font-mono text-2xl font-bold">
                      {isRunning ? (backtestState?.spot_price?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00") : "---"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isRunning ? formatTimestamp(backtestState?.timestamp) : "Select date to start"}
                    </div>
                  </CardContent>
                </Card>

                {/* Total P&L */}
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Total P&L</span>
                      {pnl.total_pnl >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className={cn(
                      "font-mono text-2xl font-bold",
                      pnl.total_pnl >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {pnl.total_pnl >= 0 ? "+" : ""}₹{pnl.total_pnl.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Realized: ₹{pnl.realized_pnl.toLocaleString("en-IN")}
                    </div>
                  </CardContent>
                </Card>

                {/* Adjustments */}
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Adjustments</span>
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="font-mono text-2xl font-bold">
                      {backtestState?.adjustment_count || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Trades: {backtestState?.trade_count || trades.length || 0}
                    </div>
                  </CardContent>
                </Card>

                {/* Current Positions */}
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Positions</span>
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs",
                          strategyActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""
                        )}
                      >
                        {strategyActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {strategyActive && backtestState?.ce_strike ? (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-blue-500">CE</span>
                          <span className="font-mono text-sm font-bold">{backtestState.ce_strike}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-amber-500">PE</span>
                          <span className="font-mono text-sm font-bold">{backtestState.pe_strike}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No positions</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Trade History & Adjustments */}
              {isRunning && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Trade History */}
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-primary" />
                        Trade History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[250px]">
                        {trades.length > 0 ? (
                          <div className="space-y-2">
                            {trades.map((trade, idx) => (
                              <div 
                                key={idx}
                                className={cn(
                                  "p-3 rounded-sm border text-sm",
                                  trade.action === "SELL" 
                                    ? "bg-red-500/5 border-red-500/20" 
                                    : "bg-emerald-500/5 border-emerald-500/20"
                                )}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        trade.action === "SELL" ? "text-red-500 border-red-500/30" : "text-emerald-500 border-emerald-500/30"
                                      )}
                                    >
                                      {trade.action}
                                    </Badge>
                                    <Badge variant="outline" className={cn(
                                      "text-xs",
                                      trade.option_type === "CE" ? "text-blue-500 border-blue-500/30" : "text-amber-500 border-amber-500/30"
                                    )}>
                                      {trade.option_type}
                                    </Badge>
                                    <span className="font-mono">{trade.strike}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatFullTimestamp(trade.timestamp)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    Premium: ₹{trade.premium?.toFixed(2)} × {trade.quantity}
                                  </span>
                                  {trade.pnl !== undefined && (
                                    <span className={cn(
                                      "font-mono text-xs font-medium",
                                      trade.pnl >= 0 ? "text-emerald-500" : "text-red-500"
                                    )}>
                                      {trade.pnl >= 0 ? "+" : ""}₹{trade.pnl.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                {trade.is_adjustment && (
                                  <Badge variant="outline" className="mt-1 text-xs text-amber-500 border-amber-500/30">
                                    Adjustment #{trade.adjustment_number}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No trades yet</p>
                            <p className="text-xs">Start the strategy to see trades</p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Adjustment History */}
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Adjustment History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[250px]">
                        {adjustments.length > 0 ? (
                          <div className="space-y-2">
                            {adjustments.map((adj, idx) => (
                              <div 
                                key={idx}
                                className={cn(
                                  "p-3 rounded-sm border",
                                  adj.direction === "UP" 
                                    ? "bg-blue-500/5 border-blue-500/20" 
                                    : "bg-amber-500/5 border-amber-500/20"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn(
                                      "text-xs",
                                      adj.direction === "UP" 
                                        ? "bg-blue-500/20 text-blue-500 border-blue-500/30" 
                                        : "bg-amber-500/20 text-amber-500 border-amber-500/30"
                                    )}>
                                      #{adj.number} {adj.direction}
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatFullTimestamp(adj.timestamp)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Old: </span>
                                    <span className="font-mono">CE {adj.old_ce_strike} / PE {adj.old_pe_strike}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">New: </span>
                                    <span className="font-mono font-medium">CE {adj.new_ce_strike} / PE {adj.new_pe_strike}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Spot: {adj.spot_price?.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No adjustments yet</p>
                            <p className="text-xs">Adjustments occur when spot approaches strikes</p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Empty State */}
              {!isRunning && (
                <Card className="bg-card border-border">
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">Ready to Backtest</p>
                      <p className="text-sm mt-1">Select a date and start backtest to see P&L, trades, and adjustments</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Download Data Tab */}
        <TabsContent value="download" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Search & Select */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  Search Instrument
                </CardTitle>
                <CardDescription>
                  Search for stocks, indices, or F&O instruments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search (e.g., RELIANCE, NIFTY)"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && searchStocks()}
                    className="font-mono"
                  />
                  <Button onClick={searchStocks} disabled={isSearching}>
                    {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      <Label className="text-xs">Select Instrument</Label>
                      {searchResults.map((inst, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedStock(inst)}
                          className={cn(
                            "p-3 rounded-sm border cursor-pointer transition-colors",
                            selectedStock?.instrument_token === inst.instrument_token
                              ? "bg-primary/10 border-primary"
                              : "bg-secondary/30 border-border hover:bg-secondary/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium">{inst.tradingsymbol}</span>
                            <Badge variant="outline" className="text-xs">{inst.exchange}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{inst.name}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Selected Stock */}
                {selectedStock && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Selected</span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                        {selectedStock.exchange}
                      </Badge>
                    </div>
                    <div className="font-mono font-bold mt-1">{selectedStock.tradingsymbol}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Download Options */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  Download Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Timeframe */}
                <div className="space-y-2">
                  <Label className="text-xs">Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeframes.map((tf) => (
                        <SelectItem key={tf.value} value={tf.value}>
                          {tf.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">From Date</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">To Date</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Download Button */}
                <Button
                  onClick={downloadData}
                  disabled={!selectedStock || isDownloading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isDownloading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Downloading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download CSV
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Download Presets */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Download</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  { symbol: "NIFTY 50", token: 256265, exchange: "NSE" },
                  { symbol: "NIFTY BANK", token: 260105, exchange: "NSE" },
                  { symbol: "RELIANCE", token: 738561, exchange: "NSE" },
                  { symbol: "TCS", token: 2953217, exchange: "NSE" },
                  { symbol: "INFY", token: 408065, exchange: "NSE" },
                  { symbol: "HDFCBANK", token: 341249, exchange: "NSE" },
                ].map((item) => (
                  <Button
                    key={item.token}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStock({
                      tradingsymbol: item.symbol,
                      instrument_token: item.token,
                      exchange: item.exchange,
                      name: item.symbol
                    })}
                    className={cn(
                      "font-mono text-xs",
                      selectedStock?.instrument_token === item.token && "bg-primary/10 border-primary"
                    )}
                  >
                    {item.symbol}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BacktestPage;
