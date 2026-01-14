import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTradingStore } from "../../store/tradingStore";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  LayoutDashboard,
  History,
  Settings,
  LogOut,
  TrendingUp,
  Menu,
  X,
  Bell,
  Activity
} from "lucide-react";
import { Badge } from "../ui/badge";

const DashboardLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    config, 
    strategyState, 
    spotPrice, 
    logout,
    fetchSpotPrice,
    fetchStrategyState,
    startPolling,
    stopPolling
  } = useTradingStore();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchSpotPrice();
    fetchStrategyState();
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard 
    },
    { 
      path: '/history', 
      label: 'Trade History', 
      icon: History 
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: Settings 
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "w-64 fixed h-full border-r border-border bg-card/50 backdrop-blur-xl z-50 flex flex-col transition-transform duration-300",
          "hidden md:flex",
          sidebarOpen && "translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">NiftyAlgo</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Strategy Status */}
        <div className="p-4 border-t border-border">
          <div className="p-3 bg-secondary/50 rounded-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Strategy</span>
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
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mode</span>
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs",
                  config.trading_mode === 'paper' 
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}
              >
                {config.trading_mode === 'paper' ? 'Paper' : 'Live'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button
            data-testid="logout-btn"
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside 
        className={cn(
          "w-64 fixed h-full border-r border-border bg-card z-50 flex flex-col transition-transform duration-300 md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Same content as desktop sidebar */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">NiftyAlgo</span>
          </Link>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center px-4 md:px-6 justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">NIFTY 50</span>
              <span className="font-mono font-bold text-lg">
                {spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {strategyState.is_active && (
              <div className="hidden sm:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">CE:</span>
                  <span className="font-mono text-blue-500">{strategyState.ce_strike}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">PE:</span>
                  <span className="font-mono text-amber-500">{strategyState.pe_strike}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Adj:</span>
                  <span className="font-mono">{strategyState.adjustment_count}</span>
                </div>
              </div>
            )}
            
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
