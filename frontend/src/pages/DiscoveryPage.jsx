import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  TrendingUp, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  Package,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DiscoveryPage = () => {
  const navigate = useNavigate();
  const [sources, setSources] = useState({});
  const [selectedSources, setSelectedSources] = useState([]);
  const [maxPerSource, setMaxPerSource] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sourcesRes, statsRes, logsRes] = await Promise.all([
        axios.get(`${API}/discovery/sources`),
        axios.get(`${API}/discovery/stats`),
        axios.get(`${API}/discovery/status`)
      ]);
      
      setSources(sourcesRes.data);
      setStats(statsRes.data);
      setRecentLogs(logsRes.data);
      
      // Pre-select default sources
      setSelectedSources(["flipkart_deals", "amazon_deals"]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSource = (sourceKey) => {
    setSelectedSources(prev => 
      prev.includes(sourceKey) 
        ? prev.filter(s => s !== sourceKey)
        : [...prev, sourceKey]
    );
  };

  const runDiscovery = async () => {
    if (selectedSources.length === 0) {
      toast.error("Please select at least one source");
      return;
    }

    setIsRunning(true);
    try {
      const response = await axios.post(`${API}/discovery/run`, null, {
        params: {
          sources: selectedSources,
          max_per_source: maxPerSource
        },
        paramsSerializer: params => {
          return Object.entries(params)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return value.map(v => `${key}=${v}`).join('&');
              }
              return `${key}=${value}`;
            })
            .join('&');
        }
      });
      
      toast.success("Discovery started! Products will be added in the background.");
      
      // Refresh logs after a delay
      setTimeout(fetchData, 5000);
    } catch (error) {
      toast.error("Failed to start discovery");
    } finally {
      setIsRunning(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header-nav py-3 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-gray-300 hover:text-white hover:bg-slate-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-pink-500" />
            <span className="font-heading font-bold text-xl text-white">Auto Discovery</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.total_products}</p>
                <p className="text-sm text-gray-500">Total Products</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.by_platform?.flipkart || 0}</p>
                <p className="text-sm text-gray-500">Flipkart</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.by_platform?.amazon || 0}</p>
                <p className="text-sm text-gray-500">Amazon</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.by_source?.auto_discovered || 0}</p>
                <p className="text-sm text-gray-500">Auto Discovered</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Discovery Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Discovery Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Select sources to discover new products from:
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(sources).map(([key, source]) => (
                    <div
                      key={key}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSources.includes(key) 
                          ? 'border-pink-500 bg-pink-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleSource(key)}
                    >
                      <Checkbox 
                        checked={selectedSources.includes(key)}
                        onCheckedChange={() => toggleSource(key)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{source.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{source.platform}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        source.platform === 'flipkart' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {source.platform}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Label htmlFor="maxProducts" className="text-sm text-gray-600">
                    Max products per source:
                  </Label>
                  <Input
                    id="maxProducts"
                    type="number"
                    min="5"
                    max="50"
                    value={maxPerSource}
                    onChange={(e) => setMaxPerSource(parseInt(e.target.value) || 10)}
                    className="mt-1 w-32"
                  />
                </div>

                <Button 
                  onClick={runDiscovery}
                  disabled={isRunning || selectedSources.length === 0}
                  className="w-full search-btn"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Discovery...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Discovery ({selectedSources.length} sources × {maxPerSource} products)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Discovery Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Discoveries
                </span>
                <Button variant="ghost" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No discovery runs yet</p>
                  <p className="text-sm">Run your first discovery to see results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log, index) => (
                    <div 
                      key={log.id || index}
                      className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {log.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : log.status === 'running' ? (
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-sm font-medium capitalize">{log.status}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(log.started_at)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <p className="font-bold text-blue-600">{log.products_found || 0}</p>
                          <p className="text-xs text-gray-500">Found</p>
                        </div>
                        <div>
                          <p className="font-bold text-green-600">{log.products_added || 0}</p>
                          <p className="text-xs text-gray-500">Added</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-600">{log.products_skipped || 0}</p>
                          <p className="text-xs text-gray-500">Skipped</p>
                        </div>
                      </div>

                      {log.errors && log.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-500">
                          {log.errors.length} error(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DiscoveryPage;
