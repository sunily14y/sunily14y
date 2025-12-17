import React, { useState, useEffect, useRef, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Canvas as FabricCanvas, Textbox, Rect, Image as FabricImage } from "fabric";
import TemplatePreview from "@/pages/TemplatePreview";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ===================== ICONS =====================
const Icons = {
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Type: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Save: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Palette: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
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
        // Seed database first
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

      {/* Featured Templates */}
      <section className="py-16 px-4" data-testid="featured-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Featured Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.slice(0, 8).map((template) => (
              <div
                key={template.id}
                onClick={() => navigate(`/preview/${template.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transform hover:scale-105 transition-all cursor-pointer group"
                data-testid={`template-card-${template.id}`}
              >
                <div className="aspect-[5/7] overflow-hidden">
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{template.category_slug.replace('-', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => navigate("/templates")}
              className="inline-flex items-center gap-2 border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-full font-semibold hover:bg-purple-600 hover:text-white transition-all"
              data-testid="view-all-templates-btn"
            >
              View All Templates <Icons.ChevronRight />
            </button>
          </div>
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
            <Icons.Search />
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
                onClick={() => navigate(`/editor/${template.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transform hover:scale-105 transition-all cursor-pointer group"
                data-testid={`template-item-${template.id}`}
              >
                <div className="aspect-[5/7] overflow-hidden">
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
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

// ===================== EDITOR PAGE =====================
const EditorPage = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [template, setTemplate] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Text properties
  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");

  const fonts = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Comic Sans MS", "Impact", "Arial Black", "Trebuchet MS", "Palatino"];

  // Initialize canvas
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await axios.get(`${API}/templates/${templateId}`);
        setTemplate(res.data);
        setBackgroundColor(res.data.background_color);
      } catch (error) {
        console.error("Error fetching template:", error);
        toast.error("Failed to load template");
        navigate("/templates");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [templateId, navigate]);

  useEffect(() => {
    if (!template || !canvasRef.current || fabricRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: template.width,
      height: template.height,
      backgroundColor: template.background_color,
      selection: true,
    });

    fabricRef.current = canvas;

    // Load template elements
    template.elements.forEach((el) => {
      if (el.type === "text") {
        const text = new Textbox(el.text || "Text", {
          left: el.x - 100,
          top: el.y - 20,
          width: 200,
          fontSize: el.fontSize || 24,
          fontFamily: el.fontFamily || "Arial",
          fontWeight: el.fontWeight || "normal",
          fontStyle: el.fontStyle || "normal",
          fill: el.fill || "#000000",
          textAlign: el.textAlign || "center",
          originX: "center",
          originY: "center",
        });
        canvas.add(text);
      }
    });

    // Selection event
    canvas.on("selection:created", (e) => {
      const obj = e.selected[0];
      setSelectedObject(obj);
      if (obj.type === "textbox") {
        setTextColor(obj.fill);
        setFontSize(obj.fontSize);
        setFontFamily(obj.fontFamily);
      }
    });

    canvas.on("selection:updated", (e) => {
      const obj = e.selected[0];
      setSelectedObject(obj);
      if (obj.type === "textbox") {
        setTextColor(obj.fill);
        setFontSize(obj.fontSize);
        setFontFamily(obj.fontFamily);
      }
    });

    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    canvas.renderAll();

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [template]);

  // Update background color
  const handleBackgroundChange = (color) => {
    setBackgroundColor(color);
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = color;
      fabricRef.current.renderAll();
    }
  };

  // Add new text
  const addText = () => {
    if (!fabricRef.current) return;
    const text = new Textbox("New Text", {
      left: 250,
      top: 350,
      width: 200,
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#000000",
      textAlign: "center",
      originX: "center",
      originY: "center",
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
  };

  // Add image
  const addImage = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgElement = document.createElement("img");
      imgElement.src = event.target.result;
      imgElement.onload = () => {
        const img = new FabricImage(imgElement, {
          left: 250,
          top: 350,
          originX: "center",
          originY: "center",
          scaleX: 0.3,
          scaleY: 0.3,
        });
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        fabricRef.current.renderAll();
      };
    };
    reader.readAsDataURL(file);
  };

  // Update text properties
  const updateTextProperty = (property, value) => {
    if (!selectedObject || selectedObject.type !== "textbox") return;
    selectedObject.set(property, value);
    fabricRef.current.renderAll();
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!selectedObject || !fabricRef.current) return;
    fabricRef.current.remove(selectedObject);
    fabricRef.current.renderAll();
    setSelectedObject(null);
  };

  // Download as image
  const downloadImage = () => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement("a");
    link.download = `${template?.name || "design"}.png`;
    link.href = dataURL;
    link.click();
    toast.success("Image downloaded successfully!");
  };

  // Save design
  const saveDesign = async () => {
    if (!fabricRef.current || !template) return;
    setSaving(true);
    try {
      const elements = fabricRef.current.getObjects().map((obj) => {
        const base = {
          type: obj.type === "textbox" ? "text" : obj.type,
          x: obj.left,
          y: obj.top,
          width: obj.width,
          height: obj.height,
          rotation: obj.angle,
        };
        if (obj.type === "textbox") {
          return {
            ...base,
            text: obj.text,
            fontSize: obj.fontSize,
            fontFamily: obj.fontFamily,
            fontWeight: obj.fontWeight,
            fontStyle: obj.fontStyle,
            fill: obj.fill,
            textAlign: obj.textAlign,
          };
        }
        return base;
      });

      await axios.post(`${API}/designs`, {
        template_id: template.id,
        name: template.name,
        width: template.width,
        height: template.height,
        background_color: backgroundColor,
        elements,
      });
      toast.success("Design saved successfully!");
    } catch (error) {
      console.error("Error saving design:", error);
      toast.error("Failed to save design");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" data-testid="editor-page">
      {/* Editor Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/templates")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              data-testid="back-btn"
            >
              <Icons.ArrowLeft /> Back
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-gray-900">{template?.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveDesign}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              data-testid="save-btn"
            >
              <Icons.Save /> {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={downloadImage}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
              data-testid="download-btn"
            >
              <Icons.Download /> Download
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left Toolbar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h2 className="font-semibold text-gray-900 mb-4">Tools</h2>
          
          {/* Add Elements */}
          <div className="space-y-2 mb-6">
            <button
              onClick={addText}
              className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              data-testid="add-text-btn"
            >
              <Icons.Type /> Add Text
            </button>
            <label className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <Icons.Image /> Add Image
              <input type="file" accept="image/*" onChange={addImage} className="hidden" data-testid="add-image-input" />
            </label>
          </div>

          {/* Background Color */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Background Color</h3>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => handleBackgroundChange(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
                data-testid="bg-color-input"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => handleBackgroundChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Text Properties (when text is selected) */}
          {selectedObject && selectedObject.type === "textbox" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Text Properties</h3>
              
              {/* Font Family */}
              <div>
                <label className="text-xs text-gray-500">Font</label>
                <select
                  value={fontFamily}
                  onChange={(e) => {
                    setFontFamily(e.target.value);
                    updateTextProperty("fontFamily", e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  data-testid="font-family-select"
                >
                  {fonts.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs text-gray-500">Size</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => {
                    const size = parseInt(e.target.value);
                    setFontSize(size);
                    updateTextProperty("fontSize", size);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  data-testid="font-size-input"
                />
              </div>

              {/* Text Color */}
              <div>
                <label className="text-xs text-gray-500">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      updateTextProperty("fill", e.target.value);
                    }}
                    className="w-10 h-10 rounded cursor-pointer"
                    data-testid="text-color-input"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      updateTextProperty("fill", e.target.value);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={deleteSelected}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                data-testid="delete-element-btn"
              >
                <Icons.Trash /> Delete Element
              </button>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-200 p-8 overflow-auto">
          <div className="bg-white shadow-2xl rounded-lg overflow-hidden" style={{ width: template?.width, height: template?.height }}>
            <canvas ref={canvasRef} data-testid="editor-canvas" />
          </div>
        </div>

        {/* Right Panel - Quick Tips */}
        <div className="w-64 bg-white border-l border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Tips</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>📝 Click on any text to edit it</p>
            <p>🎨 Use the color picker to change colors</p>
            <p>📷 Add your own images</p>
            <p>↔️ Drag elements to reposition</p>
            <p>🔄 Use corners to resize</p>
            <p>💾 Save to keep your design</p>
            <p>⬇️ Download as PNG image</p>
          </div>
        </div>
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
              <div
                key={design.id}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all"
                data-testid={`design-card-${design.id}`}
              >
                <div 
                  className="aspect-[5/7] flex items-center justify-center"
                  style={{ backgroundColor: design.background_color }}
                >
                  <span className="text-4xl">🎨</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{design.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(design.updated_at).toLocaleDateString()}
                  </p>
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
          <Route path="/editor/:templateId" element={<EditorPage />} />
          <Route path="/my-designs" element={<MyDesignsPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
