import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Search, ShoppingCart, TrendingUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleTrackProduct = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a product URL");
      return;
    }

    if (!url.includes("amazon") && !url.includes("flipkart")) {
      toast.error("Please enter a valid Amazon or Flipkart product URL");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/products/track`, { url });
      toast.success("Product added to tracking!");
      setUrl("");
      navigate(`/product/${response.data.id}`);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to track product";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/products/${productId}`);
      toast.success("Product removed");
      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(price));
  };

  const calculateDiscount = (original, current) => {
    if (!original || original <= current) return null;
    return Math.round(((original - current) / original) * 100);
  };

  return (
    <div className="app-container min-h-screen">
      {/* Header */}
      <header className="header-nav py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-pink-500" />
            <span className="font-heading font-bold text-xl">PriceHistory</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Amazon Price Tracker</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Flipkart Price Tracker</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Latest Deals</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading font-bold text-2xl md:text-3xl mb-8">
            Price History - Price Tracker
          </h1>
          
          <div className="bg-slate-700/50 rounded-xl p-6 md:p-8">
            <h2 className="text-lg md:text-xl font-semibold mb-6">Search Price History</h2>
            
            <form onSubmit={handleTrackProduct} className="space-y-4">
              <div className="search-box flex items-center">
                <Search className="h-5 w-5 text-gray-400 ml-4" />
                <Input
                  data-testid="search-input"
                  type="text"
                  placeholder="Enter Product Link or Name"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 border-0 focus-visible:ring-0 text-gray-700 text-base py-6"
                  disabled={isLoading}
                />
              </div>
              
              <Button
                data-testid="search-button"
                type="submit"
                disabled={isLoading}
                className="search-btn w-full md:w-auto px-12 py-6 text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Search"
                )}
              </Button>
            </form>

            <p className="text-sm text-gray-400 mt-4 max-w-2xl mx-auto">
              *Want to search a historical price chart of products or the lowest ever price? 
              Search for the name of the product or paste the product's link in the search box and hit enter.
            </p>

            {/* Quick Links */}
            <div className="flex flex-wrap justify-center mt-6 border-t border-slate-600 pt-6">
              <a href="#" className="quick-link">Amazon Price Tracker</a>
              <a href="#" className="quick-link">Flipkart Price Tracker</a>
              <a href="#" className="quick-link">Latest Deals</a>
              <a href="#" className="quick-link">Price Drop</a>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Deals Section */}
      <section className="py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="section-title mb-6">
            <span>New</span> Trending Deals
          </h2>

          {isLoadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="product-card p-4 animate-pulse">
                  <div className="h-32 bg-gray-200 rounded mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-gray-700 mb-2">No products tracked yet</h3>
              <p className="text-gray-500">Start by pasting an Amazon or Flipkart product URL above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4" data-testid="products-grid">
              {products.map((product) => {
                const discount = calculateDiscount(product.original_price, product.current_price);
                return (
                  <div
                    key={product.id}
                    data-testid={`product-card-${product.id}`}
                    className="product-card cursor-pointer relative group"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {/* Platform Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`platform-badge uppercase ${product.platform === 'amazon' ? 'platform-amazon' : 'platform-flipkart'}`}>
                        {product.platform}
                      </span>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteProduct(product.id, e)}
                      className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1.5 shadow-md hover:bg-red-50"
                      data-testid={`delete-product-${product.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </button>

                    {/* Product Image */}
                    <div className="p-4 pb-0">
                      <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ShoppingCart className="h-12 w-12 text-gray-300" />
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="text-sm text-gray-700 line-clamp-2 mb-3 min-h-[40px]">
                        {product.name}
                      </h3>

                      {/* Price Section */}
                      <div className="flex items-center gap-2 mb-3">
                        {discount && (
                          <span className="discount-badge">{discount}%</span>
                        )}
                        {product.original_price && product.original_price > product.current_price && (
                          <span className="original-price">₹{formatPrice(product.original_price)}</span>
                        )}
                        <span className="current-price">₹{formatPrice(product.current_price)}</span>
                      </div>

                      {/* Get Deal Button */}
                      <a
                        href={product.affiliate_url || product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="get-deal-btn w-full"
                        data-testid={`get-deal-${product.id}`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Get Deal
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer py-8 mt-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-pink-500" />
              <span className="font-heading font-semibold">PriceHistory</span>
            </div>
            <p className="text-sm text-gray-400">
              Track prices across Amazon & Flipkart. Save money on every purchase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
