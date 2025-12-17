import React, { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import TemplatePreview from "@/pages/TemplatePreview";
import Editor from "@/pages/Editor";
import AdminPanel from "@/pages/Admin";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ===================== ICONS =====================
const Icons = {
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
};

// ===================== HEADER =====================
const Header = () => {
  const navigate = useNavigate();
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")} data-testid="logo">
            <Icons.Sparkles />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">GreetingsMaker</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-home">Home</Link>
            <Link to="/templates" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-templates">Templates</Link>
            <Link to="/my-designs" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-my-designs">My Designs</Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

// ===================== HOME PAGE =====================
const HomePage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await axios.post(`${API}/seed`);
        const [catRes, tmplRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/templates`)
        ]);
        setCategories(catRes.data);
        setTemplates(tmplRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50" data-testid="home-page">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-4" data-testid="hero-section">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Create Beautiful <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Invitations & Cards</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Design stunning invitations and greeting cards for any occasion. Choose from hundreds of templates and customize them to make your event unforgettable.
          </p>
          <button
            onClick={() => navigate("/templates")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all"
            data-testid="get-started-btn"
          >
            Get Started <Icons.ChevronRight />
          </button>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 bg-white" data-testid="categories-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => navigate(`/templates?category=${cat.slug}`)}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all text-center"
                data-testid={`category-${cat.slug}`}
              >
                <span className="text-4xl mb-3 block">{cat.icon}</span>
                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{cat.template_count || 0} templates</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates by Category */}
      {categories.map((category) => {
        const categoryTemplates = templates.filter(t => t.category_slug === category.slug);
        if (categoryTemplates.length === 0) return null;
        return (
          <section key={category.id} className="py-12 px-4" data-testid={`section-${category.slug}`}>
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                    <p className="text-gray-500 text-sm">{category.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/templates?category=${category.slug}`)}
                  className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                >
                  View all <Icons.ChevronRight />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {categoryTemplates.slice(0, 5).map((template) => (
                  <div
                    key={template.id}
                    onClick={() => navigate(`/preview/${template.id}`)}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transform hover:scale-105 transition-all cursor-pointer group"
                    data-testid={`template-card-${template.id}`}
                  >
                    <div className="aspect-[5/7] overflow-hidden">
                      {template.thumbnail ? (
                        <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: template.background_color || '#f0f0f0' }}>
                          <span className="text-4xl">{category.icon}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-gray-900 truncate text-sm">{template.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-green-600 font-medium">Free</span>
                        {template.editable_zones?.length > 0 && (
                          <span className="text-xs text-gray-400">{template.editable_zones.length} editable</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* View All Templates CTA */}
      <section className="py-12 px-4 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Create?</h2>
          <p className="text-purple-100 mb-6">Browse our complete collection of customizable templates</p>
          <button
            onClick={() => navigate("/templates")}
            className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
            data-testid="view-all-templates-btn"
          >
            Browse All Templates <Icons.ChevronRight />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Icons.Sparkles />
            <span className="text-xl font-bold">GreetingsMaker</span>
          </div>
          <p className="text-gray-400">Create beautiful invitations and cards for every occasion</p>
        </div>
      </footer>
    </div>
  );
};

// ===================== TEMPLATES PAGE =====================
const TemplatesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    if (cat) setSelectedCategory(cat);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, tmplRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/templates`, {
            params: {
              category_slug: selectedCategory || undefined,
              search: searchQuery || undefined
            }
          })
        ]);
        setCategories(catRes.data);
        setTemplates(tmplRes.data);
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error("Failed to load templates");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="templates-page">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              data-testid="search-input"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search /></span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            data-testid="category-filter"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === "" ? "bg-purple-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            data-testid="category-pill-all"
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.slug ? "bg-purple-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              data-testid={`category-pill-${cat.slug}`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => navigate(`/preview/${template.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transform hover:scale-105 transition-all cursor-pointer group"
                data-testid={`template-item-${template.id}`}
              >
                <div className="aspect-[5/7] overflow-hidden">
                  <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{template.category_slug.replace('-', ' ')}</p>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===================== MY DESIGNS PAGE =====================
const MyDesignsPage = () => {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const res = await axios.get(`${API}/designs`);
        setDesigns(res.data);
      } catch (error) {
        console.error("Error fetching designs:", error);
        toast.error("Failed to load designs");
      } finally {
        setLoading(false);
      }
    };
    fetchDesigns();
  }, []);

  const deleteDesign = async (id) => {
    try {
      await axios.delete(`${API}/designs/${id}`);
      setDesigns(designs.filter((d) => d.id !== id));
      toast.success("Design deleted");
    } catch (error) {
      console.error("Error deleting design:", error);
      toast.error("Failed to delete design");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="my-designs-page">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Designs</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No designs yet</h2>
            <p className="text-gray-500 mb-6">Start creating beautiful invitations and cards!</p>
            <button
              onClick={() => navigate("/templates")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
              data-testid="browse-templates-btn"
            >
              Browse Templates <Icons.ChevronRight />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {designs.map((design) => (
              <div key={design.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all" data-testid={`design-card-${design.id}`}>
                <div className="aspect-[5/7] flex items-center justify-center" style={{ backgroundColor: design.background_color }}>
                  <span className="text-4xl">🎨</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{design.name}</h3>
                  <p className="text-sm text-gray-500">{new Date(design.updated_at).toLocaleDateString()}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => deleteDesign(design.id)}
                      className="flex-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      data-testid={`delete-design-${design.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===================== MAIN APP =====================
function App() {
  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/preview/:templateId" element={<TemplatePreview />} />
          <Route path="/editor/:templateId" element={<Editor />} />
          <Route path="/my-designs" element={<MyDesignsPage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
