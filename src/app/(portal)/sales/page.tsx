"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Search,
  Download,
  Video,
  FileText,
  Folder,
  ArrowLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock,
  Sparkles,
  ExternalLink,
  BookOpen,
  Image as ImageIcon,
  Share2,
  List,
  Save,
  Plus,
  Trash2,
  Loader2,
  Edit,
  X
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";
import * as XLSX from "xlsx";
import { useSearchParams } from "next/navigation";
import AdminFileManager from "@/components/AdminFileManager";


export default function SalesPage() {
  const { user, setActiveExcelFile, setActiveDocxFile } = useStore();
  const [activeTab, setActiveTab] = useState<"training" | "pricing" | "ads" | "quotations">("training");
  const [data, setData] = useState<any>(null);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [selectedProductCat, setSelectedProductCat] = useState<string>("All");
  const [selectedAdChannel, setSelectedAdChannel] = useState<string>("All");
  const [selectedAdAsset, setSelectedAdAsset] = useState<string>("All");

  // Modal states
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  // Local file viewers are now managed globally in layout.tsx

  // Pricing Table Editable States
  const [editMode, setEditMode] = useState(false);
  const [editableProducts, setEditableProducts] = useState<any[]>([]);
  const [pricingHeaders, setPricingHeaders] = useState<string[]>([
    "category",
    "brand",
    "name",
    "spec",
    "stock",
    "rate",
    "warranty",
  ]);
  const [savingPricing, setSavingPricing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function refreshData() {
    try {
      const res = await fetch("/api/sales/data");
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
      }
    } catch (err) {
      console.error("Failed to load sales data:", err);
    }
  }

  useEffect(() => {
    setLoading(true);
    refreshData().finally(() => setLoading(false));

    const handleSave = () => {
      refreshData();
    };
    window.addEventListener("file-saved", handleSave);
    return () => window.removeEventListener("file-saved", handleSave);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "pricing") setActiveTab("pricing");
    else if (tab === "ads") setActiveTab("ads");
    else if (tab === "quotations") setActiveTab("quotations");
  }, [searchParams]);

  useEffect(() => {
    if (data?.products) {
      setEditableProducts(data.products);
      
      const defaultCols = ["category", "brand", "name", "spec", "purchasePrice", "wholesalePrice", "rate", "warranty"];
      const discovered = new Set<string>(defaultCols);
      data.products.forEach((p: any) => {
        Object.keys(p).forEach((k) => {
          if (!["id", "createdAt", "updatedAt", "stock", "description", "imageUrl"].includes(k)) {
            discovered.add(k);
          }
        });
      });
      setPricingHeaders(Array.from(discovered));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-full bg-zinc-900 rounded-lg"></div>
        <div className="h-60 bg-zinc-900 rounded-xl"></div>
      </div>
    );
  }

  // --- 1. TRAINING MODULE FUNCTIONS ---
  // Get all items in current folder
  const getTrainingItems = () => {
    if (!data?.trainingFiles) return [];
    
    // If folder is null, we show items at root (parentId === null)
    // BUT we also had `Lectures Links & Videos` as a folder at parentId = null
    const items = data.trainingFiles.filter((f: any) => f.parentId === currentFolderId);
    
    if (searchQuery) {
      return data.trainingFiles.filter(
        (f: any) => !f.isFolder && f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  };

  // Breadcrumbs for training folder navigation
  const getTrainingBreadcrumbs = () => {
    const crumbs = [];
    let currentId = currentFolderId;
    while (currentId !== null) {
      const folder = data?.trainingFiles?.find((f: any) => f.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  };

  // Handle click on file
  const handleTrainingFileClick = (file: any) => {
    if (file.isFolder) {
      setCurrentFolderId(file.id);
      setSearchQuery(""); // Clear search when browsing folders
    } else if (file.fileExtension === "link" && file.fileUrl) {
      // Parse Youtube URL to embed
      const ytUrl = file.fileUrl;
      let embedId = "";
      if (ytUrl.includes("youtu.be/")) {
        embedId = ytUrl.split("youtu.be/")[1]?.split("?")[0];
      } else if (ytUrl.includes("youtube.com/watch?v=")) {
        embedId = ytUrl.split("v=")[1]?.split("&")[0];
      }
      if (embedId) {
        setVideoModalUrl(`https://www.youtube.com/embed/${embedId}`);
      } else {
        window.open(ytUrl, "_blank");
      }
    } else if (file.fileUrl) {
      const ext = file.fileExtension?.toLowerCase() || "";
      if (["xlsx", "xls", "csv"].includes(ext)) {
        setActiveExcelFile(file);
      } else if (ext === "docx") {
        setActiveDocxFile(file);
      } else {
        window.open(getSafeFileUrl(file.fileUrl), "_blank");
      }
    }
  };

  const handleQuotationFileClick = (file: any) => {
    if (file.isFolder) {
      setCurrentFolderId(file.id);
      setSearchQuery("");
    } else if (file.fileUrl) {
      const ext = file.fileExtension?.toLowerCase() || "";
      if (["xlsx", "xls", "csv"].includes(ext)) {
        setActiveExcelFile(file);
      } else if (ext === "docx") {
        setActiveDocxFile(file);
      } else {
        window.open(getSafeFileUrl(file.fileUrl), "_blank");
      }
    }
  };

  const getQuotationItems = () => {
    if (!data?.quotationFiles) return [];
    const items = data.quotationFiles.filter((f: any) => f.parentId === currentFolderId);
    if (searchQuery) {
      return data.quotationFiles.filter(
        (f: any) => !f.isFolder && f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  };

  const getQuotationBreadcrumbs = () => {
    const crumbs = [];
    let currentId = currentFolderId;
    while (currentId !== null) {
      const folder = data?.quotationFiles?.find((f: any) => f.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  };

  // --- 2. PRICING MODULE FUNCTIONS ---
  const categories = ["All", "Solar Panels", "Inverters", "Batteries", "Stand & Structure", "Cables", "Accessories"];
  
  const getFilteredProducts = () => {
    const source = editMode ? editableProducts : (data?.products || []);
    let list = source;
    if (selectedProductCat !== "All") {
      list = list.filter((p: any) => p.category === selectedProductCat);
    }
    if (searchQuery) {
      list = list.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  };

  const userRolesList = (user?.role || "")
    .split(",")
    .map((r: string) => r.trim().toLowerCase())
    .filter(Boolean);
  const isPricingPrivileged = userRolesList.some((r: string) =>
    ["admin", "super admin", "superadmin", "management", "hr", "sales & marketing department", "sales", "accountant", "accounts"].includes(r)
  );

  const updateField = (idx: number, field: string, val: any) => {
    setEditableProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p))
    );
  };

  const handleAddRow = () => {
    const newRow: any = {
      category: "Solar Panels",
      brand: "",
      name: "",
      spec: "",
      purchasePrice: 0,
      wholesalePrice: 0,
      rate: 0,
      warranty: "",
    };
    pricingHeaders.forEach((col) => {
      if (!(col in newRow)) {
        newRow[col] = "";
      }
    });
    setEditableProducts((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    setEditableProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddColumn = () => {
    const colName = prompt("Enter new column name (letters/spaces only):");
    if (!colName) return;
    const cleanName = colName.trim().replace(/[^a-zA-Z0-9_\s]/g, "");
    if (!cleanName) {
      alert("Invalid column name.");
      return;
    }
    if (pricingHeaders.includes(cleanName)) {
      alert("Column already exists.");
      return;
    }
    setPricingHeaders((prev) => [...prev, cleanName]);
    setEditableProducts((prev) =>
      prev.map((p) => ({ ...p, [cleanName]: "" }))
    );
  };

  const handleDeleteColumn = (col: string) => {
    const defaultCols = ["category", "brand", "name", "spec", "purchasePrice", "wholesalePrice", "rate", "warranty"];
    if (defaultCols.includes(col)) {
      alert(`Cannot delete standard column: ${col}`);
      return;
    }
    if (!confirm(`Are you sure you want to delete column "${col}"? This will delete its data.`)) {
      return;
    }
    setPricingHeaders((prev) => prev.filter((h) => h !== col));
    setEditableProducts((prev) => {
      return prev.map((p) => {
        const copy = { ...p };
        delete copy[col];
        return copy;
      });
    });
  };

  const handleSavePricing = async () => {
    try {
      setSavingPricing(true);
      setSaveError(null);
      setSaveSuccess(false);

      const res = await fetch("/api/sales/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: editableProducts,
          headers: pricingHeaders,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save products.");
      }

      setSaveSuccess(true);
      setEditMode(false);
      // Refresh
      const refreshRes = await fetch("/api/sales/data");
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        setData(refreshed);
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "Failed to save pricing table changes.");
    } finally {
      setSavingPricing(false);
    }
  };

  const handleDiscardPricing = () => {
    if (confirm("Discard all unsaved edits?")) {
      setEditableProducts(data?.products || []);
      setEditMode(false);
      setSaveError(null);
    }
  };

  const handleClientSideExport = () => {
    const excelRows = getFilteredProducts().map((prod: any) => {
      const cleanRow: any = {};
      pricingHeaders.forEach((col) => {
        cleanRow[col] = prod[col] !== undefined ? prod[col] : "";
      });
      return cleanRow;
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Price List");
    XLSX.writeFile(wb, "Askari_Solar_Energy_Prices.xlsx");
  };

  // --- 3. ADVERTISING MODULE FUNCTIONS ---
  // Channel mapping
  const adChannels = ["All", "Inverex", "Crown Micro", "Knox", "Solar Panels", "Ongrid Inverters", "Other"];
  // Asset category mapping
  const adAssets = ["All", "Facebook", "Instagram", "Google", "TikTok", "YouTube", "Flyers", "Brochures", "Campaigns"];

  const getFilteredAds = () => {
    if (!data?.adFiles) return [];
    let list = data.adFiles.filter((f: any) => !f.isFolder); // show only files, not structural folder names
    
    if (selectedAdChannel !== "All") {
      list = list.filter((f: any) => f.path.toLowerCase().includes(selectedAdChannel.toLowerCase()));
    }
    if (selectedAdAsset !== "All") {
      list = list.filter((f: any) => f.path.toLowerCase().includes(selectedAdAsset.toLowerCase()) || f.name.toLowerCase().includes(selectedAdAsset.toLowerCase()));
    }
    if (searchQuery) {
      list = list.filter((f: any) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Sun className="h-6 w-6 text-amber-500 animate-spin-slow" />
            <span>Sales & Marketing Center</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Download price lists, advertising brochures, and access training materials</p>
        </div>

        {/* Global Tab Selector */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab("training"); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "training" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Sales SOPs and Training
          </button>
          <button
            onClick={() => { setActiveTab("pricing"); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "pricing" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Product Price Lists
          </button>
          <button
            onClick={() => { setActiveTab("ads"); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "ads" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Ad & Branding Library
          </button>
          <button
            onClick={() => { setActiveTab("quotations"); setCurrentFolderId(null); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "quotations" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Quotations
          </button>
        </div>
      </div>

      {/* --- TAB CONTENT: TRAINING CENTER --- */}
      {activeTab === "training" && (
        <AdminFileManager
          department="Sales"
          docType="Training"
          title="Sales SOPs & Training Library"
          description="Manage, upload, edit and organize sales SOPs, Word documents, onboarding guides, and training files"
          onRefreshParent={refreshData}
        />
      )}

      {/* --- TAB CONTENT: PRODUCT PRICE DATABASE --- */}
      {activeTab === "pricing" && (
        <div className="space-y-4">
          {/* Top details box & Editor controls */}
          <div className="glass-panel p-4 rounded-xl border border-zinc-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-200">Price List (Source: Price Lists.xlsx)</h4>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Latest Active
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Version 1.2 • Verified by Management • Seeding Sync July 2026
                </p>
              </div>
            </div>

            {/* Privileged Management Controls */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {saveSuccess && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 border border-emerald-500/15 rounded-xl animate-pulse">
                  System Saved!
                </span>
              )}
              {saveError && (
                <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-1.5 border border-red-500/15 rounded-xl">
                  {saveError}
                </span>
              )}

              {isPricingPrivileged && (
                <>
                  {editMode ? (
                    <>
                      <button
                        onClick={handleSavePricing}
                        disabled={savingPricing}
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition cursor-pointer"
                      >
                        {savingPricing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>Save Pricing</span>
                      </button>

                      <button
                        onClick={handleAddRow}
                        className="flex items-center gap-1 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-500" />
                        <span>Add Row</span>
                      </button>

                      <button
                        onClick={handleAddColumn}
                        className="flex items-center gap-1 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-500" />
                        <span>Add Column</span>
                      </button>

                      <button
                        onClick={handleDiscardPricing}
                        className="flex items-center gap-1 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-semibold rounded-xl transition cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5 text-red-450" />
                        <span>Discard</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit Price Sheet</span>
                    </button>
                  )}
                </>
              )}

              <button
                onClick={handleClientSideExport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 hover:text-white border border-zinc-700 font-bold text-zinc-300 transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Grid</span>
              </button>
              
              <a
                href="/uploads/Price Lists.xlsx"
                download
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 font-bold text-zinc-300 hover:bg-zinc-750 border border-zinc-700 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Price Lists.xlsx</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 bg-zinc-900/60 p-1 border border-zinc-800 rounded-xl w-full sm:w-fit">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedProductCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition cursor-pointer ${
                    selectedProductCat === cat ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat === "All" ? "All Products" : cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            </div>
          </div>

          {/* Pricing Table */}
          <div className="glass-panel rounded-xl border border-zinc-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-300">
                <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                  <tr>
                    {pricingHeaders.map((col) => {
                      const displayTitle = col === "rate" ? "RETAIL PRICE" : col.replace(/([A-Z])/g, " $1").toUpperCase();
                      return (
                        <th key={col} className="px-6 py-4 font-bold relative group">
                          <div className="flex items-center gap-2">
                            <span>{displayTitle}</span>
                            {editMode && !["category", "brand", "name", "spec", "purchasePrice", "wholesalePrice", "rate", "warranty"].includes(col) && (
                              <button
                                onClick={() => handleDeleteColumn(col)}
                                className="text-red-500 hover:text-red-400 p-0.5 hover:bg-zinc-800 rounded transition cursor-pointer"
                                title={`Delete column: ${col}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    {editMode && <th className="px-6 py-4 font-bold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredProducts().length > 0 ? (
                    getFilteredProducts().map((prod: any, idx: number) => (
                      <tr key={prod.id || idx} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                        {pricingHeaders.map((col) => {
                          const isEdit = editMode;
                          
                          if (isEdit) {
                            if (col === "category") {
                              return (
                                <td key={col} className="px-4 py-2">
                                  <select
                                    value={prod.category || "Solar Panels"}
                                    onChange={(e) => updateField(idx, "category", e.target.value)}
                                    className="w-full block glass-input rounded-lg px-2 py-1 text-white bg-zinc-950 focus:outline-none"
                                  >
                                    <option value="Solar Panels">Solar Panels</option>
                                    <option value="Inverters">Inverters</option>
                                    <option value="Batteries">Batteries</option>
                                    <option value="Stand & Structure">Stand & Structure</option>
                                    <option value="Structures">Structures</option>
                                    <option value="Cables">Cables</option>
                                    <option value="Accessories">Accessories</option>
                                    <option value="Installation Materials">Installation Materials</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </td>
                              );
                            }
                            
                            const inputType = ["purchasePrice", "wholesalePrice", "rate"].includes(col) ? "number" : "text";
                            return (
                              <td key={col} className="px-4 py-2">
                                <input
                                  type={inputType}
                                  value={prod[col] !== undefined && prod[col] !== null ? prod[col] : ""}
                                  onChange={(e) => updateField(idx, col, e.target.value)}
                                  className="w-full block glass-input rounded-lg px-2 py-1 text-white bg-zinc-955 focus:outline-none font-sans"
                                />
                              </td>
                            );
                          }

                          // Render read-only cells
                          if (col === "category") {
                            return <td key={col} className="px-6 py-4 text-amber-500 font-semibold">{prod.category}</td>;
                          }
                          if (col === "brand") {
                            return <td key={col} className="px-6 py-4 text-zinc-200">{prod.brand}</td>;
                          }
                          if (col === "name") {
                            return <td key={col} className="px-6 py-4 font-bold text-zinc-200">{prod.name}</td>;
                          }
                          if (["purchasePrice", "wholesalePrice", "rate"].includes(col)) {
                            return (
                              <td key={col} className="px-6 py-4 font-bold text-white">
                                {new Intl.NumberFormat("en-PK", {
                                  style: "currency",
                                  currency: "PKR",
                                  maximumFractionDigits: 0,
                                }).format(parseFloat(prod[col]) || 0)}
                              </td>
                            );
                          }
                          return <td key={col} className="px-6 py-4 text-zinc-400">{prod[col] !== null && prod[col] !== undefined ? String(prod[col]) : "--"}</td>;
                        })}

                        {editMode && (
                          <td className="px-6 py-2 text-right">
                            <button
                              onClick={() => handleDeleteRow(idx)}
                              className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-red-500 transition cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={pricingHeaders.length + (editMode ? 1 : 0)} className="px-6 py-8 text-center text-zinc-500 font-medium">
                        No products match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: ADVERTISEMENT LIBRARY --- */}
      {activeTab === "ads" && (
        <AdminFileManager
          department="Sales"
          docType="Advertisements"
          title="Advertising & Branding Library"
          description="Manage, upload, edit and organize marketing banners, flyer designs, brochures, and brand media"
          onRefreshParent={refreshData}
        />
      )}

      {/* --- TAB CONTENT: QUOTATIONS --- */}
      {activeTab === "quotations" && (
        <AdminFileManager
          department="Sales"
          docType="Quotations"
          title="Sales Quotations & Proposal Templates"
          description="Manage, upload, edit and organize official quotation templates, PDF proposals, and client estimates"
          onRefreshParent={refreshData}
        />
      )}

      {/* --- EMBEDDED MODALS --- */}
      {/* 1. YouTube Video Embed Player Modal */}
      {videoModalUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setVideoModalUrl(null)}
        >
          <div
            className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden aspect-video shadow-2xl animate-fade-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={videoModalUrl}
              title="YouTube video player"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* 2. Image Full Preview Modal */}
      {imageModalUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setImageModalUrl(null)}
        >
          <div
            className="w-full max-w-3xl flex flex-col items-center justify-center gap-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageModalUrl}
              alt="Creatives Preview"
              className="max-h-[80vh] object-contain rounded-xl border border-zinc-800 shadow-2xl"
            />
            <div className="flex gap-4">
              <a
                href={imageModalUrl}
                download
                className="flex items-center gap-1.5 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl"
              >
                <Download className="h-4 w-4" />
                <span>Download Creative</span>
              </a>
              <button
                onClick={() => setImageModalUrl(null)}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
