import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTradingStore } from "../store/tradingStore";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LoginPage = () => {
  const navigate = useNavigate();
  const { setSession, sessionId } = useTradingStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);

  useEffect(() => {
    // Check if already logged in
    if (sessionId) {
      navigate("/dashboard");
      return;
    }
    checkAuthStatus();
  }, [sessionId, navigate]);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/status`);
      setAuthStatus(response.data);
    } catch (error) {
      console.error("Failed to check auth status:", error);
    }
  };

  const handleZerodhaLogin = async () => {
    setIsLoading(true);
    try {
      // Create session first
      const sessionResponse = await axios.post(`${API_URL}/session/create`);
      const newSessionId = sessionResponse.data.session_id;
      
      // Store session in localStorage
      localStorage.setItem('niftyalgo_session_id', newSessionId);
      setSession(newSessionId, sessionResponse.data.config);
      
      // Get Zerodha login URL
      const response = await axios.get(`${API_URL}/auth/login-url`, {
        params: { session_id: newSessionId }
      });
      
      // Redirect to Zerodha
      window.location.href = response.data.login_url;
    } catch (error) {
      toast.error("Failed to initiate login");
      setIsLoading(false);
    }
  };

  const handlePaperTrading = async () => {
    setIsCreating(true);
    try {
      const response = await axios.post(`${API_URL}/session/create`);
      const newSessionId = response.data.session_id;
      
      localStorage.setItem('niftyalgo_session_id', newSessionId);
      setSession(newSessionId, response.data.config);
      
      toast.success("Paper trading session started");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to create session");
    } finally {
      setIsCreating(false);
    }
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Short Strangle Strategy",
      description: "Automated NIFTY 50 option selling"
    },
    {
      icon: Zap,
      title: "Dynamic Adjustments",
      description: "Auto-shift when spot approaches strikes"
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Max daily loss limits & position tracking"
    },
    {
      icon: BarChart3,
      title: "Live Option Chain",
      description: "Real-time prices with one-click orders"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-950 via-background to-background p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">NiftyAlgo</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            Automated Options Trading
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Professional short strangle strategy for NIFTY 50 with real-time adjustments
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Powered by Zerodha Kite Connect API
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">NiftyAlgo</span>
            </div>
            <p className="text-muted-foreground">Automated NIFTY 50 Options Trading</p>
          </div>

          {/* Auth Status */}
          {authStatus && (
            <Card className={cn(
              "border",
              authStatus.is_authenticated && authStatus.is_token_valid
                ? "bg-emerald-500/10 border-emerald-500/30"
                : authStatus.is_authenticated
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-secondary/30 border-border"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {authStatus.is_authenticated && authStatus.is_token_valid ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="font-medium text-emerald-500">Connected to Zerodha</p>
                        <p className="text-xs text-muted-foreground">
                          User: {authStatus.zerodha_user_id} • Token valid
                        </p>
                      </div>
                    </>
                  ) : authStatus.is_authenticated ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="font-medium text-amber-500">Token Expired</p>
                        <p className="text-xs text-muted-foreground">
                          Please re-login to Zerodha
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Not Connected</p>
                        <p className="text-xs text-muted-foreground">
                          Login with Zerodha to start trading
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Login Options */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">Get Started</h2>
            
            {/* Zerodha Login */}
            <Button
              data-testid="zerodha-login-btn"
              onClick={handleZerodhaLogin}
              disabled={isLoading}
              className="w-full h-14 bg-[#387ED1] hover:bg-[#2d6ab8] text-white font-medium text-base"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Login with Zerodha
                </span>
              )}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            
            {/* Paper Trading */}
            <Button
              data-testid="start-trading-btn"
              onClick={handlePaperTrading}
              disabled={isCreating}
              variant="outline"
              className="w-full h-14 font-medium text-base border-2"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Creating session...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Start Paper Trading
                </span>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                Live Trading
              </Badge>
              <span>Real orders on NSE/NFO</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                Paper Trading
              </Badge>
              <span>Practice with live data</span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground">
            By logging in, you agree to our terms of service. Trading involves risk.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
