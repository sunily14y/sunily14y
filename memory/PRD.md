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

## What's Been Implemented (Jan 14, 2026)

### Backend (FastAPI + MongoDB)
- [x] Session management with configuration persistence
- [x] Mock market data generators (NIFTY spot, options chain)
- [x] Strategy engine with automated adjustment logic
- [x] Position tracking with real-time P&L
- [x] Trade history logging
- [x] Stats calculation (premium collected/paid)
- [x] 16 REST API endpoints

### Frontend (React + Tailwind + Shadcn)
- [x] Dark professional trading terminal UI
- [x] Login page with session creation
- [x] Dashboard with live spot price chart
- [x] Current positions panel (CE/PE)
- [x] Strategy start/stop controls
- [x] Settings page for configuration
- [x] Trade history with pagination and CSV export
- [x] Real-time polling updates

### Features Complete
- Paper trading mode (fully functional)
- Strategy execution (strangle creation)
- P&L calculation (unrealized/realized)
- Adjustment monitoring (background task)
- Configuration management

## Prioritized Backlog

### P0 (Critical - Blocking Live Trading)
- [ ] Zerodha Kite Connect OAuth integration
- [ ] Real order placement (live mode)
- [ ] Real-time WebSocket data streaming

### P1 (Important)
- [ ] Scheduled entry/exit times (9:20 AM - 3:15 PM)
- [ ] Max daily loss auto-exit
- [ ] Browser notifications for adjustments
- [ ] Options chain viewer

### P2 (Nice to Have)
- [ ] Historical performance analytics
- [ ] Multiple strategy presets
- [ ] Mobile responsive improvements
- [ ] Sound alerts

## Architecture
```
Frontend (React) → Backend (FastAPI) → MongoDB
                ↓
        Trading Engine (async)
                ↓
        Mock Data / Zerodha API
```

## Next Tasks
1. Add Zerodha API credentials to enable live trading
2. Implement scheduled entry/exit logic
3. Add WebSocket for real-time data streaming
