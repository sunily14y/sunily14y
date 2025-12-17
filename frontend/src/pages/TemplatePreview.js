import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icons
const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Heart: ({ filled }) => filled ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  Share: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Printer: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>,
  FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Package: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Facebook: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  Twitter: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  Pinterest: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
};

// Color variants for templates
const colorVariants = [
  { name: "Coral", color: "#FF6B6B", bg: "#FFF5F5" },
  { name: "Ocean Blue", color: "#4ECDC4", bg: "#E8F8F5" },
  { name: "Royal Purple", color: "#9B59B6", bg: "#F5EEF8" },
  { name: "Sunshine", color: "#F39C12", bg: "#FEF9E7" },
  { name: "Forest Green", color: "#27AE60", bg: "#E9F7EF" },
  { name: "Rose Pink", color: "#E91E63", bg: "#FCE4EC" },
];

const TemplatePreview = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await axios.get(`${API}/templates/${templateId}`);
        setTemplate(res.data);
      } catch (error) {
        console.error("Error fetching template:", error);
        toast.error("Template not found");
        navigate("/templates");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [templateId, navigate]);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : colorVariants.length - 1));
    setSelectedVariant((prev) => (prev > 0 ? prev - 1 : colorVariants.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < colorVariants.length - 1 ? prev + 1 : 0));
    setSelectedVariant((prev) => (prev < colorVariants.length - 1 ? prev + 1 : 0));
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out this amazing ${template?.name} template!`;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
    };
    
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
    setShowShareMenu(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!template) return null;

  const currentVariant = colorVariants[selectedVariant];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="template-preview-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")} data-testid="logo">
              <Icons.Sparkles />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">GreetingsMaker</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">Home</Link>
              <Link to="/templates" className="text-gray-600 hover:text-gray-900 transition-colors">Templates</Link>
              <Link to="/my-designs" className="text-gray-600 hover:text-gray-900 transition-colors">My Designs</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-purple-600">Home</Link>
            <span className="text-gray-300">/</span>
            <Link to="/templates" className="text-gray-500 hover:text-purple-600">Templates</Link>
            <span className="text-gray-300">/</span>
            <Link to={`/templates?category=${template.category_slug}`} className="text-gray-500 hover:text-purple-600 capitalize">
              {template.category_slug.replace("-", " ")}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">{template.name}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Side - Preview */}
          <div className="space-y-6">
            {/* Share & Save Actions */}
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
                  data-testid="share-btn"
                >
                  <Icons.Share /> Share
                </button>
                {showShareMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[200px]">
                    <button onClick={() => handleShare("facebook")} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                      <span className="text-blue-600"><Icons.Facebook /></span> Facebook
                    </button>
                    <button onClick={() => handleShare("twitter")} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                      <span className="text-gray-900"><Icons.Twitter /></span> Twitter
                    </button>
                    <button onClick={() => handleShare("pinterest")} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                      <span className="text-red-600"><Icons.Pinterest /></span> Pinterest
                    </button>
                    <hr className="my-2" />
                    <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                      🔗 Copy Link
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setIsSaved(!isSaved);
                  toast.success(isSaved ? "Removed from favorites" : "Added to favorites!");
                }}
                className={`flex items-center gap-2 transition-colors ${isSaved ? "text-red-500" : "text-gray-600 hover:text-red-500"}`}
                data-testid="save-btn"
              >
                <Icons.Heart filled={isSaved} /> {isSaved ? "Saved" : "Save"}
              </button>
            </div>

            {/* Preview Card with Envelope Effect */}
            <div className="relative">
              {/* Envelope Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-100 to-amber-200 rounded-t-3xl transform -rotate-1 scale-105 opacity-50" style={{ top: "-20px" }}></div>
              
              {/* Main Preview */}
              <div 
                className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border-8 border-white"
                style={{ aspectRatio: "5/7" }}
              >
                {/* Template Preview with Dynamic Background */}
                <div 
                  className="w-full h-full flex flex-col items-center justify-center p-8 relative"
                  style={{ backgroundColor: currentVariant.bg }}
                >
                  {/* Decorative Elements */}
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute rounded-full opacity-30"
                        style={{
                          width: `${Math.random() * 40 + 10}px`,
                          height: `${Math.random() * 40 + 10}px`,
                          backgroundColor: currentVariant.color,
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 text-center space-y-4">
                    {template.elements.map((el, idx) => (
                      <p
                        key={idx}
                        style={{
                          fontSize: `${Math.min(el.fontSize * 0.6, 32)}px`,
                          fontFamily: el.fontFamily,
                          fontWeight: el.fontWeight || "normal",
                          fontStyle: el.fontStyle || "normal",
                          color: idx === 0 || idx === 1 ? currentVariant.color : el.fill,
                          lineHeight: 1.3,
                        }}
                        className="whitespace-pre-line"
                      >
                        {el.text}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Navigation Arrows */}
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
                  data-testid="prev-variant-btn"
                >
                  <Icons.ChevronLeft />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
                  data-testid="next-variant-btn"
                >
                  <Icons.ChevronRight />
                </button>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex justify-center gap-2">
              {colorVariants.slice(0, 4).map((variant, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedVariant(idx);
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedVariant === idx ? "border-purple-500 ring-2 ring-purple-200" : "border-gray-200 hover:border-gray-300"
                  }`}
                  data-testid={`variant-thumb-${idx}`}
                >
                  <div className="w-full h-full" style={{ backgroundColor: variant.bg }}>
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: variant.color }}></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side - Details */}
          <div className="space-y-8">
            {/* Title & Category */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="template-title">{template.name}</h1>
              <p className="text-gray-500 capitalize">{template.category_slug.replace("-", " ")} invitation</p>
            </div>

            {/* Size & Price */}
            <div className="flex items-center gap-8">
              <div>
                <span className="text-sm text-gray-500">Size</span>
                <p className="font-medium text-gray-900">5" x 7"</p>
              </div>
              <div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Free</span>
              </div>
            </div>

            {/* Customize Button */}
            <button
              onClick={() => navigate(`/editor/${template.id}`)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-[1.02] transition-all"
              data-testid="customize-btn"
            >
              Customize
            </button>

            {/* Color Selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Color</span>
                <span className="text-sm font-medium text-gray-900">{currentVariant.name}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorVariants.map((variant, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedVariant(idx);
                      setCurrentImageIndex(idx);
                    }}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedVariant === idx ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: variant.color }}
                    title={variant.name}
                    data-testid={`color-${variant.name.toLowerCase().replace(" ", "-")}`}
                  >
                    {selectedVariant === idx && <span className="text-white"><Icons.Check /></span>}
                  </button>
                ))}
              </div>
              <p className="text-sm text-green-600 mt-2">Free</p>
            </div>

            {/* Spread the Joy Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Spread the joy</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm" data-testid="download-image-btn">
                  <Icons.Image /> Download image
                </button>
                <button className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm" data-testid="download-pdf-btn">
                  <Icons.FileText /> Download PDF
                </button>
                <button className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm" data-testid="print-btn">
                  <Icons.Printer /> Print
                </button>
                <button className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm" data-testid="share-action-btn">
                  <Icons.Share /> Share
                </button>
                <button className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm" data-testid="order-prints-btn">
                  <Icons.Package /> Order prints
                </button>
              </div>
            </div>

            {/* RSVP Section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Icons.Calendar />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Add RSVP page</h3>
                  <p className="text-sm text-gray-600">Get your own event webpage to track RSVPs, view responses, and manage your guest list.</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Design description</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                This beautiful {template.name.toLowerCase()} template is perfect for your {template.category_slug.replace("-", " ")} celebration. 
                Featuring elegant typography and customizable colors, this invitation sets the perfect tone for your special event. 
                Personalize every detail to make your invitation uniquely yours!
              </p>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, idx) => (
                    <Link
                      key={idx}
                      to={`/templates?search=${tag}`}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-purple-100 hover:text-purple-700 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Templates Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Placeholder for related templates */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                onClick={() => navigate("/templates")}
                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div 
                  className="aspect-[5/7]" 
                  style={{ backgroundColor: colorVariants[i % colorVariants.length].bg }}
                >
                  <div className="w-full h-full flex items-center justify-center opacity-50 group-hover:opacity-70 transition-opacity">
                    <div 
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: colorVariants[i % colorVariants.length].color }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 mt-16">
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

export default TemplatePreview;
