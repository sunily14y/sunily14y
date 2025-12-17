import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icons
const Icons = {
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Folder: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>,
  FileImage: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m20 17-1.09-1.09a2 2 0 0 0-2.82 0L10 22"/></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Type: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Unlock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
};

// Admin Login Component
const AdminLogin = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/admin/login`, { password });
      if (res.data.success) {
        localStorage.setItem("adminPassword", password);
        onLogin(password);
        toast.success("Login successful!");
      }
    } catch (error) {
      toast.error("Invalid password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" data-testid="admin-login">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Icons.Settings />
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-gray-500">Enter password to continue</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            data-testid="admin-password-input"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            data-testid="admin-login-btn"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">Default: admin123</p>
      </div>
    </div>
  );
};

// Category Modal
const CategoryModal = ({ category, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    icon: category?.icon || "🎉",
    description: category?.description || "",
    is_active: category?.is_active !== false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    onSave(form);
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="category-modal">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {category ? "Edit Category" : "Add Category"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Birthday"
              data-testid="category-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="birthday"
              data-testid="category-slug-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="🎂"
              data-testid="category-icon-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={2}
              placeholder="Celebrate birthdays with style"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              data-testid="save-category-btn"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Template Editor Modal
const TemplateEditorModal = ({ template, categories, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: template?.name || "",
    category_id: template?.category_id || "",
    category_slug: template?.category_slug || "",
    thumbnail: template?.thumbnail || "",
    width: template?.width || 500,
    height: template?.height || 700,
    background_color: template?.background_color || "#ffffff",
    tags: template?.tags?.join(", ") || "",
    is_premium: template?.is_premium || false,
    is_active: template?.is_active !== false,
    editable_zones: template?.editable_zones || [],
    locked_elements: template?.locked_elements || [],
  });
  const [activeTab, setActiveTab] = useState("basic");
  const [editingZone, setEditingZone] = useState(null);
  const fileInputRef = useRef(null);

  const handleCategoryChange = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    setForm({ ...form, category_id: categoryId, category_slug: cat?.slug || "" });
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/admin/upload`, formData);
      setForm({ ...form, thumbnail: res.data.url });
      toast.success("Thumbnail uploaded!");
    } catch (error) {
      toast.error("Failed to upload thumbnail");
    }
  };

  const addEditableZone = (type) => {
    const newZone = {
      id: `zone-${Date.now()}`,
      type,
      name: type === "text" ? "New Text Zone" : "New Image Zone",
      x: 250,
      y: 350,
      width: type === "text" ? 300 : 100,
      height: type === "text" ? 50 : 100,
      // Text defaults
      default_text: type === "text" ? "Enter text here" : "",
      placeholder: type === "text" ? "Click to edit" : "",
      font_family: "Arial",
      font_size: 24,
      font_color: "#000000",
      font_weight: "normal",
      text_align: "center",
      // Permissions
      can_edit_text: true,
      can_change_font: true,
      can_change_size: true,
      can_change_color: true,
      can_move: false,
      can_resize: false,
      can_delete: false,
      // Image
      accepts_upload: type === "image",
    };
    setForm({ ...form, editable_zones: [...form.editable_zones, newZone] });
    setEditingZone(newZone);
  };

  const updateZone = (zoneId, updates) => {
    setForm({
      ...form,
      editable_zones: form.editable_zones.map(z => 
        z.id === zoneId ? { ...z, ...updates } : z
      ),
    });
    if (editingZone?.id === zoneId) {
      setEditingZone({ ...editingZone, ...updates });
    }
  };

  const deleteZone = (zoneId) => {
    setForm({
      ...form,
      editable_zones: form.editable_zones.filter(z => z.id !== zoneId),
    });
    if (editingZone?.id === zoneId) {
      setEditingZone(null);
    }
  };

  const handleSubmit = () => {
    if (!form.name || !form.category_id) {
      toast.error("Name and category are required");
      return;
    }
    
    // Convert editable_zones to elements for backward compatibility
    const elements = form.editable_zones
      .filter(z => z.type === "text")
      .map(z => ({
        type: "text",
        id: z.id,
        x: z.x,
        y: z.y,
        text: z.default_text,
        fontSize: z.font_size,
        fontFamily: z.font_family,
        fontWeight: z.font_weight,
        fontStyle: z.font_style || "normal",
        fill: z.font_color,
        textAlign: z.text_align,
      }));
    
    const saveData = {
      ...form,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      elements,
    };
    
    onSave(saveData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="template-modal">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? "Edit Template" : "Create Template"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {["basic", "zones", "permissions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "zones" ? "Editable Zones" : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Tab */}
          {activeTab === "basic" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Birthday Party Invitation"
                    data-testid="template-name-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    data-testid="template-category-select"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width (px)</label>
                    <input
                      type="number"
                      value={form.width}
                      onChange={(e) => setForm({ ...form, width: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (px)</label>
                    <input
                      type="number"
                      value={form.height}
                      onChange={(e) => setForm({ ...form, height: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.background_color}
                      onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.background_color}
                      onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="birthday, party, fun"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_premium}
                      onChange={(e) => setForm({ ...form, is_premium: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Premium</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-purple-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.thumbnail ? (
                    <img src={form.thumbnail} alt="Thumbnail" className="max-h-60 mx-auto rounded-lg" />
                  ) : (
                    <div className="py-8">
                      <Icons.Upload />
                      <p className="mt-2 text-sm text-gray-500">Click to upload thumbnail</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                </div>
                <input
                  type="text"
                  value={form.thumbnail}
                  onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                  placeholder="Or paste image URL"
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* Editable Zones Tab */}
          {activeTab === "zones" && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Canvas Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Template Preview</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addEditableZone("text")}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                      data-testid="add-text-zone-btn"
                    >
                      <Icons.Type /> Add Text Zone
                    </button>
                    <button
                      onClick={() => addEditableZone("image")}
                      className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                      data-testid="add-image-zone-btn"
                    >
                      <Icons.Image /> Add Image Zone
                    </button>
                  </div>
                </div>
                <div 
                  className="relative border border-gray-300 rounded-lg overflow-hidden"
                  style={{ 
                    backgroundColor: form.background_color,
                    width: "100%",
                    paddingBottom: `${(form.height / form.width) * 100}%`,
                  }}
                >
                  {form.editable_zones.map((zone) => (
                    <div
                      key={zone.id}
                      onClick={() => setEditingZone(zone)}
                      className={`absolute border-2 rounded cursor-pointer transition-all ${
                        editingZone?.id === zone.id
                          ? "border-purple-500 bg-purple-100/50"
                          : zone.type === "text"
                          ? "border-blue-400 bg-blue-100/30"
                          : "border-green-400 bg-green-100/30"
                      }`}
                      style={{
                        left: `${(zone.x / form.width) * 100}%`,
                        top: `${(zone.y / form.height) * 100}%`,
                        width: `${(zone.width / form.width) * 100}%`,
                        height: `${(zone.height / form.height) * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-xs p-1">
                        <span className={`px-1 py-0.5 rounded ${zone.type === "text" ? "bg-blue-500" : "bg-green-500"} text-white truncate`}>
                          {zone.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone Editor */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  {editingZone ? `Edit Zone: ${editingZone.name}` : "Select a zone to edit"}
                </h3>
                {editingZone ? (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
                      <input
                        type="text"
                        value={editingZone.name}
                        onChange={(e) => updateZone(editingZone.id, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">X Position</label>
                        <input
                          type="number"
                          value={editingZone.x}
                          onChange={(e) => updateZone(editingZone.id, { x: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Y Position</label>
                        <input
                          type="number"
                          value={editingZone.y}
                          onChange={(e) => updateZone(editingZone.id, { y: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                        <input
                          type="number"
                          value={editingZone.width}
                          onChange={(e) => updateZone(editingZone.id, { width: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                        <input
                          type="number"
                          value={editingZone.height}
                          onChange={(e) => updateZone(editingZone.id, { height: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>

                    {editingZone.type === "text" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Default Text</label>
                          <textarea
                            value={editingZone.default_text}
                            onChange={(e) => updateZone(editingZone.id, { default_text: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
                            <select
                              value={editingZone.font_family}
                              onChange={(e) => updateZone(editingZone.id, { font_family: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              {["Arial", "Georgia", "Times New Roman", "Verdana", "Comic Sans MS", "Impact"].map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                            <input
                              type="number"
                              value={editingZone.font_size}
                              onChange={(e) => updateZone(editingZone.id, { font_size: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={editingZone.font_color}
                              onChange={(e) => updateZone(editingZone.id, { font_color: e.target.value })}
                              className="w-12 h-10 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={editingZone.font_color}
                              onChange={(e) => updateZone(editingZone.id, { font_color: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => deleteZone(editingZone.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      <Icons.Trash /> Delete Zone
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Click on a zone in the preview to edit it</p>
                  </div>
                )}

                {/* Zones List */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">All Zones ({form.editable_zones.length})</h4>
                  <div className="space-y-2">
                    {form.editable_zones.map((zone) => (
                      <div
                        key={zone.id}
                        onClick={() => setEditingZone(zone)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          editingZone?.id === zone.id ? "bg-purple-100" : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {zone.type === "text" ? <Icons.Type /> : <Icons.Image />}
                          <span className="text-sm">{zone.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${zone.type === "text" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {zone.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === "permissions" && editingZone && (
            <div className="max-w-xl">
              <h3 className="font-medium text-gray-900 mb-4">Zone Permissions: {editingZone.name}</h3>
              <div className="space-y-3">
                {editingZone.type === "text" && (
                  <>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={editingZone.can_edit_text}
                        onChange={(e) => updateZone(editingZone.id, { can_edit_text: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Allow Text Editing</span>
                        <p className="text-sm text-gray-500">Users can change the text content</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={editingZone.can_change_font}
                        onChange={(e) => updateZone(editingZone.id, { can_change_font: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Allow Font Change</span>
                        <p className="text-sm text-gray-500">Users can select different fonts</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={editingZone.can_change_size}
                        onChange={(e) => updateZone(editingZone.id, { can_change_size: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Allow Size Change</span>
                        <p className="text-sm text-gray-500">Users can adjust font size</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={editingZone.can_change_color}
                        onChange={(e) => updateZone(editingZone.id, { can_change_color: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Allow Color Change</span>
                        <p className="text-sm text-gray-500">Users can change text color</p>
                      </div>
                    </label>
                  </>
                )}
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={editingZone.can_move}
                    onChange={(e) => updateZone(editingZone.id, { can_move: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Allow Moving</span>
                    <p className="text-sm text-gray-500">Users can drag this element to a new position</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={editingZone.can_resize}
                    onChange={(e) => updateZone(editingZone.id, { can_resize: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Allow Resizing</span>
                    <p className="text-sm text-gray-500">Users can resize this element</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={editingZone.can_delete}
                    onChange={(e) => updateZone(editingZone.id, { can_delete: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Allow Deletion</span>
                    <p className="text-sm text-gray-500">Users can remove this element</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === "permissions" && !editingZone && (
            <div className="text-center py-12">
              <p className="text-gray-500">Select a zone in the "Editable Zones" tab to configure its permissions</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            data-testid="save-template-btn"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Admin Panel
const AdminPanel = () => {
  const navigate = useNavigate();
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem("adminPassword") || "");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSection, setActiveSection] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");

  // Verify login on mount
  useEffect(() => {
    const verifyLogin = async () => {
      if (adminPassword) {
        try {
          const res = await axios.get(`${API}/admin/verify?password=${adminPassword}`);
          setIsLoggedIn(res.data.valid);
        } catch {
          setIsLoggedIn(false);
        }
      }
      setLoading(false);
    };
    verifyLogin();
  }, [adminPassword]);

  // Fetch data
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      const [catRes, tmplRes] = await Promise.all([
        axios.get(`${API}/admin/categories`),
        axios.get(`${API}/admin/templates`),
      ]);
      setCategories(catRes.data);
      setTemplates(tmplRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  const handleLogin = (password) => {
    setAdminPassword(password);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminPassword");
    setAdminPassword("");
    setIsLoggedIn(false);
  };

  // Category handlers
  const handleSaveCategory = async (data) => {
    try {
      if (editingCategory) {
        await axios.put(`${API}/admin/categories/${editingCategory.id}`, data);
        toast.success("Category updated!");
      } else {
        await axios.post(`${API}/admin/categories`, data);
        toast.success("Category created!");
      }
      fetchData();
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save category");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await axios.delete(`${API}/admin/categories/${id}`);
      toast.success("Category deleted!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete category");
    }
  };

  // Template handlers
  const handleSaveTemplate = async (data) => {
    try {
      if (editingTemplate) {
        await axios.put(`${API}/admin/templates/${editingTemplate.id}`, data);
        toast.success("Template updated!");
      } else {
        await axios.post(`${API}/admin/templates`, data);
        toast.success("Template created!");
      }
      fetchData();
      setShowTemplateModal(false);
      setEditingTemplate(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save template");
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await axios.delete(`${API}/admin/templates/${id}`);
      toast.success("Template deleted!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete template");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const filteredTemplates = selectedCategoryFilter
    ? templates.filter(t => t.category_id === selectedCategoryFilter)
    : templates;

  return (
    <div className="min-h-screen bg-gray-100" data-testid="admin-panel">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Icons.Settings />
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-purple-600">
              <Icons.Eye /> View Site
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-65px)]">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveSection("categories")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === "categories"
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              data-testid="nav-categories"
            >
              <Icons.Folder /> Categories
            </button>
            <button
              onClick={() => setActiveSection("templates")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === "templates"
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              data-testid="nav-templates"
            >
              <Icons.FileImage /> Templates
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Categories Section */}
          {activeSection === "categories" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setShowCategoryModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  data-testid="add-category-btn"
                >
                  <Icons.Plus /> Add Category
                </button>
              </div>

              <div className="grid gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-xl p-4 flex items-center justify-between"
                    data-testid={`category-row-${cat.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{cat.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                        <p className="text-sm text-gray-500">{cat.slug} • {cat.template_count || 0} templates</p>
                      </div>
                      {!cat.is_active && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setShowCategoryModal(true);
                        }}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                        data-testid={`edit-category-${cat.id}`}
                      >
                        <Icons.Edit />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        data-testid={`delete-category-${cat.id}`}
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Templates Section */}
          {activeSection === "templates" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowTemplateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    data-testid="add-template-btn"
                  >
                    <Icons.Plus /> Add Template
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    data-testid={`template-card-${tmpl.id}`}
                  >
                    <div className="aspect-[5/7] bg-gray-100 relative">
                      {tmpl.thumbnail ? (
                        <img src={tmpl.thumbnail} alt={tmpl.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: tmpl.background_color }}>
                          <span className="text-4xl">🖼️</span>
                        </div>
                      )}
                      {!tmpl.is_active && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded">
                          Inactive
                        </div>
                      )}
                      {tmpl.is_premium && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-xs rounded">
                          Premium
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate">{tmpl.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{tmpl.category_slug?.replace('-', ' ')}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {tmpl.editable_zones?.length || 0} editable zones
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => {
                            setEditingTemplate(tmpl);
                            setShowTemplateModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                          data-testid={`edit-template-${tmpl.id}`}
                        >
                          <Icons.Edit /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          data-testid={`delete-template-${tmpl.id}`}
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl">
                  <p className="text-gray-500">No templates found. Create your first template!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
        />
      )}

      {showTemplateModal && (
        <TemplateEditorModal
          template={editingTemplate}
          categories={categories}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
};

export default AdminPanel;
