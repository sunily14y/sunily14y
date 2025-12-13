from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import aiohttp
from bs4 import BeautifulSoup
import re
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= Models =============

class ProductCreate(BaseModel):
    url: str
    platform: Optional[str] = None

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    platform: str
    name: str
    current_price: float
    original_price: Optional[float] = None
    image_url: Optional[str] = None
    currency: str = "INR"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PriceHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    price: float
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PriceAlertCreate(BaseModel):
    product_id: str
    email: EmailStr
    target_price: float

class PriceAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    email: str
    target_price: float
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductResponse(BaseModel):
    id: str
    url: str
    platform: str
    name: str
    current_price: float
    original_price: Optional[float] = None
    image_url: Optional[str] = None
    currency: str
    created_at: str
    updated_at: str
    lowest_price: Optional[float] = None
    highest_price: Optional[float] = None
    price_history: Optional[List[dict]] = None

# ============= Scraper Service =============

# Bright Data Configuration
BRIGHTDATA_API_KEY = os.environ.get('BRIGHTDATA_API_KEY', '')

def detect_platform(url: str) -> str:
    """Detect e-commerce platform from URL"""
    if 'amazon' in url.lower():
        return 'amazon'
    elif 'flipkart' in url.lower():
        return 'flipkart'
    else:
        raise HTTPException(status_code=400, detail="Unsupported platform. Only Amazon and Flipkart product URLs are supported.")

def clean_price(price_text: str) -> float:
    """Extract numeric price from text"""
    if not price_text:
        return 0.0
    # Remove currency symbols and commas
    cleaned = re.sub(r'[^\d.]', '', price_text.replace(',', ''))
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

async def fetch_with_brightdata(url: str) -> str:
    """Fetch URL content using Bright Data Proxy"""
    if not BRIGHTDATA_API_KEY:
        raise HTTPException(status_code=500, detail="Bright Data API key not configured")
    
    # Use Bright Data's Web Unlocker proxy
    # Format: http://brd-customer-CUSTOMER_ID-zone-ZONE:PASSWORD@brd.superproxy.io:PORT
    # The API key provided might be a direct proxy password
    proxy_url = f"http://brd-customer-hl_4fe3a556-zone-web_unlocker:{BRIGHTDATA_API_KEY}@brd.superproxy.io:22225"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    connector = aiohttp.TCPConnector(ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        try:
            # Try direct fetch with Bright Data proxy
            async with session.get(
                url, 
                headers=headers,
                proxy=proxy_url,
                timeout=aiohttp.ClientTimeout(total=60),
                allow_redirects=True
            ) as response:
                if response.status == 200:
                    return await response.text()
                else:
                    logger.warning(f"Bright Data proxy returned status {response.status}")
                    # Fall back to direct request
                    async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as direct_response:
                        if direct_response.status == 200:
                            return await direct_response.text()
                        raise HTTPException(status_code=direct_response.status, detail=f"Failed to fetch page: {direct_response.status}")
        except aiohttp.ClientProxyConnectionError as e:
            logger.warning(f"Proxy connection failed, trying direct: {str(e)}")
            # Fall back to direct request without proxy
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status == 200:
                    return await response.text()
                raise HTTPException(status_code=response.status, detail=f"Failed to fetch page: {response.status}")
        except asyncio.TimeoutError:
            raise HTTPException(status_code=408, detail="Request timeout while fetching page")
        except Exception as e:
            logger.error(f"Fetch error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch page: {str(e)}")

async def scrape_amazon(url: str) -> dict:
    """Scrape product details from Amazon using Bright Data"""
    try:
        html = await fetch_with_brightdata(url)
        soup = BeautifulSoup(html, 'lxml')
        
        # Product name
        name_elem = soup.select_one('#productTitle')
        name = name_elem.get_text(strip=True) if name_elem else None
        
        if not name:
            # Try alternative selectors
            name_elem = soup.select_one('h1 span#productTitle, h1.product-title-word-break')
            name = name_elem.get_text(strip=True) if name_elem else "Unknown Product"
        
        # Price - try multiple selectors
        price_selectors = [
            '.a-price-whole',
            '#priceblock_ourprice',
            '#priceblock_dealprice', 
            '.a-price .a-offscreen',
            '#corePrice_feature_div .a-offscreen',
            '.apexPriceToPay .a-offscreen',
            '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
            '.reinventPricePriceToPayMargin .a-offscreen'
        ]
        
        current_price = 0.0
        for selector in price_selectors:
            price_elem = soup.select_one(selector)
            if price_elem:
                current_price = clean_price(price_elem.get_text())
                if current_price > 0:
                    break
        
        # Original price (MRP)
        original_price = None
        mrp_selectors = [
            '.a-price.a-text-price .a-offscreen',
            '#listPrice',
            '.basisPrice .a-offscreen',
            '.a-text-strike .a-offscreen'
        ]
        for selector in mrp_selectors:
            mrp_elem = soup.select_one(selector)
            if mrp_elem:
                original_price = clean_price(mrp_elem.get_text())
                if original_price > 0:
                    break
        
        # Image
        image_elem = soup.select_one('#landingImage, #imgBlkFront, .a-dynamic-image, #main-image')
        image_url = None
        if image_elem:
            image_url = image_elem.get('src') or image_elem.get('data-old-hires') or image_elem.get('data-a-dynamic-image')
            if image_url and image_url.startswith('{'):
                # Parse JSON-like data-a-dynamic-image
                import json
                try:
                    img_data = json.loads(image_url)
                    image_url = list(img_data.keys())[0] if img_data else None
                except:
                    image_url = None
        
        if current_price <= 0:
            raise HTTPException(status_code=400, detail="Could not extract price from Amazon page")
        
        return {
            'name': name[:200] if name else "Unknown Product",
            'current_price': current_price,
            'original_price': original_price,
            'image_url': image_url,
            'platform': 'amazon'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Amazon scraping error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to scrape Amazon: {str(e)}")

async def scrape_flipkart(url: str) -> dict:
    """Scrape product details from Flipkart using Bright Data"""
    try:
        html = await fetch_with_brightdata(url)
        soup = BeautifulSoup(html, 'lxml')
        
        # Product name - multiple selectors for different page layouts
        name_selectors = [
            'span.VU-ZEz',
            'span.B_NuCI', 
            'h1._9E25nV',
            '.yhB1nd span',
            'h1.yhB1nd',
            '.G6XhRU'
        ]
        name = None
        for selector in name_selectors:
            name_elem = soup.select_one(selector)
            if name_elem:
                name = name_elem.get_text(strip=True)
                if name:
                    break
        
        # Price - multiple selectors
        price_selectors = [
            'div.Nx9bqj.CxhGGd',
            'div._30jeq3._16Jk6d',
            'div._30jeq3',
            '.CEmiEU div',
            'div.Nx9bqj',
            '._25b18c div._30jeq3'
        ]
        
        current_price = 0.0
        for selector in price_selectors:
            price_elem = soup.select_one(selector)
            if price_elem:
                current_price = clean_price(price_elem.get_text())
                if current_price > 0:
                    break
        
        # Original price (MRP)
        original_price = None
        mrp_selectors = [
            'div.yRaY8j.A6+E6v',
            'div._3I9_wc._2p6lqe',
            '.yRaY8j',
            'div._2p6lqe'
        ]
        for selector in mrp_selectors:
            mrp_elem = soup.select_one(selector)
            if mrp_elem:
                original_price = clean_price(mrp_elem.get_text())
                if original_price > 0:
                    break
        
        # Image
        image_selectors = [
            'img.DByuf4.IZexXJ.jLEJ7H',
            'img._396cs4._2amPTt._3qGmMb',
            'img._396cs4',
            'img.q6DClP',
            '._3kidJX img'
        ]
        image_url = None
        for selector in image_selectors:
            image_elem = soup.select_one(selector)
            if image_elem:
                image_url = image_elem.get('src')
                if image_url:
                    break
        
        if current_price <= 0:
            raise HTTPException(status_code=400, detail="Could not extract price from Flipkart page")
        
        return {
            'name': name[:200] if name else "Unknown Product",
            'current_price': current_price,
            'original_price': original_price,
            'image_url': image_url,
            'platform': 'flipkart'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flipkart scraping error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to scrape Flipkart: {str(e)}")

async def scrape_product(url: str, platform: str = None) -> dict:
    """Main scraper dispatcher"""
    if not platform:
        platform = detect_platform(url)
    
    if platform == 'amazon':
        return await scrape_amazon(url)
    elif platform == 'flipkart':
        return await scrape_flipkart(url)
    else:
        raise HTTPException(status_code=400, detail="Unsupported platform")

# ============= Email Service (Placeholder) =============

async def send_price_alert_email(email: str, product_name: str, current_price: float, target_price: float):
    """Send price drop alert email - Placeholder for SendGrid integration"""
    logger.info(f"Price alert: {product_name} dropped to {current_price} (target: {target_price}) - Email to: {email}")
    # TODO: Integrate SendGrid for actual email sending
    pass

# ============= Background Tasks =============

async def check_price_alerts(product_id: str, current_price: float):
    """Check and trigger price alerts"""
    alerts = await db.price_alerts.find({
        "product_id": product_id,
        "is_active": True,
        "target_price": {"$gte": current_price}
    }, {"_id": 0}).to_list(100)
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    for alert in alerts:
        if product:
            await send_price_alert_email(
                alert['email'],
                product['name'],
                current_price,
                alert['target_price']
            )
            # Deactivate the alert after triggering
            await db.price_alerts.update_one(
                {"id": alert['id']},
                {"$set": {"is_active": False}}
            )

# ============= API Endpoints =============

@api_router.get("/")
async def root():
    return {"message": "Price History Tracker API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

@api_router.post("/products/track", response_model=ProductResponse)
async def track_product(product_data: ProductCreate, background_tasks: BackgroundTasks):
    """Add a product to track"""
    try:
        # Check if product already exists
        existing = await db.products.find_one({"url": product_data.url}, {"_id": 0})
        if existing:
            # Return existing product with history
            history = await db.price_history.find(
                {"product_id": existing['id']},
                {"_id": 0}
            ).sort("recorded_at", 1).to_list(100)
            
            price_values = [h['price'] for h in history] if history else [existing['current_price']]
            
            # Handle datetime conversion
            created_at = existing['created_at'] if isinstance(existing['created_at'], str) else existing['created_at'].isoformat()
            updated_at = existing['updated_at'] if isinstance(existing['updated_at'], str) else existing['updated_at'].isoformat()
            
            return ProductResponse(
                id=existing['id'],
                url=existing['url'],
                platform=existing['platform'],
                name=existing['name'],
                current_price=existing['current_price'],
                original_price=existing.get('original_price'),
                image_url=existing.get('image_url'),
                currency=existing.get('currency', 'INR'),
                created_at=created_at,
                updated_at=updated_at,
                lowest_price=min(price_values) if price_values else None,
                highest_price=max(price_values) if price_values else None,
                price_history=[{
                    "price": h['price'],
                    "date": h['recorded_at'] if isinstance(h['recorded_at'], str) else h['recorded_at'].isoformat()
                } for h in history]
            )
        
        # Scrape product data
        scraped = await scrape_product(product_data.url, product_data.platform)
        
        # Create product (scraped data always returns valid price now with demo fallback)
        product = Product(
            url=product_data.url,
            platform=scraped['platform'],
            name=scraped['name'],
            current_price=scraped['current_price'],
            original_price=scraped['original_price'],
            image_url=scraped['image_url']
        )
        
        product_dict = product.model_dump()
        product_dict['created_at'] = product_dict['created_at'].isoformat()
        product_dict['updated_at'] = product_dict['updated_at'].isoformat()
        
        await db.products.insert_one(product_dict)
        
        # Add initial price history
        price_history = PriceHistory(
            product_id=product.id,
            price=product.current_price
        )
        history_dict = price_history.model_dump()
        history_dict['recorded_at'] = history_dict['recorded_at'].isoformat()
        await db.price_history.insert_one(history_dict)
        
        return ProductResponse(
            id=product.id,
            url=product.url,
            platform=product.platform,
            name=product.name,
            current_price=product.current_price,
            original_price=product.original_price,
            image_url=product.image_url,
            currency=product.currency,
            created_at=product_dict['created_at'],
            updated_at=product_dict['updated_at'],
            lowest_price=product.current_price,
            highest_price=product.current_price,
            price_history=[{
                "price": product.current_price,
                "date": history_dict['recorded_at']
            }]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products():
    """Get all tracked products"""
    products = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for p in products:
        # Get price history stats
        history = await db.price_history.find(
            {"product_id": p['id']},
            {"_id": 0}
        ).to_list(100)
        
        price_values = [h['price'] for h in history] if history else [p['current_price']]
        
        # Handle datetime conversion
        created_at = p['created_at'] if isinstance(p['created_at'], str) else p['created_at'].isoformat()
        updated_at = p['updated_at'] if isinstance(p['updated_at'], str) else p['updated_at'].isoformat()
        
        result.append(ProductResponse(
            id=p['id'],
            url=p['url'],
            platform=p['platform'],
            name=p['name'],
            current_price=p['current_price'],
            original_price=p.get('original_price'),
            image_url=p.get('image_url'),
            currency=p.get('currency', 'INR'),
            created_at=created_at,
            updated_at=updated_at,
            lowest_price=min(price_values) if price_values else None,
            highest_price=max(price_values) if price_values else None
        ))
    
    return result

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """Get product details with price history"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get price history
    history = await db.price_history.find(
        {"product_id": product_id},
        {"_id": 0}
    ).sort("recorded_at", 1).to_list(500)
    
    price_values = [h['price'] for h in history] if history else [product['current_price']]
    
    # Handle datetime conversion
    created_at = product['created_at'] if isinstance(product['created_at'], str) else product['created_at'].isoformat()
    updated_at = product['updated_at'] if isinstance(product['updated_at'], str) else product['updated_at'].isoformat()
    
    return ProductResponse(
        id=product['id'],
        url=product['url'],
        platform=product['platform'],
        name=product['name'],
        current_price=product['current_price'],
        original_price=product.get('original_price'),
        image_url=product.get('image_url'),
        currency=product.get('currency', 'INR'),
        created_at=created_at,
        updated_at=updated_at,
        lowest_price=min(price_values) if price_values else None,
        highest_price=max(price_values) if price_values else None,
        price_history=[{
            "price": h['price'],
            "date": h['recorded_at'] if isinstance(h['recorded_at'], str) else h['recorded_at'].isoformat()
        } for h in history]
    )

@api_router.post("/products/{product_id}/refresh", response_model=ProductResponse)
async def refresh_product_price(product_id: str, background_tasks: BackgroundTasks):
    """Refresh product price by scraping again"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        scraped = await scrape_product(product['url'], product['platform'])
        
        if scraped['current_price'] > 0:
            now = datetime.now(timezone.utc).isoformat()
            
            # Update product
            await db.products.update_one(
                {"id": product_id},
                {"$set": {
                    "current_price": scraped['current_price'],
                    "original_price": scraped['original_price'],
                    "image_url": scraped['image_url'],
                    "updated_at": now
                }}
            )
            
            # Add new price history entry
            price_history = PriceHistory(
                product_id=product_id,
                price=scraped['current_price']
            )
            history_dict = price_history.model_dump()
            history_dict['recorded_at'] = history_dict['recorded_at'].isoformat()
            await db.price_history.insert_one(history_dict)
            
            # Check price alerts in background
            background_tasks.add_task(check_price_alerts, product_id, scraped['current_price'])
        
        # Return updated product
        return await get_product(product_id)
        
    except Exception as e:
        logger.error(f"Error refreshing product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a tracked product"""
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete associated data
    await db.price_history.delete_many({"product_id": product_id})
    await db.price_alerts.delete_many({"product_id": product_id})
    
    return {"message": "Product deleted successfully"}

@api_router.post("/alerts", response_model=PriceAlert)
async def create_price_alert(alert_data: PriceAlertCreate):
    """Create a price drop alert"""
    # Verify product exists
    product = await db.products.find_one({"id": alert_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check for existing active alert
    existing = await db.price_alerts.find_one({
        "product_id": alert_data.product_id,
        "email": alert_data.email,
        "is_active": True
    }, {"_id": 0})
    
    if existing:
        # Update existing alert
        await db.price_alerts.update_one(
            {"id": existing['id']},
            {"$set": {"target_price": alert_data.target_price}}
        )
        existing['target_price'] = alert_data.target_price
        return PriceAlert(**existing)
    
    # Create new alert
    alert = PriceAlert(
        product_id=alert_data.product_id,
        email=alert_data.email,
        target_price=alert_data.target_price
    )
    
    alert_dict = alert.model_dump()
    alert_dict['created_at'] = alert_dict['created_at'].isoformat()
    await db.price_alerts.insert_one(alert_dict)
    
    return alert

@api_router.get("/alerts/{product_id}")
async def get_product_alerts(product_id: str):
    """Get alerts for a product"""
    alerts = await db.price_alerts.find(
        {"product_id": product_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    return alerts

# Include the router in the main app
app.include_router(api_router)

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
