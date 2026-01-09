from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'uno_game')]

# Create the main app without a prefix
app = FastAPI(title="UNO Game API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class GameResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str
    won: bool
    difficulty: str
    opponent_type: str  # 'ai' or 'human'
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class GameResultCreate(BaseModel):
    player_name: str
    won: bool
    difficulty: str
    opponent_type: str

class LeaderboardEntry(BaseModel):
    player_name: str
    wins: int
    total_games: int
    win_rate: float

class PlayerStats(BaseModel):
    player_name: str
    wins: int
    losses: int
    total_games: int
    win_rate: float
    games_vs_ai: int
    games_vs_human: int


# API Routes
@api_router.get("/")
async def root():
    return {"message": "UNO Game API", "version": "1.0.0"}

@api_router.post("/games", response_model=GameResult)
async def create_game_result(game: GameResultCreate):
    """Save a game result"""
    game_dict = game.dict()
    game_obj = GameResult(**game_dict)
    await db.games.insert_one(game_obj.dict())
    return game_obj

@api_router.get("/games", response_model=List[GameResult])
async def get_games(player_name: Optional[str] = None, limit: int = 50):
    """Get game history, optionally filtered by player"""
    query = {}
    if player_name:
        query["player_name"] = player_name
    
    games = await db.games.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [GameResult(**game) for game in games]

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 10):
    """Get top players by wins"""
    pipeline = [
        {
            "$group": {
                "_id": "$player_name",
                "wins": {"$sum": {"$cond": ["$won", 1, 0]}},
                "total_games": {"$sum": 1}
            }
        },
        {
            "$project": {
                "player_name": "$_id",
                "wins": 1,
                "total_games": 1,
                "win_rate": {
                    "$multiply": [
                        {"$divide": ["$wins", "$total_games"]},
                        100
                    ]
                }
            }
        },
        {"$sort": {"wins": -1, "win_rate": -1}},
        {"$limit": limit}
    ]
    
    results = await db.games.aggregate(pipeline).to_list(limit)
    return [LeaderboardEntry(
        player_name=r["player_name"],
        wins=r["wins"],
        total_games=r["total_games"],
        win_rate=r["win_rate"]
    ) for r in results]

@api_router.get("/stats/{player_name}", response_model=PlayerStats)
async def get_player_stats(player_name: str):
    """Get detailed stats for a specific player"""
    pipeline = [
        {"$match": {"player_name": player_name}},
        {
            "$group": {
                "_id": "$player_name",
                "wins": {"$sum": {"$cond": ["$won", 1, 0]}},
                "losses": {"$sum": {"$cond": ["$won", 0, 1]}},
                "total_games": {"$sum": 1},
                "games_vs_ai": {
                    "$sum": {"$cond": [{"$eq": ["$opponent_type", "ai"]}, 1, 0]}
                },
                "games_vs_human": {
                    "$sum": {"$cond": [{"$eq": ["$opponent_type", "human"]}, 1, 0]}
                }
            }
        }
    ]
    
    results = await db.games.aggregate(pipeline).to_list(1)
    
    if not results:
        return PlayerStats(
            player_name=player_name,
            wins=0,
            losses=0,
            total_games=0,
            win_rate=0.0,
            games_vs_ai=0,
            games_vs_human=0
        )
    
    r = results[0]
    win_rate = (r["wins"] / r["total_games"] * 100) if r["total_games"] > 0 else 0
    
    return PlayerStats(
        player_name=player_name,
        wins=r["wins"],
        losses=r["losses"],
        total_games=r["total_games"],
        win_rate=win_rate,
        games_vs_ai=r["games_vs_ai"],
        games_vs_human=r["games_vs_human"]
    )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
