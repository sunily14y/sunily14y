from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends
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
import json

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

# Admin password (in production, use proper auth)
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# ===================== MODELS =====================

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    icon: str = "🎉"
    description: Optional[str] = None
    template_count: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: str = "🎉"
    description: Optional[str] = None
    is_active: bool = True

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

# Editable zone configuration
class EditableZone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # 'text', 'image'
    name: str  # Display name for admin
    x: float
    y: float
    width: float
    height: float
    # For text zones
    default_text: Optional[str] = None
    placeholder: Optional[str] = None
    font_family: Optional[str] = "Arial"
    font_size: Optional[int] = 24
    font_color: Optional[str] = "#000000"
    font_weight: Optional[str] = "normal"
    font_style: Optional[str] = "normal"
    text_align: Optional[str] = "center"
    max_length: Optional[int] = None
    # Permissions
    can_edit_text: bool = True
    can_change_font: bool = True
    can_change_size: bool = True
    can_change_color: bool = True
    can_move: bool = False
    can_resize: bool = False
    can_delete: bool = False
    # For image zones
    accepts_upload: bool = True
    default_image: Optional[str] = None

class TemplateElement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # 'text', 'image', 'shape'
    x: float
    y: float
    width: float = 100
    height: float = 50
    rotation: float = 0
    # Locked elements (decorative, non-editable)
    is_locked: bool = False
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
    # Editable zones - areas where users CAN make changes
    editable_zones: List[Dict[str, Any]] = []
    # Locked elements - decorative elements users CANNOT edit
    locked_elements: List[Dict[str, Any]] = []
    # Legacy elements field for backward compatibility
    elements: List[Dict[str, Any]] = []
    tags: List[str] = []
    is_premium: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TemplateCreate(BaseModel):
    name: str
    category_id: str
    category_slug: str
    thumbnail: str = ""
    width: int = 500
    height: int = 700
    background_color: str = "#ffffff"
    background_image: Optional[str] = None
    editable_zones: List[Dict[str, Any]] = []
    locked_elements: List[Dict[str, Any]] = []
    elements: List[Dict[str, Any]] = []
    tags: List[str] = []
    is_premium: bool = False
    is_active: bool = True

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    category_slug: Optional[str] = None
    thumbnail: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    background_color: Optional[str] = None
    background_image: Optional[str] = None
    editable_zones: Optional[List[Dict[str, Any]]] = None
    locked_elements: Optional[List[Dict[str, Any]]] = None
    elements: Optional[List[Dict[str, Any]]] = None
    tags: Optional[List[str]] = None
    is_premium: Optional[bool] = None
    is_active: Optional[bool] = None

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

class AdminLogin(BaseModel):
    password: str

# ===================== HELPER FUNCTIONS =====================

def fix_datetime(doc):
    if isinstance(doc.get('created_at'), str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'].replace('Z', '+00:00'))
    if isinstance(doc.get('updated_at'), str):
        doc['updated_at'] = datetime.fromisoformat(doc['updated_at'].replace('Z', '+00:00'))
    return doc

# ===================== ADMIN AUTH =====================

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    if credentials.password == ADMIN_PASSWORD:
        return {"success": True, "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid password")

@api_router.get("/admin/verify")
async def admin_verify(password: str):
    if password == ADMIN_PASSWORD:
        return {"valid": True}
    return {"valid": False}

# ===================== ADMIN CATEGORY ROUTES =====================

@api_router.get("/admin/categories", response_model=List[Category])
async def admin_get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    for c in categories:
        fix_datetime(c)
    return categories

@api_router.post("/admin/categories", response_model=Category)
async def admin_create_category(input: CategoryCreate):
    # Check if slug already exists
    existing = await db.categories.find_one({"slug": input.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Category slug already exists")
    
    category = Category(**input.model_dump())
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category

@api_router.put("/admin/categories/{category_id}", response_model=Category)
async def admin_update_category(category_id: str, input: CategoryUpdate):
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    fix_datetime(updated)
    return updated

@api_router.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str):
    # Check if category has templates
    template_count = await db.templates.count_documents({"category_id": category_id})
    if template_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {template_count} templates")
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ===================== ADMIN TEMPLATE ROUTES =====================

@api_router.get("/admin/templates")
async def admin_get_templates(category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    templates = await db.templates.find(query, {"_id": 0}).to_list(200)
    for t in templates:
        fix_datetime(t)
    return templates

@api_router.get("/admin/templates/{template_id}")
async def admin_get_template(template_id: str):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    fix_datetime(template)
    return template

@api_router.post("/admin/templates", response_model=Template)
async def admin_create_template(input: TemplateCreate):
    template = Template(**input.model_dump())
    doc = template.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.templates.insert_one(doc)
    
    # Update category template count
    await db.categories.update_one(
        {"id": input.category_id},
        {"$inc": {"template_count": 1}}
    )
    return template

@api_router.put("/admin/templates/{template_id}")
async def admin_update_template(template_id: str, input: TemplateUpdate):
    existing = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Handle category change
    if 'category_id' in update_data and update_data['category_id'] != existing.get('category_id'):
        await db.categories.update_one({"id": existing['category_id']}, {"$inc": {"template_count": -1}})
        await db.categories.update_one({"id": update_data['category_id']}, {"$inc": {"template_count": 1}})
    
    await db.templates.update_one({"id": template_id}, {"$set": update_data})
    updated = await db.templates.find_one({"id": template_id}, {"_id": 0})
    fix_datetime(updated)
    return updated

@api_router.delete("/admin/templates/{template_id}")
async def admin_delete_template(template_id: str):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.templates.delete_one({"id": template_id})
    
    # Update category template count
    await db.categories.update_one(
        {"id": template.get('category_id')},
        {"$inc": {"template_count": -1}}
    )
    return {"message": "Template deleted successfully"}

# ===================== IMAGE UPLOAD =====================

@api_router.post("/admin/upload")
async def admin_upload_image(file: UploadFile = File(...)):
    """Upload image and return base64 data URL"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    return {"url": data_url, "filename": file.filename}

# ===================== PUBLIC CATEGORY ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Greetings Island Clone API"}

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(100)
    for c in categories:
        fix_datetime(c)
    return categories

@api_router.get("/categories/{slug}")
async def get_category_by_slug(slug: str):
    category = await db.categories.find_one({"slug": slug, "is_active": {"$ne": False}}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    fix_datetime(category)
    return category

# ===================== PUBLIC TEMPLATE ROUTES =====================

@api_router.get("/templates", response_model=List[Template])
async def get_templates(category_slug: Optional[str] = None, search: Optional[str] = None):
    query = {"is_active": {"$ne": False}}
    if category_slug:
        query["category_slug"] = category_slug
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    templates = await db.templates.find(query, {"_id": 0}).to_list(100)
    for t in templates:
        fix_datetime(t)
    return templates

@api_router.get("/templates/{template_id}", response_model=Template)
async def get_template(template_id: str):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    fix_datetime(template)
    return template

# Legacy route for backward compatibility
@api_router.post("/categories", response_model=Category)
async def create_category(input: CategoryCreate):
    return await admin_create_category(input)

@api_router.post("/templates", response_model=Template)
async def create_template(input: TemplateCreate):
    return await admin_create_template(input)

# ===================== USER DESIGN ROUTES =====================

@api_router.get("/designs", response_model=List[UserDesign])
async def get_user_designs():
    designs = await db.user_designs.find({}, {"_id": 0}).to_list(100)
    for d in designs:
        fix_datetime(d)
    return designs

@api_router.get("/designs/{design_id}", response_model=UserDesign)
async def get_user_design(design_id: str):
    design = await db.user_designs.find_one({"id": design_id}, {"_id": 0})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    fix_datetime(design)
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
    fix_datetime(updated)
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
    
    # Check if already seeded
    existing_cats = await db.categories.count_documents({})
    if existing_cats > 0:
        return {"message": "Database already seeded", "categories": existing_cats}
    
    # Categories
    categories_data = [
        {"id": "cat-birthday", "name": "Birthday", "slug": "birthday", "icon": "🎂", "description": "Celebrate birthdays with style", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cat-wedding", "name": "Wedding", "slug": "wedding", "icon": "💒", "description": "Perfect invitations for your special day", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cat-baby", "name": "Baby Shower", "slug": "baby-shower", "icon": "👶", "description": "Welcome the little one", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cat-christmas", "name": "Christmas", "slug": "christmas", "icon": "🎄", "description": "Spread holiday cheer", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cat-newyear", "name": "New Year", "slug": "new-year", "icon": "🎆", "description": "Ring in the new year", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cat-graduation", "name": "Graduation", "slug": "graduation", "icon": "🎓", "description": "Celebrate achievements", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cat-thankyou", "name": "Thank You", "slug": "thank-you", "icon": "🙏", "description": "Express your gratitude", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cat-anniversary", "name": "Anniversary", "slug": "anniversary", "icon": "💝", "description": "Celebrate love and togetherness", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.categories.insert_many(categories_data)
    
    # Sample template with editable zones
    templates_data = [
        {
            "id": "tmpl-bday-1",
            "name": "Colorful Birthday Bash",
            "category_id": "cat-birthday",
            "category_slug": "birthday",
            "thumbnail": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#FFF5E6",
            "editable_zones": [
                {"id": "zone-1", "type": "text", "name": "Header", "x": 250, "y": 80, "width": 400, "height": 50, "default_text": "🎉 You're Invited! 🎉", "placeholder": "Enter header text", "font_size": 32, "font_family": "Georgia", "font_color": "#FF6B6B", "font_weight": "bold", "text_align": "center", "can_edit_text": True, "can_change_font": True, "can_change_size": True, "can_change_color": True, "can_move": False, "can_delete": False},
                {"id": "zone-2", "type": "text", "name": "Title", "x": 250, "y": 200, "width": 400, "height": 80, "default_text": "BIRTHDAY PARTY", "placeholder": "Event title", "font_size": 48, "font_family": "Arial Black", "font_color": "#4ECDC4", "font_weight": "bold", "text_align": "center", "can_edit_text": True, "can_change_font": True, "can_change_size": True, "can_change_color": True, "can_move": False, "can_delete": False},
                {"id": "zone-3", "type": "text", "name": "Name", "x": 250, "y": 320, "width": 300, "height": 50, "default_text": "[Name]", "placeholder": "Enter name", "font_size": 36, "font_family": "Georgia", "font_color": "#2C3E50", "font_style": "italic", "text_align": "center", "can_edit_text": True, "can_change_font": True, "can_change_size": True, "can_change_color": True, "can_move": False, "can_delete": False},
                {"id": "zone-4", "type": "text", "name": "Date & Time", "x": 250, "y": 450, "width": 300, "height": 60, "default_text": "Saturday, January 15th\n3:00 PM", "placeholder": "Date and time", "font_size": 24, "font_family": "Arial", "font_color": "#666666", "text_align": "center", "can_edit_text": True, "can_change_font": True, "can_change_size": True, "can_change_color": True, "can_move": False, "can_delete": False},
                {"id": "zone-5", "type": "text", "name": "Address", "x": 250, "y": 580, "width": 300, "height": 60, "default_text": "123 Party Street\nCelebration City", "placeholder": "Venue address", "font_size": 20, "font_family": "Arial", "font_color": "#888888", "text_align": "center", "can_edit_text": True, "can_change_font": True, "can_change_size": True, "can_change_color": True, "can_move": False, "can_delete": False},
                {"id": "zone-6", "type": "image", "name": "Photo", "x": 400, "y": 100, "width": 80, "height": 80, "accepts_upload": True, "can_move": False, "can_resize": False, "can_delete": False},
            ],
            "locked_elements": [],
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 80, "text": "🎉 You're Invited! 🎉", "fontSize": 32, "fontFamily": "Georgia", "fontWeight": "bold", "fill": "#FF6B6B", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 200, "text": "BIRTHDAY PARTY", "fontSize": 48, "fontFamily": "Arial Black", "fontWeight": "bold", "fill": "#4ECDC4", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 320, "text": "[Name]", "fontSize": 36, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#2C3E50", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 450, "text": "Saturday, January 15th\n3:00 PM", "fontSize": 24, "fontFamily": "Arial", "fill": "#666666", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 580, "text": "123 Party Street\nCelebration City", "fontSize": 20, "fontFamily": "Arial", "fill": "#888888", "textAlign": "center"},
            ],
            "tags": ["colorful", "fun", "party", "balloons"],
            "is_premium": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "tmpl-wed-1",
            "name": "Classic Floral Wedding",
            "category_id": "cat-wedding",
            "category_slug": "wedding",
            "thumbnail": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=560&fit=crop",
            "width": 500,
            "height": 700,
            "background_color": "#FDF8F5",
            "editable_zones": [
                {"id": "zone-1", "type": "text", "name": "Header", "x": 250, "y": 80, "width": 400, "height": 40, "default_text": "Together with their families", "font_size": 18, "font_family": "Georgia", "font_color": "#8B7355", "font_style": "italic", "text_align": "center", "can_edit_text": True, "can_change_font": True, "can_change_color": True},
                {"id": "zone-2", "type": "text", "name": "Couple Names", "x": 250, "y": 180, "width": 400, "height": 60, "default_text": "Sarah & Michael", "font_size": 48, "font_family": "Georgia", "font_color": "#2C3E50", "font_style": "italic", "text_align": "center", "can_edit_text": True, "can_change_font": True, "can_change_color": True},
                {"id": "zone-3", "type": "text", "name": "Invitation Text", "x": 250, "y": 280, "width": 400, "height": 60, "default_text": "request the pleasure of your company\nat their wedding celebration", "font_size": 18, "font_family": "Georgia", "font_color": "#666666", "text_align": "center", "can_edit_text": True},
                {"id": "zone-4", "type": "text", "name": "Date & Time", "x": 250, "y": 420, "width": 400, "height": 60, "default_text": "Saturday, June 15th, 2024\nFour o'clock in the afternoon", "font_size": 20, "font_family": "Georgia", "font_color": "#333333", "text_align": "center", "can_edit_text": True},
                {"id": "zone-5", "type": "text", "name": "Venue", "x": 250, "y": 560, "width": 400, "height": 60, "default_text": "The Grand Ballroom\n123 Celebration Avenue", "font_size": 18, "font_family": "Georgia", "font_color": "#666666", "text_align": "center", "can_edit_text": True},
            ],
            "locked_elements": [],
            "elements": [
                {"type": "text", "id": "e1", "x": 250, "y": 80, "text": "Together with their families", "fontSize": 18, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#8B7355", "textAlign": "center"},
                {"type": "text", "id": "e2", "x": 250, "y": 180, "text": "Sarah & Michael", "fontSize": 48, "fontFamily": "Georgia", "fontStyle": "italic", "fill": "#2C3E50", "textAlign": "center"},
                {"type": "text", "id": "e3", "x": 250, "y": 280, "text": "request the pleasure of your company\nat their wedding celebration", "fontSize": 18, "fontFamily": "Georgia", "fill": "#666666", "textAlign": "center"},
                {"type": "text", "id": "e4", "x": 250, "y": 420, "text": "Saturday, June 15th, 2024\nFour o'clock in the afternoon", "fontSize": 20, "fontFamily": "Georgia", "fill": "#333333", "textAlign": "center"},
                {"type": "text", "id": "e5", "x": 250, "y": 560, "text": "The Grand Ballroom\n123 Celebration Avenue", "fontSize": 18, "fontFamily": "Georgia", "fill": "#666666", "textAlign": "center"},
            ],
            "tags": ["elegant", "floral", "classic", "romantic"],
            "is_premium": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
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
