# Price History Tracker - Requirements & Architecture

## Original Problem Statement
Build a website similar to PriceHistory.app that can track and display the historical prices of products across various e-commerce platforms. Primary Goal: Help customers make informed purchasing decisions based on price trends.

## User Requirements
- **Platforms**: Amazon and Flipkart support
- **Data Source**: Real-time web scraping
- **Features**: Price history charts with trends, Price drop alerts (email notifications)
- **Authentication**: No auth needed for MVP
- **Design**: Light mode

## Architecture

### Backend (FastAPI + MongoDB)
- **Server**: `/app/backend/server.py`
- **Database**: MongoDB collections - `products`, `price_history`, `price_alerts`
- **Web Scraping**: aiohttp + BeautifulSoup for HTTP scraping

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| POST | /api/products/track | Add product to track |
| GET | /api/products | List tracked products |
| GET | /api/products/{id} | Get product with history |
| POST | /api/products/{id}/refresh | Refresh product price |
| DELETE | /api/products/{id} | Delete product |
| POST | /api/alerts | Create price alert |
| GET | /api/alerts/{product_id} | Get alerts for product |

### Frontend (React)
- **Pages**: HomePage, ProductPage
- **Components**: Uses Shadcn/UI components
- **Charts**: Recharts for price history visualization
- **Design**: Manrope/Outfit fonts, Emerald/Lime color scheme

## Features Completed
1. ✅ Product URL input and tracking
2. ✅ Price history charts with trend visualization
3. ✅ Product details display (name, image, current price)
4. ✅ Price drop alert subscription via email
5. ✅ Multi-platform support (Amazon, Flipkart)
6. ✅ Tracked products list/dashboard
7. ✅ Price refresh functionality
8. ✅ Delete product functionality

## Next Action Items
1. **Email Integration**: Connect SendGrid for actual email delivery
2. **Scheduled Price Updates**: Add background job to refresh prices periodically
3. **Price Comparison**: Compare prices across platforms
4. **User Accounts**: Optional authentication for saved preferences
5. **Browser Extension**: Quick add products from product pages

## Technical Notes
- Web scraping may fail for some URLs due to anti-bot protection
- E-commerce sites frequently change their HTML structure
- Consider using a proxy rotation service for production scraping
