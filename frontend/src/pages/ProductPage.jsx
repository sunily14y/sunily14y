import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Bell,
  TrendingDown,
  TrendingUp,
  Loader2,
  BarChart3,
  Calendar,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
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

  const formatPrice = (price, currency = "INR") => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(price);
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

  const getPlatformColor = (platform) => {
    return platform === "amazon" ? "bg-[#ff9900] text-[#232f3e]" : "bg-[#2874f0] text-white";
  };

  const getPriceChange = () => {
    if (!product?.price_history || product.price_history.length < 2) return null;
    const latest = product.price_history[product.price_history.length - 1].price;
    const previous = product.price_history[product.price_history.length - 2].price;
    const change = latest - previous;
    const percentage = ((change / previous) * 100).toFixed(1);
    return { change, percentage };
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white border border-slate-200 rounded-xl p-4 shadow-lg">
          <p className="text-sm text-slate-500 mb-1">{formatChartDate(label)}</p>
          <p className="font-mono text-lg font-medium text-slate-900">
            {formatPrice(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#064E3B] mx-auto mb-4" />
          <p className="text-slate-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const priceChange = getPriceChange();
  const chartData = product.price_history?.map(h => ({
    date: h.date,
    price: h.price
  })) || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 sticky-header border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to Products</span>
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-[#064E3B]" />
              <span className="font-heading font-bold text-lg text-slate-900">PriceTracker</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="product-page">
        {/* Product Header */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Product Image & Info */}
          <div className="lg:w-2/5">
            <Card className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge className={`${getPlatformColor(product.platform)} text-xs font-medium px-3 py-1 rounded-full platform-badge`}>
                    {product.platform}
                  </Badge>
                  <a
                    href={product.affiliate_url || product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#064E3B] hover:underline"
                    data-testid="product-link"
                  >
                    View on {product.platform}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <div className="aspect-square w-full max-w-[300px] mx-auto mb-6 bg-slate-50 rounded-xl overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                      data-testid="product-image"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <BarChart3 className="h-16 w-16" />
                    </div>
                  )}
                </div>

                <h1 className="font-heading font-semibold text-xl text-slate-900 mb-4 text-left" data-testid="product-name">
                  {product.name}
                </h1>

                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Tracking since {formatDate(product.created_at)}</span>
                </div>

                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-full rounded-full bg-[#064E3B] hover:bg-[#064E3B]/90 text-white mb-3"
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

                <a
                  href={product.affiliate_url || product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-6 bg-[#84CC16] hover:bg-[#65a30d] text-black font-bold rounded-full text-center transition-all flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl"
                  data-testid="get-deal-button"
                >
                  <ExternalLink className="h-5 w-5" />
                  Get Deal on {product.platform === 'amazon' ? 'Amazon' : 'Flipkart'}
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Price Stats */}
          <div className="lg:w-3/5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Current Price */}
              <Card className="bg-white border border-slate-100 rounded-2xl">
                <CardContent className="p-6">
                  <p className="text-sm text-slate-500 mb-2">Current Price</p>
                  <p className="font-mono text-3xl font-medium text-slate-900 price-display" data-testid="current-price">
                    {formatPrice(product.current_price, product.currency)}
                  </p>
                  {priceChange && (
                    <div className={`flex items-center gap-1 mt-2 ${priceChange.change > 0 ? 'text-red-500' : priceChange.change < 0 ? 'text-[#16a34a]' : 'text-slate-500'}`}>
                      {priceChange.change > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : priceChange.change < 0 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {priceChange.change === 0 ? 'No change' : `${Math.abs(priceChange.percentage)}%`}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lowest Price */}
              <Card className="bg-white border border-slate-100 rounded-2xl">
                <CardContent className="p-6">
                  <p className="text-sm text-slate-500 mb-2">Lowest Price</p>
                  <p className="font-mono text-3xl font-medium text-[#16a34a] price-display" data-testid="lowest-price">
                    {product.lowest_price ? formatPrice(product.lowest_price, product.currency) : '-'}
                  </p>
                  {product.lowest_price && product.lowest_price < product.current_price && (
                    <p className="text-xs text-slate-500 mt-2">
                      {formatPrice(product.current_price - product.lowest_price)} above lowest
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Highest Price */}
              <Card className="bg-white border border-slate-100 rounded-2xl">
                <CardContent className="p-6">
                  <p className="text-sm text-slate-500 mb-2">Highest Price</p>
                  <p className="font-mono text-3xl font-medium text-slate-900 price-display" data-testid="highest-price">
                    {product.highest_price ? formatPrice(product.highest_price, product.currency) : '-'}
                  </p>
                  {product.original_price && (
                    <p className="text-xs text-slate-500 mt-2">
                      MRP: {formatPrice(product.original_price)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Price Chart */}
            <Card className="bg-white border border-slate-100 rounded-2xl">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Price History</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 1 ? (
                  <div className="h-[300px]" data-testid="price-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#064E3B" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#064E3B" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatChartDate}
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#064E3B"
                          strokeWidth={2}
                          fill="url(#colorPrice)"
                          dot={{ fill: "#064E3B", strokeWidth: 0, r: 3 }}
                          activeDot={{ fill: "#064E3B", strokeWidth: 2, stroke: "#fff", r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>Price history will appear here as we track more data points.</p>
                      <p className="text-sm mt-1">Check back later or click Refresh to update.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Price Alert Form */}
        <Card className="bg-white border border-slate-100 rounded-2xl" data-testid="subscribe-form">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#84CC16]" />
              Set Price Drop Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAlert} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="email" className="text-sm text-slate-600 mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                  data-testid="alert-email"
                />
              </div>
              <div className="sm:w-48">
                <Label htmlFor="targetPrice" className="text-sm text-slate-600 mb-2 block">
                  Target Price (₹)
                </Label>
                <Input
                  id="targetPrice"
                  type="number"
                  placeholder="Enter target price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] font-mono"
                  data-testid="alert-target-price"
                />
              </div>
              <div className="sm:self-end">
                <Button
                  type="submit"
                  disabled={isCreatingAlert}
                  className="h-12 px-6 rounded-full bg-[#84CC16] hover:bg-[#84CC16]/90 text-black font-semibold w-full sm:w-auto"
                  data-testid="create-alert-button"
                >
                  {isCreatingAlert ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Bell className="mr-2 h-4 w-4" />
                      Set Alert
                    </>
                  )}
                </Button>
              </div>
            </form>
            <p className="text-sm text-slate-500 mt-4">
              We'll send you an email when the price drops to or below your target price.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProductPage;
