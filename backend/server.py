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
    affiliate_url: Optional[str] = None
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

# ScraperAPI Configuration
SCRAPERAPI_KEY = os.environ.get('SCRAPERAPI_KEY', '')
SCRAPERAPI_URL = "http://api.scraperapi.com"

# Affiliate Configuration
AMAZON_AFFILIATE_TAG = os.environ.get('AMAZON_AFFILIATE_TAG', '')
FLIPKART_AFFILIATE_ID = os.environ.get('FLIPKART_AFFILIATE_ID', '')

def detect_platform(url: str) -> str:
    """Detect e-commerce platform from URL"""
    if 'amazon' in url.lower():
        return 'amazon'
    elif 'flipkart' in url.lower():
        return 'flipkart'
    else:
        raise HTTPException(status_code=400, detail="Unsupported platform. Only Amazon and Flipkart product URLs are supported.")

def clean_url(url: str, platform: str) -> str:
    """Clean URL by removing unnecessary query parameters"""
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
    
    parsed = urlparse(url)
    
    if platform == 'flipkart':
        # For Flipkart, keep only the base path with product ID
        # Example: https://www.flipkart.com/apple-iphone-15-128-gb-black/p/itm6ac6485515ae4
        path = parsed.path
        # Remove query string for cleaner URLs
        clean = urlunparse((parsed.scheme, parsed.netloc, path, '', '', ''))
        return clean
    elif platform == 'amazon':
        # For Amazon, keep the /dp/PRODUCT_ID format
        path = parsed.path
        # Extract just the /dp/XXXXX part if present
        if '/dp/' in path:
            dp_match = re.search(r'(/dp/[A-Z0-9]+)', path)
            if dp_match:
                path = dp_match.group(1)
        clean = urlunparse((parsed.scheme, parsed.netloc, path, '', '', ''))
        return clean
    
    return url

def generate_affiliate_url(url: str, platform: str) -> str:
    """Generate affiliate URL for the given platform"""
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
    
    parsed = urlparse(url)
    
    if platform == 'amazon' and AMAZON_AFFILIATE_TAG:
        # Amazon affiliate: add tag parameter
        # Format: https://www.amazon.in/dp/PRODUCT_ID?tag=affiliate-tag
        query_params = parse_qs(parsed.query)
        query_params['tag'] = [AMAZON_AFFILIATE_TAG]
        new_query = urlencode(query_params, doseq=True)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
    
    elif platform == 'flipkart' and FLIPKART_AFFILIATE_ID:
        # Flipkart affiliate: add affid parameter
        # Format: https://www.flipkart.com/product-path?affid=affiliate-id
        query_params = parse_qs(parsed.query)
        query_params['affid'] = [FLIPKART_AFFILIATE_ID]
        new_query = urlencode(query_params, doseq=True)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
    
    return url

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

async def fetch_with_scraperapi(url: str, platform: str = None) -> str:
    """Fetch URL content using ScraperAPI"""
    
    if not SCRAPERAPI_KEY:
        raise HTTPException(status_code=500, detail="ScraperAPI key not configured")
    
    # Clean the URL to remove unnecessary parameters
    if platform:
        url = clean_url(url, platform)
    
    logger.info(f"Fetching {url} via ScraperAPI")
    
    # Build ScraperAPI URL with parameters
    params = {
        'api_key': SCRAPERAPI_KEY,
        'url': url,
        'render': 'true',  # JavaScript rendering for dynamic content
        'country_code': 'in'  # India for Amazon.in and Flipkart
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                SCRAPERAPI_URL,
                params=params,
                timeout=aiohttp.ClientTimeout(total=90)
            ) as response:
                logger.info(f"ScraperAPI response status: {response.status}")
                
                if response.status == 200:
                    html = await response.text()
                    if len(html) > 1000:
                        logger.info(f"Got HTML content, length: {len(html)}")
                        return html
                    else:
                        raise HTTPException(status_code=400, detail="Received incomplete page content")
                elif response.status == 403:
                    raise HTTPException(status_code=403, detail="Access denied by target website")
                elif response.status == 429:
                    raise HTTPException(status_code=429, detail="API rate limit exceeded. Please try again later.")
                else:
                    error_text = await response.text()
                    logger.error(f"ScraperAPI error: {response.status} - {error_text[:200]}")
                    raise HTTPException(status_code=response.status, detail=f"Failed to fetch page: {error_text[:100]}")
                    
        except asyncio.TimeoutError:
            raise HTTPException(status_code=408, detail="Request timeout. The page is taking too long to load.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"ScraperAPI fetch error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch page: {str(e)}")

async def scrape_amazon(url: str) -> dict:
    """Scrape product details from Amazon using ScraperAPI"""
    try:
        html = await fetch_with_scraperapi(url, 'amazon')
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
            image_url = image_elem.get('src') or image_elem.get('data-old-hires')
            # Handle data-a-dynamic-image JSON
            if not image_url or image_url.startswith('{'):
                dyn_img = image_elem.get('data-a-dynamic-image')
                if dyn_img:
                    try:
                        import json
                        img_data = json.loads(dyn_img)
                        image_url = list(img_data.keys())[0] if img_data else None
                    except:
                        pass
        
        if current_price <= 0:
            raise HTTPException(status_code=400, detail="Could not extract price from Amazon page. Please check if the URL is correct.")
        
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
    """Scrape product details from Flipkart using ScraperAPI"""
    try:
        html = await fetch_with_scraperapi(url, 'flipkart')
        soup = BeautifulSoup(html, 'lxml')
        
        # Product name - multiple selectors for different page layouts
        name_selectors = [
            'span.VU-ZEz',
            'span.B_NuCI', 
            'h1._9E25nV',
            '.yhB1nd span',
            'h1.yhB1nd',
            '.G6XhRU',
            'h1 span'
        ]
        name = None
        for selector in name_selectors:
            name_elem = soup.select_one(selector)
            if name_elem:
                name = name_elem.get_text(strip=True)
                if name and len(name) > 5:
                    break
        
        # Price - multiple selectors (Flipkart changes class names frequently)
        price_selectors = [
            'div.Nx9bqj.CxhGGd',
            'div.hZ3P6w.bnqy13',  # New selector
            'div._30jeq3._16Jk6d',
            'div._30jeq3',
            '.CEmiEU div',
            'div.Nx9bqj',
            '._25b18c div._30jeq3',
            'div.bnqy13'  # Alternative new selector
        ]
        
        current_price = 0.0
        for selector in price_selectors:
            price_elem = soup.select_one(selector)
            if price_elem:
                current_price = clean_price(price_elem.get_text())
                if current_price > 0:
                    break
        
        # If still no price, try finding any element with ₹ that looks like a main price
        if current_price <= 0:
            for elem in soup.find_all(string=lambda t: t and '₹' in t and ',' in t):
                price_text = elem.strip()
                if price_text.startswith('₹') and len(price_text) < 15:
                    parent_classes = elem.parent.get('class', [])
                    # Skip if it's clearly not a main price (cashback, discount text)
                    if not any(word in str(parent_classes).lower() for word in ['cashback', 'discount', 'offer']):
                        current_price = clean_price(price_text)
                        if current_price > 1000:  # Reasonable product price
                            break
        
        # Original price (MRP)
        original_price = None
        mrp_selectors = [
            'div.yRaY8j.A6+E6v',
            'div.kRYCnD.yHYOcc',  # New selector
            'div._3I9_wc._2p6lqe',
            '.yRaY8j',
            'div._2p6lqe',
            'div.yHYOcc'
        ]
        for selector in mrp_selectors:
            mrp_elem = soup.select_one(selector)
            if mrp_elem:
                original_price = clean_price(mrp_elem.get_text())
                if original_price > 0:
                    break
        
        # Image - Try multiple approaches
        image_selectors = [
            'img.UCc1lI',  # New main product image selector
            'img.DByuf4.IZexXJ.jLEJ7H',
            'img._396cs4._2amPTt._3qGmMb',
            'img._396cs4',
            'img.q6DClP',
            '._3kidJX img',
            'img[loading="eager"]',
            'img._53J4C-'
        ]
        image_url = None
        for selector in image_selectors:
            image_elem = soup.select_one(selector)
            if image_elem:
                src = image_elem.get('src', '')
                if src and 'rukminim' in src and 'placeholder' not in src.lower():
                    image_url = src if src.startswith('http') else f"https:{src}"
                    break
        
        # Fallback: find any rukminim image with product dimensions
        if not image_url:
            for img in soup.find_all('img'):
                src = img.get('src', '')
                if 'rukminim' in src and ('416' in src or '312' in src or '200' in src) and 'placeholder' not in src.lower():
                    image_url = src if src.startswith('http') else f"https:{src}"
                    break
        
        # Try to extract from srcset
        if not image_url:
            for img in soup.find_all('img'):
                srcset = img.get('srcset', '')
                if 'rukminim' in srcset:
                    # Get first URL from srcset
                    first_src = srcset.split(',')[0].split(' ')[0]
                    if first_src:
                        image_url = first_src if first_src.startswith('http') else f"https:{first_src}"
                        break
        
        # Try to find image URL in page data/scripts
        if not image_url:
            import re
            img_pattern = re.search(r'(https://rukminim[^"\']+(?:416|312)[^"\']+\.(?:jpg|jpeg|png|webp))', str(soup))
            if img_pattern:
                image_url = img_pattern.group(1)
        
        # No placeholder - leave as None if no image found
        # Frontend will show a product icon instead
        
        if current_price <= 0:
            raise HTTPException(status_code=400, detail="Could not extract price from Flipkart page. Please check if the URL is correct.")
        
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
                affiliate_url=generate_affiliate_url(existing['url'], existing['platform']),
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
            affiliate_url=generate_affiliate_url(product.url, product.platform),
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
            affiliate_url=generate_affiliate_url(p['url'], p['platform']),
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
        affiliate_url=generate_affiliate_url(product['url'], product['platform']),
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

@api_router.post("/products/refresh-all")
async def refresh_all_products():
    """Refresh all products - update prices and images"""
    products = await db.products.find({}, {"_id": 0}).to_list(100)
    results = {"success": 0, "failed": 0, "errors": []}
    
    for product in products:
        try:
            scraped = await scrape_product(product['url'], product['platform'])
            
            if scraped['current_price'] > 0:
                now = datetime.now(timezone.utc).isoformat()
                
                # Update product with new data
                update_data = {
                    "current_price": scraped['current_price'],
                    "updated_at": now
                }
                
                # Update image if we got a valid one
                if scraped.get('image_url') and 'unsplash' not in str(scraped['image_url']):
                    update_data["image_url"] = scraped['image_url']
                
                if scraped.get('original_price'):
                    update_data["original_price"] = scraped['original_price']
                
                await db.products.update_one(
                    {"id": product['id']},
                    {"$set": update_data}
                )
                results["success"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(f"{product['name'][:30]}: No price found")
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"{product['name'][:30]}: {str(e)[:50]}")
    
    return results

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

# ============= Auto-Discovery System =============

class DiscoveryConfig(BaseModel):
    max_products: int = 50
    sources: List[str] = ["flipkart_deals", "flipkart_mobiles", "amazon_deals"]

async def discover_flipkart_products(category_url: str, max_products: int = 20) -> List[str]:
    """Discover product URLs from Flipkart category/deals pages"""
    try:
        html = await fetch_with_scraperapi(category_url, 'flipkart')
        soup = BeautifulSoup(html, 'lxml')
        
        product_urls = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if '/p/itm' in href:
                if href.startswith('/'):
                    href = 'https://www.flipkart.com' + href
                # Clean URL
                clean_url = href.split('?')[0]
                if clean_url not in product_urls:
                    product_urls.append(clean_url)
                if len(product_urls) >= max_products:
                    break
        
        return product_urls
    except Exception as e:
        logger.error(f"Flipkart discovery error: {str(e)}")
        return []

async def discover_amazon_products(category_url: str, max_products: int = 20) -> List[str]:
    """Discover product URLs from Amazon category/deals pages"""
    try:
        html = await fetch_with_scraperapi(category_url, 'amazon')
        soup = BeautifulSoup(html, 'lxml')
        
        product_urls = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if '/dp/' in href:
                # Extract ASIN
                match = re.search(r'/dp/([A-Z0-9]{10})', href)
                if match:
                    asin = match.group(1)
                    clean_url = f"https://www.amazon.in/dp/{asin}"
                    if clean_url not in product_urls:
                        product_urls.append(clean_url)
                    if len(product_urls) >= max_products:
                        break
        
        return product_urls
    except Exception as e:
        logger.error(f"Amazon discovery error: {str(e)}")
        return []

# Predefined discovery sources
DISCOVERY_SOURCES = {
    "flipkart_deals": {
        "url": "https://www.flipkart.com/offers-store",
        "platform": "flipkart",
        "name": "Flipkart Deals"
    },
    "flipkart_mobiles": {
        "url": "https://www.flipkart.com/mobile-phones-store",
        "platform": "flipkart",
        "name": "Flipkart Mobiles"
    },
    "flipkart_electronics": {
        "url": "https://www.flipkart.com/electronics-store",
        "platform": "flipkart",
        "name": "Flipkart Electronics"
    },
    "flipkart_fashion": {
        "url": "https://www.flipkart.com/fashion-store",
        "platform": "flipkart",
        "name": "Flipkart Fashion"
    },
    "amazon_deals": {
        "url": "https://www.amazon.in/deals",
        "platform": "amazon",
        "name": "Amazon Deals"
    },
    "amazon_mobiles": {
        "url": "https://www.amazon.in/mobile-phones/b?node=1389401031",
        "platform": "amazon",
        "name": "Amazon Mobiles"
    },
    "amazon_electronics": {
        "url": "https://www.amazon.in/electronics/b?node=976419031",
        "platform": "amazon",
        "name": "Amazon Electronics"
    },
    "amazon_bestsellers": {
        "url": "https://www.amazon.in/gp/bestsellers/",
        "platform": "amazon",
        "name": "Amazon Best Sellers"
    }
}

@api_router.get("/discovery/sources")
async def get_discovery_sources():
    """Get available discovery sources"""
    return {key: {"name": val["name"], "platform": val["platform"]} for key, val in DISCOVERY_SOURCES.items()}

@api_router.post("/discovery/run")
async def run_discovery(background_tasks: BackgroundTasks, sources: List[str] = None, max_per_source: int = 10):
    """Run product discovery from selected sources"""
    if not sources:
        sources = ["flipkart_deals", "amazon_deals"]
    
    # Validate sources
    valid_sources = [s for s in sources if s in DISCOVERY_SOURCES]
    if not valid_sources:
        raise HTTPException(status_code=400, detail="No valid sources provided")
    
    # Start discovery in background
    background_tasks.add_task(execute_discovery, valid_sources, max_per_source)
    
    return {
        "status": "started",
        "sources": valid_sources,
        "max_per_source": max_per_source,
        "message": "Discovery started in background. Check /api/discovery/status for progress."
    }

async def execute_discovery(sources: List[str], max_per_source: int):
    """Execute the actual discovery process"""
    discovery_id = str(uuid.uuid4())[:8]
    
    # Store discovery status
    await db.discovery_logs.insert_one({
        "id": discovery_id,
        "status": "running",
        "sources": sources,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "products_found": 0,
        "products_added": 0,
        "products_skipped": 0,
        "errors": []
    })
    
    total_found = 0
    total_added = 0
    total_skipped = 0
    errors = []
    
    for source_key in sources:
        source = DISCOVERY_SOURCES[source_key]
        logger.info(f"[Discovery] Scanning {source['name']}...")
        
        try:
            # Discover product URLs
            if source['platform'] == 'flipkart':
                urls = await discover_flipkart_products(source['url'], max_per_source)
            else:
                urls = await discover_amazon_products(source['url'], max_per_source)
            
            total_found += len(urls)
            logger.info(f"[Discovery] Found {len(urls)} products from {source['name']}")
            
            # Add products (skip duplicates)
            for url in urls:
                try:
                    # Check if already exists
                    existing = await db.products.find_one({"url": {"$regex": url.split('?')[0]}}, {"_id": 0, "id": 1})
                    if existing:
                        total_skipped += 1
                        continue
                    
                    # Scrape and add product
                    scraped = await scrape_product(url, source['platform'])
                    
                    if scraped['current_price'] > 0:
                        product = Product(
                            url=url,
                            platform=source['platform'],
                            name=scraped['name'],
                            current_price=scraped['current_price'],
                            original_price=scraped.get('original_price'),
                            image_url=scraped.get('image_url')
                        )
                        
                        product_dict = product.model_dump()
                        product_dict['created_at'] = product_dict['created_at'].isoformat()
                        product_dict['updated_at'] = product_dict['updated_at'].isoformat()
                        product_dict['discovered_from'] = source_key
                        
                        await db.products.insert_one(product_dict)
                        
                        # Add initial price history
                        price_history = PriceHistory(
                            product_id=product.id,
                            price=product.current_price
                        )
                        history_dict = price_history.model_dump()
                        history_dict['recorded_at'] = history_dict['recorded_at'].isoformat()
                        await db.price_history.insert_one(history_dict)
                        
                        total_added += 1
                        logger.info(f"[Discovery] Added: {scraped['name'][:40]} - ₹{scraped['current_price']}")
                    
                    # Small delay to avoid rate limiting
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    errors.append(f"{url[:50]}: {str(e)[:50]}")
                    logger.error(f"[Discovery] Error adding product: {str(e)}")
        
        except Exception as e:
            errors.append(f"{source['name']}: {str(e)[:50]}")
            logger.error(f"[Discovery] Error scanning {source['name']}: {str(e)}")
    
    # Update discovery log
    await db.discovery_logs.update_one(
        {"id": discovery_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "products_found": total_found,
            "products_added": total_added,
            "products_skipped": total_skipped,
            "errors": errors[:20]  # Keep only first 20 errors
        }}
    )
    
    logger.info(f"[Discovery] Complete! Found: {total_found}, Added: {total_added}, Skipped: {total_skipped}")

@api_router.get("/discovery/status")
async def get_discovery_status():
    """Get status of recent discoveries"""
    logs = await db.discovery_logs.find(
        {},
        {"_id": 0}
    ).sort("started_at", -1).limit(5).to_list(5)
    return logs

@api_router.get("/discovery/stats")
async def get_discovery_stats():
    """Get discovery statistics"""
    total_products = await db.products.count_documents({})
    
    # Count by platform
    flipkart_count = await db.products.count_documents({"platform": "flipkart"})
    amazon_count = await db.products.count_documents({"platform": "amazon"})
    
    # Count by discovery source
    discovered_count = await db.products.count_documents({"discovered_from": {"$exists": True}})
    manual_count = total_products - discovered_count
    
    return {
        "total_products": total_products,
        "by_platform": {
            "flipkart": flipkart_count,
            "amazon": amazon_count
        },
        "by_source": {
            "auto_discovered": discovered_count,
            "manually_added": manual_count
        }
    }

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
