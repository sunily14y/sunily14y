import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { useTradingStore } from "./store/tradingStore";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TradeHistoryPage from "./pages/TradeHistoryPage";
import SettingsPage from "./pages/SettingsPage";
import DashboardLayout from "./components/layout/DashboardLayout";

function App() {
  const { sessionId, loadSession, createSession } = useTradingStore();

  useEffect(() => {
    const initSession = async () => {
      const savedSessionId = localStorage.getItem('niftyalgo_session_id');
      if (savedSessionId) {
        try {
          await loadSession(savedSessionId);
        } catch (error) {
          console.error('Failed to load session:', error);
        }
      }
    };
    initSession();
  }, [loadSession]);

  return (
    <>
      <div className="noise-overlay" />
      <BrowserRouter>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
