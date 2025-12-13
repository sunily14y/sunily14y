import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Search, TrendingDown, Bell, BarChart3, Loader2, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

    // Basic URL validation
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

  const formatPrice = (price, currency = "INR") => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getPlatformColor = (platform) => {
    return platform === "amazon" ? "bg-[#ff9900] text-[#232f3e]" : "bg-[#2874f0] text-white";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 sticky-header border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-[#064E3B]" />
              <span className="font-heading font-bold text-xl text-slate-900">PriceTracker</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">Track prices. Save money.</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section relative py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight mb-6">
              Track Prices.
              <span className="text-[#064E3B]"> Save Money.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
              Monitor product prices across Amazon and Flipkart. Get notified when prices drop.
              Make smarter purchasing decisions.
            </p>

            {/* Search Form */}
            <form onSubmit={handleTrackProduct} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  data-testid="search-input"
                  type="url"
                  placeholder="Paste Amazon or Flipkart product URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-14 pl-12 pr-4 rounded-full border-slate-200 focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] text-lg search-input"
                  disabled={isLoading}
                />
              </div>
              <Button
                data-testid="search-button"
                type="submit"
                disabled={isLoading}
                className="h-14 px-8 rounded-full bg-[#064E3B] hover:bg-[#064E3B]/90 text-white font-semibold text-lg btn-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-2 h-5 w-5" />
                    Track Price
                  </>
                )}
              </Button>
            </form>

            {/* Features */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-3 text-slate-600">
                <div className="h-10 w-10 rounded-full bg-[#064E3B]/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-[#064E3B]" />
                </div>
                <span className="text-sm font-medium">Price History Charts</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-slate-600">
                <div className="h-10 w-10 rounded-full bg-[#84CC16]/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-[#84CC16]" />
                </div>
                <span className="text-sm font-medium">Price Drop Alerts</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-slate-600">
                <div className="h-10 w-10 rounded-full bg-[#064E3B]/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-[#064E3B]" />
                </div>
                <span className="text-sm font-medium">Best Price Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tracked Products */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading font-semibold text-2xl text-slate-900">
              Tracked Products
            </h2>
            {products.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProducts}
                className="rounded-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>

          {isLoadingProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-40 bg-slate-200 rounded-xl" />
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-6 bg-slate-200 rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card className="bg-white border border-slate-100 rounded-2xl empty-state">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-slate-900 mb-2">
                  No products tracked yet
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Start by pasting an Amazon or Flipkart product URL above to track its price history.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-grid">
              {products.map((product, index) => (
                <Card
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden product-card cursor-pointer hover:border-slate-200 transition-all"
                  onClick={() => navigate(`/product/${product.id}`)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Badge className={`${getPlatformColor(product.platform)} text-xs font-medium px-2 py-1 rounded-full platform-badge`}>
                        {product.platform}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-slate-500" />
                        </a>
                        <button
                          onClick={(e) => handleDeleteProduct(product.id, e)}
                          className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-red-100 transition-colors"
                          data-testid={`delete-product-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    <div className="aspect-square w-full max-w-[200px] mx-auto mb-4 bg-slate-50 rounded-xl overflow-hidden">
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
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <BarChart3 className="h-12 w-12" />
                        </div>
                      )}
                    </div>

                    <h3 className="font-medium text-slate-900 text-sm line-clamp-2 mb-3 text-left">
                      {product.name}
                    </h3>

                    <div className="flex items-end justify-between">
                      <div className="text-left">
                        <p className="text-xs text-slate-500 mb-1">Current Price</p>
                        <p className="font-mono text-2xl font-medium text-slate-900 price-display">
                          {formatPrice(product.current_price, product.currency)}
                        </p>
                      </div>
                      {product.lowest_price && product.lowest_price < product.current_price && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">Lowest</p>
                          <p className="font-mono text-sm font-medium text-[#16a34a] price-display">
                            {formatPrice(product.lowest_price, product.currency)}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#064E3B]" />
              <span className="font-heading font-semibold text-slate-900">PriceTracker</span>
            </div>
            <p className="text-sm text-slate-500">
              Track prices across Amazon & Flipkart. Save money on every purchase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
