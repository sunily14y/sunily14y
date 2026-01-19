import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { useTradingStore } from "./store/tradingStore";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TradeHistoryPage from "./pages/TradeHistoryPage";
import SettingsPage from "./pages/SettingsPage";
import BacktestPage from "./pages/BacktestPage";
import OptionChainPage from "./pages/OptionChainPage";
import DashboardLayout from "./components/layout/DashboardLayout";

// Component to handle auth callback
const AuthHandler = ({ children }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadSession } = useTradingStore();
  
  useEffect(() => {
    const handleAuth = async () => {
      const auth = searchParams.get('auth');
      const sessionId = searchParams.get('session_id');
      
      if (auth === 'success' && sessionId) {
        // Save session_id from callback
        localStorage.setItem('niftyalgo_session_id', sessionId);
        try {
          await loadSession(sessionId);
          // Clear URL params
          navigate('/dashboard', { replace: true });
        } catch (error) {
          console.error('Failed to load session:', error);
        }
      }
    };
    
    handleAuth();
  }, [searchParams, loadSession, navigate]);
  
  return children;
};

function AppContent() {
  const { sessionId, loadSession } = useTradingStore();

  useEffect(() => {
    const initSession = async () => {
      const savedSessionId = localStorage.getItem('niftyalgo_session_id');
      if (savedSessionId && !sessionId) {
        try {
          await loadSession(savedSessionId);
        } catch (error) {
          console.error('Failed to load session:', error);
        }
      }
    };
    initSession();
  }, [loadSession, sessionId]);

  return (
    <AuthHandler>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            sessionId ? (
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            sessionId ? (
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/history"
          element={
            sessionId ? (
              <DashboardLayout>
                <TradeHistoryPage />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/settings"
          element={
            sessionId ? (
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/backtest"
          element={
            sessionId ? (
              <DashboardLayout>
                <BacktestPage />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/option-chain"
          element={
            <DashboardLayout>
              <OptionChainPage />
            </DashboardLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthHandler>
  );
}

function App() {
  return (
    <>
      <div className="noise-overlay" />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
