from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Greetings Island Clone API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===================== MODELS =====================

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    icon: str = "🎉"
    description: Optional[str] = None
    template_count: int = 0

class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: str = "🎉"
    description: Optional[str] = None

class TemplateElement(BaseModel):
    type: str  # 'text', 'image', 'shape'
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    x: float = 0
    y: float = 0
    width: float = 100
    height: float = 50
    rotation: float = 0
    # Text properties
    text: Optional[str] = None
    fontSize: Optional[int] = 24
    fontFamily: Optional[str] = "Arial"
    fontWeight: Optional[str] = "normal"
    fontStyle: Optional[str] = "normal"
    textAlign: Optional[str] = "center"
    fill: Optional[str] = "#000000"
    # Image properties
    src: Optional[str] = None
    # Shape properties
    shapeType: Optional[str] = None
    stroke: Optional[str] = None
    strokeWidth: Optional[int] = None

class Template(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category_id: str
    category_slug: str
    thumbnail: str
    width: int = 500
    height: int = 700
    background_color: str = "#ffffff"
    background_image: Optional[str] = None
    elements: List[Dict[str, Any]] = []
    tags: List[str] = []
    is_premium: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TemplateCreate(BaseModel):
    name: str
    category_id: str
    category_slug: str
    thumbnail: str
    width: int = 500
    height: int = 700
    background_color: str = "#ffffff"
    background_image: Optional[str] = None
    elements: List[Dict[str, Any]] = []
    tags: List[str] = []
    is_premium: bool = False

class UserDesign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template_id: str
    name: str = "Untitled Design"
    width: int = 500
    height: int = 700
    background_color: str = "#ffffff"
    background_image: Optional[str] = None
    elements: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserDesignCreate(BaseModel):
    template_id: str
    name: str = "Untitled Design"
    width: int = 500
    height: int = 700
    background_color: str = "#ffffff"
    background_image: Optional[str] = None
    elements: List[Dict[str, Any]] = []

class UserDesignUpdate(BaseModel):
    name: Optional[str] = None
    background_color: Optional[str] = None
    background_image: Optional[str] = None
    elements: Optional[List[Dict[str, Any]]] = None

# ===================== CATEGORY ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Greetings Island Clone API"}

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.get("/categories/{slug}")
async def get_category_by_slug(slug: str):
    category = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@api_router.post("/categories", response_model=Category)
async def create_category(input: CategoryCreate):
    category = Category(**input.model_dump())
    doc = category.model_dump()
    await db.categories.insert_one(doc)
    return category

# ===================== TEMPLATE ROUTES =====================

@api_router.get("/templates", response_model=List[Template])
async def get_templates(category_slug: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if category_slug:
        query["category_slug"] = category_slug
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    templates = await db.templates.find(query, {"_id": 0}).to_list(100)
    # Convert datetime strings back to datetime objects
    for t in templates:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'].replace('Z', '+00:00'))
    return templates

@api_router.get("/templates/{template_id}", response_model=Template)
async def get_template(template_id: str):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if isinstance(template.get('created_at'), str):
        template['created_at'] = datetime.fromisoformat(template['created_at'].replace('Z', '+00:00'))
    return template

@api_router.post("/templates", response_model=Template)
async def create_template(input: TemplateCreate):
    template = Template(**input.model_dump())
    doc = template.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.templates.insert_one(doc)
    return template

# ===================== USER DESIGN ROUTES =====================

@api_router.get("/designs", response_model=List[UserDesign])
async def get_user_designs():
    designs = await db.user_designs.find({}, {"_id": 0}).to_list(100)
    for d in designs:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'].replace('Z', '+00:00'))
        if isinstance(d.get('updated_at'), str):
            d['updated_at'] = datetime.fromisoformat(d['updated_at'].replace('Z', '+00:00'))
    return designs

@api_router.get("/designs/{design_id}", response_model=UserDesign)
async def get_user_design(design_id: str):
    design = await db.user_designs.find_one({"id": design_id}, {"_id": 0})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    if isinstance(design.get('created_at'), str):
        design['created_at'] = datetime.fromisoformat(design['created_at'].replace('Z', '+00:00'))
    if isinstance(design.get('updated_at'), str):
        design['updated_at'] = datetime.fromisoformat(design['updated_at'].replace('Z', '+00:00'))
    return design

@api_router.post("/designs", response_model=UserDesign)
async def create_user_design(input: UserDesignCreate):
    design = UserDesign(**input.model_dump())
    doc = design.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.user_designs.insert_one(doc)
    return design

@api_router.put("/designs/{design_id}", response_model=UserDesign)
async def update_user_design(design_id: str, input: UserDesignUpdate):
    existing = await db.user_designs.find_one({"id": design_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Design not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.user_designs.update_one({"id": design_id}, {"$set": update_data})
    updated = await db.user_designs.find_one({"id": design_id}, {"_id": 0})
    
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'].replace('Z', '+00:00'))
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'].replace('Z', '+00:00'))
    return updated

@api_router.delete("/designs/{design_id}")
async def delete_user_design(design_id: str):
    result = await db.user_designs.delete_one({"id": design_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Design not found")
    return {"message": "Design deleted successfully"}

# ===================== SEED DATA =====================

@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample categories and templates"""
    
    # Clear existing data
    await db.categories.delete_many({})
    await db.templates.delete_many({})
    
    # Categories
    categories_data = [
        {"id": "cat-birthday", "name": "Birthday", "slug": "birthday", "icon": "🎂", "description": "Celebrate birthdays with style"},
        {"id": "cat-wedding", "name": "Wedding", "slug": "wedding", "icon": "💒", "description": "Perfect invitations for your special day"},
        {"id": "cat-baby", "name": "Baby Shower", "slug": "baby-shower", "icon": "👶", "description": "Welcome the little one"},
        {"id": "cat-christmas", "name": "Christmas", "slug": "christmas", "icon": "🎄", "description": "Spread holiday cheer"},
        {"id": "cat-newyear", "name": "New Year", "slug": "new-year", "icon": "🎆", "description": "Ring in the new year"},
        {"id": "cat-graduation", "name": "Graduation", "slug": "graduation", "icon": "🎓", "description": "Celebrate achievements"},
        {"id": "cat-thankyou", "name": "Thank You", "slug": "thank-you", "icon": "🙏", "description": "Express your gratitude"},
        {"id": "cat-anniversary", "name": "Anniversary", "slug": "anniversary", "icon": "💝", "description": "Celebrate love and togetherness"},
    ]
    
    await db.categories.insert_many(categories_data)
    
    # Templates
    templates_data = [
        # Birthday Templates
        {
            "id": "tmpl-bday-1",
            "name": "Colorful Birthday Bash",
            "category_id": "cat-birthday",
            "category_slug": "birthday",
            "thumbnail": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#FFF5E6",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 80, "text": "🎉 You're Invited! 🎉", "fontSize": 32, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#FF6B6B", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 200, "text": "BIRTHDAY PARTY", "fontSize": 48, "fontFamily": "Arial Black", "fontWeight": "bold", "fill": "#4ECDC4", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 320, "text": "[Name]", "fontSize": 36, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#2C3E50", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 450, "text": "Saturday, January 15th\n3:00 PM", "fontSize": 24, "fontFamily": "Arial", "fill": "#666666", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 580, "text": "123 Party Street\nCelebration City", "fontSize": 20, "fontFamily": "Arial", "fill": "#888888", "textAlign": "center"},
            ],
            "tags": ["colorful", "fun", "party", "balloons"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "tmpl-bday-2",
            "name": "Elegant Gold Birthday",
            "category_id": "cat-birthday",
            "category_slug": "birthday",
            "thumbnail": "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#1A1A2E",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 100, "text": "You're Invited", "fontSize": 28, "fontFamily": "Georgia", "fill": "#D4AF37", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 220, "text": "BIRTHDAY\nCELEBRATION", "fontSize": 42, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#FFFFFF", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 380, "text": "[Name]", "fontSize": 36, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#D4AF37", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 500, "text": "Date & Time", "fontSize": 22, "fontFamily": "Arial", "fill": "#CCCCCC", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 600, "text": "Venue Address", "fontSize": 18, "fontFamily": "Arial", "fill": "#999999", "textAlign": "center"},
            ],
            "tags": ["elegant", "gold", "luxury", "milestone"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "tmpl-bday-3",
            "name": "Kids Rainbow Party",
            "category_id": "cat-birthday",
            "category_slug": "birthday",
            "thumbnail": "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#E8F5E9",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 80, "text": "🌈 PARTY TIME! 🌈", "fontSize": 36, "fontFamily": "Comic Sans MS", "fontWeight": "bold", "fill": "#FF5722", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 200, "text": "[Child's Name]", "fontSize": 40, "fontFamily": "Comic Sans MS", "fill": "#9C27B0", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 300, "text": "is turning", "fontSize": 24, "fontFamily": "Comic Sans MS", "fill": "#333333", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 380, "text": "[Age]!", "fontSize": 72, "fontFamily": "Comic Sans MS", "fontWeight": "bold", "fill": "#2196F3", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 520, "text": "Join us for fun!\nDate & Time", "fontSize": 22, "fontFamily": "Comic Sans MS", "fill": "#4CAF50", "textAlign": "center"},
            ],
            "tags": ["kids", "colorful", "rainbow", "fun"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Wedding Templates
        {
            "id": "tmpl-wed-1",
            "name": "Classic Floral Wedding",
            "category_id": "cat-wedding",
            "category_slug": "wedding",
            "thumbnail": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#FDF8F5",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 80, "text": "Together with their families", "fontSize": 18, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#8B7355", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 180, "text": "Sarah & Michael", "fontSize": 48, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#2C3E50", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 280, "text": "request the pleasure of your company\nat their wedding celebration", "fontSize": 18, "fontFamily": "Georgia", "fill": "#666666", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 420, "text": "Saturday, June 15th, 2024\nFour o'clock in the afternoon", "fontSize": 20, "fontFamily": "Georgia", "fill": "#333333", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 560, "text": "The Grand Ballroom\n123 Celebration Avenue", "fontSize": 18, "fontFamily": "Georgia", "fill": "#666666", "textAlign": "center"},
            ],
            "tags": ["elegant", "floral", "classic", "romantic"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "tmpl-wed-2",
            "name": "Modern Minimalist Wedding",
            "category_id": "cat-wedding",
            "category_slug": "wedding",
            "thumbnail": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#FFFFFF",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 150, "text": "EMMA", "fontSize": 56, "fontFamily": "Helvetica", "fontWeight": "300", "fill": "#1A1A1A", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 230, "text": "&", "fontSize": 36, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#B8860B", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 310, "text": "JAMES", "fontSize": 56, "fontFamily": "Helvetica", "fontWeight": "300", "fill": "#1A1A1A", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 450, "text": "06.20.2024", "fontSize": 24, "fontFamily": "Helvetica", "fill": "#666666", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 550, "text": "Save the Date", "fontSize": 18, "fontFamily": "Helvetica", "fill": "#999999", "textAlign": "center"},
            ],
            "tags": ["modern", "minimalist", "simple", "clean"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Baby Shower Templates
        {
            "id": "tmpl-baby-1",
            "name": "Sweet Baby Blue",
            "category_id": "cat-baby",
            "category_slug": "baby-shower",
            "thumbnail": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#E3F2FD",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 80, "text": "👶 It's a Boy! 👶", "fontSize": 32, "fontFamily": "Georgia", "fill": "#1976D2", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 180, "text": "BABY SHOWER", "fontSize": 42, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#0D47A1", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 300, "text": "Honoring\n[Mom's Name]", "fontSize": 26, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#333333", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 450, "text": "Saturday, March 20th\n2:00 PM", "fontSize": 22, "fontFamily": "Arial", "fill": "#555555", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 580, "text": "RSVP to [Host]", "fontSize": 18, "fontFamily": "Arial", "fill": "#777777", "textAlign": "center"},
            ],
            "tags": ["baby boy", "blue", "cute", "shower"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "tmpl-baby-2",
            "name": "Pretty Pink Baby",
            "category_id": "cat-baby",
            "category_slug": "baby-shower",
            "thumbnail": "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#FCE4EC",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 80, "text": "💖 It's a Girl! 💖", "fontSize": 32, "fontFamily": "Georgia", "fill": "#E91E63", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 180, "text": "BABY SHOWER", "fontSize": 42, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#AD1457", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 300, "text": "Honoring\n[Mom's Name]", "fontSize": 26, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#333333", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 450, "text": "Saturday, March 20th\n2:00 PM", "fontSize": 22, "fontFamily": "Arial", "fill": "#555555", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 580, "text": "RSVP to [Host]", "fontSize": 18, "fontFamily": "Arial", "fill": "#777777", "textAlign": "center"},
            ],
            "tags": ["baby girl", "pink", "cute", "shower"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Christmas Templates
        {
            "id": "tmpl-xmas-1",
            "name": "Classic Christmas",
            "category_id": "cat-christmas",
            "category_slug": "christmas",
            "thumbnail": "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#1B4332",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 100, "text": "🎄 MERRY 🎄", "fontSize": 36, "fontFamily": "Georgia", "fill": "#FFD700", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 200, "text": "CHRISTMAS", "fontSize": 52, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#FFFFFF", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 350, "text": "Wishing you joy\nand happiness", "fontSize": 26, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#E8E8E8", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 500, "text": "From\n[Your Family]", "fontSize": 22, "fontFamily": "Georgia", "fill": "#FFD700", "textAlign": "center"},
            ],
            "tags": ["christmas", "holiday", "festive", "green"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # New Year Templates
        {
            "id": "tmpl-ny-1",
            "name": "Sparkling New Year",
            "category_id": "cat-newyear",
            "category_slug": "new-year",
            "thumbnail": "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#0D0D0D",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 100, "text": "✨ HAPPY ✨", "fontSize": 36, "fontFamily": "Georgia", "fill": "#FFD700", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 200, "text": "NEW YEAR", "fontSize": 52, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#FFFFFF", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 320, "text": "2025", "fontSize": 80, "fontFamily": "Arial Black", "fill": "#FFD700", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 480, "text": "Join us for a\nmidnight celebration!", "fontSize": 22, "fontFamily": "Georgia", "fill": "#CCCCCC", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 600, "text": "December 31st, 9 PM", "fontSize": 20, "fontFamily": "Arial", "fill": "#888888", "textAlign": "center"},
            ],
            "tags": ["new year", "celebration", "party", "2025"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Thank You Templates
        {
            "id": "tmpl-ty-1",
            "name": "Heartfelt Thanks",
            "category_id": "cat-thankyou",
            "category_slug": "thank-you",
            "thumbnail": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#FFF8E7",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 150, "text": "Thank You", "fontSize": 56, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#8B4513", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 280, "text": "so much!", "fontSize": 36, "fontFamily": "Georgia", "fill": "#A0522D", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 420, "text": "Your kindness and\nthoughtfulness mean\nthe world to us.", "fontSize": 22, "fontFamily": "Georgia", "fill": "#555555", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 580, "text": "With gratitude,\n[Your Name]", "fontSize": 20, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#777777", "textAlign": "center"},
            ],
            "tags": ["thank you", "gratitude", "appreciation"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Graduation Templates
        {
            "id": "tmpl-grad-1",
            "name": "Graduation Celebration",
            "category_id": "cat-graduation",
            "category_slug": "graduation",
            "thumbnail": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#1A237E",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 80, "text": "🎓 CONGRATULATIONS 🎓", "fontSize": 28, "fontFamily": "Georgia", "fill": "#FFD700", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 180, "text": "CLASS OF 2025", "fontSize": 42, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#FFFFFF", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 300, "text": "[Graduate Name]", "fontSize": 36, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#FFD700", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 420, "text": "Join us for a\ngraduation party!", "fontSize": 22, "fontFamily": "Georgia", "fill": "#E8E8E8", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 560, "text": "Date & Time\nVenue", "fontSize": 18, "fontFamily": "Arial", "fill": "#BBBBBB", "textAlign": "center"},
            ],
            "tags": ["graduation", "academic", "celebration", "achievement"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Anniversary Templates
        {
            "id": "tmpl-anniv-1",
            "name": "Golden Anniversary",
            "category_id": "cat-anniversary",
            "category_slug": "anniversary",
            "thumbnail": "https://images.unsplash.com/photo-1529636798458-92182e662485?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#2C2C2C",
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 100, "text": "💝 Celebrating 💝", "fontSize": 28, "fontFamily": "Georgia", "fill": "#D4AF37", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 200, "text": "[X] Years", "fontSize": 56, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#FFD700", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 300, "text": "of Love", "fontSize": 36, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#FFFFFF", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 420, "text": "[Couple Names]", "fontSize": 28, "fontFamily": "Georgia", "fill": "#D4AF37", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 550, "text": "Join us in celebrating\nDate & Venue", "fontSize": 18, "fontFamily": "Arial", "fill": "#CCCCCC", "textAlign": "center"},
            ],
            "tags": ["anniversary", "love", "golden", "celebration"],
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    await db.templates.insert_many(templates_data)
    
    # Update category counts
    for cat in categories_data:
        count = await db.templates.count_documents({"category_slug": cat["slug"]})
        await db.categories.update_one({"id": cat["id"]}, {"$set": {"template_count": count}})
    
    return {"message": "Database seeded successfully", "categories": len(categories_data), "templates": len(templates_data)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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
