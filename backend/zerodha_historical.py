"""
Zerodha Historical Data Integration for Backtesting
Uses Kite Connect Historical Data API
"""

from kiteconnect import KiteConnect
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Tuple
import logging
import os
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Instrument tokens for common indices
INSTRUMENT_TOKENS = {
    "NIFTY 50": 256265,
    "NIFTY BANK": 260105,
    "INDIA VIX": 264969,
}

async def get_kite_with_token() -> Optional[KiteConnect]:
    """Get Kite instance with valid access token from database"""
    try:
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME')
        api_key = os.environ.get('ZERODHA_API_KEY')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Get latest session with access token
        session = await db.sessions.find_one(
            {"access_token": {"$exists": True, "$ne": None}},
            {"_id": 0},
            sort=[("login_time", -1)]
        )
        
        client.close()
        
        if session and session.get("access_token"):
            kite = KiteConnect(api_key=api_key)
            kite.set_access_token(session["access_token"])
            return kite
        
        return None
    except Exception as e:
        logger.error(f"Error getting Kite instance: {e}")
        return None


def get_kite_sync(access_token: str) -> KiteConnect:
    """Get Kite instance with provided access token (sync version)"""
    api_key = os.environ.get('ZERODHA_API_KEY')
    kite = KiteConnect(api_key=api_key)
    kite.set_access_token(access_token)
    return kite


async def fetch_zerodha_historical(
    date: str,
    instrument_token: int = 256265,
    interval: str = "5minute"
) -> List[Dict]:
    """
    Fetch historical data from Zerodha for a specific date
    
    Args:
        date: Date in YYYY-MM-DD format
        instrument_token: Zerodha instrument token (default: NIFTY 50)
        interval: minute, 3minute, 5minute, 15minute, 30minute, 60minute, day
    
    Returns:
        List of OHLCV candles
    """
    try:
        kite = await get_kite_with_token()
        if not kite:
            logger.error("No valid Kite session found")
            return []
        
        # Parse date
        start_date = datetime.strptime(date, "%Y-%m-%d")
        end_date = start_date + timedelta(days=1)
        
        # Fetch data
        data = kite.historical_data(
            instrument_token=instrument_token,
            from_date=start_date,
            to_date=end_date,
            interval=interval
        )
        
        # Convert to standard format
        candles = []
        for row in data:
            candles.append({
                "timestamp": row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"]),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"])
            })
        
        logger.info(f"Fetched {len(candles)} candles from Zerodha for {date}")
        return candles
        
    except Exception as e:
        logger.error(f"Error fetching Zerodha historical data: {e}")
        return []


def fetch_zerodha_historical_sync(
    kite: KiteConnect,
    date: str,
    instrument_token: int = 256265,
    interval: str = "5minute"
) -> List[Dict]:
    """Synchronous version for use in thread pool"""
    try:
        start_date = datetime.strptime(date, "%Y-%m-%d")
        end_date = start_date + timedelta(days=1)
        
        data = kite.historical_data(
            instrument_token=instrument_token,
            from_date=start_date,
            to_date=end_date,
            interval=interval
        )
        
        candles = []
        for row in data:
            candles.append({
                "timestamp": row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"]),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"])
            })
        
        return candles
    except Exception as e:
        logger.error(f"Error in sync fetch: {e}")
        return []


async def fetch_option_historical(
    date: str,
    strike: int,
    option_type: str,  # "CE" or "PE"
    expiry_date: str = None
) -> List[Dict]:
    """
    Fetch historical data for a NIFTY option
    
    Args:
        date: Trading date in YYYY-MM-DD format
        strike: Strike price (e.g., 26000)
        option_type: "CE" or "PE"
        expiry_date: Expiry date (if None, uses nearest weekly expiry)
    """
    try:
        kite = await get_kite_with_token()
        if not kite:
            return []
        
        # Get NFO instruments
        instruments = kite.instruments("NFO")
        
        # Find the specific option
        target_symbol = None
        for inst in instruments:
            if (inst["name"] == "NIFTY" and 
                inst["strike"] == strike and 
                inst["instrument_type"] == option_type):
                target_symbol = inst
                break
        
        if not target_symbol:
            logger.error(f"Option not found: NIFTY {strike} {option_type}")
            return []
        
        # Fetch historical data
        start_date = datetime.strptime(date, "%Y-%m-%d")
        end_date = start_date + timedelta(days=1)
        
        data = kite.historical_data(
            instrument_token=target_symbol["instrument_token"],
            from_date=start_date,
            to_date=end_date,
            interval="5minute"
        )
        
        candles = []
        for row in data:
            candles.append({
                "timestamp": row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"]),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"])
            })
        
        return candles
        
    except Exception as e:
        logger.error(f"Error fetching option historical: {e}")
        return []


async def get_available_trading_dates(days: int = 60) -> List[str]:
    """Get list of trading dates from Zerodha"""
    try:
        kite = await get_kite_with_token()
        if not kite:
            return []
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Fetch daily data to get trading dates
        data = kite.historical_data(
            instrument_token=256265,  # NIFTY 50
            from_date=start_date,
            to_date=end_date,
            interval="day"
        )
        
        dates = []
        for row in data:
            dt = row["date"]
            if hasattr(dt, "strftime"):
                dates.append(dt.strftime("%Y-%m-%d"))
            else:
                dates.append(str(dt)[:10])
        
        return sorted(dates, reverse=True)
        
    except Exception as e:
        logger.error(f"Error getting trading dates: {e}")
        return []


def get_available_trading_dates_sync(kite: KiteConnect, days: int = 60) -> List[str]:
    """Synchronous version for thread pool"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        data = kite.historical_data(
            instrument_token=256265,
            from_date=start_date,
            to_date=end_date,
            interval="day"
        )
        
        dates = []
        for row in data:
            dt = row["date"]
            if hasattr(dt, "strftime"):
                dates.append(dt.strftime("%Y-%m-%d"))
            else:
                dates.append(str(dt)[:10])
        
        return sorted(dates, reverse=True)
        
    except Exception as e:
        logger.error(f"Error in sync get dates: {e}")
        return []


async def get_nifty_options_chain(expiry: str = None) -> List[Dict]:
    """Get current NIFTY options chain with strikes"""
    try:
        kite = await get_kite_with_token()
        if not kite:
            return []
        
        instruments = kite.instruments("NFO")
        
        # Filter NIFTY options
        options = []
        for inst in instruments:
            if inst["name"] == "NIFTY" and inst["instrument_type"] in ["CE", "PE"]:
                options.append({
                    "symbol": inst["tradingsymbol"],
                    "strike": inst["strike"],
                    "type": inst["instrument_type"],
                    "expiry": str(inst["expiry"]),
                    "instrument_token": inst["instrument_token"],
                    "lot_size": inst["lot_size"]
                })
        
        return options
        
    except Exception as e:
        logger.error(f"Error getting options chain: {e}")
        return []
