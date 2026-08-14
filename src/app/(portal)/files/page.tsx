"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";
import ExcelEditor from "@/components/ExcelEditor";
import DocxViewer from "@/components/DocxViewer";
import {
  Folder,
  FileText,
  FileSpreadsheet,
  Video,
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  Star,
  ChevronRight,
  ArrowLeft,
  X,
  Sparkles,
  LayoutGrid,
  List,
  UploadCloud,
  ChevronDown
} from "lucide-react";

export default function FileManagerPage() {
  const { user, setActiveExcelFile, setActiveDocxFile, setActivePdfFile } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout & Category
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "training" | "excel" | "branding" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Directory Navigation
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);

  // Dialog Modals state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("amber");
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItemId, setRenameItemId] = useState<number | null>(null);
  const [renameItemName, setRenameItemName] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  // Local file viewers are now managed globally in layout.tsx

  // Helper to load items
  async function fetchItems() {
    try {
      setLoading(true);
      let url = "/api/files";
      
      if (selectedCategory === "training" || selectedCategory === "excel" || selectedCategory === "branding") {
        url = "/api/files?all=true";
      } else if (searchQuery) {
        url = `/api/files?search=${encodeURIComponent(searchQuery)}`;
      } else if (selectedCategory === "favorites") {
        url = "/api/files?favorites=true";
      } else if (currentFolderId) {
        url = `/api/files?parentId=${currentFolderId}`;
      } else {
        url = "/api/files?parentId=";
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        // Dynamic category filters
        if (selectedCategory === "training") {
          const filtered = data.items.filter((item: any) => 
            !item.isFolder && (
              item.docType === "Training" || 
              item.path.toLowerCase().includes("training") ||
              item.name.toLowerCase().includes("training")
            )
          );
          setItems(filtered);
        } else if (selectedCategory === "excel") {
          const filtered = data.items.filter((item: any) => 
            !item.isFolder && (
              ["xlsx", "xls", "csv"].includes(item.fileExtension?.toLowerCase() || "") ||
              item.name.toLowerCase().includes("price")
            )
          );
          setItems(filtered);
        } else if (selectedCategory === "branding") {
          const filtered = data.items.filter((item: any) => 
            !item.isFolder && (
              item.docType === "Advertisements" || 
              item.path.toLowerCase().includes("advertisements") || 
              item.path.toLowerCase().includes("branding") ||
              item.name.toLowerCase().includes("ad") ||
              item.name.toLowerCase().includes("branding")
            )
          );
          setItems(filtered);
        } else {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();

    const handleSave = () => {
      fetchItems();
    };
    window.addEventListener("file-saved", handleSave);
    return () => window.removeEventListener("file-saved", handleSave);
  }, [currentFolderId, selectedCategory, searchQuery]);

  // Load breadcrumbs when folder changes
  useEffect(() => {
    if (!currentFolderId) {
      setBreadcrumbs([]);
      return;
    }

    async function buildCrumbs() {
      try {
        const res = await fetch("/api/files");
        if (res.ok) {
          const data = await res.json();
          const crumbsList = [];
          let folderId = currentFolderId;
          while (folderId !== null) {
            const folder = data.items?.find((x: any) => x.id === folderId);
            if (folder) {
              crumbsList.unshift(folder);
              folderId = folder.parentId;
            } else {
              break;
            }
          }
          setBreadcrumbs(crumbsList);
        }
      } catch (err) {
        console.error(err);
      }
    }
    buildCrumbs();
  }, [currentFolderId]);

  // Create Folder handler
  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_FOLDER",
          name: folderName,
          folderColor,
          parentId: currentFolderId,
        }),
      });

      if (res.ok) {
        setShowFolderModal(false);
        setFolderName("");
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // Rename handler
  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameItemId || !renameItemName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RENAME",
          id: renameItemId,
          name: renameItemName,
        }),
      });

      if (res.ok) {
        setShowRenameModal(false);
        setRenameItemId(null);
        setRenameItemName("");
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // Delete handler
  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE",
          id,
        }),
      });

      if (res.ok) {
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Favorite toggle handler
  async function handleToggleFavorite(id: number, currentFav: boolean) {
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FAVORITE",
          id,
          isFavorite: !currentFav,
        }),
      });

      if (res.ok) {
        setItems(items.map((x) => (x.id === id ? { ...x, isFavorite: !currentFav } : x)));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const getFileIcon = (ext: string | null) => {
    if (!ext) return FileText;
    const e = ext.toLowerCase();
    if (["xlsx", "xls", "csv"].includes(e)) return FileSpreadsheet;
    if (["mp4", "avi", "mov", "mkv", "link"].includes(e)) return Video;
    return FileText;
  };

  const getFolderColorClass = (color: string | null) => {
    switch (color) {
      case "amber": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "blue": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "emerald": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "rose": return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      case "violet": return "text-violet-500 bg-violet-500/10 border-violet-500/20";
      case "indigo": return "text-indigo-500 bg-indigo-500/10 border-indigo-500/20";
      default: return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const colors = ["amber", "blue", "emerald", "violet", "rose", "indigo"];

  const formatVirtualPath = (pathString: string) => {
    if (!pathString || pathString === "/") return "Root";
    const clean = pathString.startsWith("/") ? pathString.substring(1) : pathString;
    return "Root > " + clean.split("/").join(" > ");
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in relative z-10">
      <div className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-6 h-fit">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Library Sections</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Filter documents by favorites or recently uploaded</p>
        </div>

        <div className="space-y-1.5">
          <button
            onClick={() => { setSelectedCategory("all"); setCurrentFolderId(null); setSearchQuery(""); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              selectedCategory === "all" && !currentFolderId && !searchQuery
                ? "bg-amber-500 text-zinc-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
            }`}
          >
            <Folder className="h-4.5 w-4.5" />
            <span>All Explorer</span>
          </button>

          <button
            onClick={() => { setSelectedCategory("training"); setCurrentFolderId(null); setSearchQuery(""); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              selectedCategory === "training"
                ? "bg-amber-500 text-zinc-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
            }`}
          >
            <Sparkles className="h-4.5 w-4.5" />
            <span>SOPs & Training</span>
          </button>

          <button
            onClick={() => { setSelectedCategory("excel"); setCurrentFolderId(null); setSearchQuery(""); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              selectedCategory === "excel"
                ? "bg-amber-500 text-zinc-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
            }`}
          >
            <FileSpreadsheet className="h-4.5 w-4.5" />
            <span>Product Price Lists</span>
          </button>

          <button
            onClick={() => { setSelectedCategory("branding"); setCurrentFolderId(null); setSearchQuery(""); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              selectedCategory === "branding"
                ? "bg-amber-500 text-zinc-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
            }`}
          >
            <Video className="h-4.5 w-4.5" />
            <span>Ad & Branding Library</span>
          </button>

          <button
            onClick={() => { setSelectedCategory("favorites"); setCurrentFolderId(null); setSearchQuery(""); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              selectedCategory === "favorites"
                ? "bg-amber-500 text-zinc-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
            }`}
          >
            <Star className="h-4.5 w-4.5" />
            <span>My Favorites</span>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-850 text-center space-y-3 relative group">
          <input
            type="file"
            id="file-manager-upload-input"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              const formData = new FormData();
              formData.append("file", file);
              if (currentFolderId) {
                formData.append("parentId", currentFolderId.toString());
              }

              try {
                const res = await fetch("/api/files/upload", {
                  method: "POST",
                  body: formData,
                });
                if (res.ok) {
                  fetchItems();
                  alert(`"${file.name}" uploaded successfully!`);
                } else {
                  const errData = await res.json();
                  alert(errData.error || "Upload failed.");
                }
              } catch (err) {
                console.error("Upload error:", err);
                alert("Upload failed.");
              }
            }}
          />
          <label
            htmlFor="file-manager-upload-input"
            className="cursor-pointer block space-y-3 hover:text-white"
          >
            <UploadCloud className="h-8 w-8 text-zinc-500 group-hover:text-amber-500 transition mx-auto" />
            <p className="text-[10px] text-zinc-500 group-hover:text-zinc-300 leading-normal px-2 transition font-semibold">
              Click to select and upload files to auto-categorise.
            </p>
          </label>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {["training", "excel", "branding", "favorites"].includes(selectedCategory) ? (
            <div className="text-xs font-bold text-white flex items-center gap-2 select-none">
              <span className="text-amber-500 uppercase tracking-wider">
                {selectedCategory === "training" ? "SOPs & Training" :
                 selectedCategory === "excel" ? "Product Price Lists" :
                 selectedCategory === "branding" ? "Ad & Branding Library" :
                 "My Favorites"}
              </span>
              <span className="text-zinc-700 font-normal">|</span>
              <span className="text-zinc-500 font-medium">({items.length} files found)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <button
                onClick={() => { setCurrentFolderId(null); setSelectedCategory("all"); }}
                className="text-zinc-200 hover:text-amber-500 transition cursor-pointer"
              >
                Root
              </button>
              {breadcrumbs.map((crumb) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className="text-zinc-200 hover:text-amber-500 transition cursor-pointer"
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <input
                type="text"
                placeholder="Search file manager..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            </div>

            <div className="flex bg-zinc-900 border border-zinc-850 p-1 rounded-xl">
              <button
                onClick={() => setLayoutMode("grid")}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  layoutMode === "grid" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setLayoutMode("list")}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  layoutMode === "list" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {selectedCategory === "all" && (
              <button
                onClick={() => setShowFolderModal(true)}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            <div className="h-28 bg-zinc-900 rounded-xl"></div>
            <div className="h-28 bg-zinc-900 rounded-xl"></div>
            <div className="h-28 bg-zinc-900 rounded-xl"></div>
          </div>
        ) : (
          <div>
            {layoutMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentFolderId !== null && (
                  <div
                    onClick={() => {
                      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
                      setCurrentFolderId(parentCrumb ? parentCrumb.id : null);
                    }}
                    className="glass-card p-4 rounded-xl border border-zinc-800 hover:bg-zinc-800/40 cursor-pointer flex items-center gap-3 h-28 transition"
                  >
                    <div className="p-2 bg-zinc-800 text-zinc-400 rounded-xl border border-zinc-700">
                      <ArrowLeft className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-300">Go Back</h4>
                      <p className="text-[9px] text-zinc-500 uppercase font-semibold">Parent directory</p>
                    </div>
                  </div>
                )}

                {items.length > 0 ? (
                  items.map((file) => {
                    const isFolder = file.isFolder;
                    const Icon = isFolder ? Folder : getFileIcon(file.fileExtension);
                    const colorClass = isFolder ? getFolderColorClass(file.folderColor) : "bg-blue-500/10 text-blue-400 border border-blue-500/20";

                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (isFolder) {
                            setCurrentFolderId(file.id);
                          } else if (file.fileUrl) {
                            const ext = file.fileExtension?.toLowerCase() || "";
                            if (["xlsx", "xls", "csv"].includes(ext)) {
                              setActiveExcelFile(file);
                            } else if (["docx", "doc"].includes(ext)) {
                              setActiveDocxFile(file);
                            } else if (ext === "pdf") {
                              setActivePdfFile(file);
                            } else {
                              window.open(getSafeFileUrl(file.fileUrl), "_blank");
                            }
                          }
                        }}
                        className="glass-card p-4 rounded-xl border border-zinc-800 hover:border-amber-500/30 hover:bg-zinc-900/40 cursor-pointer flex flex-col justify-between h-28 relative group transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className={`p-2 rounded-xl border ${colorClass}`}>
                            <Icon className="h-5 w-5 shrink-0" />
                          </div>

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-200">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleFavorite(file.id, file.isFavorite); }}
                              className={`p-1 rounded text-zinc-500 hover:text-amber-500 transition`}
                            >
                              <Star className={`h-4.5 w-4.5 ${file.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setRenameItemId(file.id); setRenameItemName(file.name); setShowRenameModal(true); }}
                              className="p-1 rounded text-zinc-500 hover:text-white"
                            >
                              <Edit className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                              className="p-1 rounded text-zinc-500 hover:text-red-500"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2">
                          <h4 className="text-xs font-bold text-zinc-200 truncate group-hover:text-amber-400 transition" title={file.name}>
                            {file.name}
                          </h4>
                          {["training", "excel", "branding", "favorites"].includes(selectedCategory) && (
                            <span className="text-[8px] text-amber-500/80 font-bold block truncate max-w-full mt-0.5" title={formatVirtualPath(file.path)}>
                              {formatVirtualPath(file.path)}
                            </span>
                          )}
                          <p className="text-[9px] text-zinc-550 mt-1 uppercase font-bold tracking-wider">
                            {isFolder ? "Folder" : file.fileExtension || "File"} • {(file.fileSize ? `${(file.fileSize/1024).toFixed(1)} KB` : "N/A")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-12 text-center text-zinc-500">
                    No files or directories found.
                  </div>
                )}
              </div>
            ) : (
              // List layout
              <div className="glass-panel border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left text-zinc-300">
                  <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      {["training", "excel", "branding", "favorites"].includes(selectedCategory) && (
                        <th className="px-6 py-3">Location</th>
                      )}
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Size</th>
                      <th className="px-6 py-3">Uploaded Date</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((file) => {
                      const isFolder = file.isFolder;
                      const Icon = isFolder ? Folder : getFileIcon(file.fileExtension);
                      return (
                        <tr
                          key={file.id}
                          onClick={() => {
                            if (isFolder) {
                              setCurrentFolderId(file.id);
                            } else if (file.fileUrl) {
                              const ext = file.fileExtension?.toLowerCase() || "";
                                if (["xlsx", "xls", "csv"].includes(ext)) {
                                  setActiveExcelFile(file);
                                } else if (["docx", "doc"].includes(ext)) {
                                  setActiveDocxFile(file);
                                } else if (ext === "pdf") {
                                  setActivePdfFile(file);
                                } else {
                                  window.open(getSafeFileUrl(file.fileUrl), "_blank");
                                }
                            }
                          }}
                          className="border-b border-zinc-800/40 hover:bg-zinc-900/10 cursor-pointer"
                        >
                          <td className="px-6 py-3 font-semibold text-zinc-200 flex items-center gap-2">
                            <Icon className={`h-4 w-4 shrink-0 ${isFolder ? "text-amber-500" : "text-blue-400"}`} />
                            <span>{file.name}</span>
                          </td>
                          {["training", "excel", "branding", "favorites"].includes(selectedCategory) && (
                            <td className="px-6 py-3 text-amber-500/80 text-[10px] truncate max-w-xs font-semibold" title={formatVirtualPath(file.path)}>
                              {formatVirtualPath(file.path)}
                            </td>
                          )}
                          <td className="px-6 py-3 text-zinc-400">{isFolder ? "Folder" : file.fileExtension || "File"}</td>
                          <td className="px-6 py-3 text-zinc-400">{(file.fileSize ? `${(file.fileSize/1024).toFixed(1)} KB` : "--")}</td>
                          <td className="px-6 py-3 text-zinc-500">{new Date(file.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-3 text-right flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleFavorite(file.id, file.isFavorite)}
                              className="text-zinc-500 hover:text-amber-500"
                            >
                              <Star className={`h-4 w-4 ${file.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="text-zinc-500 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- DIALOG MODALS --- */}
      {/* 1. Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-white">Create New Folder</h3>
              <button onClick={() => setShowFolderModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Folder Name</label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="e.g. Sales Q3 Reports"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Folder Theme Color</label>
                <div className="flex gap-2 mt-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFolderColor(c)}
                      className={`h-6 w-6 rounded-full bg-${c}-500 border-2 transition ${
                        folderColor === c ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c === "emerald" ? "#10b981" : c === "amber" ? "#f59e0b" : c === "violet" ? "#8b5cf6" : c === "blue" ? "#3b82f6" : c === "rose" ? "#f43f5e" : "#6366f1" }}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 bg-zinc-850 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-white">Rename Item</h3>
              <button onClick={() => setShowRenameModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRename} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">New Name</label>
                <input
                  type="text"
                  required
                  value={renameItemName}
                  onChange={(e) => setRenameItemName(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 bg-zinc-850 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Global viewers are rendered in layout.tsx */}
    </>
  );
}
