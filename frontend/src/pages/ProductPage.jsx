import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  Bell,
  TrendingUp,
  Loader2,
  ShoppingCart,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${productId}`);
      setProduct(response.data);
      if (response.data.current_price) {
        setTargetPrice(Math.floor(response.data.current_price * 0.9).toString());
      }
    } catch (error) {
      toast.error("Product not found");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await axios.post(`${API}/products/${productId}/refresh`);
      setProduct(response.data);
      toast.success("Price updated!");
    } catch (error) {
      toast.error("Failed to refresh price");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!alertEmail || !targetPrice) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreatingAlert(true);
    try {
      await axios.post(`${API}/alerts`, {
        product_id: productId,
        email: alertEmail,
        target_price: parseFloat(targetPrice)
      });
      toast.success("Price alert created! We'll notify you when the price drops.");
      setAlertEmail("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create alert");
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(price));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatChartDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  const calculateDiscount = (original, current) => {
    if (!original || original <= current) return null;
    return Math.round(((original - current) / original) * 100);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm text-gray-500 mb-1">{formatChartDate(label)}</p>
          <p className="font-bold text-gray-900">₹{formatPrice(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const discount = calculateDiscount(product.original_price, product.current_price);
  const chartData = product.price_history?.map(h => ({
    date: h.date,
    price: h.price
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header-nav py-3 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-gray-300 hover:text-white hover:bg-slate-700"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-pink-500" />
            <span className="font-heading font-bold text-xl text-white">PriceHistory</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8" data-testid="product-page">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Info */}
          <div className="lg:col-span-1">
            <Card className="product-card">
              <CardContent className="p-6">
                {/* Platform Badge */}
                <div className="mb-4">
                  <span className={`platform-badge uppercase ${product.platform === 'amazon' ? 'platform-amazon' : 'platform-flipkart'}`}>
                    {product.platform}
                  </span>
                </div>

                {/* Product Image */}
                <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-4">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                      data-testid="product-image"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Product Name */}
                <h1 className="font-semibold text-gray-900 mb-3" data-testid="product-name">
                  {product.name}
                </h1>

                {/* Tracking Since */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Tracking since {formatDate(product.created_at)}</span>
                </div>

                {/* Refresh Button */}
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  className="w-full mb-3"
                  data-testid="refresh-button"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Price
                    </>
                  )}
                </Button>

                {/* Get Deal Button */}
                <a
                  href={product.affiliate_url || product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="search-btn w-full py-3 flex items-center justify-center gap-2 rounded-lg font-semibold"
                  data-testid="get-deal-button"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Get Deal on {product.platform === 'amazon' ? 'Amazon' : 'Flipkart'}
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Price Info & Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Stats */}
            <div className="grid grid-cols-3 gap-4">
              {/* Highest Price */}
              <Card className="product-card">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Highest</p>
                  <p className="font-bold text-xl text-gray-900" data-testid="highest-price">
                    ₹{product.highest_price ? formatPrice(product.highest_price) : '-'}
                  </p>
                </CardContent>
              </Card>

              {/* Lowest Price */}
              <Card className="product-card">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Lowest</p>
                  <p className="font-bold text-xl text-green-600" data-testid="lowest-price">
                    ₹{product.lowest_price ? formatPrice(product.lowest_price) : '-'}
                  </p>
                </CardContent>
              </Card>

              {/* Current Price */}
              <Card className="product-card border-2 border-pink-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Current</p>
                  <div className="flex items-center justify-center gap-2">
                    {discount && (
                      <span className="text-sm font-bold text-green-600">{discount}%</span>
                    )}
                    <p className="font-bold text-xl text-red-500" data-testid="current-price">
                      ₹{formatPrice(product.current_price)}
                    </p>
                  </div>
                  {product.original_price && product.original_price > product.current_price && (
                    <p className="text-sm text-gray-400 line-through">
                      ₹{formatPrice(product.original_price)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Price Chart */}
            <Card className="product-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Price History Chart</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 1 ? (
                  <div className="h-[280px]" data-testid="price-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatChartDate}
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          fill="url(#colorPrice)"
                          dot={{ fill: "#f43f5e", strokeWidth: 0, r: 3 }}
                          activeDot={{ fill: "#f43f5e", strokeWidth: 2, stroke: "#fff", r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Price history will appear here as we track more data points.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price Alert Form */}
            <Card className="product-card" data-testid="subscribe-form">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-pink-500" />
                  Set Price Drop Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAlert} className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="email" className="text-sm text-gray-600 mb-1 block">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      className="h-11"
                      data-testid="alert-email"
                    />
                  </div>
                  <div className="md:w-40">
                    <Label htmlFor="targetPrice" className="text-sm text-gray-600 mb-1 block">
                      Target Price (₹)
                    </Label>
                    <Input
                      id="targetPrice"
                      type="number"
                      placeholder="Target price"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="h-11"
                      data-testid="alert-target-price"
                    />
                  </div>
                  <div className="md:self-end">
                    <Button
                      type="submit"
                      disabled={isCreatingAlert}
                      className="search-btn h-11 px-6 w-full md:w-auto"
                      data-testid="create-alert-button"
                    >
                      {isCreatingAlert ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Set Alert"
                      )}
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-gray-500 mt-3">
                  We'll notify you when the price drops to or below your target.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductPage;
