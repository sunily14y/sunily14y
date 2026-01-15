# NiftyAlgo - NIFTY 50 Automated Option Selling System

## Original Problem Statement
Build an AUTOMATED OPTION SELLING ALGO for NIFTY 50 using Zerodha Kite API supporting both Paper Trading and Live Trading. Strategy: Short Strangle with Dynamic Shifting.

## User Personas
- **Retail Options Trader**: Indian trader looking to automate NIFTY 50 option selling strategies
- **Algo Learner**: Beginner wanting to test strategies without risking real money
- **Professional Trader**: Experienced trader needing systematic execution with adjustments

## Core Requirements (Static)
1. Short Strangle Strategy: Sell CE at Spot+200, Sell PE at Spot-200
2. Dynamic Adjustment: When spot approaches sold strike by 50 pts, shift both legs by 50 pts
3. Symmetric Shifts: CE and PE always adjusted together
4. Configurable: Lot size, adjustment zone, loss limits
5. Paper/Live modes
6. Trade logging and history
7. Real-time P&L tracking
8. **LIVE DATA ONLY**: No mock/simulated data - uses Zerodha API exclusively

## What's Been Implemented

### Jan 15, 2026 - Backtest Configuration Options (Complete)
- [x] **Custom Lot Size**: Slider to set 1-10 lots (each lot = 25 qty)
- [x] **Custom Strike Distance**: Slider 50-500 points from ATM
- [x] **Custom Adjustment Zone**: Slider 25-100 points trigger zone
- [x] **Max Daily Loss**: Input field for loss limit with auto-exit feature
- [x] Config passed to backend and used in backtest engine
- [x] Max loss exit triggers automatic position closure

### Jan 15, 2026 - Enhanced Backtesting (Complete)
- [x] **P&L Tracking**: Realized and unrealized P&L calculation during backtest
- [x] **Trade History**: Complete log of all entry/exit trades with premiums
- [x] **Adjustment History**: Detailed log of when/why adjustments occurred
- [x] New API endpoints: `/backtest/pnl`, `/backtest/trades`, `/backtest/adjustments`, `/backtest/summary`
- [x] Enhanced frontend UI with trade history and adjustment panels

### Jan 15, 2026 - Mock Data Removal (Complete)
- [x] Removed ALL mock data functions from backend:
  - `get_mock_nifty_spot()` - REMOVED
  - `get_mock_option_premium()` - REMOVED  
  - `get_mock_options_chain()` - REMOVED
- [x] All API endpoints now return `is_connected` and `is_live` flags
- [x] Frontend shows "LIVE" badge when connected to Zerodha
- [x] Frontend shows "DISCONNECTED" badge when not connected
- [x] Strategy start/stop gracefully fails with 503 if no live data
- [x] Paper trading mode now uses live Zerodha data (no mock)

### Jan 14-15, 2026 - Zerodha Integration (Complete)
- [x] Zerodha Kite Connect OAuth integration with token persistence
- [x] Historical data API integration for backtesting
- [x] Separate Backtest page (`/backtest`) with data download feature
- [x] Instrument search and CSV download capability
- [x] Access token stored in MongoDB for session persistence

### Backend (FastAPI + MongoDB) - Complete
- [x] Session management with configuration persistence
- [x] Live market data from Zerodha (spot price, options LTP)
- [x] Strategy engine with automated adjustment logic
- [x] Position tracking with real-time P&L
- [x] Trade history logging
- [x] Stats calculation (premium collected/paid)
- [x] 20+ REST API endpoints
- [x] Backtesting engine with historical data

### Frontend (React + Tailwind + Shadcn) - Complete
- [x] Dark professional trading terminal UI
- [x] Login page with Zerodha OAuth
- [x] Dashboard with live spot price chart
- [x] LIVE/DISCONNECTED connection status badges
- [x] Current positions panel (CE/PE)
- [x] Strategy start/stop controls
- [x] Settings page for configuration
- [x] Trade history with pagination and CSV export
- [x] Backtest page with instrument search and data download
- [x] Real-time polling updates

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Zerodha Kite Connect OAuth integration
- [x] Remove all mock data (Live data only)
- [x] Backtesting feature with historical data

### P1 (Important)
- [ ] Scheduled entry/exit times (9:20 AM - 3:15 PM)
- [ ] Max daily loss auto-exit enforcement
- [ ] WebSocket for real-time data streaming
- [ ] Browser notifications for adjustments

### P2 (Nice to Have)
- [ ] Historical performance analytics
- [ ] Multiple strategy presets
- [ ] Sound alerts
- [ ] Real historical options data for backtesting (instead of Black-Scholes)

## Architecture
```
Frontend (React) → Backend (FastAPI) → MongoDB
                ↓
        Trading Engine (async)
                ↓
        Zerodha Kite API (Live Data)
                ↓
        Historical Data API (Backtesting)
```

## API Endpoints

### Auth & Session
- `GET /api/auth/login-url` - Get Zerodha login URL
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/status` - Check authentication status
- `POST /api/session/create` - Create new trading session
- `GET /api/session/{id}` - Get session details
- `PUT /api/session/{id}/config` - Update configuration

### Market Data (LIVE ONLY)
- `GET /api/market/spot` - Live NIFTY 50 spot price
- `GET /api/market/spot-history` - Historical spot prices from DB
- `GET /api/market/options-chain` - Options chain data

### Strategy
- `POST /api/strategy/start` - Start trading strategy
- `POST /api/strategy/stop` - Stop strategy and exit positions
- `GET /api/strategy/state/{id}` - Get strategy state

### Positions & Trades
- `GET /api/positions/{id}` - Get current positions
- `GET /api/trades/{id}` - Get trade history
- `GET /api/stats/{id}` - Get trading statistics

### Backtesting
- `GET /api/backtest/available-dates` - Get available backtest dates
- `POST /api/backtest/start` - Start backtest session
- `POST /api/backtest/stop` - Stop backtest
- `GET /api/backtest/state` - Get backtest state

### Data Download
- `GET /api/data/search-instruments` - Search instruments
- `GET /api/data/historical` - Download historical data

## Database Schema

### sessions
```json
{
  "id": "uuid",
  "zerodha_user_id": "string",
  "access_token": "string",
  "public_token": "string",
  "login_time": "datetime",
  "config": {
    "lot_size": 1,
    "adjustment_zone": 50,
    "strike_distance": 200,
    "max_daily_loss": null,
    "trading_mode": "paper"
  }
}
```

### strategy_states
```json
{
  "session_id": "uuid",
  "is_active": false,
  "ce_strike": 26000,
  "pe_strike": 25600,
  "ce_symbol": "NIFTY25JAN2650CE",
  "pe_symbol": "NIFTY25JAN2550PE",
  "adjustment_count": 0,
  "last_spot_price": 25800
}
```

### positions, trades, spot_history
- Standard trading data structures

## Key Technical Notes
- Zerodha access token expires daily - user must re-authenticate each day
- Paper trading uses live Zerodha data but doesn't place real orders
- Live trading places actual orders on NSE/NFO
- All pricing requires active Zerodha connection

## Next Tasks
1. Implement scheduled entry/exit times
2. Enforce max daily loss auto-exit
3. Add WebSocket for real-time streaming
