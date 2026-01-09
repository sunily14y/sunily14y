from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'uno_game')]

# Create the main app
app = FastAPI(title="UNO Game API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Emergent Auth URL
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class GameResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    player_name: str
    won: bool
    difficulty: str
    opponent_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GameResultCreate(BaseModel):
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

class FriendRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str
    to_user_id: str
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Friend(BaseModel):
    user_id: str
    name: str
    email: str
    picture: Optional[str] = None

class GameHistoryItem(BaseModel):
    id: str
    opponent_name: str
    opponent_type: str
    difficulty: str
    won: bool
    timestamp: datetime


# ==================== AUTH HELPERS ====================

async def get_session_token(request: Request) -> Optional[str]:
    """Get session token from cookie or Authorization header"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    
    # Fall back to Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None

async def get_current_user(request: Request) -> User:
    """Get current authenticated user"""
    session_token = await get_session_token(request)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry with timezone handling
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def get_optional_user(request: Request) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/exchange")
async def exchange_session_id(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            EMERGENT_AUTH_URL,
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        user_data = auth_response.json()
    
    session_data = SessionDataResponse(**user_data)
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": session_data.email},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "created_at": datetime.now(timezone.utc)
        })
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_data.session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_data.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "session_token": session_data.session_token,
        "user": user_doc
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = await get_session_token(request)
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/check")
async def check_auth(request: Request):
    """Check if user is authenticated"""
    user = await get_optional_user(request)
    return {"authenticated": user is not None, "user": user}


# ==================== GAME ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "UNO Game API", "version": "1.0.0"}

@api_router.post("/games", response_model=GameResult)
async def create_game_result(
    game: GameResultCreate,
    current_user: User = Depends(get_current_user)
):
    """Save a game result"""
    game_obj = GameResult(
        user_id=current_user.user_id,
        player_name=current_user.name,
        **game.dict()
    )
    await db.games.insert_one(game_obj.dict())
    return game_obj

@api_router.get("/games/history", response_model=List[GameHistoryItem])
async def get_game_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get user's game history"""
    games = await db.games.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    history = []
    for game in games:
        history.append(GameHistoryItem(
            id=game["id"],
            opponent_name="AI Opponent" if game["opponent_type"] == "ai" else "Local Player",
            opponent_type=game["opponent_type"],
            difficulty=game["difficulty"],
            won=game["won"],
            timestamp=game["timestamp"]
        ))
    
    return history

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

@api_router.get("/stats/me", response_model=PlayerStats)
async def get_my_stats(current_user: User = Depends(get_current_user)):
    """Get current user's stats"""
    pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {
            "$group": {
                "_id": "$user_id",
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
            player_name=current_user.name,
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
        player_name=current_user.name,
        wins=r["wins"],
        losses=r["losses"],
        total_games=r["total_games"],
        win_rate=win_rate,
        games_vs_ai=r["games_vs_ai"],
        games_vs_human=r["games_vs_human"]
    )


# ==================== FRIENDS ROUTES ====================

@api_router.get("/friends", response_model=List[Friend])
async def get_friends(current_user: User = Depends(get_current_user)):
    """Get user's friends list"""
    # Get accepted friend requests where user is either sender or receiver
    friend_requests = await db.friend_requests.find(
        {
            "$or": [
                {"from_user_id": current_user.user_id, "status": "accepted"},
                {"to_user_id": current_user.user_id, "status": "accepted"}
            ]
        },
        {"_id": 0}
    ).to_list(100)
    
    friend_ids = []
    for fr in friend_requests:
        if fr["from_user_id"] == current_user.user_id:
            friend_ids.append(fr["to_user_id"])
        else:
            friend_ids.append(fr["from_user_id"])
    
    friends = []
    for friend_id in friend_ids:
        user_doc = await db.users.find_one({"user_id": friend_id}, {"_id": 0})
        if user_doc:
            friends.append(Friend(
                user_id=user_doc["user_id"],
                name=user_doc["name"],
                email=user_doc["email"],
                picture=user_doc.get("picture")
            ))
    
    return friends

@api_router.post("/friends/add")
async def add_friend(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Send friend request by email"""
    body = await request.json()
    friend_email = body.get("email")
    
    if not friend_email:
        raise HTTPException(status_code=400, detail="Email required")
    
    if friend_email == current_user.email:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    
    # Find user by email
    friend_user = await db.users.find_one({"email": friend_email}, {"_id": 0})
    if not friend_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends or request exists
    existing = await db.friend_requests.find_one({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": friend_user["user_id"]},
            {"from_user_id": friend_user["user_id"], "to_user_id": current_user.user_id}
        ]
    })
    
    if existing:
        if existing["status"] == "accepted":
            raise HTTPException(status_code=400, detail="Already friends")
        elif existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="Friend request already pending")
    
    # Create friend request
    friend_request = FriendRequest(
        from_user_id=current_user.user_id,
        to_user_id=friend_user["user_id"]
    )
    await db.friend_requests.insert_one(friend_request.dict())
    
    return {"message": "Friend request sent"}

@api_router.get("/friends/requests")
async def get_friend_requests(current_user: User = Depends(get_current_user)):
    """Get pending friend requests"""
    requests = await db.friend_requests.find(
        {"to_user_id": current_user.user_id, "status": "pending"},
        {"_id": 0}
    ).to_list(50)
    
    result = []
    for req in requests:
        from_user = await db.users.find_one({"user_id": req["from_user_id"]}, {"_id": 0})
        if from_user:
            result.append({
                "id": req["id"],
                "from_user": {
                    "user_id": from_user["user_id"],
                    "name": from_user["name"],
                    "email": from_user["email"],
                    "picture": from_user.get("picture")
                },
                "created_at": req["created_at"]
            })
    
    return result

@api_router.post("/friends/accept/{request_id}")
async def accept_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Accept a friend request"""
    result = await db.friend_requests.update_one(
        {"id": request_id, "to_user_id": current_user.user_id, "status": "pending"},
        {"$set": {"status": "accepted"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Friend request accepted"}

@api_router.post("/friends/reject/{request_id}")
async def reject_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Reject a friend request"""
    result = await db.friend_requests.update_one(
        {"id": request_id, "to_user_id": current_user.user_id, "status": "pending"},
        {"$set": {"status": "rejected"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Friend request rejected"}


# ==================== ROOM/MULTIPLAYER ROUTES ====================

class Room(BaseModel):
    room_code: str
    creator_id: str
    creator_name: str
    players: List[dict] = []
    status: str = "waiting"  # waiting, playing, finished
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    max_players: int = 4

class RoomPlayer(BaseModel):
    user_id: str
    name: str
    is_creator: bool = False
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def generate_room_code() -> str:
    """Generate a unique 4-digit room code"""
    import random
    return ''.join([str(random.randint(0, 9)) for _ in range(4)])

@api_router.post("/rooms/create")
async def create_room(request: Request):
    """Create a new game room"""
    body = await request.json()
    user_id = body.get("user_id")
    user_name = body.get("user_name", "Player")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Generate unique room code
    room_code = generate_room_code()
    
    # Make sure code is unique
    while await db.rooms.find_one({"room_code": room_code, "status": "waiting"}):
        room_code = generate_room_code()
    
    # Create room
    room = {
        "room_code": room_code,
        "creator_id": user_id,
        "creator_name": user_name,
        "players": [{
            "user_id": user_id,
            "name": user_name,
            "is_creator": True,
            "joined_at": datetime.now(timezone.utc)
        }],
        "status": "waiting",
        "created_at": datetime.now(timezone.utc),
        "max_players": 4
    }
    
    await db.rooms.insert_one(room)
    
    return {
        "room_code": room_code,
        "creator_id": user_id,
        "players": room["players"],
        "status": "waiting"
    }

@api_router.post("/rooms/join")
async def join_room(request: Request):
    """Join an existing room by code"""
    body = await request.json()
    room_code = body.get("room_code")
    user_id = body.get("user_id")
    user_name = body.get("user_name", "Player")
    
    if not room_code or not user_id:
        raise HTTPException(status_code=400, detail="room_code and user_id required")
    
    # Find room
    room = await db.rooms.find_one({"room_code": room_code, "status": "waiting"})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or game already started")
    
    # Check if room is full
    if len(room["players"]) >= room.get("max_players", 4):
        raise HTTPException(status_code=400, detail="Room is full")
    
    # Check if already in room
    if any(p["user_id"] == user_id for p in room["players"]):
        return {
            "room_code": room_code,
            "players": room["players"],
            "status": room["status"],
            "is_creator": room["creator_id"] == user_id
        }
    
    # Add player to room
    new_player = {
        "user_id": user_id,
        "name": user_name,
        "is_creator": False,
        "joined_at": datetime.now(timezone.utc)
    }
    
    await db.rooms.update_one(
        {"room_code": room_code},
        {"$push": {"players": new_player}}
    )
    
    # Get updated room
    room = await db.rooms.find_one({"room_code": room_code})
    
    return {
        "room_code": room_code,
        "players": room["players"],
        "status": room["status"],
        "is_creator": False
    }

@api_router.get("/rooms/{room_code}")
async def get_room(room_code: str):
    """Get room status and players"""
    room = await db.rooms.find_one({"room_code": room_code}, {"_id": 0})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {
        "room_code": room["room_code"],
        "creator_id": room["creator_id"],
        "creator_name": room["creator_name"],
        "players": room["players"],
        "status": room["status"],
        "max_players": room.get("max_players", 4)
    }

@api_router.post("/rooms/{room_code}/leave")
async def leave_room(room_code: str, request: Request):
    """Leave a room"""
    body = await request.json()
    user_id = body.get("user_id")
    
    room = await db.rooms.find_one({"room_code": room_code})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Remove player from room
    await db.rooms.update_one(
        {"room_code": room_code},
        {"$pull": {"players": {"user_id": user_id}}}
    )
    
    # If creator leaves, delete room
    if room["creator_id"] == user_id:
        await db.rooms.delete_one({"room_code": room_code})
        return {"message": "Room deleted"}
    
    return {"message": "Left room"}


# ==================== MULTIPLAYER GAME ROUTES ====================

import random

def create_uno_deck():
    """Create a standard UNO deck"""
    cards = []
    card_id = 0
    colors = ['red', 'yellow', 'green', 'blue']
    
    for color in colors:
        # One 0 per color
        cards.append({"id": str(card_id), "color": color, "type": "number", "value": 0})
        card_id += 1
        
        # Two of each 1-9 per color
        for num in range(1, 10):
            cards.append({"id": str(card_id), "color": color, "type": "number", "value": num})
            card_id += 1
            cards.append({"id": str(card_id), "color": color, "type": "number", "value": num})
            card_id += 1
        
        # Two of each action card per color
        for _ in range(2):
            cards.append({"id": str(card_id), "color": color, "type": "skip"})
            card_id += 1
            cards.append({"id": str(card_id), "color": color, "type": "reverse"})
            card_id += 1
            cards.append({"id": str(card_id), "color": color, "type": "draw2"})
            card_id += 1
    
    # Wild cards
    for _ in range(4):
        cards.append({"id": str(card_id), "color": "wild", "type": "wild"})
        card_id += 1
        cards.append({"id": str(card_id), "color": "wild", "type": "wild4"})
        card_id += 1
    
    random.shuffle(cards)
    return cards

def can_play_card(card, top_card, selected_color):
    """Check if a card can be played"""
    # Wild cards can always be played
    if card["type"] in ["wild", "wild4"]:
        return True
    
    # Match color
    current_color = selected_color or top_card["color"]
    if card["color"] == current_color:
        return True
    
    # Match number
    if card["type"] == "number" and top_card["type"] == "number" and card.get("value") == top_card.get("value"):
        return True
    
    # Match action type
    if card["type"] == top_card["type"] and card["type"] != "number":
        return True
    
    return False

@api_router.post("/rooms/{room_code}/start")
async def start_game(room_code: str, request: Request):
    """Start the game and initialize game state"""
    body = await request.json()
    user_id = body.get("user_id")
    
    room = await db.rooms.find_one({"room_code": room_code})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["creator_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only room creator can start the game")
    
    if len(room["players"]) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players to start")
    
    # Create deck and deal cards
    deck = create_uno_deck()
    players_hands = {}
    
    for player in room["players"]:
        hand = []
        for _ in range(7):
            if deck:
                hand.append(deck.pop())
        players_hands[player["user_id"]] = hand
    
    # Find first non-wild card for discard pile
    discard_pile = []
    while deck:
        card = deck.pop()
        if card["type"] == "number":
            discard_pile.append(card)
            break
        else:
            deck.insert(0, card)  # Put back at bottom
    
    # Initialize game state
    game_state = {
        "room_code": room_code,
        "deck": deck,
        "discard_pile": discard_pile,
        "players_hands": players_hands,
        "player_order": [p["user_id"] for p in room["players"]],
        "current_player_index": 0,
        "direction": 1,  # 1 = clockwise, -1 = counter-clockwise
        "selected_color": discard_pile[0]["color"] if discard_pile else None,
        "status": "playing",
        "winner": None,
        "last_action": None,
        "uno_called": {},
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Save game state
    await db.game_states.update_one(
        {"room_code": room_code},
        {"$set": game_state},
        upsert=True
    )
    
    # Update room status
    await db.rooms.update_one(
        {"room_code": room_code},
        {"$set": {"status": "playing"}}
    )
    
    return {"message": "Game started", "status": "playing"}

@api_router.get("/rooms/{room_code}/game-state")
async def get_game_state(room_code: str, user_id: str):
    """Get current game state for a player"""
    game_state = await db.game_states.find_one({"room_code": room_code}, {"_id": 0})
    
    if not game_state:
        raise HTTPException(status_code=404, detail="Game not found")
    
    room = await db.rooms.find_one({"room_code": room_code}, {"_id": 0})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Build response with limited info (don't expose other players' cards)
    players_info = []
    for player in room["players"]:
        pid = player["user_id"]
        hand = game_state["players_hands"].get(pid, [])
        players_info.append({
            "user_id": pid,
            "name": player["name"],
            "card_count": len(hand),
            "is_current": game_state["player_order"][game_state["current_player_index"]] == pid,
            "is_creator": player.get("is_creator", False)
        })
    
    # Get current player's hand
    my_hand = game_state["players_hands"].get(user_id, [])
    
    return {
        "room_code": room_code,
        "status": game_state["status"],
        "players": players_info,
        "my_hand": my_hand,
        "discard_pile": game_state["discard_pile"][-1] if game_state["discard_pile"] else None,
        "deck_count": len(game_state["deck"]),
        "current_player_id": game_state["player_order"][game_state["current_player_index"]],
        "direction": game_state["direction"],
        "selected_color": game_state["selected_color"],
        "winner": game_state.get("winner"),
        "last_action": game_state.get("last_action"),
        "updated_at": game_state["updated_at"]
    }

@api_router.post("/rooms/{room_code}/play-card")
async def play_card(room_code: str, request: Request):
    """Play a card"""
    body = await request.json()
    user_id = body.get("user_id")
    card_id = body.get("card_id")
    chosen_color = body.get("chosen_color")  # For wild cards
    
    game_state = await db.game_states.find_one({"room_code": room_code})
    
    if not game_state:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game_state["status"] != "playing":
        raise HTTPException(status_code=400, detail="Game is not in progress")
    
    # Check if it's this player's turn
    current_player_id = game_state["player_order"][game_state["current_player_index"]]
    if current_player_id != user_id:
        raise HTTPException(status_code=400, detail="Not your turn")
    
    # Find the card in player's hand
    hand = game_state["players_hands"].get(user_id, [])
    card = None
    card_index = None
    for i, c in enumerate(hand):
        if c["id"] == card_id:
            card = c
            card_index = i
            break
    
    if card is None:
        raise HTTPException(status_code=400, detail="Card not in hand")
    
    # Check if card can be played
    top_card = game_state["discard_pile"][-1] if game_state["discard_pile"] else None
    if top_card and not can_play_card(card, top_card, game_state["selected_color"]):
        raise HTTPException(status_code=400, detail="Cannot play this card")
    
    # Remove card from hand
    hand.pop(card_index)
    game_state["players_hands"][user_id] = hand
    
    # Add card to discard pile
    game_state["discard_pile"].append(card)
    
    # Handle card effects
    direction = game_state["direction"]
    skip_next = False
    draw_amount = 0
    new_color = card["color"] if card["color"] != "wild" else None
    
    room = await db.rooms.find_one({"room_code": room_code})
    num_players = len(room["players"])
    
    if card["type"] == "reverse":
        direction = -direction
        if num_players == 2:
            skip_next = True
    elif card["type"] == "skip":
        skip_next = True
    elif card["type"] == "draw2":
        draw_amount = 2
        skip_next = True
    elif card["type"] == "wild":
        new_color = chosen_color or "red"
    elif card["type"] == "wild4":
        new_color = chosen_color or "red"
        draw_amount = 4
        skip_next = True
    
    game_state["direction"] = direction
    game_state["selected_color"] = new_color
    
    # Calculate next player
    next_index = (game_state["current_player_index"] + direction) % num_players
    
    # Handle draw cards for next player
    if draw_amount > 0:
        next_player_id = game_state["player_order"][next_index]
        next_hand = game_state["players_hands"].get(next_player_id, [])
        deck = game_state["deck"]
        
        for _ in range(draw_amount):
            if not deck:
                # Reshuffle discard pile
                top = game_state["discard_pile"].pop()
                deck = game_state["discard_pile"]
                random.shuffle(deck)
                game_state["discard_pile"] = [top]
            if deck:
                next_hand.append(deck.pop())
        
        game_state["players_hands"][next_player_id] = next_hand
        game_state["deck"] = deck
    
    if skip_next:
        next_index = (next_index + direction) % num_players
    
    game_state["current_player_index"] = next_index
    
    # Get player name for action
    player_name = "Player"
    for p in room["players"]:
        if p["user_id"] == user_id:
            player_name = p["name"]
            break
    
    game_state["last_action"] = f"{player_name} played a card"
    game_state["updated_at"] = datetime.now(timezone.utc)
    
    # Check for winner
    if len(hand) == 0:
        game_state["status"] = "finished"
        game_state["winner"] = {"user_id": user_id, "name": player_name}
    
    # Save updated state
    await db.game_states.update_one(
        {"room_code": room_code},
        {"$set": game_state}
    )
    
    return {"success": True, "message": "Card played"}

@api_router.post("/rooms/{room_code}/draw-card")
async def draw_card(room_code: str, request: Request):
    """Draw a card from the deck"""
    body = await request.json()
    user_id = body.get("user_id")
    
    game_state = await db.game_states.find_one({"room_code": room_code})
    
    if not game_state:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game_state["status"] != "playing":
        raise HTTPException(status_code=400, detail="Game is not in progress")
    
    # Check if it's this player's turn
    current_player_id = game_state["player_order"][game_state["current_player_index"]]
    if current_player_id != user_id:
        raise HTTPException(status_code=400, detail="Not your turn")
    
    deck = game_state["deck"]
    discard_pile = game_state["discard_pile"]
    
    # Reshuffle if deck is empty
    if not deck:
        if len(discard_pile) > 1:
            top = discard_pile.pop()
            deck = discard_pile
            random.shuffle(deck)
            game_state["discard_pile"] = [top]
    
    if not deck:
        raise HTTPException(status_code=400, detail="No cards left to draw")
    
    # Draw card
    drawn_card = deck.pop()
    hand = game_state["players_hands"].get(user_id, [])
    hand.append(drawn_card)
    game_state["players_hands"][user_id] = hand
    game_state["deck"] = deck
    
    # Check if drawn card can be played
    top_card = game_state["discard_pile"][-1] if game_state["discard_pile"] else None
    can_play = can_play_card(drawn_card, top_card, game_state["selected_color"]) if top_card else True
    
    room = await db.rooms.find_one({"room_code": room_code})
    player_name = "Player"
    for p in room["players"]:
        if p["user_id"] == user_id:
            player_name = p["name"]
            break
    
    game_state["last_action"] = f"{player_name} drew a card"
    game_state["updated_at"] = datetime.now(timezone.utc)
    
    await db.game_states.update_one(
        {"room_code": room_code},
        {"$set": game_state}
    )
    
    return {
        "success": True,
        "drawn_card": drawn_card,
        "can_play": can_play
    }

@api_router.post("/rooms/{room_code}/pass-turn")
async def pass_turn(room_code: str, request: Request):
    """Pass turn after drawing (if can't/won't play drawn card)"""
    body = await request.json()
    user_id = body.get("user_id")
    
    game_state = await db.game_states.find_one({"room_code": room_code})
    
    if not game_state:
        raise HTTPException(status_code=404, detail="Game not found")
    
    current_player_id = game_state["player_order"][game_state["current_player_index"]]
    if current_player_id != user_id:
        raise HTTPException(status_code=400, detail="Not your turn")
    
    room = await db.rooms.find_one({"room_code": room_code})
    num_players = len(room["players"])
    
    # Move to next player
    next_index = (game_state["current_player_index"] + game_state["direction"]) % num_players
    game_state["current_player_index"] = next_index
    game_state["updated_at"] = datetime.now(timezone.utc)
    
    await db.game_states.update_one(
        {"room_code": room_code},
        {"$set": game_state}
    )
    
    return {"success": True, "message": "Turn passed"}

@api_router.post("/rooms/{room_code}/call-uno")
async def call_uno(room_code: str, request: Request):
    """Call UNO when having one card"""
    body = await request.json()
    user_id = body.get("user_id")
    
    game_state = await db.game_states.find_one({"room_code": room_code})
    
    if not game_state:
        raise HTTPException(status_code=404, detail="Game not found")
    
    hand = game_state["players_hands"].get(user_id, [])
    
    if len(hand) != 1:
        raise HTTPException(status_code=400, detail="Can only call UNO with one card")
    
    game_state["uno_called"][user_id] = True
    game_state["updated_at"] = datetime.now(timezone.utc)
    
    room = await db.rooms.find_one({"room_code": room_code})
    player_name = "Player"
    for p in room["players"]:
        if p["user_id"] == user_id:
            player_name = p["name"]
            break
    
    game_state["last_action"] = f"{player_name} called UNO!"
    
    await db.game_states.update_one(
        {"room_code": room_code},
        {"$set": game_state}
    )
    
    return {"success": True, "message": "UNO called!"}


# ==================== PROFILE ROUTES ====================

@api_router.put("/profile")
async def update_profile(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    body = await request.json()
    name = body.get("name")
    
    if not name or len(name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"name": name.strip()}}
    )
    
    # Also update name in games
    await db.games.update_many(
        {"user_id": current_user.user_id},
        {"$set": {"player_name": name.strip()}}
    )
    
    return {"message": "Profile updated"}


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
