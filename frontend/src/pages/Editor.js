import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Canvas as FabricCanvas, Textbox, Image as FabricImage, Circle, Rect } from "fabric";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ===================== ICONS =====================
const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Type: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Sticker: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/><path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1"/><path d="M8 13h0"/><path d="M16 13h0"/></svg>,
  Palette: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>,
  Shapes: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Bold: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>,
  Underline: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/></svg>,
  AlignLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>,
  AlignCenter: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></svg>,
  AlignRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Minus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Undo: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Redo: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>,
  Layers: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-8.58 3.9a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-8.58 3.9a2 2 0 0 1-1.66 0L2 17.65"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
};

// Font options
const fontOptions = [
  { name: "Arial", value: "Arial" },
  { name: "Georgia", value: "Georgia" },
  { name: "Times New Roman", value: "Times New Roman" },
  { name: "Helvetica", value: "Helvetica" },
  { name: "Verdana", value: "Verdana" },
  { name: "Courier New", value: "Courier New" },
  { name: "Comic Sans MS", value: "Comic Sans MS" },
  { name: "Impact", value: "Impact" },
  { name: "Arial Black", value: "Arial Black" },
  { name: "Trebuchet MS", value: "Trebuchet MS" },
  { name: "Palatino", value: "Palatino Linotype" },
  { name: "Lucida", value: "Lucida Sans Unicode" },
  { name: "Tahoma", value: "Tahoma" },
  { name: "Century Gothic", value: "Century Gothic" },
];

// Color presets
const colorPresets = [
  "#000000", "#FFFFFF", "#FF6B6B", "#4ECDC4", "#9B59B6", "#3498DB",
  "#E74C3C", "#2ECC71", "#F39C12", "#1ABC9C", "#E91E63", "#673AB7",
  "#FF9800", "#795548", "#607D8B", "#D4AF37", "#8B4513", "#2C3E50",
];

// Sticker emojis
const stickers = [
  "🎉", "🎈", "🎂", "🎁", "🎊", "✨", "🌟", "💖", "💝", "💍",
  "🌹", "🌻", "🌺", "🌸", "🌷", "🎄", "❄️", "🎅", "🤶", "🎃",
  "👶", "🍼", "🧸", "🐣", "🐥", "🎓", "🏆", "🏅", "🔔", "💒",
];

const Editor = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("text");
  const [selectedObject, setSelectedObject] = useState(null);
  
  // Text properties
  const [textContent, setTextContent] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("center");
  
  // Canvas properties
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Fetch template
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

  // Initialize canvas
  useEffect(() => {
    if (!template || !canvasRef.current || fabricRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: template.width,
      height: template.height,
      backgroundColor: template.background_color,
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Load template elements
    template.elements.forEach((el) => {
      if (el.type === "text") {
        const text = new Textbox(el.text || "Text", {
          left: el.x,
          top: el.y,
          width: 300,
          fontSize: el.fontSize || 24,
          fontFamily: el.fontFamily || "Arial",
          fontWeight: el.fontWeight || "normal",
          fontStyle: el.fontStyle || "normal",
          fill: el.fill || "#000000",
          textAlign: el.textAlign || "center",
          originX: "center",
          originY: "center",
          editable: true,
        });
        canvas.add(text);
      }
    });

    // Event handlers
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => setSelectedObject(null));
    canvas.on("object:modified", saveHistory);
    canvas.on("object:added", saveHistory);

    canvas.renderAll();
    saveHistory();

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [template]);

  const handleSelection = (e) => {
    const obj = e.selected[0];
    setSelectedObject(obj);
    if (obj && obj.type === "textbox") {
      setTextContent(obj.text);
      setFontSize(obj.fontSize);
      setFontFamily(obj.fontFamily);
      setTextColor(obj.fill);
      setIsBold(obj.fontWeight === "bold");
      setIsItalic(obj.fontStyle === "italic");
      setTextAlign(obj.textAlign);
    }
  };

  const saveHistory = () => {
    if (!fabricRef.current) return;
    const json = fabricRef.current.toJSON();
    setCanvasHistory(prev => [...prev.slice(0, historyIndex + 1), json]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0 && fabricRef.current) {
      const newIndex = historyIndex - 1;
      fabricRef.current.loadFromJSON(canvasHistory[newIndex], () => {
        fabricRef.current.renderAll();
        setHistoryIndex(newIndex);
      });
    }
  };

  const redo = () => {
    if (historyIndex < canvasHistory.length - 1 && fabricRef.current) {
      const newIndex = historyIndex + 1;
      fabricRef.current.loadFromJSON(canvasHistory[newIndex], () => {
        fabricRef.current.renderAll();
        setHistoryIndex(newIndex);
      });
    }
  };

  // Add text
  const addText = (preset = "New Text") => {
    if (!fabricRef.current) return;
    const text = new Textbox(preset, {
      left: template.width / 2,
      top: template.height / 2,
      width: 250,
      fontSize: 28,
      fontFamily: "Arial",
      fill: "#000000",
      textAlign: "center",
      originX: "center",
      originY: "center",
      editable: true,
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
  };

  // Add sticker
  const addSticker = (emoji) => {
    if (!fabricRef.current) return;
    const text = new Textbox(emoji, {
      left: template.width / 2,
      top: template.height / 2,
      fontSize: 60,
      originX: "center",
      originY: "center",
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
  };

  // Add image
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgElement = document.createElement("img");
      imgElement.src = event.target.result;
      imgElement.onload = () => {
        const img = new FabricImage(imgElement, {
          left: template.width / 2,
          top: template.height / 2,
          originX: "center",
          originY: "center",
          scaleX: Math.min(200 / imgElement.width, 1),
          scaleY: Math.min(200 / imgElement.height, 1),
        });
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        fabricRef.current.renderAll();
      };
    };
    reader.readAsDataURL(file);
  };

  // Update text property
  const updateTextProperty = (property, value) => {
    if (!selectedObject || selectedObject.type !== "textbox") return;
    selectedObject.set(property, value);
    fabricRef.current.renderAll();
  };

  // Delete selected
  const deleteSelected = () => {
    if (!selectedObject || !fabricRef.current) return;
    fabricRef.current.remove(selectedObject);
    fabricRef.current.renderAll();
    setSelectedObject(null);
  };

  // Duplicate selected
  const duplicateSelected = () => {
    if (!selectedObject || !fabricRef.current) return;
    selectedObject.clone((cloned) => {
      cloned.set({
        left: selectedObject.left + 20,
        top: selectedObject.top + 20,
      });
      fabricRef.current.add(cloned);
      fabricRef.current.setActiveObject(cloned);
      fabricRef.current.renderAll();
    });
  };

  // Change background
  const handleBackgroundChange = (color) => {
    setBackgroundColor(color);
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = color;
      fabricRef.current.renderAll();
    }
  };

  // Download
  const downloadImage = (format = "png") => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: format,
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement("a");
    link.download = `${template?.name || "design"}.${format}`;
    link.href = dataURL;
    link.click();
    toast.success(`Downloaded as ${format.toUpperCase()}!`);
  };

  // Save design
  const saveDesign = async () => {
    if (!fabricRef.current || !template) return;
    try {
      const elements = fabricRef.current.getObjects().map((obj) => ({
        type: obj.type === "textbox" ? "text" : obj.type,
        x: obj.left,
        y: obj.top,
        text: obj.text,
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
        fill: obj.fill,
        textAlign: obj.textAlign,
      }));

      await axios.post(`${API}/designs`, {
        template_id: template.id,
        name: template.name,
        width: template.width,
        height: template.height,
        background_color: backgroundColor,
        elements,
      });
      toast.success("Design saved!");
    } catch (error) {
      toast.error("Failed to save design");
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
    <div className="h-screen flex flex-col bg-gray-100" data-testid="editor-page">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/preview/${templateId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            data-testid="back-btn"
          >
            <Icons.ArrowLeft />
          </button>
          <div className="flex items-center gap-2">
            <Icons.Sparkles />
            <span className="font-semibold text-gray-900">GreetingsMaker</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30"
            title="Undo"
          >
            <Icons.Undo />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= canvasHistory.length - 1}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30"
            title="Redo"
          >
            <Icons.Redo />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/preview/${templateId}`)}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveDesign}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Save
          </button>
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
              data-testid="download-btn"
            >
              <Icons.Download /> Download <Icons.ChevronDown />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={() => downloadImage("png")} className="w-full px-4 py-2 text-left hover:bg-gray-50">Download PNG</button>
              <button onClick={() => downloadImage("jpeg")} className="w-full px-4 py-2 text-left hover:bg-gray-50">Download JPEG</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 flex-shrink-0">
          {[
            { id: "text", icon: <Icons.Type />, label: "Text" },
            { id: "image", icon: <Icons.Image />, label: "Photo" },
            { id: "stickers", icon: <Icons.Sticker />, label: "Stickers" },
            { id: "colors", icon: <Icons.Palette />, label: "Colors" },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`w-16 h-16 flex flex-col items-center justify-center rounded-xl transition-all gap-1 ${
                activeTab === tool.id
                  ? "bg-purple-100 text-purple-600"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              data-testid={`tool-${tool.id}`}
            >
              {tool.icon}
              <span className="text-xs">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Left Panel - Tool Options */}
        <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            {/* Text Tab */}
            {activeTab === "text" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Add Text</h3>
                <button
                  onClick={() => addText("Add a heading")}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                  data-testid="add-heading-btn"
                >
                  <span className="text-xl font-bold">Add a heading</span>
                </button>
                <button
                  onClick={() => addText("Add a subheading")}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                  data-testid="add-subheading-btn"
                >
                  <span className="text-lg font-medium">Add a subheading</span>
                </button>
                <button
                  onClick={() => addText("Add body text")}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                  data-testid="add-body-btn"
                >
                  <span className="text-base">Add body text</span>
                </button>

                {/* Text Presets */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm text-gray-500 mb-3">Quick Add</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {["DATE", "TIME", "RSVP", "ADDRESS"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => addText(preset)}
                        className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Image Tab */}
            {activeTab === "image" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Add Photo</h3>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all">
                  <Icons.Upload />
                  <span className="mt-2 text-sm text-gray-500">Upload Image</span>
                  <span className="text-xs text-gray-400">PNG, JPG up to 10MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="image-upload-input"
                  />
                </label>
                <p className="text-xs text-gray-400 text-center">
                  Add your own photos to personalize your design
                </p>
              </div>
            )}

            {/* Stickers Tab */}
            {activeTab === "stickers" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Add Stickers</h3>
                <div className="grid grid-cols-5 gap-2">
                  {stickers.map((sticker, idx) => (
                    <button
                      key={idx}
                      onClick={() => addSticker(sticker)}
                      className="text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      data-testid={`sticker-${idx}`}
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors Tab */}
            {activeTab === "colors" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Background Color</h3>
                <div className="grid grid-cols-6 gap-2">
                  {colorPresets.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleBackgroundChange(color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        backgroundColor === color ? "border-purple-500 scale-110" : "border-gray-200"
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid={`bg-color-${idx}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => handleBackgroundChange(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => handleBackgroundChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-200 overflow-auto p-8">
          <div 
            className="bg-white shadow-2xl relative"
            style={{ 
              width: template?.width || 500, 
              height: template?.height || 700,
              borderRadius: "4px"
            }}
          >
            <canvas ref={canvasRef} data-testid="editor-canvas" />
          </div>
        </div>

        {/* Right Panel - Properties */}
        {selectedObject && selectedObject.type === "textbox" && (
          <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Text Properties</h3>
                <button
                  onClick={() => fabricRef.current?.discardActiveObject().renderAll()}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icons.X />
                </button>
              </div>

              {/* Font Family */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Font</label>
                <select
                  value={fontFamily}
                  onChange={(e) => {
                    setFontFamily(e.target.value);
                    updateTextProperty("fontFamily", e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  style={{ fontFamily: fontFamily }}
                  data-testid="font-select"
                >
                  {fontOptions.map((font) => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Size</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newSize = Math.max(8, fontSize - 2);
                      setFontSize(newSize);
                      updateTextProperty("fontSize", newSize);
                    }}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Icons.Minus />
                  </button>
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => {
                      const size = parseInt(e.target.value) || 24;
                      setFontSize(size);
                      updateTextProperty("fontSize", size);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                    data-testid="font-size-input"
                  />
                  <button
                    onClick={() => {
                      const newSize = Math.min(200, fontSize + 2);
                      setFontSize(newSize);
                      updateTextProperty("fontSize", newSize);
                    }}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Icons.Plus />
                  </button>
                </div>
              </div>

              {/* Text Style */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Style</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const newBold = !isBold;
                      setIsBold(newBold);
                      updateTextProperty("fontWeight", newBold ? "bold" : "normal");
                    }}
                    className={`p-2 border rounded-lg transition-all ${
                      isBold ? "bg-purple-100 border-purple-300 text-purple-600" : "border-gray-300 hover:bg-gray-50"
                    }`}
                    data-testid="bold-btn"
                  >
                    <Icons.Bold />
                  </button>
                  <button
                    onClick={() => {
                      const newItalic = !isItalic;
                      setIsItalic(newItalic);
                      updateTextProperty("fontStyle", newItalic ? "italic" : "normal");
                    }}
                    className={`p-2 border rounded-lg transition-all ${
                      isItalic ? "bg-purple-100 border-purple-300 text-purple-600" : "border-gray-300 hover:bg-gray-50"
                    }`}
                    data-testid="italic-btn"
                  >
                    <Icons.Italic />
                  </button>
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Alignment</label>
                <div className="flex gap-1">
                  {[
                    { align: "left", icon: <Icons.AlignLeft /> },
                    { align: "center", icon: <Icons.AlignCenter /> },
                    { align: "right", icon: <Icons.AlignRight /> },
                  ].map((item) => (
                    <button
                      key={item.align}
                      onClick={() => {
                        setTextAlign(item.align);
                        updateTextProperty("textAlign", item.align);
                      }}
                      className={`p-2 border rounded-lg transition-all ${
                        textAlign === item.align
                          ? "bg-purple-100 border-purple-300 text-purple-600"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      data-testid={`align-${item.align}-btn`}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Color</label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {colorPresets.slice(0, 12).map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTextColor(color);
                        updateTextProperty("fill", color);
                      }}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        textColor === color ? "border-purple-500 scale-110" : "border-gray-200"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      updateTextProperty("fill", e.target.value);
                    }}
                    className="w-10 h-10 rounded cursor-pointer"
                    data-testid="text-color-picker"
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

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <button
                  onClick={duplicateSelected}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid="duplicate-btn"
                >
                  <Icons.Copy /> Duplicate
                </button>
                <button
                  onClick={deleteSelected}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  data-testid="delete-btn"
                >
                  <Icons.Trash /> Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - No Selection */}
        {!selectedObject && (
          <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl mb-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Icons.Calendar />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Create RSVP</h4>
                  <p className="text-xs text-gray-500">Track your guests</p>
                </div>
              </div>

              <div className="text-center py-8">
                <div className="text-4xl mb-3">👆</div>
                <p className="text-gray-500 text-sm">Click on any element to edit</p>
                <p className="text-gray-400 text-xs mt-1">Or use the tools on the left to add new elements</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;
