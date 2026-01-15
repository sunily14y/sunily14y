"""
Backtesting module for NIFTY 50 Options Strategy
Uses Yahoo Finance for historical data
"""

import yfinance as yf
import numpy as np
from scipy.stats import norm
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# NIFTY 50 Yahoo Finance symbol
NIFTY_SYMBOL = "^NSEI"

def fetch_historical_data(
    start_date: str,
    end_date: str = None,
    interval: str = "5m"
) -> List[Dict]:
    """
    Fetch historical NIFTY 50 data from Yahoo Finance
    
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format (default: start_date + 1 day)
        interval: Data interval - 1m, 5m, 15m, 1h, 1d
    
    Returns:
        List of price data points with timestamp and OHLC
    """
    try:
        ticker = yf.Ticker(NIFTY_SYMBOL)
        
        # Parse dates
        start = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d")
        else:
            end = start + timedelta(days=1)
        
        # For 1m and 5m data, Yahoo limits to last 60 days
        max_history = datetime.now() - timedelta(days=59)
        if start < max_history and interval in ["1m", "5m"]:
            logger.warning(f"Requested date {start_date} is beyond 60 days. Adjusting...")
            start = max_history
        
        # Fetch data
        df = ticker.history(
            start=start.strftime("%Y-%m-%d"),
            end=end.strftime("%Y-%m-%d"),
            interval=interval
        )
        
        if df.empty:
            logger.error(f"No data found for {start_date}")
            return []
        
        # Convert to list of dicts
        data = []
        for idx, row in df.iterrows():
            # Convert timestamp to IST
            ts = idx.to_pydatetime()
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            
            data.append({
                "timestamp": ts.isoformat(),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
                "volume": int(row["Volume"])
            })
        
        logger.info(f"Fetched {len(data)} data points for {start_date}")
        return data
        
    except Exception as e:
        logger.error(f"Error fetching historical data: {e}")
        return []


def get_available_dates(days: int = 60) -> List[str]:
    """
    Get list of available trading dates for backtesting
    
    Args:
        days: Number of days to look back
    
    Returns:
        List of dates in YYYY-MM-DD format
    """
    try:
        ticker = yf.Ticker(NIFTY_SYMBOL)
        end = datetime.now()
        start = end - timedelta(days=days)
        
        df = ticker.history(start=start, end=end, interval="1d")
        
        if df.empty:
            logger.error("No data returned from Yahoo Finance")
            return []
        
        dates = []
        for idx in df.index:
            # Handle timezone-aware datetime
            if hasattr(idx, 'to_pydatetime'):
                ts = idx.to_pydatetime()
            else:
                ts = idx
            
            # Remove timezone info for formatting
            if hasattr(ts, 'tzinfo') and ts.tzinfo is not None:
                ts = ts.replace(tzinfo=None)
            
            dates.append(ts.strftime("%Y-%m-%d"))
        
        logger.info(f"Found {len(dates)} available dates for backtesting")
        return sorted(dates, reverse=True)  # Most recent first
        
    except Exception as e:
        logger.error(f"Error getting available dates: {e}")
        import traceback
        traceback.print_exc()
        return []


def calculate_option_premium(
    spot_price: float,
    strike_price: float,
    time_to_expiry: float,  # In years
    risk_free_rate: float = 0.07,  # 7% annual
    volatility: float = 0.15,  # 15% annual IV
    option_type: str = "CE"
) -> float:
    """
    Calculate option premium using Black-Scholes model
    
    Args:
        spot_price: Current NIFTY spot price
        strike_price: Option strike price
        time_to_expiry: Time to expiry in years (e.g., 0.02 for ~1 week)
        risk_free_rate: Annual risk-free rate
        volatility: Annual implied volatility
        option_type: "CE" for call, "PE" for put
    
    Returns:
        Option premium
    """
    try:
        S = spot_price
        K = strike_price
        T = max(time_to_expiry, 0.001)  # Minimum time
        r = risk_free_rate
        sigma = volatility
        
        # Black-Scholes formula
        d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        if option_type == "CE":
            # Call option
            price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:
            # Put option
            price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        
        # Add some realistic bid-ask spread and market noise
        spread = max(0.5, price * 0.02)  # 2% or minimum 0.5
        price = price + np.random.uniform(-spread/2, spread/2)
        
        return max(0.5, round(price, 2))  # Minimum premium of 0.5
        
    except Exception as e:
        logger.error(f"Error calculating option premium: {e}")
        return 10.0  # Default fallback


def calculate_iv_from_moneyness(
    spot_price: float,
    strike_price: float,
    base_iv: float = 0.12
) -> float:
    """
    Calculate implied volatility based on moneyness (IV smile)
    OTM options typically have higher IV
    """
    moneyness = abs(strike_price - spot_price) / spot_price
    
    # IV smile - OTM options have higher IV
    iv_adjustment = moneyness * 0.5  # 50% higher IV for 10% OTM
    
    return base_iv + iv_adjustment


def get_weekly_expiry_days(current_date: datetime) -> float:
    """
    Calculate days to weekly expiry (Thursday)
    Returns time in years for Black-Scholes
    """
    days_until_thursday = (3 - current_date.weekday()) % 7
    if days_until_thursday == 0 and current_date.hour >= 15:
        days_until_thursday = 7
    
    # Convert to years (252 trading days)
    return max(days_until_thursday / 252, 0.004)  # Minimum ~1 day


class BacktestEngine:
    """
    Engine to run backtests on historical data
    """
    
    def __init__(self, session_id: str, config: dict):
        self.session_id = session_id
        self.config = config
        self.data: List[Dict] = []
        self.current_index: int = 0
        self.is_running: bool = False
        self.speed: float = 1.0  # 1x, 2x, 5x, 10x
        self.positions: List[Dict] = []
        self.trades: List[Dict] = []
        self.ce_strike: Optional[int] = None
        self.pe_strike: Optional[int] = None
        self.adjustment_count: int = 0
        self.start_time: Optional[datetime] = None
        
        # Enhanced tracking for P&L and history
        self.trade_history: List[Dict] = []  # All trades with details
        self.adjustment_history: List[Dict] = []  # Adjustment events
        self.entry_ce_premium: float = 0.0
        self.entry_pe_premium: float = 0.0
        self.realized_pnl: float = 0.0
        self.lot_size: int = config.get("lot_size", 1) * 25  # NIFTY lot = 25
        
    def load_data(self, date: str) -> bool:
        """Load historical data for a specific date"""
        self.data = fetch_historical_data(date, interval="5m")
        self.current_index = 0
        return len(self.data) > 0
    
    def get_current_candle(self) -> Optional[Dict]:
        """Get current candle in replay"""
        if self.current_index < len(self.data):
            return self.data[self.current_index]
        return None
    
    def get_spot_price(self) -> float:
        """Get current spot price"""
        candle = self.get_current_candle()
        if candle:
            return candle["close"]
        return 0.0
    
    def get_option_premium(self, strike: int, option_type: str) -> float:
        """Calculate option premium for given strike"""
        spot = self.get_spot_price()
        if spot == 0:
            return 0.0
        
        candle = self.get_current_candle()
        if candle:
            ts = datetime.fromisoformat(candle["timestamp"].replace("Z", "+00:00"))
            time_to_expiry = get_weekly_expiry_days(ts)
        else:
            time_to_expiry = 0.02  # ~5 days default
        
        iv = calculate_iv_from_moneyness(spot, strike)
        
        return calculate_option_premium(
            spot_price=spot,
            strike_price=strike,
            time_to_expiry=time_to_expiry,
            volatility=iv,
            option_type=option_type
        )
    
    def advance(self) -> bool:
        """Move to next candle, returns False if at end"""
        if self.current_index < len(self.data) - 1:
            self.current_index += 1
            return True
        return False
    
    def get_progress(self) -> dict:
        """Get current replay progress"""
        total = len(self.data)
        current = self.current_index
        candle = self.get_current_candle()
        
        return {
            "current_index": current,
            "total_candles": total,
            "progress_percent": round((current / total) * 100, 1) if total > 0 else 0,
            "current_timestamp": candle["timestamp"] if candle else None,
            "is_complete": current >= total - 1
        }
    
    def get_remaining_data(self) -> List[Dict]:
        """Get remaining candles for chart"""
        return self.data[self.current_index:]
    
    def get_past_data(self, count: int = 50) -> List[Dict]:
        """Get past candles for chart"""
        start = max(0, self.current_index - count)
        return self.data[start:self.current_index + 1]


# Global backtest sessions storage
backtest_sessions: Dict[str, BacktestEngine] = {}


def get_backtest_engine(session_id: str) -> Optional[BacktestEngine]:
    """Get backtest engine for session"""
    return backtest_sessions.get(session_id)


def create_backtest_engine(session_id: str, config: dict) -> BacktestEngine:
    """Create new backtest engine for session"""
    engine = BacktestEngine(session_id, config)
    backtest_sessions[session_id] = engine
    return engine


def remove_backtest_engine(session_id: str):
    """Remove backtest engine"""
    if session_id in backtest_sessions:
        del backtest_sessions[session_id]
