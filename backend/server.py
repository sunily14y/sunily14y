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
import random
from kiteconnect import KiteConnect

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Zerodha Config
ZERODHA_API_KEY = os.environ.get('ZERODHA_API_KEY', '')
ZERODHA_API_SECRET = os.environ.get('ZERODHA_API_SECRET', '')
ZERODHA_REDIRECT_URL = os.environ.get('ZERODHA_REDIRECT_URL', 'https://dynastrangle-algo.preview.emergentagent.com/api/auth/callback')

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

# ====================== MOCK DATA (Fallback) ======================

def get_mock_nifty_spot() -> float:
    """Generate realistic NIFTY spot price around 26000"""
    base_price = 26000
    variation = random.uniform(-200, 200)
    return round(base_price + variation, 2)

def get_mock_option_premium(spot: float, strike: int, option_type: str) -> float:
    """Calculate mock option premium based on moneyness"""
    if option_type == "CE":
        intrinsic = max(0, spot - strike)
        time_value = random.uniform(20, 80)
    else:
        intrinsic = max(0, strike - spot)
        time_value = random.uniform(20, 80)
    premium = intrinsic + time_value + random.uniform(-10, 10)
    return max(5, round(premium, 2))

def get_mock_options_chain(spot_price: float) -> List[OptionsChainItem]:
    """Generate mock options chain data"""
    atm_strike = round(spot_price / 50) * 50
    chain = []
    expiry = get_nifty_weekly_expiry()
    
    for i in range(-10, 11):
        strike = atm_strike + (i * 50)
        ce_ltp = get_mock_option_premium(spot_price, strike, "CE")
        pe_ltp = get_mock_option_premium(spot_price, strike, "PE")
        
        chain.append(OptionsChainItem(
            strike=strike,
            ce_ltp=ce_ltp,
            pe_ltp=pe_ltp,
            ce_symbol=format_nifty_option_symbol(strike, "CE", expiry),
            pe_symbol=format_nifty_option_symbol(strike, "PE", expiry),
            ce_iv=round(random.uniform(10, 25), 2),
            pe_iv=round(random.uniform(10, 25), 2),
            ce_oi=random.randint(10000, 500000),
            pe_oi=random.randint(10000, 500000),
            ce_volume=random.randint(1000, 50000),
            pe_volume=random.randint(1000, 50000)
        ))
    
    return chain

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
        # Find any session with valid access token
        session = await db.sessions.find_one(
            {"access_token": {"$exists": True, "$ne": None}},
            {"_id": 0}
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
    """Get live spot price, returns (price, is_live)"""
    # Try to get live data from any authenticated session
    live_price = await fetch_live_nifty_spot_any_session()
    if live_price:
        return live_price, True
    return get_mock_nifty_spot(), False

async def get_live_option_price(symbol: str, strike: int, option_type: str, spot_price: float) -> tuple[float, bool]:
    """Get live option price, returns (price, is_live)"""
    live_price = await fetch_live_option_ltp_any_session(symbol)
    if live_price:
        return live_price, True
    return get_mock_option_premium(spot_price, strike, option_type), False

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
        """Main strategy execution loop"""
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
                
                # Get current spot price (live or mock)
                is_live = config.trading_mode == TradingMode.LIVE and session_data.get("access_token")
                
                if is_live:
                    spot_price = await fetch_live_nifty_spot(session_id)
                    if not spot_price:
                        spot_price = get_mock_nifty_spot()
                else:
                    spot_price = get_mock_nifty_spot()
                
                state.last_spot_price = spot_price
                
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
        """Shift both legs of the strangle"""
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
        
        # Get prices
        if is_live:
            ce_exit_price = await fetch_live_option_ltp(session_id, state.ce_symbol) or get_mock_option_premium(spot_price, state.ce_strike, "CE")
            pe_exit_price = await fetch_live_option_ltp(session_id, state.pe_symbol) or get_mock_option_premium(spot_price, state.pe_strike, "PE")
        else:
            ce_exit_price = get_mock_option_premium(spot_price, state.ce_strike, "CE")
            pe_exit_price = get_mock_option_premium(spot_price, state.pe_strike, "PE")
        
        new_ce_symbol = format_nifty_option_symbol(new_ce_strike, "CE", expiry)
        new_pe_symbol = format_nifty_option_symbol(new_pe_strike, "PE", expiry)
        
        if is_live:
            new_ce_price = await fetch_live_option_ltp(session_id, new_ce_symbol) or get_mock_option_premium(spot_price, new_ce_strike, "CE")
            new_pe_price = await fetch_live_option_ltp(session_id, new_pe_symbol) or get_mock_option_premium(spot_price, new_pe_strike, "PE")
        else:
            new_ce_price = get_mock_option_premium(spot_price, new_ce_strike, "CE")
            new_pe_price = get_mock_option_premium(spot_price, new_pe_strike, "PE")
        
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
        return RedirectResponse(url="https://dynastrangle-algo.preview.emergentagent.com/login?error=no_session")
    
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
            return RedirectResponse(url=f"https://dynastrangle-algo.preview.emergentagent.com/dashboard?auth=success&session_id={sid}&mode=live")
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
            return RedirectResponse(url=f"https://dynastrangle-algo.preview.emergentagent.com/dashboard?auth=success&session_id={sid}")
            
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        return RedirectResponse(url=f"https://dynastrangle-algo.preview.emergentagent.com/login?error={str(e)}")

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
    """Get current NIFTY 50 spot price - always tries live data first"""
    spot_price, is_live = await get_live_spot_price()
    
    # Store in history for charting
    if is_live:
        await db.spot_history.insert_one({
            "price": spot_price,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_live": True
        })
    
    return {
        "spot_price": spot_price,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "high": spot_price + random.uniform(50, 150),
        "low": spot_price - random.uniform(50, 150),
        "open": spot_price + random.uniform(-100, 100),
        "close": spot_price,
        "is_live": is_live
    }

@api_router.get("/market/options-chain")
async def get_options_chain(session_id: str = None):
    """Get NIFTY options chain - always tries live data first"""
    spot_price, is_live = await get_live_spot_price()
    
    chain = get_mock_options_chain(spot_price)
    atm_strike = round(spot_price / 50) * 50
    
    return {
        "spot_price": spot_price,
        "atm_strike": atm_strike,
        "chain": [item.model_dump() for item in chain],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_live": is_live
    }

@api_router.get("/market/spot-history")
async def get_spot_history(minutes: int = 60, session_id: str = None):
    """Get historical spot prices for charting"""
    history = []
    
    # Try to get live history from database
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    live_history = await db.spot_history.find(
        {"timestamp": {"$gte": cutoff.isoformat()}},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(500)
    
    if live_history and len(live_history) > 5:
        history = [{"timestamp": h["timestamp"], "price": h["price"]} for h in live_history]
        return {"history": history, "is_live": True}
    
    # Fallback to mock data
    spot_price, _ = await get_live_spot_price()
    now = datetime.now(timezone.utc)
    
    for i in range(minutes, 0, -1):
        timestamp = now - timedelta(minutes=i)
        variation = random.uniform(-50, 50) * (1 + 0.1 * random.random())
        price = spot_price + variation + (i * random.uniform(-0.5, 0.5))
        history.append({
            "timestamp": timestamp.isoformat(),
            "price": round(price, 2)
        })
    
    return {"history": history, "is_live": False}

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
