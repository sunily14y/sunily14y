import { useState, useEffect, useRef } from "react";
import { useTradingStore } from "../store/tradingStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Progress } from "./ui/progress";
import { cn } from "../lib/utils";
import { 
  Play, 
  Pause, 
  Square, 
  FastForward, 
  SkipForward,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BacktestPanel = () => {
  const { sessionId, config } = useTradingStore();
  
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [speed, setSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [backtestState, setBacktestState] = useState(null);
  const [strategyActive, setStrategyActive] = useState(false);
  
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchAvailableDates();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchAvailableDates = async () => {
    try {
      const response = await axios.get(`${API_URL}/backtest/available-dates`);
      setAvailableDates(response.data.dates || []);
      if (response.data.dates?.length > 0) {
        setSelectedDate(response.data.dates[0]);
      }
    } catch (error) {
      console.error("Failed to fetch dates:", error);
    }
  };

  const startBacktest = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/backtest/start`, null, {
        params: { session_id: sessionId, date: selectedDate, speed }
      });
      
      setIsRunning(true);
      setIsPaused(false);
      toast.success(`Backtest started for ${selectedDate}`);
      
      // Start auto-advance
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
        
        if (response.data.adjustment_triggered) {
          toast.info(`Adjustment #${response.data.adjustment_count}: CE=${response.data.ce_strike}, PE=${response.data.pe_strike}`);
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
      
      toast.success(`Strategy started: CE=${response.data.ce_strike}, PE=${response.data.pe_strike}`);
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
      toast.success(`Strategy stopped. Adjustments: ${response.data.adjustment_count}`);
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

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Backtest Mode
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-500 border-violet-500/20">
            Historical Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isRunning ? (
          <>
            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Select Date</label>
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
                        month: "short",
                        year: "numeric"
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speed Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Speed</label>
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
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading Data...
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
                <span className="text-xs text-muted-foreground">Replaying</span>
                <span className="text-xs font-mono">{selectedDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Time</span>
                <span className="text-sm font-mono font-bold">
                  {formatTimestamp(backtestState?.timestamp)}
                </span>
              </div>
            </div>

            {/* Spot Price */}
            <div className="p-3 bg-secondary/30 rounded-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">NIFTY 50</span>
                <Activity className="w-4 h-4 text-violet-500" />
              </div>
              <div className="font-mono text-2xl font-bold">
                {backtestState?.spot_price?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}
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

            {/* Strategy Status */}
            {strategyActive && backtestState?.ce_strike && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-sm text-center">
                  <span className="text-xs text-muted-foreground">CE</span>
                  <div className="font-mono font-bold text-blue-500">{backtestState.ce_strike}</div>
                </div>
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-sm text-center">
                  <span className="text-xs text-muted-foreground">PE</span>
                  <div className="font-mono font-bold text-amber-500">{backtestState.pe_strike}</div>
                </div>
              </div>
            )}

            {/* Adjustment Count */}
            {strategyActive && (
              <div className="flex items-center justify-between p-2 bg-secondary/30 rounded-sm">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Adjustments
                </span>
                <span className="font-mono font-bold">{backtestState?.adjustment_count || 0}</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
                className="flex-1"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => skipForward(10)}
                disabled={!isPaused}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSpeedChange(Math.min(10, speed * 2))}
              >
                <FastForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Strategy Controls */}
            <div className="flex gap-2">
              {!strategyActive ? (
                <Button
                  onClick={startStrategy}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Start Strategy
                </Button>
              ) : (
                <Button
                  onClick={stopStrategy}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Stop Strategy
                </Button>
              )}
            </div>

            {/* Stop Backtest */}
            <Button
              variant="outline"
              onClick={stopBacktest}
              className="w-full"
              size="sm"
            >
              Exit Backtest
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BacktestPanel;
