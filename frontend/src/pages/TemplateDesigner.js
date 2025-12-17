import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Canvas as FabricCanvas, Textbox, Rect, Circle, Image as FabricImage, Line, Triangle, Polygon } from "fabric";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icons
const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Type: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Shapes: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  Palette: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>,
  Layers: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-8.58 3.9a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-8.58 3.9a2 2 0 0 1-1.66 0L2 17.65"/></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Undo: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Redo: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>,
  Bold: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>,
  Underline: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/></svg>,
  AlignLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>,
  AlignCenter: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></svg>,
  AlignRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></svg>,
  ChevronUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>,
  ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Unlock: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Minus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Save: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Grid: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="3" y2="21"/><line x1="15" x2="15" y1="3" y2="21"/></svg>,
  ZoomIn: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>,
  ZoomOut: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>,
  MoveUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 9 7-7 7 7"/><path d="M12 16V2"/></svg>,
  MoveDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 15-7 7-7-7"/><path d="M12 8v14"/></svg>,
};

// Font options
const fonts = [
  "Arial", "Georgia", "Times New Roman", "Helvetica", "Verdana", 
  "Comic Sans MS", "Impact", "Arial Black", "Trebuchet MS", "Palatino",
  "Courier New", "Lucida Console", "Tahoma", "Century Gothic"
];

// Color presets
const colorPresets = [
  "#000000", "#FFFFFF", "#FF6B6B", "#4ECDC4", "#9B59B6", "#3498DB",
  "#E74C3C", "#2ECC71", "#F39C12", "#1ABC9C", "#E91E63", "#673AB7",
  "#FF9800", "#795548", "#607D8B", "#D4AF37", "#8B4513", "#2C3E50",
  "#F8F9FA", "#E9ECEF", "#DEE2E6", "#CED4DA", "#ADB5BD", "#6C757D",
];

// Shape presets
const shapes = [
  { name: "Rectangle", type: "rect" },
  { name: "Circle", type: "circle" },
  { name: "Triangle", type: "triangle" },
  { name: "Line", type: "line" },
  { name: "Star", type: "star" },
];

// Stickers/Emojis
const stickers = [
  "🎉", "🎈", "🎂", "🎁", "🎊", "✨", "🌟", "💖", "💝", "💍",
  "🌹", "🌻", "🌺", "🌸", "🌷", "🎄", "❄️", "🎅", "🤶", "🎃",
  "👶", "🍼", "🧸", "🐣", "🐥", "🎓", "🏆", "🏅", "🔔", "💒",
  "🥂", "🍾", "💐", "🕊️", "❤️", "💕", "💗", "💓", "💘", "🦋",
];

const TemplateDesigner = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("elements");
  const [selectedObject, setSelectedObject] = useState(null);
  const [layers, setLayers] = useState([]);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Template settings
  const [templateName, setTemplateName] = useState("Untitled Template");
  const [categoryId, setCategoryId] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [canvasWidth, setCanvasWidth] = useState(500);
  const [canvasHeight, setCanvasHeight] = useState(700);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [tags, setTags] = useState("");
  
  // Selected object properties
  const [objProps, setObjProps] = useState({
    fill: "#000000",
    stroke: "",
    strokeWidth: 0,
    opacity: 100,
    fontSize: 24,
    fontFamily: "Arial",
    fontWeight: "normal",
    fontStyle: "normal",
    textAlign: "center",
    // Permissions
    isEditable: true,
    canEditText: true,
    canChangeFont: true,
    canChangeSize: true,
    canChangeColor: true,
    canMove: false,
    canResize: false,
    canDelete: false,
  });

  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Fetch template and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await axios.get(`${API}/admin/categories`);
        setCategories(catRes.data);
        
        if (templateId && templateId !== "new") {
          const tmplRes = await axios.get(`${API}/admin/templates/${templateId}`);
          const tmpl = tmplRes.data;
          setTemplateName(tmpl.name);
          setCategoryId(tmpl.category_id);
          setCategorySlug(tmpl.category_slug);
          setCanvasWidth(tmpl.width);
          setCanvasHeight(tmpl.height);
          setBackgroundColor(tmpl.background_color);
          setTags(tmpl.tags?.join(", ") || "");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [templateId]);

  // Initialize canvas
  useEffect(() => {
    if (loading || !canvasRef.current) return;
    
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Load existing template elements
    if (templateId && templateId !== "new") {
      loadTemplateElements();
    }

    // Event handlers
    canvas.on("selection:created", handleObjectSelect);
    canvas.on("selection:updated", handleObjectSelect);
    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });
    canvas.on("object:modified", () => {
      updateLayers();
      saveToHistory();
    });
    canvas.on("object:added", () => {
      updateLayers();
    });
    canvas.on("object:removed", () => {
      updateLayers();
    });

    canvas.renderAll();
    saveToHistory();

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [loading, canvasWidth, canvasHeight]);

  // Update background color
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = backgroundColor;
      fabricRef.current.renderAll();
    }
  }, [backgroundColor]);

  const loadTemplateElements = async () => {
    try {
      const res = await axios.get(`${API}/admin/templates/${templateId}`);
      const tmpl = res.data;
      
      // Load editable zones or elements
      const elements = tmpl.editable_zones?.length > 0 ? tmpl.editable_zones : tmpl.elements;
      
      elements?.forEach((el) => {
        if (el.type === "text") {
          addTextToCanvas(el.default_text || el.text || "Text", {
            left: el.x,
            top: el.y,
            fontSize: el.font_size || el.fontSize || 24,
            fontFamily: el.font_family || el.fontFamily || "Arial",
            fill: el.font_color || el.fill || "#000000",
            fontWeight: el.font_weight || el.fontWeight || "normal",
            fontStyle: el.font_style || el.fontStyle || "normal",
            textAlign: el.text_align || el.textAlign || "center",
            // Store permissions
            customData: {
              isEditable: el.can_edit_text !== false,
              canEditText: el.can_edit_text !== false,
              canChangeFont: el.can_change_font !== false,
              canChangeSize: el.can_change_size !== false,
              canChangeColor: el.can_change_color !== false,
              canMove: el.can_move === true,
              canResize: el.can_resize === true,
              canDelete: el.can_delete === true,
              zoneName: el.name || "",
            }
          });
        }
      });
      
      updateLayers();
    } catch (error) {
      console.error("Error loading template elements:", error);
    }
  };

  const handleObjectSelect = (e) => {
    const obj = e.selected[0];
    setSelectedObject(obj);
    
    const customData = obj.customData || {};
    
    setObjProps({
      fill: obj.fill || "#000000",
      stroke: obj.stroke || "",
      strokeWidth: obj.strokeWidth || 0,
      opacity: Math.round((obj.opacity || 1) * 100),
      fontSize: obj.fontSize || 24,
      fontFamily: obj.fontFamily || "Arial",
      fontWeight: obj.fontWeight || "normal",
      fontStyle: obj.fontStyle || "normal",
      textAlign: obj.textAlign || "center",
      isEditable: customData.isEditable !== false,
      canEditText: customData.canEditText !== false,
      canChangeFont: customData.canChangeFont !== false,
      canChangeSize: customData.canChangeSize !== false,
      canChangeColor: customData.canChangeColor !== false,
      canMove: customData.canMove === true,
      canResize: customData.canResize === true,
      canDelete: customData.canDelete === true,
      zoneName: customData.zoneName || "",
    });
  };

  const updateLayers = () => {
    if (!fabricRef.current) return;
    const objects = fabricRef.current.getObjects();
    setLayers(objects.map((obj, idx) => ({
      id: obj.id || idx,
      type: obj.type,
      name: obj.customData?.zoneName || obj.text?.substring(0, 20) || `${obj.type} ${idx + 1}`,
      visible: obj.visible !== false,
      locked: obj.lockMovementX && obj.lockMovementY,
      obj: obj,
    })));
  };

  const saveToHistory = () => {
    if (!fabricRef.current) return;
    const json = fabricRef.current.toJSON(['customData']);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), json]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      fabricRef.current.loadFromJSON(history[newIndex], () => {
        fabricRef.current.renderAll();
        updateLayers();
        setHistoryIndex(newIndex);
      });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      fabricRef.current.loadFromJSON(history[newIndex], () => {
        fabricRef.current.renderAll();
        updateLayers();
        setHistoryIndex(newIndex);
      });
    }
  };

  // Add text to canvas
  const addTextToCanvas = (text = "New Text", options = {}) => {
    if (!fabricRef.current) return;
    
    const textbox = new Textbox(text, {
      left: options.left || canvasWidth / 2,
      top: options.top || canvasHeight / 2,
      width: options.width || 250,
      fontSize: options.fontSize || 28,
      fontFamily: options.fontFamily || "Arial",
      fontWeight: options.fontWeight || "normal",
      fontStyle: options.fontStyle || "normal",
      fill: options.fill || "#000000",
      textAlign: options.textAlign || "center",
      originX: "center",
      originY: "center",
      editable: true,
      customData: options.customData || {
        isEditable: true,
        canEditText: true,
        canChangeFont: true,
        canChangeSize: true,
        canChangeColor: true,
        canMove: false,
        canResize: false,
        canDelete: false,
        zoneName: "",
      },
    });
    
    fabricRef.current.add(textbox);
    fabricRef.current.setActiveObject(textbox);
    fabricRef.current.renderAll();
    saveToHistory();
  };

  // Add shape to canvas
  const addShape = (shapeType) => {
    if (!fabricRef.current) return;
    
    let shape;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    switch (shapeType) {
      case "rect":
        shape = new Rect({
          left: centerX,
          top: centerY,
          width: 100,
          height: 100,
          fill: "#4ECDC4",
          originX: "center",
          originY: "center",
        });
        break;
      case "circle":
        shape = new Circle({
          left: centerX,
          top: centerY,
          radius: 50,
          fill: "#FF6B6B",
          originX: "center",
          originY: "center",
        });
        break;
      case "triangle":
        shape = new Triangle({
          left: centerX,
          top: centerY,
          width: 100,
          height: 100,
          fill: "#9B59B6",
          originX: "center",
          originY: "center",
        });
        break;
      case "line":
        shape = new Line([centerX - 50, centerY, centerX + 50, centerY], {
          stroke: "#000000",
          strokeWidth: 2,
          originX: "center",
          originY: "center",
        });
        break;
      case "star":
        const points = [];
        const spikes = 5;
        const outerRadius = 50;
        const innerRadius = 25;
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI / spikes) * i - Math.PI / 2;
          points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });
        }
        shape = new Polygon(points, {
          fill: "#F39C12",
          originX: "center",
          originY: "center",
        });
        break;
      default:
        return;
    }
    
    fabricRef.current.add(shape);
    fabricRef.current.setActiveObject(shape);
    fabricRef.current.renderAll();
    saveToHistory();
  };

  // Add sticker/emoji
  const addSticker = (emoji) => {
    addTextToCanvas(emoji, { fontSize: 60 });
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
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: "center",
          originY: "center",
          scaleX: Math.min(200 / imgElement.width, 1),
          scaleY: Math.min(200 / imgElement.height, 1),
        });
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        fabricRef.current.renderAll();
        saveToHistory();
      };
    };
    reader.readAsDataURL(file);
  };

  // Background image upload
  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgElement = document.createElement("img");
      imgElement.src = event.target.result;
      imgElement.onload = () => {
        fabricRef.current.setBackgroundImage(
          new FabricImage(imgElement, {
            scaleX: canvasWidth / imgElement.width,
            scaleY: canvasHeight / imgElement.height,
          }),
          fabricRef.current.renderAll.bind(fabricRef.current)
        );
        saveToHistory();
      };
    };
    reader.readAsDataURL(file);
  };

  // Update selected object property
  const updateObjectProperty = (prop, value) => {
    if (!selectedObject) return;
    
    if (prop === "opacity") {
      selectedObject.set("opacity", value / 100);
    } else {
      selectedObject.set(prop, value);
    }
    
    fabricRef.current.renderAll();
    setObjProps(prev => ({ ...prev, [prop]: value }));
  };

  // Update custom data (permissions)
  const updateCustomData = (prop, value) => {
    if (!selectedObject) return;
    
    if (!selectedObject.customData) {
      selectedObject.customData = {};
    }
    selectedObject.customData[prop] = value;
    
    setObjProps(prev => ({ ...prev, [prop]: value }));
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!selectedObject || !fabricRef.current) return;
    fabricRef.current.remove(selectedObject);
    fabricRef.current.renderAll();
    setSelectedObject(null);
    saveToHistory();
  };

  // Duplicate selected object
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
      saveToHistory();
    });
  };

  // Layer controls
  const bringForward = () => {
    if (!selectedObject || !fabricRef.current) return;
    fabricRef.current.bringObjectForward(selectedObject);
    fabricRef.current.renderAll();
    updateLayers();
  };

  const sendBackward = () => {
    if (!selectedObject || !fabricRef.current) return;
    fabricRef.current.sendObjectBackwards(selectedObject);
    fabricRef.current.renderAll();
    updateLayers();
  };

  const bringToFront = () => {
    if (!selectedObject || !fabricRef.current) return;
    fabricRef.current.bringObjectToFront(selectedObject);
    fabricRef.current.renderAll();
    updateLayers();
  };

  const sendToBack = () => {
    if (!selectedObject || !fabricRef.current) return;
    fabricRef.current.sendObjectToBack(selectedObject);
    fabricRef.current.renderAll();
    updateLayers();
  };

  // Toggle layer visibility
  const toggleLayerVisibility = (layer) => {
    layer.obj.visible = !layer.obj.visible;
    fabricRef.current.renderAll();
    updateLayers();
  };

  // Toggle layer lock
  const toggleLayerLock = (layer) => {
    const isLocked = layer.obj.lockMovementX;
    layer.obj.lockMovementX = !isLocked;
    layer.obj.lockMovementY = !isLocked;
    layer.obj.lockRotation = !isLocked;
    layer.obj.lockScalingX = !isLocked;
    layer.obj.lockScalingY = !isLocked;
    layer.obj.hasControls = isLocked;
    layer.obj.selectable = isLocked;
    fabricRef.current.renderAll();
    updateLayers();
  };

  // Save template
  const saveTemplate = async () => {
    if (!fabricRef.current) return;
    
    if (!templateName || !categoryId) {
      toast.error("Please enter template name and select category");
      return;
    }
    
    setSaving(true);
    
    try {
      // Generate thumbnail
      const thumbnailData = fabricRef.current.toDataURL({
        format: "png",
        quality: 0.8,
        multiplier: 0.5,
      });
      
      // Convert canvas objects to editable zones
      const objects = fabricRef.current.getObjects();
      const editableZones = objects.map((obj, idx) => {
        const customData = obj.customData || {};
        return {
          id: `zone-${idx}`,
          type: obj.type === "textbox" ? "text" : obj.type,
          name: customData.zoneName || `Element ${idx + 1}`,
          x: obj.left,
          y: obj.top,
          width: obj.width * (obj.scaleX || 1),
          height: obj.height * (obj.scaleY || 1),
          default_text: obj.text || "",
          font_family: obj.fontFamily || "Arial",
          font_size: obj.fontSize || 24,
          font_color: obj.fill || "#000000",
          font_weight: obj.fontWeight || "normal",
          font_style: obj.fontStyle || "normal",
          text_align: obj.textAlign || "center",
          can_edit_text: customData.canEditText !== false,
          can_change_font: customData.canChangeFont !== false,
          can_change_size: customData.canChangeSize !== false,
          can_change_color: customData.canChangeColor !== false,
          can_move: customData.canMove === true,
          can_resize: customData.canResize === true,
          can_delete: customData.canDelete === true,
        };
      });
      
      // Also create legacy elements array
      const elements = objects
        .filter(obj => obj.type === "textbox")
        .map((obj, idx) => ({
          type: "text",
          id: `el-${idx}`,
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
      
      const templateData = {
        name: templateName,
        category_id: categoryId,
        category_slug: categorySlug,
        thumbnail: thumbnailData,
        width: canvasWidth,
        height: canvasHeight,
        background_color: backgroundColor,
        editable_zones: editableZones,
        elements: elements,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        is_active: true,
      };
      
      if (templateId && templateId !== "new") {
        await axios.put(`${API}/admin/templates/${templateId}`, templateData);
        toast.success("Template updated!");
      } else {
        await axios.post(`${API}/admin/templates`, templateData);
        toast.success("Template created!");
      }
      
      navigate("/admin");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // Zoom controls
  const handleZoom = (delta) => {
    const newZoom = Math.max(25, Math.min(200, zoom + delta));
    setZoom(newZoom);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900" data-testid="template-designer">
      {/* Top Toolbar */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <Icons.ArrowLeft /> Back
          </button>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1.5 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
            placeholder="Template name"
          />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30" title="Undo">
            <Icons.Undo />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-gray-400 hover:text-white disabled:opacity-30" title="Redo">
            <Icons.Redo />
          </button>
          <div className="w-px h-6 bg-gray-600 mx-2" />
          <button onClick={() => handleZoom(-10)} className="p-2 text-gray-400 hover:text-white" title="Zoom Out">
            <Icons.ZoomOut />
          </button>
          <span className="text-gray-400 text-sm w-12 text-center">{zoom}%</span>
          <button onClick={() => handleZoom(10)} className="p-2 text-gray-400 hover:text-white" title="Zoom In">
            <Icons.ZoomIn />
          </button>
          <button onClick={() => setShowGrid(!showGrid)} className={`p-2 ${showGrid ? "text-purple-400" : "text-gray-400"} hover:text-white`} title="Toggle Grid">
            <Icons.Grid />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={saveTemplate}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Icons.Save /> {saving ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-1">
          {[
            { id: "elements", icon: <Icons.Type />, label: "Text" },
            { id: "shapes", icon: <Icons.Shapes />, label: "Shapes" },
            { id: "images", icon: <Icons.Image />, label: "Images" },
            { id: "stickers", icon: "✨", label: "Stickers" },
            { id: "background", icon: <Icons.Palette />, label: "BG" },
            { id: "layers", icon: <Icons.Layers />, label: "Layers" },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-all text-xs gap-0.5 ${
                activeTab === tool.id ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <span className="text-lg">{tool.icon}</span>
            </button>
          ))}
        </div>

        {/* Left Panel - Tool Options */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4">
            {/* Text Elements */}
            {activeTab === "elements" && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Add Text</h3>
                <button
                  onClick={() => addTextToCanvas("Add a heading", { fontSize: 36, fontWeight: "bold" })}
                  className="w-full text-left px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-white text-lg font-bold">Heading</span>
                </button>
                <button
                  onClick={() => addTextToCanvas("Add a subheading", { fontSize: 24 })}
                  className="w-full text-left px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-white">Subheading</span>
                </button>
                <button
                  onClick={() => addTextToCanvas("Add body text", { fontSize: 16 })}
                  className="w-full text-left px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-gray-300 text-sm">Body text</span>
                </button>
                
                <div className="pt-4 border-t border-gray-700">
                  <h4 className="text-gray-400 text-sm mb-2">Quick Add</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {["Name", "Date", "Time", "Venue", "RSVP", "Address"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => addTextToCanvas(`[${preset}]`, { fontSize: 20 })}
                        className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Shapes */}
            {activeTab === "shapes" && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Shapes</h3>
                <div className="grid grid-cols-3 gap-2">
                  {shapes.map((shape) => (
                    <button
                      key={shape.type}
                      onClick={() => addShape(shape.type)}
                      className="aspect-square bg-gray-700 rounded-lg hover:bg-gray-600 flex items-center justify-center text-2xl"
                    >
                      {shape.type === "rect" && <div className="w-8 h-8 bg-purple-500 rounded-sm" />}
                      {shape.type === "circle" && <div className="w-8 h-8 bg-pink-500 rounded-full" />}
                      {shape.type === "triangle" && <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[28px] border-b-blue-500" />}
                      {shape.type === "line" && <div className="w-8 h-0.5 bg-gray-300" />}
                      {shape.type === "star" && <span>⭐</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            {activeTab === "images" && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Upload Image</h3>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-xl hover:border-purple-500 cursor-pointer transition-colors">
                  <Icons.Upload />
                  <span className="mt-2 text-sm text-gray-400">Click to upload</span>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            )}

            {/* Stickers */}
            {activeTab === "stickers" && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Stickers & Emojis</h3>
                <div className="grid grid-cols-5 gap-2">
                  {stickers.map((sticker, idx) => (
                    <button
                      key={idx}
                      onClick={() => addSticker(sticker)}
                      className="text-2xl p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Background */}
            {activeTab === "background" && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Background</h3>
                
                <div>
                  <label className="text-gray-400 text-sm">Color</label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {colorPresets.map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => setBackgroundColor(color)}
                        className={`w-8 h-8 rounded-lg border-2 ${backgroundColor === color ? "border-purple-500" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Background Image</label>
                  <label className="flex items-center justify-center w-full h-20 mt-2 border-2 border-dashed border-gray-600 rounded-xl hover:border-purple-500 cursor-pointer transition-colors">
                    <span className="text-sm text-gray-400">Upload background</span>
                    <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <label className="text-gray-400 text-sm">Canvas Size</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-xs text-gray-500">Width</span>
                      <input
                        type="number"
                        value={canvasWidth}
                        onChange={(e) => setCanvasWidth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Height</span>
                      <input
                        type="number"
                        value={canvasHeight}
                        onChange={(e) => setCanvasHeight(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Layers */}
            {activeTab === "layers" && (
              <div className="space-y-2">
                <h3 className="text-white font-medium mb-3">Layers</h3>
                {layers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No layers yet</p>
                ) : (
                  [...layers].reverse().map((layer, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        fabricRef.current.setActiveObject(layer.obj);
                        fabricRef.current.renderAll();
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                        selectedObject === layer.obj ? "bg-purple-600/30 border border-purple-500" : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      <span className="text-gray-400 text-xs w-5">{layer.type === "textbox" ? "T" : "▢"}</span>
                      <span className="flex-1 text-white text-sm truncate">{layer.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer); }} className="p-1 text-gray-400 hover:text-white">
                        {layer.visible ? <Icons.Eye /> : <Icons.EyeOff />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer); }} className="p-1 text-gray-400 hover:text-white">
                        {layer.locked ? <Icons.Lock /> : <Icons.Unlock />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-900 overflow-auto p-8" style={{ backgroundImage: showGrid ? "radial-gradient(circle, #374151 1px, transparent 1px)" : "none", backgroundSize: "20px 20px" }}>
          <div
            className="shadow-2xl"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "center center",
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-72 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="p-4">
            {selectedObject ? (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Element Properties</h3>

                {/* Zone Name */}
                <div>
                  <label className="text-gray-400 text-xs">Element Name</label>
                  <input
                    type="text"
                    value={objProps.zoneName}
                    onChange={(e) => updateCustomData("zoneName", e.target.value)}
                    placeholder="e.g., Title, Date, Name"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm mt-1"
                  />
                </div>

                {/* Text-specific properties */}
                {selectedObject.type === "textbox" && (
                  <>
                    <div>
                      <label className="text-gray-400 text-xs">Font</label>
                      <select
                        value={objProps.fontFamily}
                        onChange={(e) => updateObjectProperty("fontFamily", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm mt-1"
                        style={{ fontFamily: objProps.fontFamily }}
                      >
                        {fonts.map((font) => (
                          <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs">Size</label>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateObjectProperty("fontSize", Math.max(8, objProps.fontSize - 2))} className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white">
                          <Icons.Minus />
                        </button>
                        <input
                          type="number"
                          value={objProps.fontSize}
                          onChange={(e) => updateObjectProperty("fontSize", parseInt(e.target.value))}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-center"
                        />
                        <button onClick={() => updateObjectProperty("fontSize", objProps.fontSize + 2)} className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white">
                          <Icons.Plus />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs">Style</label>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => updateObjectProperty("fontWeight", objProps.fontWeight === "bold" ? "normal" : "bold")}
                          className={`p-2 rounded-lg ${objProps.fontWeight === "bold" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400"}`}
                        >
                          <Icons.Bold />
                        </button>
                        <button
                          onClick={() => updateObjectProperty("fontStyle", objProps.fontStyle === "italic" ? "normal" : "italic")}
                          className={`p-2 rounded-lg ${objProps.fontStyle === "italic" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400"}`}
                        >
                          <Icons.Italic />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs">Alignment</label>
                      <div className="flex gap-1 mt-1">
                        {["left", "center", "right"].map((align) => (
                          <button
                            key={align}
                            onClick={() => updateObjectProperty("textAlign", align)}
                            className={`p-2 rounded-lg ${objProps.textAlign === align ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400"}`}
                          >
                            {align === "left" && <Icons.AlignLeft />}
                            {align === "center" && <Icons.AlignCenter />}
                            {align === "right" && <Icons.AlignRight />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Color */}
                <div>
                  <label className="text-gray-400 text-xs">{selectedObject.type === "textbox" ? "Text Color" : "Fill Color"}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={objProps.fill || "#000000"}
                      onChange={(e) => updateObjectProperty("fill", e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={objProps.fill || "#000000"}
                      onChange={(e) => updateObjectProperty("fill", e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <label className="text-gray-400 text-xs">Opacity</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={objProps.opacity}
                    onChange={(e) => updateObjectProperty("opacity", parseInt(e.target.value))}
                    className="w-full mt-1"
                  />
                  <span className="text-gray-500 text-xs">{objProps.opacity}%</span>
                </div>

                {/* Layer controls */}
                <div className="pt-4 border-t border-gray-700">
                  <label className="text-gray-400 text-xs">Layer Order</label>
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    <button onClick={bringToFront} className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white text-xs" title="Bring to Front">⬆️ Top</button>
                    <button onClick={bringForward} className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white text-xs" title="Bring Forward">↑ Up</button>
                    <button onClick={sendBackward} className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white text-xs" title="Send Backward">↓ Down</button>
                    <button onClick={sendToBack} className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white text-xs" title="Send to Back">⬇️ Back</button>
                  </div>
                </div>

                {/* User Permissions */}
                <div className="pt-4 border-t border-gray-700">
                  <h4 className="text-white font-medium text-sm mb-3">User Permissions</h4>
                  <p className="text-gray-500 text-xs mb-3">Control what users can edit</p>
                  
                  <div className="space-y-2">
                    {selectedObject.type === "textbox" && (
                      <>
                        <label className="flex items-center gap-2 text-gray-300 text-sm">
                          <input type="checkbox" checked={objProps.canEditText} onChange={(e) => updateCustomData("canEditText", e.target.checked)} className="rounded" />
                          Edit text content
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 text-sm">
                          <input type="checkbox" checked={objProps.canChangeFont} onChange={(e) => updateCustomData("canChangeFont", e.target.checked)} className="rounded" />
                          Change font
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 text-sm">
                          <input type="checkbox" checked={objProps.canChangeSize} onChange={(e) => updateCustomData("canChangeSize", e.target.checked)} className="rounded" />
                          Change size
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 text-sm">
                          <input type="checkbox" checked={objProps.canChangeColor} onChange={(e) => updateCustomData("canChangeColor", e.target.checked)} className="rounded" />
                          Change color
                        </label>
                      </>
                    )}
                    <label className="flex items-center gap-2 text-gray-300 text-sm">
                      <input type="checkbox" checked={objProps.canMove} onChange={(e) => updateCustomData("canMove", e.target.checked)} className="rounded" />
                      Move element
                    </label>
                    <label className="flex items-center gap-2 text-gray-300 text-sm">
                      <input type="checkbox" checked={objProps.canResize} onChange={(e) => updateCustomData("canResize", e.target.checked)} className="rounded" />
                      Resize element
                    </label>
                    <label className="flex items-center gap-2 text-gray-300 text-sm">
                      <input type="checkbox" checked={objProps.canDelete} onChange={(e) => updateCustomData("canDelete", e.target.checked)} className="rounded" />
                      Delete element
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-700 space-y-2">
                  <button onClick={duplicateSelected} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">
                    <Icons.Copy /> Duplicate
                  </button>
                  <button onClick={deleteSelected} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
                    <Icons.Trash /> Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-white font-medium">Template Settings</h3>
                
                <div>
                  <label className="text-gray-400 text-xs">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      const cat = categories.find(c => c.id === e.target.value);
                      setCategoryId(e.target.value);
                      setCategorySlug(cat?.slug || "");
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm mt-1"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-xs">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="birthday, party, fun"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm mt-1"
                  />
                </div>

                <div className="pt-4 text-center">
                  <div className="text-4xl mb-2">👆</div>
                  <p className="text-gray-500 text-sm">Select an element to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDesigner;
