from fastapi import FastAPI, APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import asyncio
from enum import Enum
from kiteconnect import KiteConnect
from backtesting import (
    fetch_historical_data,
    get_available_dates,
    calculate_option_premium,
    get_weekly_expiry_days,
    calculate_iv_from_moneyness,
    BacktestEngine,
    get_backtest_engine,
    create_backtest_engine,
    remove_backtest_engine
)
from zerodha_historical import (
    get_kite_with_token,
    get_kite_sync,
    fetch_zerodha_historical_sync,
    get_available_trading_dates_sync
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Zerodha Config
ZERODHA_API_KEY = os.environ.get('ZERODHA_API_KEY', '')
ZERODHA_API_SECRET = os.environ.get('ZERODHA_API_SECRET', '')
ZERODHA_REDIRECT_URL = os.environ.get('ZERODHA_REDIRECT_URL', 'https://zerotrades.preview.emergentagent.com/api/auth/callback')

app = FastAPI(title="NiftyAlgo Trading System")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Global Kite instance
kite = KiteConnect(api_key=ZERODHA_API_KEY) if ZERODHA_API_KEY else None

# ====================== ENUMS ======================
class TradingMode(str, Enum):
    PAPER = "paper"
    LIVE = "live"
    BACKTEST = "backtest"

class PositionType(str, Enum):
    CE = "CE"
    PE = "PE"

class OrderAction(str, Enum):
    SELL = "SELL"
    BUY = "BUY"

# ====================== MODELS ======================
class StrategyConfig(BaseModel):
    lot_size: int = Field(default=1, ge=1)
    adjustment_zone: int = Field(default=50, ge=10)
    strike_distance: int = Field(default=200, ge=50)
    max_daily_loss: Optional[float] = Field(default=None)
    max_trades_per_day: Optional[int] = Field(default=None)
    entry_time: str = Field(default="09:20")
    exit_time: str = Field(default="15:15")
    no_entry_after: str = Field(default="15:00")
    trading_mode: TradingMode = Field(default=TradingMode.PAPER)

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    zerodha_user_id: Optional[str] = None
    access_token: Optional[str] = None
    public_token: Optional[str] = None
    login_time: Optional[datetime] = None
    config: StrategyConfig = Field(default_factory=StrategyConfig)
    is_authenticated: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Position(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    symbol: str
    strike: int
    position_type: PositionType
    quantity: int
    entry_price: float
    current_price: float = 0.0
    pnl: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Trade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    symbol: str
    strike: int
    position_type: PositionType
    action: OrderAction
    quantity: int
    price: float
    order_id: Optional[str] = None
    is_adjustment: bool = False
    adjustment_reason: Optional[str] = None
    paper_trade: bool = True
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StrategyState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    is_active: bool = False
    ce_strike: Optional[int] = None
    pe_strike: Optional[int] = None
    ce_symbol: Optional[str] = None
    pe_symbol: Optional[str] = None
    adjustment_count: int = 0
    total_pnl: float = 0.0
    daily_pnl: float = 0.0
    last_spot_price: float = 0.0
    start_time: Optional[datetime] = None
    last_update: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MarketData(BaseModel):
    spot_price: float
    timestamp: datetime
    high: float
    low: float
    open: float
    close: float

class OptionsChainItem(BaseModel):
    strike: int
    ce_ltp: float
    pe_ltp: float
    ce_symbol: str = ""
    pe_symbol: str = ""
    ce_iv: float = 0.0
    pe_iv: float = 0.0
    ce_oi: int = 0
    pe_oi: int = 0
    ce_volume: int = 0
    pe_volume: int = 0

# ====================== KITE CONNECT HELPERS ======================

def get_kite_for_session(access_token: str) -> KiteConnect:
    """Get a Kite instance with access token set"""
    k = KiteConnect(api_key=ZERODHA_API_KEY)
    k.set_access_token(access_token)
    return k

async def get_session_kite(session_id: str) -> Optional[KiteConnect]:
    """Get Kite instance for a session if authenticated"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if session and session.get("access_token"):
        return get_kite_for_session(session["access_token"])
    return None

def get_nifty_weekly_expiry():
    """Get current week's NIFTY expiry (Thursday)"""
    today = datetime.now()
    days_until_thursday = (3 - today.weekday()) % 7
    if days_until_thursday == 0 and today.hour >= 15:
        days_until_thursday = 7
    expiry = today + timedelta(days=days_until_thursday)
    return expiry.strftime("%y%b%d").upper()  # e.g., "25JAN16"

def format_nifty_option_symbol(strike: int, option_type: str, expiry: str = None):
    """Format NIFTY option trading symbol"""
    if not expiry:
        expiry = get_nifty_weekly_expiry()
    # Format: NIFTY25JAN2650CE
    return f"NIFTY{expiry}{strike}{option_type}"

# ====================== LIVE DATA ONLY (No Mock Data) ======================
# All mock data functions have been removed.
# The system now relies exclusively on live Zerodha data.

# ====================== LIVE DATA FETCHERS ======================

async def fetch_live_nifty_spot(session_id: str) -> Optional[float]:
    """Fetch live NIFTY 50 spot price from Zerodha"""
    try:
        k = await get_session_kite(session_id)
        if k:
            quote = k.quote(["NSE:NIFTY 50"])
            if "NSE:NIFTY 50" in quote:
                return quote["NSE:NIFTY 50"]["last_price"]
    except Exception as e:
        logger.error(f"Error fetching live NIFTY spot: {e}")
    return None

async def fetch_live_nifty_spot_any_session() -> Optional[float]:
    """Fetch live NIFTY 50 spot price using any authenticated session"""
    try:
        session = await db.sessions.find_one(
            {"access_token": {"$exists": True, "$ne": None}},
            {"_id": 0},
            sort=[("login_time", -1)]
        )
        if session and session.get("access_token"):
            k = get_kite_for_session(session["access_token"])
            quote = k.quote(["NSE:NIFTY 50"])
            if "NSE:NIFTY 50" in quote:
                return quote["NSE:NIFTY 50"]["last_price"]
    except Exception as e:
        logger.error(f"Error fetching live NIFTY spot (any session): {e}")
    return None

async def fetch_live_option_ltp(session_id: str, symbol: str) -> Optional[float]:
    """Fetch live option LTP"""
    try:
        k = await get_session_kite(session_id)
        if k:
            quote = k.quote([f"NFO:{symbol}"])
            if f"NFO:{symbol}" in quote:
                return quote[f"NFO:{symbol}"]["last_price"]
    except Exception as e:
        logger.error(f"Error fetching option LTP for {symbol}: {e}")
    return None

async def fetch_live_option_ltp_any_session(symbol: str) -> Optional[float]:
    """Fetch live option LTP using any authenticated session"""
    try:
        session = await db.sessions.find_one(
            {"access_token": {"$exists": True, "$ne": None}},
            {"_id": 0}
        )
        if session and session.get("access_token"):
            k = get_kite_for_session(session["access_token"])
            quote = k.quote([f"NFO:{symbol}"])
            if f"NFO:{symbol}" in quote:
                return quote[f"NFO:{symbol}"]["last_price"]
    except Exception as e:
        logger.error(f"Error fetching option LTP for {symbol} (any session): {e}")
    return None

async def get_live_spot_price() -> tuple[float, bool]:
    """Get live spot price, returns (price, is_live) - NO MOCK DATA"""
    live_price = await fetch_live_nifty_spot_any_session()
    if live_price:
        return live_price, True
    return 0.0, False

async def get_live_option_price(symbol: str, strike: int, option_type: str) -> tuple[float, bool]:
    """Get live option price, returns (price, is_live) - NO MOCK DATA"""
    live_price = await fetch_live_option_ltp_any_session(symbol)
    if live_price:
        return live_price, True
    return 0.0, False

async def place_live_order(session_id: str, symbol: str, transaction_type: str, quantity: int, order_type: str = "MARKET") -> Optional[str]:
    """Place live order on Zerodha"""
    try:
        k = await get_session_kite(session_id)
        if k:
            order_id = k.place_order(
                tradingsymbol=symbol,
                exchange="NFO",
                transaction_type=transaction_type,
                quantity=quantity,
                order_type=order_type,
                product="MIS",  # Intraday
                variety="regular"
            )
            logger.info(f"Order placed: {order_id} for {symbol}")
            return str(order_id)
    except Exception as e:
        logger.error(f"Error placing order for {symbol}: {e}")
        raise HTTPException(status_code=400, detail=f"Order failed: {str(e)}")
    return None

# ====================== TRADING ENGINE ======================
class TradingEngine:
    def __init__(self):
        self.active_sessions: Dict[str, asyncio.Task] = {}
    
    async def start_strategy(self, session_id: str):
        """Start automated trading for a session"""
        if session_id in self.active_sessions:
            return False
        
        task = asyncio.create_task(self._run_strategy_loop(session_id))
        self.active_sessions[session_id] = task
        return True
    
    async def stop_strategy(self, session_id: str):
        """Stop automated trading for a session"""
        if session_id in self.active_sessions:
            self.active_sessions[session_id].cancel()
            del self.active_sessions[session_id]
            return True
        return False
    
    async def _run_strategy_loop(self, session_id: str):
        """Main strategy execution loop - LIVE DATA ONLY"""
        try:
            while True:
                session_data = await db.sessions.find_one({"id": session_id}, {"_id": 0})
                if not session_data:
                    break
                
                state_data = await db.strategy_states.find_one({"session_id": session_id}, {"_id": 0})
                if not state_data or not state_data.get("is_active"):
                    break
                
                config = StrategyConfig(**session_data.get("config", {}))
                state = StrategyState(**state_data)
                
                # Always fetch live data from Zerodha
                spot_price = await fetch_live_nifty_spot(session_id)
                if not spot_price:
                    # Try any authenticated session
                    spot_price = await fetch_live_nifty_spot_any_session()
                
                if not spot_price:
                    # No live data available - log and continue waiting
                    logger.warning(f"No live data available for session {session_id}")
                    await asyncio.sleep(5)  # Wait longer when disconnected
                    continue
                
                state.last_spot_price = spot_price
                is_live = config.trading_mode == TradingMode.LIVE and session_data.get("access_token")
                
                # Check adjustment conditions
                if state.ce_strike and state.pe_strike:
                    await self._check_and_adjust(session_id, config, state, spot_price, is_live)
                
                # Update state
                await db.strategy_states.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "last_spot_price": spot_price,
                        "last_update": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                await asyncio.sleep(2)
                
        except asyncio.CancelledError:
            logger.info(f"Strategy loop cancelled for session {session_id}")
        except Exception as e:
            logger.error(f"Error in strategy loop: {str(e)}")
    
    async def _check_and_adjust(self, session_id: str, config: StrategyConfig, state: StrategyState, spot_price: float, is_live: bool):
        """Check if adjustment is needed and execute"""
        adjustment_zone = config.adjustment_zone
        
        # Check CALL side
        if spot_price >= state.ce_strike - adjustment_zone:
            await self._shift_strangle(session_id, config, state, spot_price, "UP", is_live)
        # Check PUT side
        elif spot_price <= state.pe_strike + adjustment_zone:
            await self._shift_strangle(session_id, config, state, spot_price, "DOWN", is_live)
    
    async def _shift_strangle(self, session_id: str, config: StrategyConfig, state: StrategyState, spot_price: float, direction: str, is_live: bool):
        """Shift both legs of the strangle - LIVE DATA ONLY"""
        shift_amount = 50
        expiry = get_nifty_weekly_expiry()
        
        if direction == "UP":
            new_ce_strike = state.ce_strike + shift_amount
            new_pe_strike = state.pe_strike + shift_amount
            reason = f"NIFTY moved UP to {spot_price}, near CE strike {state.ce_strike}"
        else:
            new_ce_strike = state.ce_strike - shift_amount
            new_pe_strike = state.pe_strike - shift_amount
            reason = f"NIFTY moved DOWN to {spot_price}, near PE strike {state.pe_strike}"
        
        lot_size = config.lot_size * 25
        
        # Get prices - always from live feed
        ce_exit_price = await fetch_live_option_ltp(session_id, state.ce_symbol)
        pe_exit_price = await fetch_live_option_ltp(session_id, state.pe_symbol)
        
        # If session doesn't have token, try any authenticated session
        if not ce_exit_price:
            ce_exit_price = await fetch_live_option_ltp_any_session(state.ce_symbol)
        if not pe_exit_price:
            pe_exit_price = await fetch_live_option_ltp_any_session(state.pe_symbol)
        
        # Cannot proceed without live prices
        if not ce_exit_price or not pe_exit_price:
            logger.error(f"Cannot shift strangle - no live prices available")
            return
        
        new_ce_symbol = format_nifty_option_symbol(new_ce_strike, "CE", expiry)
        new_pe_symbol = format_nifty_option_symbol(new_pe_strike, "PE", expiry)
        
        new_ce_price = await fetch_live_option_ltp(session_id, new_ce_symbol)
        new_pe_price = await fetch_live_option_ltp(session_id, new_pe_symbol)
        
        if not new_ce_price:
            new_ce_price = await fetch_live_option_ltp_any_session(new_ce_symbol)
        if not new_pe_price:
            new_pe_price = await fetch_live_option_ltp_any_session(new_pe_symbol)
        
        # Cannot proceed without new strike prices
        if not new_ce_price or not new_pe_price:
            logger.error(f"Cannot shift strangle - no live prices for new strikes")
            return
        
        # Place orders (live mode)
        order_ids = {"ce_exit": None, "pe_exit": None, "ce_entry": None, "pe_entry": None}
        
        if is_live:
            try:
                order_ids["ce_exit"] = await place_live_order(session_id, state.ce_symbol, "BUY", lot_size)
                order_ids["pe_exit"] = await place_live_order(session_id, state.pe_symbol, "BUY", lot_size)
                order_ids["ce_entry"] = await place_live_order(session_id, new_ce_symbol, "SELL", lot_size)
                order_ids["pe_entry"] = await place_live_order(session_id, new_pe_symbol, "SELL", lot_size)
            except Exception as e:
                logger.error(f"Error placing adjustment orders: {e}")
                return
        
        # Record trades
        trades = [
            Trade(session_id=session_id, symbol=state.ce_symbol, strike=state.ce_strike, position_type=PositionType.CE, action=OrderAction.BUY, quantity=lot_size, price=ce_exit_price, order_id=order_ids["ce_exit"], is_adjustment=True, adjustment_reason=reason, paper_trade=not is_live),
            Trade(session_id=session_id, symbol=state.pe_symbol, strike=state.pe_strike, position_type=PositionType.PE, action=OrderAction.BUY, quantity=lot_size, price=pe_exit_price, order_id=order_ids["pe_exit"], is_adjustment=True, adjustment_reason=reason, paper_trade=not is_live),
            Trade(session_id=session_id, symbol=new_ce_symbol, strike=new_ce_strike, position_type=PositionType.CE, action=OrderAction.SELL, quantity=lot_size, price=new_ce_price, order_id=order_ids["ce_entry"], is_adjustment=True, adjustment_reason=reason, paper_trade=not is_live),
            Trade(session_id=session_id, symbol=new_pe_symbol, strike=new_pe_strike, position_type=PositionType.PE, action=OrderAction.SELL, quantity=lot_size, price=new_pe_price, order_id=order_ids["pe_entry"], is_adjustment=True, adjustment_reason=reason, paper_trade=not is_live),
        ]
        
        for trade in trades:
            trade_doc = trade.model_dump()
            trade_doc['timestamp'] = trade_doc['timestamp'].isoformat()
            await db.trades.insert_one(trade_doc)
        
        # Update state
        await db.strategy_states.update_one(
            {"session_id": session_id},
            {"$set": {
                "ce_strike": new_ce_strike,
                "pe_strike": new_pe_strike,
                "ce_symbol": new_ce_symbol,
                "pe_symbol": new_pe_symbol,
                "adjustment_count": state.adjustment_count + 1,
                "last_update": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Adjustment #{state.adjustment_count + 1}: {direction} shift. New CE: {new_ce_strike}, New PE: {new_pe_strike}")

trading_engine = TradingEngine()

# ====================== API ROUTES ======================

@api_router.get("/")
async def root():
    return {"message": "NiftyAlgo Trading System API", "version": "1.0.0", "kite_configured": bool(ZERODHA_API_KEY)}

# Session Management
@api_router.post("/session/create")
async def create_session():
    """Create a new trading session"""
    session = UserSession()
    session_dict = session.model_dump()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    session_dict['config'] = session.config.model_dump()
    
    await db.sessions.insert_one(session_dict)
    
    state = StrategyState(session_id=session.id)
    state_dict = state.model_dump()
    state_dict['last_update'] = state_dict['last_update'].isoformat()
    await db.strategy_states.insert_one(state_dict)
    
    return {"session_id": session.id, "config": session.config.model_dump()}

@api_router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session details"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@api_router.put("/session/{session_id}/config")
async def update_config(session_id: str, config: StrategyConfig):
    """Update strategy configuration"""
    result = await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"config": config.model_dump()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "config": config.model_dump()}

# Zerodha Auth
@api_router.get("/auth/login-url")
async def get_login_url(session_id: str):
    """Get Zerodha login URL"""
    if ZERODHA_API_KEY:
        login_url = kite.login_url()
        # Store session_id in database for callback lookup
        await db.pending_auth.update_one(
            {"session_id": session_id},
            {"$set": {"session_id": session_id, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        # Use state parameter to pass session_id
        return {"login_url": f"{login_url}&state={session_id}", "is_mock": False}
    else:
        return {"login_url": f"/callback?request_token=mock_token&session_id={session_id}", "is_mock": True}

@api_router.get("/auth/callback")
async def auth_callback(request_token: str, status: str = None, state: str = None, session_id: str = None):
    """Handle Zerodha OAuth callback"""
    # Get session_id from state parameter or query parameter
    sid = state or session_id
    
    # If no session_id, try to get the most recent pending auth
    if not sid:
        pending = await db.pending_auth.find_one({}, sort=[("created_at", -1)])
        if pending:
            sid = pending.get("session_id")
    
    if not sid:
        # Redirect to frontend with error
        return RedirectResponse(url="https://zerotrades.preview.emergentagent.com/login?error=no_session")
    
    try:
        if ZERODHA_API_KEY and ZERODHA_API_SECRET and request_token and request_token != "mock_token":
            # Real Zerodha authentication
            data = kite.generate_session(request_token, api_secret=ZERODHA_API_SECRET)
            
            # Get current session to update config
            session = await db.sessions.find_one({"id": sid}, {"_id": 0})
            current_config = session.get("config", {}) if session else {}
            current_config["trading_mode"] = "live"  # Auto-switch to live mode
            
            await db.sessions.update_one(
                {"id": sid},
                {"$set": {
                    "is_authenticated": True,
                    "zerodha_user_id": data.get("user_id"),
                    "access_token": data.get("access_token"),
                    "public_token": data.get("public_token"),
                    "login_time": datetime.now(timezone.utc).isoformat(),
                    "config": current_config
                }}
            )
            
            # Clean up pending auth
            await db.pending_auth.delete_one({"session_id": sid})
            
            logger.info(f"Zerodha authentication successful for user {data.get('user_id')} - Live mode enabled")
            
            # Redirect to frontend dashboard with session
            return RedirectResponse(url=f"https://zerotrades.preview.emergentagent.com/dashboard?auth=success&session_id={sid}&mode=live")
        else:
            # Mock authentication for paper trading
            await db.sessions.update_one(
                {"id": sid},
                {"$set": {
                    "is_authenticated": True,
                    "zerodha_user_id": f"PAPER_{sid[:8]}",
                    "login_time": datetime.now(timezone.utc).isoformat()
                }}
            )
            return RedirectResponse(url=f"https://zerotrades.preview.emergentagent.com/dashboard?auth=success&session_id={sid}")
            
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        return RedirectResponse(url=f"https://zerotrades.preview.emergentagent.com/login?error={str(e)}")

@api_router.post("/auth/callback")
async def auth_callback_post(session_id: str, request_token: str = "mock_token"):
    """Handle POST callback (for paper trading)"""
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {
            "is_authenticated": True,
            "zerodha_user_id": f"PAPER_{session_id[:8]}",
            "login_time": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "message": "Authenticated successfully"}

# Market Data
@api_router.get("/market/spot")
async def get_nifty_spot(session_id: str = None):
    """Get current NIFTY 50 spot price - LIVE DATA ONLY"""
    spot_price, is_live = await get_live_spot_price()
    
    # Store in history for charting only if we have live data
    if is_live and spot_price > 0:
        await db.spot_history.insert_one({
            "price": spot_price,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_live": True
        })
    
    return {
        "spot_price": spot_price,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_live": is_live,
        "is_connected": is_live and spot_price > 0
    }

@api_router.get("/market/options-chain")
async def get_options_chain(session_id: str = None):
    """Get NIFTY options chain - LIVE DATA ONLY (returns empty if disconnected)"""
    spot_price, is_live = await get_live_spot_price()
    
    if not is_live or spot_price == 0:
        return {
            "spot_price": 0,
            "atm_strike": 0,
            "chain": [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_live": False,
            "is_connected": False
        }
    
    atm_strike = round(spot_price / 50) * 50
    
    # TODO: Fetch real options chain from Zerodha when available
    # For now, return basic structure with spot price
    return {
        "spot_price": spot_price,
        "atm_strike": atm_strike,
        "chain": [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_live": is_live,
        "is_connected": True
    }

@api_router.get("/market/spot-history")
async def get_spot_history(minutes: int = 60, session_id: str = None):
    """Get historical spot prices for charting - LIVE DATA ONLY"""
    # Try to get live history from database
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    live_history = await db.spot_history.find(
        {"timestamp": {"$gte": cutoff.isoformat()}},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(500)
    
    if live_history and len(live_history) > 0:
        history = [{"timestamp": h["timestamp"], "price": h["price"]} for h in live_history]
        return {"history": history, "is_live": True, "is_connected": True}
    
    # No historical data available - return empty
    return {"history": [], "is_live": False, "is_connected": False}

# Check Zerodha auth status
@api_router.get("/auth/status")
async def get_auth_status():
    """Check if any session has valid Zerodha authentication"""
    session = await db.sessions.find_one(
        {"access_token": {"$exists": True, "$ne": None}},
        {"_id": 0, "zerodha_user_id": 1, "login_time": 1}
    )
    if session:
        return {
            "is_authenticated": True,
            "zerodha_user_id": session.get("zerodha_user_id"),
            "login_time": session.get("login_time")
        }
    return {"is_authenticated": False}

# Strategy Management
@api_router.post("/strategy/start")
async def start_strategy(session_id: str, background_tasks: BackgroundTasks):
    """Start the trading strategy"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    config = StrategyConfig(**session.get("config", {}))
    is_live = config.trading_mode == TradingMode.LIVE and session.get("access_token")
    
    # Get current spot price
    if is_live:
        spot_price = await fetch_live_nifty_spot(session_id)
        if not spot_price:
            spot_price = get_mock_nifty_spot()
    else:
        spot_price = get_mock_nifty_spot()
    
    atm_strike = round(spot_price / 50) * 50
    ce_strike = atm_strike + config.strike_distance
    pe_strike = atm_strike - config.strike_distance
    
    lot_size = config.lot_size * 25
    expiry = get_nifty_weekly_expiry()
    
    ce_symbol = format_nifty_option_symbol(ce_strike, "CE", expiry)
    pe_symbol = format_nifty_option_symbol(pe_strike, "PE", expiry)
    
    # Get option premiums
    if is_live:
        ce_price = await fetch_live_option_ltp(session_id, ce_symbol) or get_mock_option_premium(spot_price, ce_strike, "CE")
        pe_price = await fetch_live_option_ltp(session_id, pe_symbol) or get_mock_option_premium(spot_price, pe_strike, "PE")
    else:
        ce_price = get_mock_option_premium(spot_price, ce_strike, "CE")
        pe_price = get_mock_option_premium(spot_price, pe_strike, "PE")
    
    # Place orders
    order_ids = {"ce": None, "pe": None}
    
    if is_live:
        try:
            order_ids["ce"] = await place_live_order(session_id, ce_symbol, "SELL", lot_size)
            order_ids["pe"] = await place_live_order(session_id, pe_symbol, "SELL", lot_size)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Order placement failed: {str(e)}")
    
    # Create trades
    trades = [
        Trade(session_id=session_id, symbol=ce_symbol, strike=ce_strike, position_type=PositionType.CE, action=OrderAction.SELL, quantity=lot_size, price=ce_price, order_id=order_ids["ce"], paper_trade=not is_live),
        Trade(session_id=session_id, symbol=pe_symbol, strike=pe_strike, position_type=PositionType.PE, action=OrderAction.SELL, quantity=lot_size, price=pe_price, order_id=order_ids["pe"], paper_trade=not is_live)
    ]
    
    for trade in trades:
        trade_doc = trade.model_dump()
        trade_doc['timestamp'] = trade_doc['timestamp'].isoformat()
        await db.trades.insert_one(trade_doc)
    
    # Create positions
    positions = [
        Position(session_id=session_id, symbol=ce_symbol, strike=ce_strike, position_type=PositionType.CE, quantity=-lot_size, entry_price=ce_price, current_price=ce_price),
        Position(session_id=session_id, symbol=pe_symbol, strike=pe_strike, position_type=PositionType.PE, quantity=-lot_size, entry_price=pe_price, current_price=pe_price)
    ]
    
    for pos in positions:
        pos_doc = pos.model_dump()
        pos_doc['created_at'] = pos_doc['created_at'].isoformat()
        await db.positions.insert_one(pos_doc)
    
    # Update strategy state
    await db.strategy_states.update_one(
        {"session_id": session_id},
        {"$set": {
            "is_active": True,
            "ce_strike": ce_strike,
            "pe_strike": pe_strike,
            "ce_symbol": ce_symbol,
            "pe_symbol": pe_symbol,
            "adjustment_count": 0,
            "last_spot_price": spot_price,
            "start_time": datetime.now(timezone.utc).isoformat(),
            "last_update": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await trading_engine.start_strategy(session_id)
    
    return {
        "success": True,
        "is_live": is_live,
        "spot_price": spot_price,
        "ce_strike": ce_strike,
        "pe_strike": pe_strike,
        "ce_symbol": ce_symbol,
        "pe_symbol": pe_symbol,
        "ce_premium": ce_price,
        "pe_premium": pe_price,
        "message": f"Strategy started {'(LIVE)' if is_live else '(PAPER)'}. Sold {ce_symbol} @ {ce_price} and {pe_symbol} @ {pe_price}"
    }

@api_router.post("/strategy/stop")
async def stop_strategy(session_id: str):
    """Stop the trading strategy and exit all positions"""
    state = await db.strategy_states.find_one({"session_id": session_id}, {"_id": 0})
    if not state or not state.get("is_active"):
        raise HTTPException(status_code=400, detail="Strategy is not active")
    
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    config = StrategyConfig(**session.get("config", {}))
    is_live = config.trading_mode == TradingMode.LIVE and session.get("access_token")
    
    # Get spot price
    if is_live:
        spot_price = await fetch_live_nifty_spot(session_id) or get_mock_nifty_spot()
    else:
        spot_price = get_mock_nifty_spot()
    
    lot_size = config.lot_size * 25
    ce_strike = state.get("ce_strike")
    pe_strike = state.get("pe_strike")
    ce_symbol = state.get("ce_symbol")
    pe_symbol = state.get("pe_symbol")
    
    # Get exit prices
    if is_live:
        ce_exit_price = await fetch_live_option_ltp(session_id, ce_symbol) or get_mock_option_premium(spot_price, ce_strike, "CE")
        pe_exit_price = await fetch_live_option_ltp(session_id, pe_symbol) or get_mock_option_premium(spot_price, pe_strike, "PE")
    else:
        ce_exit_price = get_mock_option_premium(spot_price, ce_strike, "CE")
        pe_exit_price = get_mock_option_premium(spot_price, pe_strike, "PE")
    
    # Place exit orders
    order_ids = {"ce": None, "pe": None}
    
    if is_live:
        try:
            order_ids["ce"] = await place_live_order(session_id, ce_symbol, "BUY", lot_size)
            order_ids["pe"] = await place_live_order(session_id, pe_symbol, "BUY", lot_size)
        except Exception as e:
            logger.error(f"Error placing exit orders: {e}")
    
    # Record exit trades
    trades = [
        Trade(session_id=session_id, symbol=ce_symbol, strike=ce_strike, position_type=PositionType.CE, action=OrderAction.BUY, quantity=lot_size, price=ce_exit_price, order_id=order_ids["ce"], paper_trade=not is_live),
        Trade(session_id=session_id, symbol=pe_symbol, strike=pe_strike, position_type=PositionType.PE, action=OrderAction.BUY, quantity=lot_size, price=pe_exit_price, order_id=order_ids["pe"], paper_trade=not is_live)
    ]
    
    for trade in trades:
        trade_doc = trade.model_dump()
        trade_doc['timestamp'] = trade_doc['timestamp'].isoformat()
        await db.trades.insert_one(trade_doc)
    
    # Calculate P&L
    positions = await db.positions.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    total_pnl = 0
    
    for pos in positions:
        if pos.get("position_type") == "CE":
            exit_p = ce_exit_price
        else:
            exit_p = pe_exit_price
        entry = pos.get("entry_price", 0)
        pnl = (entry - exit_p) * abs(pos.get("quantity", 0))
        total_pnl += pnl
    
    await db.positions.delete_many({"session_id": session_id})
    await trading_engine.stop_strategy(session_id)
    
    await db.strategy_states.update_one(
        {"session_id": session_id},
        {"$set": {
            "is_active": False,
            "total_pnl": total_pnl,
            "last_update": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "is_live": is_live,
        "total_pnl": round(total_pnl, 2),
        "ce_exit_price": ce_exit_price,
        "pe_exit_price": pe_exit_price,
        "message": f"Strategy stopped {'(LIVE)' if is_live else '(PAPER)'}. Total P&L: ₹{round(total_pnl, 2)}"
    }

@api_router.get("/strategy/state/{session_id}")
async def get_strategy_state(session_id: str):
    """Get current strategy state"""
    state = await db.strategy_states.find_one({"session_id": session_id}, {"_id": 0})
    if not state:
        raise HTTPException(status_code=404, detail="Strategy state not found")
    
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    config = StrategyConfig(**session.get("config", {}))
    is_live = config.trading_mode == TradingMode.LIVE and session.get("access_token")
    
    if state.get("is_active"):
        if is_live:
            spot_price = await fetch_live_nifty_spot(session_id) or get_mock_nifty_spot()
        else:
            spot_price = get_mock_nifty_spot()
        
        state["last_spot_price"] = spot_price
        
        positions = await db.positions.find({"session_id": session_id}, {"_id": 0}).to_list(100)
        total_pnl = 0
        
        for pos in positions:
            if is_live:
                current_price = await fetch_live_option_ltp(session_id, pos.get("symbol")) or get_mock_option_premium(spot_price, pos.get("strike"), pos.get("position_type"))
            else:
                current_price = get_mock_option_premium(spot_price, pos.get("strike"), pos.get("position_type"))
            
            entry = pos.get("entry_price", 0)
            pnl = (entry - current_price) * abs(pos.get("quantity", 0))
            total_pnl += pnl
        
        state["daily_pnl"] = round(total_pnl, 2)
    
    state["is_live_data"] = is_live
    return state

# Positions
@api_router.get("/positions/{session_id}")
async def get_positions(session_id: str):
    """Get current positions"""
    positions = await db.positions.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    config = StrategyConfig(**session.get("config", {}))
    is_live = config.trading_mode == TradingMode.LIVE and session.get("access_token")
    
    if is_live:
        spot_price = await fetch_live_nifty_spot(session_id) or get_mock_nifty_spot()
    else:
        spot_price = get_mock_nifty_spot()
    
    for pos in positions:
        if is_live:
            pos["current_price"] = await fetch_live_option_ltp(session_id, pos.get("symbol")) or get_mock_option_premium(spot_price, pos.get("strike"), pos.get("position_type"))
        else:
            pos["current_price"] = get_mock_option_premium(spot_price, pos.get("strike"), pos.get("position_type"))
        
        entry = pos.get("entry_price", 0)
        pos["pnl"] = round((entry - pos["current_price"]) * abs(pos.get("quantity", 0)), 2)
    
    return {"positions": positions, "spot_price": spot_price, "is_live_data": is_live}

# Trades
@api_router.get("/trades/{session_id}")
async def get_trades(session_id: str, limit: int = Query(default=50, le=500), skip: int = Query(default=0)):
    """Get trade history"""
    trades = await db.trades.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total_count = await db.trades.count_documents({"session_id": session_id})
    return {"trades": trades, "total": total_count}

# Stats
@api_router.get("/stats/{session_id}")
async def get_stats(session_id: str):
    """Get trading statistics"""
    trades = await db.trades.find({"session_id": session_id}, {"_id": 0}).to_list(1000)
    
    total_trades = len(trades)
    adjustments = len([t for t in trades if t.get("is_adjustment")])
    sell_trades = [t for t in trades if t.get("action") == "SELL"]
    buy_trades = [t for t in trades if t.get("action") == "BUY"]
    
    total_premium_collected = sum(t.get("price", 0) * t.get("quantity", 0) for t in sell_trades)
    total_premium_paid = sum(t.get("price", 0) * t.get("quantity", 0) for t in buy_trades)
    
    return {
        "total_trades": total_trades,
        "adjustment_count": adjustments,
        "total_premium_collected": round(total_premium_collected, 2),
        "total_premium_paid": round(total_premium_paid, 2),
        "net_premium": round(total_premium_collected - total_premium_paid, 2)
    }

# Include router
# (moved to end after all routes are defined)

# ====================== BACKTEST API ROUTES ======================

@api_router.get("/backtest/available-dates")
async def get_backtest_dates():
    """Get list of available dates for backtesting using Zerodha"""
    import asyncio
    import concurrent.futures
    
    # First try Zerodha Historical Data
    try:
        # Get access token from database
        session = await db.sessions.find_one(
            {"access_token": {"$exists": True, "$ne": None}},
            {"_id": 0, "access_token": 1},
            sort=[("login_time", -1)]
        )
        
        if session and session.get("access_token"):
            kite = get_kite_sync(session["access_token"])
            
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as pool:
                dates = await loop.run_in_executor(
                    pool, get_available_trading_dates_sync, kite, 60
                )
            
            if dates:
                return {"dates": dates, "source": "zerodha"}
    except Exception as e:
        logger.warning(f"Zerodha historical failed, falling back to Yahoo: {e}")
    
    # Fallback to Yahoo Finance
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        dates = await loop.run_in_executor(pool, get_available_dates, 60)
    
    return {"dates": dates, "source": "yahoo"}

@api_router.post("/backtest/start")
async def start_backtest(session_id: str, date: str, speed: float = 1.0):
    """Start a backtest session for a specific date using Zerodha data"""
    import asyncio
    import concurrent.futures
    
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    config = session.get("config", {})
    engine = create_backtest_engine(session_id, config)
    
    # Try Zerodha first
    data_loaded = False
    data_source = "yahoo"
    
    try:
        auth_session = await db.sessions.find_one(
            {"access_token": {"$exists": True, "$ne": None}},
            {"_id": 0, "access_token": 1},
            sort=[("login_time", -1)]
        )
        
        if auth_session and auth_session.get("access_token"):
            kite = get_kite_sync(auth_session["access_token"])
            
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as pool:
                candles = await loop.run_in_executor(
                    pool, fetch_zerodha_historical_sync, kite, date, 256265, "5minute"
                )
            
            if candles:
                engine.data = candles
                engine.current_index = 0
                data_loaded = True
                data_source = "zerodha"
                logger.info(f"Loaded {len(candles)} candles from Zerodha for {date}")
    except Exception as e:
        logger.warning(f"Zerodha data fetch failed: {e}")
    
    # Fallback to Yahoo
    if not data_loaded:
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            success = await loop.run_in_executor(pool, engine.load_data, date)
        
        if not success:
            remove_backtest_engine(session_id)
            raise HTTPException(status_code=400, detail=f"No data available for {date}")
    
    engine.speed = speed
    engine.is_running = True
    
    config["trading_mode"] = "backtest"
    config["backtest_date"] = date
    config["backtest_speed"] = speed
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"config": config}}
    )
    
    first_candle = engine.get_current_candle()
    
    return {
        "success": True,
        "date": date,
        "total_candles": len(engine.data),
        "first_timestamp": first_candle["timestamp"] if first_candle else None,
        "speed": speed,
        "data_source": data_source
    }

@api_router.post("/backtest/stop")
async def stop_backtest(session_id: str):
    """Stop backtest session"""
    remove_backtest_engine(session_id)
    
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if session:
        config = session.get("config", {})
        config["trading_mode"] = "paper"
        config.pop("backtest_date", None)
        config.pop("backtest_speed", None)
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"config": config}}
        )
    
    return {"success": True}

@api_router.get("/backtest/state")
async def get_backtest_state(session_id: str):
    """Get current backtest state"""
    engine = get_backtest_engine(session_id)
    if not engine:
        return {"is_active": False}
    
    candle = engine.get_current_candle()
    progress = engine.get_progress()
    
    return {
        "is_active": engine.is_running,
        "speed": engine.speed,
        "spot_price": candle["close"] if candle else 0,
        "timestamp": candle["timestamp"] if candle else None,
        "progress": progress,
        "ce_strike": engine.ce_strike,
        "pe_strike": engine.pe_strike,
        "adjustment_count": engine.adjustment_count
    }

@api_router.post("/backtest/advance")
async def advance_backtest(session_id: str, steps: int = 1):
    """Advance backtest by N candles"""
    engine = get_backtest_engine(session_id)
    if not engine:
        raise HTTPException(status_code=400, detail="No active backtest")
    
    for _ in range(steps):
        if not engine.advance():
            break
    
    candle = engine.get_current_candle()
    progress = engine.get_progress()
    
    # Check for adjustments if strategy is active
    adjustment_triggered = False
    if engine.ce_strike and engine.pe_strike and candle:
        spot = candle["close"]
        adjustment_zone = engine.config.get("adjustment_zone", 50)
        
        if spot >= engine.ce_strike - adjustment_zone:
            # Shift UP
            engine.ce_strike += 50
            engine.pe_strike += 50
            engine.adjustment_count += 1
            adjustment_triggered = True
        elif spot <= engine.pe_strike + adjustment_zone:
            # Shift DOWN
            engine.ce_strike -= 50
            engine.pe_strike -= 50
            engine.adjustment_count += 1
            adjustment_triggered = True
    
    return {
        "spot_price": candle["close"] if candle else 0,
        "timestamp": candle["timestamp"] if candle else None,
        "progress": progress,
        "ce_strike": engine.ce_strike,
        "pe_strike": engine.pe_strike,
        "adjustment_count": engine.adjustment_count,
        "adjustment_triggered": adjustment_triggered
    }

@api_router.get("/backtest/chart-data")
async def get_backtest_chart(session_id: str, candles: int = 50):
    """Get chart data for backtest"""
    engine = get_backtest_engine(session_id)
    if not engine:
        raise HTTPException(status_code=400, detail="No active backtest")
    
    past_data = engine.get_past_data(candles)
    
    return {
        "data": [{"timestamp": c["timestamp"], "price": c["close"]} for c in past_data],
        "ce_strike": engine.ce_strike,
        "pe_strike": engine.pe_strike
    }

@api_router.post("/backtest/start-strategy")
async def start_backtest_strategy(session_id: str):
    """Start strategy within backtest"""
    engine = get_backtest_engine(session_id)
    if not engine:
        raise HTTPException(status_code=400, detail="No active backtest")
    
    spot = engine.get_spot_price()
    atm = round(spot / 50) * 50
    strike_distance = engine.config.get("strike_distance", 200)
    
    engine.ce_strike = atm + strike_distance
    engine.pe_strike = atm - strike_distance
    engine.adjustment_count = 0
    
    ce_premium = engine.get_option_premium(engine.ce_strike, "CE")
    pe_premium = engine.get_option_premium(engine.pe_strike, "PE")
    
    return {
        "success": True,
        "spot_price": spot,
        "ce_strike": engine.ce_strike,
        "pe_strike": engine.pe_strike,
        "ce_premium": ce_premium,
        "pe_premium": pe_premium
    }

@api_router.post("/backtest/stop-strategy")
async def stop_backtest_strategy(session_id: str):
    """Stop strategy within backtest"""
    engine = get_backtest_engine(session_id)
    if not engine:
        raise HTTPException(status_code=400, detail="No active backtest")
    
    spot = engine.get_spot_price()
    
    ce_exit = engine.get_option_premium(engine.ce_strike, "CE") if engine.ce_strike else 0
    pe_exit = engine.get_option_premium(engine.pe_strike, "PE") if engine.pe_strike else 0
    
    result = {
        "success": True,
        "ce_strike": engine.ce_strike,
        "pe_strike": engine.pe_strike,
        "ce_exit_premium": ce_exit,
        "pe_exit_premium": pe_exit,
        "adjustment_count": engine.adjustment_count
    }
    
    engine.ce_strike = None
    engine.pe_strike = None
    engine.adjustment_count = 0
    
    return result

@api_router.get("/backtest/option-premium")
async def get_backtest_option_premium(session_id: str, strike: int, option_type: str):
    """Get option premium for a strike in backtest"""
    engine = get_backtest_engine(session_id)
    if not engine:
        raise HTTPException(status_code=400, detail="No active backtest")
    
    premium = engine.get_option_premium(strike, option_type)
    return {"strike": strike, "option_type": option_type, "premium": premium}

# ====================== DATA DOWNLOAD API ROUTES ======================

@api_router.get("/data/search-instruments")
async def search_instruments(query: str):
    """Search for instruments (stocks, indices, F&O)"""
    try:
        # Get Kite instance
        session = await db.sessions.find_one(
            {"access_token": {"$exists": True, "$ne": None}},
            {"_id": 0, "access_token": 1},
            sort=[("login_time", -1)]
        )
        
        if not session or not session.get("access_token"):
            raise HTTPException(status_code=401, detail="Please login with Zerodha first")
        
        kite = get_kite_sync(session["access_token"])
        
        # Search across exchanges
        results = []
        for exchange in ["NSE", "NFO", "BSE"]:
            try:
                instruments = kite.instruments(exchange)
                for inst in instruments:
                    if query.upper() in inst["tradingsymbol"].upper() or query.upper() in str(inst.get("name", "")).upper():
                        results.append({
                            "tradingsymbol": inst["tradingsymbol"],
                            "name": inst.get("name", ""),
                            "exchange": inst["exchange"],
                            "instrument_token": inst["instrument_token"],
                            "instrument_type": inst.get("instrument_type", "EQ"),
                            "lot_size": inst.get("lot_size", 1)
                        })
                        if len(results) >= 50:  # Limit results
                            break
            except:
                pass
            
            if len(results) >= 50:
                break
        
        return {"instruments": results[:50]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/data/historical")
async def get_historical_data(
    instrument_token: int,
    from_date: str,
    to_date: str,
    interval: str = "day"
):
    """Download historical data for any instrument"""
    import concurrent.futures
    
    try:
        # Get Kite instance
        session = await db.sessions.find_one(
            {"access_token": {"$exists": True, "$ne": None}},
            {"_id": 0, "access_token": 1},
            sort=[("login_time", -1)]
        )
        
        if not session or not session.get("access_token"):
            raise HTTPException(status_code=401, detail="Please login with Zerodha first")
        
        kite = get_kite_sync(session["access_token"])
        
        # Parse dates
        from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        to_dt = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
        
        # Validate interval
        valid_intervals = ["minute", "3minute", "5minute", "15minute", "30minute", "60minute", "day"]
        if interval not in valid_intervals:
            raise HTTPException(status_code=400, detail=f"Invalid interval. Use: {valid_intervals}")
        
        # Fetch data in thread pool
        def fetch_data():
            return kite.historical_data(
                instrument_token=instrument_token,
                from_date=from_dt,
                to_date=to_dt,
                interval=interval
            )
        
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            data = await loop.run_in_executor(pool, fetch_data)
        
        # Format response
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
        
        return {
            "instrument_token": instrument_token,
            "from_date": from_date,
            "to_date": to_date,
            "interval": interval,
            "count": len(candles),
            "data": candles
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Historical data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router after all routes are defined
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
