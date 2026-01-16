import { create } from 'zustand';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useTradingStore = create((set, get) => ({
  // Session state
  sessionId: null,
  isAuthenticated: false,
  
  // Configuration
  config: {
    lot_size: 1,
    adjustment_zone: 50,
    strike_distance: 200,
    max_daily_loss: null,
    max_trades_per_day: null,
    entry_time: "09:20",
    exit_time: "15:15",
    no_entry_after: "15:00",
    trading_mode: "paper"
  },
  
  // Strategy state
  strategyState: {
    is_active: false,
    ce_strike: null,
    pe_strike: null,
    adjustment_count: 0,
    total_pnl: 0,
    daily_pnl: 0,
    last_spot_price: 0,
    start_time: null
  },
  
  // Market data
  spotPrice: 0,
  spotHistory: [],
  optionsChain: [],
  atmStrike: 0,
  
  // Positions and trades
  positions: [],
  trades: [],
  totalTrades: 0,
  
  // Stats
  stats: {
    total_trades: 0,
    adjustment_count: 0,
    total_premium_collected: 0,
    total_premium_paid: 0,
    net_premium: 0
  },
  
  // UI state
  isLoading: false,
  error: null,
  notifications: [],
  isLiveData: false,
  
  // Actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  
  addNotification: (notification) => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }]
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    }, 5000);
  },
  
  // Session management
  createSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(`${API_URL}/session/create`);
      const { session_id, config } = response.data;
      
      localStorage.setItem('niftyalgo_session_id', session_id);
      
      set({
        sessionId: session_id,
        config,
        isLoading: false,
        isAuthenticated: true
      });
      
      return session_id;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  loadSession: async (sessionId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get(`${API_URL}/session/${sessionId}`);
      
      set({
        sessionId,
        config: response.data.config || get().config,
        isAuthenticated: response.data.is_authenticated || true,
        isLoading: false
      });
      
      return response.data;
    } catch (error) {
      localStorage.removeItem('niftyalgo_session_id');
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  updateConfig: async (newConfig) => {
    const { sessionId } = get();
    if (!sessionId) return;
    
    try {
      set({ isLoading: true });
      const response = await axios.put(
        `${API_URL}/session/${sessionId}/config`,
        newConfig
      );
      
      set({ config: response.data.config, isLoading: false });
      get().addNotification({ type: 'success', message: 'Configuration updated' });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  // Market data
  fetchSpotPrice: async () => {
    const { sessionId } = get();
    try {
      const response = await axios.get(`${API_URL}/market/spot`, {
        params: { session_id: sessionId }
      });
      set({ 
        spotPrice: response.data.spot_price,
        isLiveData: response.data.is_live || false
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch spot price:', error);
    }
  },
  
  fetchSpotHistory: async (minutes = 60) => {
    const { sessionId } = get();
    try {
      const response = await axios.get(`${API_URL}/market/spot-history`, {
        params: { minutes, session_id: sessionId }
      });
      set({ 
        spotHistory: response.data.history,
        isLiveData: response.data.is_live || false
      });
    } catch (error) {
      console.error('Failed to fetch spot history:', error);
    }
  },
  
  fetchOptionsChain: async () => {
    const { sessionId } = get();
    try {
      const response = await axios.get(`${API_URL}/market/options-chain`, {
        params: { session_id: sessionId }
      });
      set({
        optionsChain: response.data.chain,
        atmStrike: response.data.atm_strike,
        spotPrice: response.data.spot_price,
        isLiveData: response.data.is_live || false
      });
    } catch (error) {
      console.error('Failed to fetch options chain:', error);
    }
  },
  
  // Strategy management
  startStrategy: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    
    try {
      set({ isLoading: true });
      const response = await axios.post(`${API_URL}/strategy/start`, null, {
        params: { session_id: sessionId }
      });
      
      get().addNotification({
        type: 'success',
        message: response.data.message
      });
      
      await get().fetchStrategyState();
      await get().fetchPositions();
      await get().fetchTrades();
      
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      
      // Extract error message from response
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to start strategy';
      
      set({ error: errorMessage });
      get().addNotification({ type: 'error', message: errorMessage });
      throw error;
    }
  },
  
  stopStrategy: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    
    try {
      set({ isLoading: true });
      const response = await axios.post(`${API_URL}/strategy/stop`, null, {
        params: { session_id: sessionId }
      });
      
      get().addNotification({
        type: 'success',
        message: response.data.message
      });
      
      await get().fetchStrategyState();
      await get().fetchPositions();
      await get().fetchTrades();
      await get().fetchStats();
      
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      get().addNotification({ type: 'error', message: error.message });
      throw error;
    }
  },
  
  fetchStrategyState: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`${API_URL}/strategy/state/${sessionId}`);
      set({ strategyState: response.data });
    } catch (error) {
      console.error('Failed to fetch strategy state:', error);
    }
  },
  
  // Positions
  fetchPositions: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`${API_URL}/positions/${sessionId}`);
      set({
        positions: response.data.positions,
        spotPrice: response.data.spot_price
      });
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  },
  
  // Trades
  fetchTrades: async (limit = 50, skip = 0) => {
    const { sessionId } = get();
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`${API_URL}/trades/${sessionId}`, {
        params: { limit, skip }
      });
      set({
        trades: response.data.trades,
        totalTrades: response.data.total
      });
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    }
  },
  
  // Stats
  fetchStats: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`${API_URL}/stats/${sessionId}`);
      set({ stats: response.data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },
  
  // Polling for real-time updates
  startPolling: () => {
    const pollInterval = setInterval(async () => {
      const { strategyState, sessionId } = get();
      if (sessionId) {
        await get().fetchSpotPrice();
        if (strategyState.is_active) {
          await get().fetchStrategyState();
          await get().fetchPositions();
        }
      }
    }, 2000);
    
    set({ pollInterval });
  },
  
  stopPolling: () => {
    const { pollInterval } = get();
    if (pollInterval) {
      clearInterval(pollInterval);
      set({ pollInterval: null });
    }
  },
  
  // Logout
  logout: () => {
    get().stopPolling();
    localStorage.removeItem('niftyalgo_session_id');
    set({
      sessionId: null,
      isAuthenticated: false,
      strategyState: {
        is_active: false,
        ce_strike: null,
        pe_strike: null,
        adjustment_count: 0,
        total_pnl: 0,
        daily_pnl: 0,
        last_spot_price: 0,
        start_time: null
      },
      positions: [],
      trades: [],
      stats: {
        total_trades: 0,
        adjustment_count: 0,
        total_premium_collected: 0,
        total_premium_paid: 0,
        net_premium: 0
      }
    });
  }
}));
