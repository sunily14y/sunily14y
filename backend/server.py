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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Zerodha Config (will be provided by user)
ZERODHA_API_KEY = os.environ.get('ZERODHA_API_KEY', '')
ZERODHA_API_SECRET = os.environ.get('ZERODHA_API_SECRET', '')
ZERODHA_REDIRECT_URL = os.environ.get('ZERODHA_REDIRECT_URL', 'http://localhost:3000/callback')

app = FastAPI(title="NiftyAlgo Trading System")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    lot_size: int = Field(default=1, ge=1)  # No upper limit - user decides
    adjustment_zone: int = Field(default=50, ge=10)  # Minimum 10 points
    strike_distance: int = Field(default=200, ge=50)  # Minimum 50 points
    max_daily_loss: Optional[float] = Field(default=None)  # Optional - user sets any amount
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
    ce_iv: float = 0.0
    pe_iv: float = 0.0
    ce_oi: int = 0
    pe_oi: int = 0
    ce_volume: int = 0
    pe_volume: int = 0

# ====================== MOCK DATA GENERATORS ======================
# These simulate Zerodha API responses for paper trading

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
    
    # Add some randomness for realistic premium
    premium = intrinsic + time_value + random.uniform(-10, 10)
    return max(5, round(premium, 2))

def get_mock_options_chain(spot_price: float) -> List[OptionsChainItem]:
    """Generate mock options chain data"""
    atm_strike = round(spot_price / 50) * 50
    chain = []
    
    for i in range(-10, 11):
        strike = atm_strike + (i * 50)
        ce_ltp = get_mock_option_premium(spot_price, strike, "CE")
        pe_ltp = get_mock_option_premium(spot_price, strike, "PE")
        
        chain.append(OptionsChainItem(
            strike=strike,
            ce_ltp=ce_ltp,
            pe_ltp=pe_ltp,
            ce_iv=round(random.uniform(10, 25), 2),
            pe_iv=round(random.uniform(10, 25), 2),
            ce_oi=random.randint(10000, 500000),
            pe_oi=random.randint(10000, 500000),
            ce_volume=random.randint(1000, 50000),
            pe_volume=random.randint(1000, 50000)
        ))
    
    return chain

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
                # Get session and config
                session_data = await db.sessions.find_one({"id": session_id}, {"_id": 0})
                if not session_data:
                    break
                
                state_data = await db.strategy_states.find_one({"session_id": session_id}, {"_id": 0})
                if not state_data or not state_data.get("is_active"):
                    break
                
                config = StrategyConfig(**session_data.get("config", {}))
                state = StrategyState(**state_data)
                
                # Get current spot price
                spot_price = get_mock_nifty_spot()
                state.last_spot_price = spot_price
                
                # Check adjustment conditions
                if state.ce_strike and state.pe_strike:
                    await self._check_and_adjust(session_id, config, state, spot_price)
                
                # Update state
                await db.strategy_states.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "last_spot_price": spot_price,
                        "last_update": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Sleep for 2 seconds between checks
                await asyncio.sleep(2)
                
        except asyncio.CancelledError:
            logger.info(f"Strategy loop cancelled for session {session_id}")
        except Exception as e:
            logger.error(f"Error in strategy loop: {str(e)}")
    
    async def _check_and_adjust(self, session_id: str, config: StrategyConfig, state: StrategyState, spot_price: float):
        """Check if adjustment is needed and execute"""
        adjustment_zone = config.adjustment_zone
        
        # Check CALL side - if spot moves UP within adjustment zone of sold CE
        if spot_price >= state.ce_strike - adjustment_zone:
            # Need to shift both legs UP by 50 points
            await self._shift_strangle(session_id, config, state, spot_price, "UP")
        
        # Check PUT side - if spot moves DOWN within adjustment zone of sold PE
        elif spot_price <= state.pe_strike + adjustment_zone:
            # Need to shift both legs DOWN by 50 points
            await self._shift_strangle(session_id, config, state, spot_price, "DOWN")
    
    async def _shift_strangle(self, session_id: str, config: StrategyConfig, state: StrategyState, spot_price: float, direction: str):
        """Shift both legs of the strangle"""
        shift_amount = 50
        
        if direction == "UP":
            new_ce_strike = state.ce_strike + shift_amount
            new_pe_strike = state.pe_strike + shift_amount
            reason = f"NIFTY moved UP to {spot_price}, near CE strike {state.ce_strike}"
        else:
            new_ce_strike = state.ce_strike - shift_amount
            new_pe_strike = state.pe_strike - shift_amount
            reason = f"NIFTY moved DOWN to {spot_price}, near PE strike {state.pe_strike}"
        
        # Exit current positions
        ce_exit_price = get_mock_option_premium(spot_price, state.ce_strike, "CE")
        pe_exit_price = get_mock_option_premium(spot_price, state.pe_strike, "PE")
        
        # Enter new positions
        new_ce_price = get_mock_option_premium(spot_price, new_ce_strike, "CE")
        new_pe_price = get_mock_option_premium(spot_price, new_pe_strike, "PE")
        
        lot_size = config.lot_size * 25  # NIFTY lot size is 25
        
        # Record trades
        trades = [
            # Exit old CE
            Trade(
                session_id=session_id,
                symbol=f"NIFTY{state.ce_strike}CE",
                strike=state.ce_strike,
                position_type=PositionType.CE,
                action=OrderAction.BUY,
                quantity=lot_size,
                price=ce_exit_price,
                is_adjustment=True,
                adjustment_reason=reason,
                paper_trade=config.trading_mode == TradingMode.PAPER
            ),
            # Exit old PE
            Trade(
                session_id=session_id,
                symbol=f"NIFTY{state.pe_strike}PE",
                strike=state.pe_strike,
                position_type=PositionType.PE,
                action=OrderAction.BUY,
                quantity=lot_size,
                price=pe_exit_price,
                is_adjustment=True,
                adjustment_reason=reason,
                paper_trade=config.trading_mode == TradingMode.PAPER
            ),
            # Enter new CE
            Trade(
                session_id=session_id,
                symbol=f"NIFTY{new_ce_strike}CE",
                strike=new_ce_strike,
                position_type=PositionType.CE,
                action=OrderAction.SELL,
                quantity=lot_size,
                price=new_ce_price,
                is_adjustment=True,
                adjustment_reason=reason,
                paper_trade=config.trading_mode == TradingMode.PAPER
            ),
            # Enter new PE
            Trade(
                session_id=session_id,
                symbol=f"NIFTY{new_pe_strike}PE",
                strike=new_pe_strike,
                position_type=PositionType.PE,
                action=OrderAction.SELL,
                quantity=lot_size,
                price=new_pe_price,
                is_adjustment=True,
                adjustment_reason=reason,
                paper_trade=config.trading_mode == TradingMode.PAPER
            )
        ]
        
        # Insert trades
        for trade in trades:
            trade_doc = trade.model_dump()
            trade_doc['timestamp'] = trade_doc['timestamp'].isoformat()
            await db.trades.insert_one(trade_doc)
        
        # Update state
        adjustment_count = state.adjustment_count + 1
        
        await db.strategy_states.update_one(
            {"session_id": session_id},
            {"$set": {
                "ce_strike": new_ce_strike,
                "pe_strike": new_pe_strike,
                "adjustment_count": adjustment_count,
                "last_update": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Adjustment #{adjustment_count}: {direction} shift. New CE: {new_ce_strike}, New PE: {new_pe_strike}")

# Global trading engine instance
trading_engine = TradingEngine()

# ====================== API ROUTES ======================

@api_router.get("/")
async def root():
    return {"message": "NiftyAlgo Trading System API", "version": "1.0.0"}

# Session Management
@api_router.post("/session/create")
async def create_session():
    """Create a new trading session"""
    session = UserSession()
    session_dict = session.model_dump()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    session_dict['config'] = session.config.model_dump()
    
    await db.sessions.insert_one(session_dict)
    
    # Create initial strategy state
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

# Zerodha Auth (Mock for Paper Trading)
@api_router.get("/auth/login-url")
async def get_login_url(session_id: str):
    """Get Zerodha login URL"""
    if ZERODHA_API_KEY:
        login_url = f"https://kite.zerodha.com/connect/login?v=3&api_key={ZERODHA_API_KEY}"
    else:
        # Mock login for paper trading
        login_url = f"/callback?request_token=mock_token&session_id={session_id}"
    return {"login_url": login_url, "is_mock": not bool(ZERODHA_API_KEY)}

@api_router.post("/auth/callback")
async def auth_callback(session_id: str, request_token: str = "mock_token"):
    """Handle Zerodha OAuth callback"""
    # For paper trading, we just mark as authenticated
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
async def get_nifty_spot():
    """Get current NIFTY 50 spot price"""
    spot_price = get_mock_nifty_spot()
    return MarketData(
        spot_price=spot_price,
        timestamp=datetime.now(timezone.utc),
        high=spot_price + random.uniform(50, 150),
        low=spot_price - random.uniform(50, 150),
        open=spot_price + random.uniform(-100, 100),
        close=spot_price
    )

@api_router.get("/market/options-chain")
async def get_options_chain():
    """Get NIFTY options chain"""
    spot_price = get_mock_nifty_spot()
    chain = get_mock_options_chain(spot_price)
    atm_strike = round(spot_price / 50) * 50
    
    return {
        "spot_price": spot_price,
        "atm_strike": atm_strike,
        "chain": [item.model_dump() for item in chain],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/market/spot-history")
async def get_spot_history(minutes: int = 60):
    """Get historical spot prices for charting"""
    base_price = get_mock_nifty_spot()
    history = []
    now = datetime.now(timezone.utc)
    
    for i in range(minutes, 0, -1):
        timestamp = now - timedelta(minutes=i)
        # Simulate price movement
        variation = random.uniform(-50, 50) * (1 + 0.1 * random.random())
        price = base_price + variation + (i * random.uniform(-0.5, 0.5))
        history.append({
            "timestamp": timestamp.isoformat(),
            "price": round(price, 2)
        })
    
    return {"history": history}

# Strategy Management
@api_router.post("/strategy/start")
async def start_strategy(session_id: str, background_tasks: BackgroundTasks):
    """Start the trading strategy"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    config = StrategyConfig(**session.get("config", {}))
    
    # Get current spot price and calculate strikes
    spot_price = get_mock_nifty_spot()
    atm_strike = round(spot_price / 50) * 50
    ce_strike = atm_strike + config.strike_distance
    pe_strike = atm_strike - config.strike_distance
    
    lot_size = config.lot_size * 25  # NIFTY lot size is 25
    
    # Get option premiums
    ce_price = get_mock_option_premium(spot_price, ce_strike, "CE")
    pe_price = get_mock_option_premium(spot_price, pe_strike, "PE")
    
    # Create initial trades
    trades = [
        Trade(
            session_id=session_id,
            symbol=f"NIFTY{ce_strike}CE",
            strike=ce_strike,
            position_type=PositionType.CE,
            action=OrderAction.SELL,
            quantity=lot_size,
            price=ce_price,
            paper_trade=config.trading_mode == TradingMode.PAPER
        ),
        Trade(
            session_id=session_id,
            symbol=f"NIFTY{pe_strike}PE",
            strike=pe_strike,
            position_type=PositionType.PE,
            action=OrderAction.SELL,
            quantity=lot_size,
            price=pe_price,
            paper_trade=config.trading_mode == TradingMode.PAPER
        )
    ]
    
    for trade in trades:
        trade_doc = trade.model_dump()
        trade_doc['timestamp'] = trade_doc['timestamp'].isoformat()
        await db.trades.insert_one(trade_doc)
    
    # Create positions
    positions = [
        Position(
            session_id=session_id,
            symbol=f"NIFTY{ce_strike}CE",
            strike=ce_strike,
            position_type=PositionType.CE,
            quantity=-lot_size,  # Negative for short
            entry_price=ce_price,
            current_price=ce_price
        ),
        Position(
            session_id=session_id,
            symbol=f"NIFTY{pe_strike}PE",
            strike=pe_strike,
            position_type=PositionType.PE,
            quantity=-lot_size,
            entry_price=pe_price,
            current_price=pe_price
        )
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
            "adjustment_count": 0,
            "last_spot_price": spot_price,
            "start_time": datetime.now(timezone.utc).isoformat(),
            "last_update": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Start automated monitoring
    await trading_engine.start_strategy(session_id)
    
    return {
        "success": True,
        "spot_price": spot_price,
        "ce_strike": ce_strike,
        "pe_strike": pe_strike,
        "ce_premium": ce_price,
        "pe_premium": pe_price,
        "message": f"Strategy started. Sold {ce_strike}CE @ {ce_price} and {pe_strike}PE @ {pe_price}"
    }

@api_router.post("/strategy/stop")
async def stop_strategy(session_id: str):
    """Stop the trading strategy and exit all positions"""
    state = await db.strategy_states.find_one({"session_id": session_id}, {"_id": 0})
    if not state or not state.get("is_active"):
        raise HTTPException(status_code=400, detail="Strategy is not active")
    
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    config = StrategyConfig(**session.get("config", {}))
    
    spot_price = get_mock_nifty_spot()
    lot_size = config.lot_size * 25
    
    # Exit positions
    ce_strike = state.get("ce_strike")
    pe_strike = state.get("pe_strike")
    
    ce_exit_price = get_mock_option_premium(spot_price, ce_strike, "CE")
    pe_exit_price = get_mock_option_premium(spot_price, pe_strike, "PE")
    
    # Record exit trades
    trades = [
        Trade(
            session_id=session_id,
            symbol=f"NIFTY{ce_strike}CE",
            strike=ce_strike,
            position_type=PositionType.CE,
            action=OrderAction.BUY,
            quantity=lot_size,
            price=ce_exit_price,
            paper_trade=config.trading_mode == TradingMode.PAPER
        ),
        Trade(
            session_id=session_id,
            symbol=f"NIFTY{pe_strike}PE",
            strike=pe_strike,
            position_type=PositionType.PE,
            action=OrderAction.BUY,
            quantity=lot_size,
            price=pe_exit_price,
            paper_trade=config.trading_mode == TradingMode.PAPER
        )
    ]
    
    for trade in trades:
        trade_doc = trade.model_dump()
        trade_doc['timestamp'] = trade_doc['timestamp'].isoformat()
        await db.trades.insert_one(trade_doc)
    
    # Calculate P&L from positions
    positions = await db.positions.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    total_pnl = 0
    
    for pos in positions:
        if pos.get("position_type") == "CE":
            entry = pos.get("entry_price", 0)
            exit_p = ce_exit_price
        else:
            entry = pos.get("entry_price", 0)
            exit_p = pe_exit_price
        
        # For short positions: profit when price goes down
        pnl = (entry - exit_p) * abs(pos.get("quantity", 0))
        total_pnl += pnl
    
    # Clear positions
    await db.positions.delete_many({"session_id": session_id})
    
    # Stop trading engine
    await trading_engine.stop_strategy(session_id)
    
    # Update strategy state
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
        "total_pnl": round(total_pnl, 2),
        "ce_exit_price": ce_exit_price,
        "pe_exit_price": pe_exit_price,
        "message": f"Strategy stopped. Total P&L: ₹{round(total_pnl, 2)}"
    }

@api_router.get("/strategy/state/{session_id}")
async def get_strategy_state(session_id: str):
    """Get current strategy state"""
    state = await db.strategy_states.find_one({"session_id": session_id}, {"_id": 0})
    if not state:
        raise HTTPException(status_code=404, detail="Strategy state not found")
    
    # Calculate real-time P&L
    if state.get("is_active"):
        spot_price = get_mock_nifty_spot()
        state["last_spot_price"] = spot_price
        
        positions = await db.positions.find({"session_id": session_id}, {"_id": 0}).to_list(100)
        total_pnl = 0
        
        for pos in positions:
            if pos.get("position_type") == "CE":
                current_price = get_mock_option_premium(spot_price, pos.get("strike"), "CE")
            else:
                current_price = get_mock_option_premium(spot_price, pos.get("strike"), "PE")
            
            entry = pos.get("entry_price", 0)
            pnl = (entry - current_price) * abs(pos.get("quantity", 0))
            total_pnl += pnl
        
        state["daily_pnl"] = round(total_pnl, 2)
    
    return state

# Positions
@api_router.get("/positions/{session_id}")
async def get_positions(session_id: str):
    """Get current positions"""
    positions = await db.positions.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    
    # Update current prices
    spot_price = get_mock_nifty_spot()
    for pos in positions:
        if pos.get("position_type") == "CE":
            pos["current_price"] = get_mock_option_premium(spot_price, pos.get("strike"), "CE")
        else:
            pos["current_price"] = get_mock_option_premium(spot_price, pos.get("strike"), "PE")
        
        entry = pos.get("entry_price", 0)
        pos["pnl"] = round((entry - pos["current_price"]) * abs(pos.get("quantity", 0)), 2)
    
    return {"positions": positions, "spot_price": spot_price}

# Trades
@api_router.get("/trades/{session_id}")
async def get_trades(
    session_id: str,
    limit: int = Query(default=50, le=500),
    skip: int = Query(default=0)
):
    """Get trade history"""
    trades = await db.trades.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    total_count = await db.trades.count_documents({"session_id": session_id})
    
    return {"trades": trades, "total": total_count}

# Summary Stats
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
