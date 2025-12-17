import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Canvas as FabricCanvas, Textbox, Image as FabricImage } from "fabric";
import { jsPDF } from "jspdf";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ===================== ICONS =====================
const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Printer: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Type: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>,
  Bold: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>,
  AlignLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>,
  AlignCenter: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></svg>,
  AlignRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Minus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
};

// Font options
const fontOptions = [
  { name: "Arial", value: "Arial" },
  { name: "Georgia", value: "Georgia" },
  { name: "Times New Roman", value: "Times New Roman" },
  { name: "Helvetica", value: "Helvetica" },
  { name: "Verdana", value: "Verdana" },
  { name: "Comic Sans MS", value: "Comic Sans MS" },
  { name: "Impact", value: "Impact" },
  { name: "Arial Black", value: "Arial Black" },
];

// Color presets
const colorPresets = [
  "#000000", "#FFFFFF", "#FF6B6B", "#4ECDC4", "#9B59B6", "#3498DB",
  "#E74C3C", "#2ECC71", "#F39C12", "#1ABC9C", "#E91E63", "#673AB7",
];

const Editor = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const fileInputRef = useRef(null);
  const zoneMapRef = useRef({}); // Maps fabric object IDs to zone data
  
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Text properties
  const [textContent, setTextContent] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("center");

  // Fetch template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await axios.get(`${API}/templates/${templateId}`);
        setTemplate(res.data);
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

  // Initialize canvas with editable zones
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
    zoneMapRef.current = {};

    // Load editable zones or fall back to elements
    const zones = template.editable_zones?.length > 0 
      ? template.editable_zones 
      : template.elements?.map(el => ({
          ...el,
          can_edit_text: true,
          can_change_font: true,
          can_change_size: true,
          can_change_color: true,
          can_move: false,
          can_resize: false,
          can_delete: false,
        }));

    zones?.forEach((zone) => {
      if (zone.type === "text") {
        const text = new Textbox(zone.default_text || zone.text || "Text", {
          left: zone.x,
          top: zone.y,
          width: zone.width || 250,
          fontSize: zone.font_size || zone.fontSize || 24,
          fontFamily: zone.font_family || zone.fontFamily || "Arial",
          fontWeight: zone.font_weight || zone.fontWeight || "normal",
          fontStyle: zone.font_style || zone.fontStyle || "normal",
          fill: zone.font_color || zone.fill || "#000000",
          textAlign: zone.text_align || zone.textAlign || "center",
          originX: "center",
          originY: "center",
          editable: zone.can_edit_text !== false,
          lockMovementX: !zone.can_move,
          lockMovementY: !zone.can_move,
          lockScalingX: !zone.can_resize,
          lockScalingY: !zone.can_resize,
          hasControls: zone.can_resize || zone.can_move,
          hasBorders: true,
        });
        
        canvas.add(text);
        zoneMapRef.current[text.id] = zone;
      } else if (zone.type === "image" && zone.accepts_upload) {
        // Add image placeholder
        const placeholder = new Textbox("📷 Click to add image", {
          left: zone.x,
          top: zone.y,
          width: zone.width || 100,
          fontSize: 14,
          fill: "#999999",
          textAlign: "center",
          originX: "center",
          originY: "center",
          editable: false,
          lockMovementX: !zone.can_move,
          lockMovementY: !zone.can_move,
          hasControls: false,
          backgroundColor: "#f0f0f0",
        });
        
        canvas.add(placeholder);
        zoneMapRef.current[placeholder.id] = { ...zone, isImagePlaceholder: true };
      }
    });

    // Selection events
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
      setSelectedZone(null);
    });

    canvas.renderAll();

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [template]);

  const handleSelection = (e) => {
    const obj = e.selected[0];
    setSelectedObject(obj);
    
    const zone = zoneMapRef.current[obj.id];
    setSelectedZone(zone);
    
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

  // Handle image upload for image zones
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricRef.current || !selectedObject || !selectedZone) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgElement = document.createElement("img");
      imgElement.src = event.target.result;
      imgElement.onload = () => {
        // Remove placeholder
        fabricRef.current.remove(selectedObject);
        
        // Add actual image
        const img = new FabricImage(imgElement, {
          left: selectedZone.x,
          top: selectedZone.y,
          originX: "center",
          originY: "center",
          scaleX: Math.min(selectedZone.width / imgElement.width, 1),
          scaleY: Math.min(selectedZone.height / imgElement.height, 1),
          lockMovementX: !selectedZone.can_move,
          lockMovementY: !selectedZone.can_move,
          lockScalingX: !selectedZone.can_resize,
          lockScalingY: !selectedZone.can_resize,
          hasControls: selectedZone.can_resize || selectedZone.can_move,
        });
        
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        zoneMapRef.current[img.id] = selectedZone;
        fabricRef.current.renderAll();
        toast.success("Image added!");
      };
    };
    reader.readAsDataURL(file);
  };

  // Update text property with permission check
  const updateTextProperty = (property, value) => {
    if (!selectedObject || selectedObject.type !== "textbox") return;
    
    // Check permissions
    if (selectedZone) {
      if (property === "fontFamily" && !selectedZone.can_change_font) {
        toast.error("Font change not allowed for this element");
        return;
      }
      if (property === "fontSize" && !selectedZone.can_change_size) {
        toast.error("Size change not allowed for this element");
        return;
      }
      if (property === "fill" && !selectedZone.can_change_color) {
        toast.error("Color change not allowed for this element");
        return;
      }
    }
    
    selectedObject.set(property, value);
    fabricRef.current.renderAll();
  };

  // Delete selected (with permission check)
  const deleteSelected = () => {
    if (!selectedObject || !fabricRef.current) return;
    
    if (selectedZone && !selectedZone.can_delete) {
      toast.error("This element cannot be deleted");
      return;
    }
    
    fabricRef.current.remove(selectedObject);
    fabricRef.current.renderAll();
    setSelectedObject(null);
    setSelectedZone(null);
  };

  // Export as PNG
  const exportPNG = () => {
    if (!fabricRef.current) return;
    setExporting(true);
    
    const dataURL = fabricRef.current.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });
    
    const link = document.createElement("a");
    link.download = `${template?.name || "design"}.png`;
    link.href = dataURL;
    link.click();
    
    setExporting(false);
    setShowExportModal(false);
    toast.success("Downloaded as PNG!");
  };

  // Export as JPEG
  const exportJPEG = () => {
    if (!fabricRef.current) return;
    setExporting(true);
    
    const dataURL = fabricRef.current.toDataURL({
      format: "jpeg",
      quality: 0.9,
      multiplier: 2,
    });
    
    const link = document.createElement("a");
    link.download = `${template?.name || "design"}.jpg`;
    link.href = dataURL;
    link.click();
    
    setExporting(false);
    setShowExportModal(false);
    toast.success("Downloaded as JPEG!");
  };

  // Export as PDF
  const exportPDF = () => {
    if (!fabricRef.current || !template) return;
    setExporting(true);
    
    try {
      const dataURL = fabricRef.current.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 2,
      });
      
      // Calculate PDF dimensions (5x7 inches default)
      const pdfWidth = 5;
      const pdfHeight = 7;
      
      const pdf = new jsPDF({
        orientation: template.height > template.width ? "portrait" : "landscape",
        unit: "in",
        format: [pdfWidth, pdfHeight],
      });
      
      pdf.addImage(dataURL, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${template?.name || "design"}.pdf`);
      
      setExporting(false);
      setShowExportModal(false);
      toast.success("Downloaded as PDF!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
      setExporting(false);
    }
  };

  // Send for print (simulated)
  const sendForPrint = (printDetails) => {
    setShowPrintModal(false);
    toast.success(`Print order submitted! We'll contact you at ${printDetails.email}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  // Check what's allowed for current selection
  const canEditText = !selectedZone || selectedZone.can_edit_text !== false;
  const canChangeFont = !selectedZone || selectedZone.can_change_font !== false;
  const canChangeSize = !selectedZone || selectedZone.can_change_size !== false;
  const canChangeColor = !selectedZone || selectedZone.can_change_color !== false;
  const canDelete = selectedZone?.can_delete === true;
  const isImageZone = selectedZone?.isImagePlaceholder || selectedZone?.type === "image";

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
            <Icons.ArrowLeft /> Back
          </button>
          <div className="flex items-center gap-2">
            <Icons.Sparkles />
            <span className="font-semibold text-gray-900">{template?.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
            data-testid="export-btn"
          >
            <Icons.Download /> Export
          </button>
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-all"
            data-testid="print-btn"
          >
            <Icons.Printer /> Order Print
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Element List */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
          <h3 className="font-semibold text-gray-900 mb-4">Editable Elements</h3>
          <div className="space-y-2">
            {(template?.editable_zones || template?.elements || []).map((zone, idx) => (
              <div
                key={zone.id || idx}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedZone?.id === zone.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => {
                  const objects = fabricRef.current?.getObjects();
                  const obj = objects?.find(o => zoneMapRef.current[o.id]?.id === zone.id);
                  if (obj) {
                    fabricRef.current.setActiveObject(obj);
                    fabricRef.current.renderAll();
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {zone.type === "text" ? <Icons.Type /> : <Icons.Image />}
                  <span className="text-sm font-medium text-gray-700">{zone.name || zone.default_text?.substring(0, 20) || `Element ${idx + 1}`}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {zone.type === "text" && (
                    <>
                      {zone.can_edit_text !== false && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Edit</span>}
                      {zone.can_change_font !== false && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Font</span>}
                      {zone.can_change_color !== false && <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">Color</span>}
                    </>
                  )}
                  {zone.type === "image" && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Upload</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tips</h4>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Click elements to edit</li>
              <li>• Green badges = allowed edits</li>
              <li>• Some elements may be locked</li>
            </ul>
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
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            {selectedObject ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {isImageZone ? "Image Zone" : "Text Properties"}
                  </h3>
                  <button
                    onClick={() => fabricRef.current?.discardActiveObject().renderAll()}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icons.X />
                  </button>
                </div>

                {/* Image Zone - Upload */}
                {isImageZone && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Upload an image for this area</p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all">
                      <Icons.Upload />
                      <span className="mt-2 text-sm text-gray-500">Click to upload</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        data-testid="image-upload-input"
                      />
                    </label>
                  </div>
                )}

                {/* Text Properties */}
                {!isImageZone && selectedObject.type === "textbox" && (
                  <>
                    {/* Text Content */}
                    {canEditText && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Text Content</label>
                        <textarea
                          value={textContent}
                          onChange={(e) => {
                            setTextContent(e.target.value);
                            selectedObject.set("text", e.target.value);
                            fabricRef.current.renderAll();
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                          rows={3}
                          data-testid="text-content-input"
                        />
                      </div>
                    )}

                    {/* Font Family */}
                    <div className={!canChangeFont ? "opacity-50 pointer-events-none" : ""}>
                      <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                        Font {!canChangeFont && <Icons.Lock />}
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => {
                          setFontFamily(e.target.value);
                          updateTextProperty("fontFamily", e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        style={{ fontFamily: fontFamily }}
                        data-testid="font-select"
                        disabled={!canChangeFont}
                      >
                        {fontOptions.map((font) => (
                          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Font Size */}
                    <div className={!canChangeSize ? "opacity-50 pointer-events-none" : ""}>
                      <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                        Size {!canChangeSize && <Icons.Lock />}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newSize = Math.max(8, fontSize - 2);
                            setFontSize(newSize);
                            updateTextProperty("fontSize", newSize);
                          }}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          disabled={!canChangeSize}
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
                          disabled={!canChangeSize}
                        />
                        <button
                          onClick={() => {
                            const newSize = Math.min(200, fontSize + 2);
                            setFontSize(newSize);
                            updateTextProperty("fontSize", newSize);
                          }}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          disabled={!canChangeSize}
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
                    <div className={!canChangeColor ? "opacity-50 pointer-events-none" : ""}>
                      <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                        Color {!canChangeColor && <Icons.Lock />}
                      </label>
                      <div className="grid grid-cols-6 gap-2 mb-2">
                        {colorPresets.map((color, idx) => (
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
                            disabled={!canChangeColor}
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
                          disabled={!canChangeColor}
                        />
                        <input
                          type="text"
                          value={textColor}
                          onChange={(e) => {
                            setTextColor(e.target.value);
                            updateTextProperty("fill", e.target.value);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          disabled={!canChangeColor}
                        />
                      </div>
                    </div>

                    {/* Delete Button */}
                    {canDelete && (
                      <button
                        onClick={deleteSelected}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        data-testid="delete-btn"
                      >
                        <Icons.Trash /> Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">👆</div>
                <p className="text-gray-500 text-sm">Select an element to customize</p>
                <p className="text-gray-400 text-xs mt-1">Click any text or image zone on the canvas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="export-modal">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Export Your Design</h2>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                <Icons.X />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={exportPNG}
                disabled={exporting}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
                data-testid="export-png-btn"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icons.Image />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">PNG Image</h3>
                  <p className="text-sm text-gray-500">High quality image with transparency</p>
                </div>
              </button>

              <button
                onClick={exportJPEG}
                disabled={exporting}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
                data-testid="export-jpeg-btn"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icons.Image />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">JPEG Image</h3>
                  <p className="text-sm text-gray-500">Compressed image, smaller file size</p>
                </div>
              </button>

              <button
                onClick={exportPDF}
                disabled={exporting}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
                data-testid="export-pdf-btn"
              >
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Icons.FileText />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">PDF Document</h3>
                  <p className="text-sm text-gray-500">Print-ready format (5" x 7")</p>
                </div>
              </button>
            </div>

            {exporting && (
              <div className="mt-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent mx-auto mb-2"></div>
                Exporting...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Order Modal */}
      {showPrintModal && (
        <PrintOrderModal
          template={template}
          onClose={() => setShowPrintModal(false)}
          onSubmit={sendForPrint}
        />
      )}
    </div>
  );
};

// Print Order Modal Component
const PrintOrderModal = ({ template, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    quantity: 25,
    paperType: "matte",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Please fill in required fields");
      return;
    }
    onSubmit(form);
  };

  const pricePerUnit = form.paperType === "glossy" ? 0.50 : 0.40;
  const totalPrice = (form.quantity * pricePerUnit).toFixed(2);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="print-modal">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Order Prints</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-900">{template?.name}</h3>
          <p className="text-sm text-purple-700">5" x 7" Invitation Cards</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <select
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {[25, 50, 75, 100, 150, 200, 250, 500].map((qty) => (
                  <option key={qty} value={qty}>{qty} cards</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paper Type</label>
              <select
                value={form.paperType}
                onChange={(e) => setForm({ ...form, paperType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="matte">Matte ($0.40/ea)</option>
                <option value="glossy">Glossy ($0.50/ea)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Any special requests..."
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{form.quantity} x {form.paperType} cards</span>
              <span className="text-gray-900">${pricePerUnit.toFixed(2)} each</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
              <span>Total</span>
              <span className="text-purple-600">${totalPrice}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
              data-testid="submit-print-order-btn"
            >
              Submit Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Editor;
