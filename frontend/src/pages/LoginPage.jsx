import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTradingStore } from "../store/tradingStore";
import { Button } from "../components/ui/button";
import { TrendingUp, Shield, Zap, BarChart3 } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const { createSession, isLoading } = useTradingStore();
  const [isCreating, setIsCreating] = useState(false);

  const handleStartTrading = async () => {
    setIsCreating(true);
    try {
      await createSession();
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Short Strangle Strategy",
      description: "Automated NIFTY 50 option selling with dynamic adjustments"
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Configurable loss limits and symmetric position management"
    },
    {
      icon: Zap,
      title: "Real-time Monitoring",
      description: "Live P&L tracking with instant adjustment notifications"
    },
    {
      icon: BarChart3,
      title: "Paper & Live Trading",
      description: "Test strategies risk-free before going live"
    }
  ];

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(9,9,11,0.9), rgba(9,9,11,0.95)), url('https://images.unsplash.com/photo-1526289034009-0240ddb68ce3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRpZ2l0YWwlMjBmaW5hbmNlJTIwYmFja2dyb3VuZCUyMGRhcmt8ZW58MHx8fHwxNzY4NDE2Mjg3fDA&ixlib=rb-4.1.0&q=85')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="grid-background absolute inset-0 opacity-30" />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Branding */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">NiftyAlgo</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Automated Option Selling System for NIFTY 50
              </p>
            </div>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 bg-card/50 backdrop-blur-sm border border-border rounded-sm"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Login Card */}
          <div className="glass p-8 rounded-sm">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Start Trading</h2>
                <p className="text-muted-foreground">
                  Begin with paper trading to test your strategy
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-sm border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="text-sm font-medium text-amber-500">Paper Trading Mode</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No real money at risk. Perfect for testing and learning.
                  </p>
                </div>

                <Button
                  data-testid="start-trading-btn"
                  onClick={handleStartTrading}
                  disabled={isCreating || isLoading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-sm shadow-lg shadow-primary/20"
                >
                  {isCreating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Session...
                    </span>
                  ) : (
                    "Start Paper Trading"
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  data-testid="zerodha-login-btn"
                  variant="outline"
                  className="w-full h-12 rounded-sm"
                  disabled
                >
                  <span className="flex items-center gap-2">
                    Connect Zerodha (Coming Soon)
                  </span>
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our terms of service and privacy policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
