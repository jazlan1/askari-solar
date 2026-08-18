"use client";

import { useEffect, useState, useRef } from "react";
import {
  Folder,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Image as ImageIcon,
  Video,
  Upload,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ArrowLeft,
  Download,
  Eye,
  Loader2,
  Search,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";

interface AdminFileManagerProps {
  department: string;
  docType?: string;
  title?: string;
  description?: string;
  allowedExtensions?: string;
  onRefreshParent?: () => void;
}

export default function AdminFileManager({
  department,
  docType = "Training",
  title,
  description,
  allowedExtensions,
  onRefreshParent,
}: AdminFileManagerProps) {
  const { user, setActiveExcelFile, setActiveDocxFile, setActivePdfFile } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: number | null; name: string }>>([
    { id: null, name: "Root" },
  ]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals / Actions
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("amber");

  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editName, setEditName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRoles = (user?.role || "")
    .split(",")
    .map((r: string) => r.trim().toLowerCase())
    .filter(Boolean);
  const isAdminOrManager =
    !user ||
    userRoles.some((r: string) =>
      ["admin", "super admin", "superadmin", "management", "hr", "sales & marketing", "accounts"].includes(r)
    );

  async function loadFiles() {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/files?department=${encodeURIComponent(department)}`;
      if (currentFolderId) {
        url += `&parentId=${currentFolderId}`;
      } else {
        url += `&parentId=null`;
      }
      if (searchQuery.trim()) {
        url = `/api/files?department=${encodeURIComponent(department)}&search=${encodeURIComponent(
          searchQuery.trim()
        )}`;
      }

      const res = await fetch(url);
      const d = await res.json();
      if (res.ok && d.success) {
        let fetchedItems: any[] = d.items || [];
        if (docType && !currentFolderId && !searchQuery.trim()) {
          fetchedItems = fetchedItems.filter(
            (it: any) => it.isFolder || it.docType === docType || it.docType === "Documents"
          );
        }
        setItems(fetchedItems);
      } else {
        setError(d.error || "Failed to load files");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to file server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, [currentFolderId, department, docType]);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_FOLDER",
          name: newFolderName.trim(),
          parentId: currentFolderId,
          department,
          docType,
          folderColor: newFolderColor,
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setNewFolderName("");
        setShowCreateFolderModal(false);
        await loadFiles();
        if (onRefreshParent) onRefreshParent();
      } else {
        setError(d.error || "Failed to create folder");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create folder");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(`Uploading ${files.length} file(s)...`);

    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append("files", files[i]);
      }
      if (currentFolderId) {
        fd.append("parentId", currentFolderId.toString());
      }
      fd.append("department", department);
      fd.append("docType", docType);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: fd,
      });

      const d = await res.json();
      if (res.ok && d.success) {
        await loadFiles();
        if (onRefreshParent) onRefreshParent();
      } else {
        setError(d.error || "File upload failed");
      }
    } catch (err: any) {
      setError(err?.message || "File upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRenameItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RENAME",
          id: editingItem.id,
          name: editName.trim(),
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setEditingItem(null);
        setEditName("");
        await loadFiles();
        if (onRefreshParent) onRefreshParent();
      } else {
        setError(d.error || "Failed to rename item");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to rename item");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteItem(item: any) {
    const isFolder = item.isFolder;
    const confirmMsg = isFolder
      ? `Are you sure you want to delete folder "${item.name}" and all its contents?`
      : `Are you sure you want to delete file "${item.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE",
          id: item.id,
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        await loadFiles();
        if (onRefreshParent) onRefreshParent();
      } else {
        setError(d.error || "Failed to delete item");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete item");
    } finally {
      setActionLoading(false);
    }
  }

  function handleOpenItem(item: any) {
    if (item.isFolder) {
      setCurrentFolderId(item.id);
      setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
      return;
    }

    const ext = (item.fileExtension || item.name.split(".").pop() || "").toLowerCase();
    const safeUrl = getSafeFileUrl(item.fileUrl);

    if (["xlsx", "xls", "csv"].includes(ext)) {
      setActiveExcelFile({ id: item.id, name: item.name, fileUrl: safeUrl });
    } else if (["docx", "doc"].includes(ext)) {
      setActiveDocxFile({ id: item.id, name: item.name, fileUrl: safeUrl });
    } else if (ext === "pdf") {
      setActivePdfFile({ id: item.id, name: item.name, fileUrl: safeUrl });
    } else {
      window.open(safeUrl, "_blank");
    }
  }

  function handleNavigateBreadcrumb(index: number) {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  function getFileIcon(item: any) {
    if (item.isFolder) {
      return <Folder className="h-6 w-6 text-amber-400 fill-amber-400/20" />;
    }
    const ext = (item.fileExtension || item.name.split(".").pop() || "").toLowerCase();
    if (["xlsx", "xls", "csv"].includes(ext)) {
      return <FileSpreadsheet className="h-6 w-6 text-emerald-400" />;
    }
    if (["docx", "doc"].includes(ext)) {
      return <FileText className="h-6 w-6 text-blue-400" />;
    }
    if (["pdf"].includes(ext)) {
      return <FileText className="h-6 w-6 text-rose-400" />;
    }
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      return <ImageIcon className="h-6 w-6 text-purple-400" />;
    }
    if (["mp4", "webm", "mkv", "mov"].includes(ext)) {
      return <Video className="h-6 w-6 text-amber-400" />;
    }
    return <FileIcon className="h-6 w-6 text-zinc-400" />;
  }

  function formatBytes(bytes?: number | null) {
    if (!bytes) return "--";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{title || `${department} Resource Library & SOPs`}</span>
          </h3>
          {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
        </div>

        {/* Action Buttons (Admin & Manager) */}
        {isAdminOrManager && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-amber-400" />
              <span>New Folder</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold transition cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>Upload Document</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedExtensions || ".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.mp4,.zip"}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Breadcrumbs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {breadcrumbs.map((b, idx) => (
            <div key={idx} className="flex items-center gap-1 shrink-0">
              {idx > 0 && <ChevronRight className="h-3 w-3 text-zinc-600" />}
              <button
                onClick={() => handleNavigateBreadcrumb(idx)}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  idx === breadcrumbs.length - 1
                    ? "font-bold text-amber-400 bg-amber-500/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {b.name}
              </button>
            </div>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search in folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadFiles();
            }}
            className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 bg-zinc-900/80 focus:outline-none"
          />
        </div>
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{uploadProgress || "Uploading files..."}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-zinc-500 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* File & Folder Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          <p className="text-xs">Loading library items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl text-center space-y-3">
          <Folder className="h-10 w-10 text-zinc-600" />
          <div>
            <p className="text-sm font-semibold text-zinc-300">No documents found</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isAdminOrManager
                ? "Click 'Upload Document' or 'New Folder' to manage files in this section."
                : "No files have been added to this section yet."}
            </p>
          </div>
          {isAdminOrManager && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition"
            >
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-4 transition flex flex-col justify-between space-y-3 shadow-md hover:shadow-lg"
            >
              {/* Item Top */}
              <div
                onClick={() => handleOpenItem(item)}
                className="flex items-start gap-3 cursor-pointer select-none"
              >
                <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 shrink-0">
                  {getFileIcon(item)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4
                    className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 truncate transition"
                    title={item.name}
                  >
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                    {item.isFolder ? (
                      <span>Folder</span>
                    ) : (
                      <>
                        <span>{formatBytes(item.fileSize)}</span>
                        <span>•</span>
                        <span className="uppercase">{item.fileExtension || "FILE"}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Item Bottom Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[10px]">
                <button
                  onClick={() => handleOpenItem(item)}
                  className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="h-3 w-3" />
                  <span>{item.isFolder ? "Open" : "View"}</span>
                </button>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                  {!item.isFolder && item.fileUrl && (
                    <a
                      href={getSafeFileUrl(item.fileUrl)}
                      download={item.name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                  )}

                  {isAdminOrManager && (
                    <>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setEditName(item.name);
                        }}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition"
                        title="Rename"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Folder className="h-4 w-4 text-amber-400" />
                <span>Create New Folder</span>
              </h4>
              <button
                onClick={() => setShowCreateFolderModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Sales SOPs 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newFolderName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold"
                >
                  {actionLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-amber-400" />
                <span>Rename Item</span>
              </h4>
              <button onClick={() => setEditingItem(null)} className="text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRenameItem} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !editName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold"
                >
                  {actionLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
