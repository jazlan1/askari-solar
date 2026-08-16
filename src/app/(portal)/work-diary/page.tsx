"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";
import {
  BookOpen,
  Folder,
  FileText,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit,
  Download,
  UploadCloud,
  Loader2,
  Search,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  FilePlus,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  User as UserIcon,
} from "lucide-react";

export default function WorkDiaryPage() {
  const { user, setActiveExcelFile, setActiveDocxFile, setActivePdfFile } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);

  const [uploading, setUploading] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItemId, setRenameItemId] = useState<number | null>(null);
  const [renameItemName, setRenameItemName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRoles = (user?.role || "").split(",").map((r) => r.trim().toLowerCase());
  const isAdmin = userRoles.some((r) => ["admin", "super admin", "superadmin", "management"].includes(r));

  async function fetchItems() {
    try {
      setLoading(true);
      let url = `/api/files?department=WorkDiary`;
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      } else if (currentFolderId) {
        url += `&parentId=${currentFolderId}`;
      } else {
        url += `&parentId=`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load work diary items:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();

    const handleFileSaved = () => {
      fetchItems();
    };
    window.addEventListener("file-saved", handleFileSaved);
    return () => window.removeEventListener("file-saved", handleFileSaved);
  }, [currentFolderId, searchQuery]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      setActionLoading(true);
      setError(null);
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_FOLDER",
          name: folderName.trim(),
          parentId: currentFolderId,
          department: "WorkDiary",
          folderColor: "amber",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create folder");
      }

      setFolderName("");
      setShowFolderModal(false);
      setSuccessMsg("Folder created successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchItems();
    } catch (err: any) {
      setError(err.message || "Failed to create folder");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItemId || !renameItemName.trim()) return;

    try {
      setActionLoading(true);
      setError(null);
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RENAME",
          id: renameItemId,
          name: renameItemName.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to rename");
      }

      setShowRenameModal(false);
      setRenameItemId(null);
      setRenameItemName("");
      setSuccessMsg("Item renamed successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchItems();
    } catch (err: any) {
      setError(err.message || "Failed to rename");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      setActionLoading(true);
      setError(null);
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE",
          id: item.id,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete");
      }

      setSuccessMsg("Item deleted successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchItems();
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      if (currentFolderId) formData.append("parentId", currentFolderId.toString());
      formData.append("department", "WorkDiary");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }

      setSuccessMsg(`Uploaded ${files.length} file(s) successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchItems();
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateNewDoc = async () => {
    const title = prompt("Enter new document title (e.g. Daily Work Log):", "Daily Work Diary");
    if (!title || !title.trim()) return;

    try {
      setUploading(true);
      setError(null);

      const blankContent = `Daily Work Diary - ${new Date().toLocaleDateString()}\n\nStaff: ${user?.name || "Staff"}\n\nTasks Done Today:\n1. \n2. \n3. \n\nNotes & Follow-ups:\n`;
      const blob = new Blob([blankContent], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const filename = `${title.trim().replace(/\.[^.]+$/, "")}.docx`;

      const fd = new FormData();
      fd.append("files", blob, filename);
      if (currentFolderId) fd.append("parentId", currentFolderId.toString());
      formDataDept(fd);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create document");
      }

      const d = await res.json();
      setSuccessMsg("Document created.");
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchItems();

      if (d.file) {
        handleFileClick(d.file);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create document.");
    } finally {
      setUploading(false);
    }
  };

  function formDataDept(fd: FormData) {
    fd.append("department", "WorkDiary");
  }

  const handleItemClick = (item: any) => {
    if (item.isFolder) {
      setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
      setCurrentFolderId(item.id);
    } else {
      handleFileClick(item);
    }
  };

  const handleFileClick = (file: any) => {
    if (!file.fileUrl) return;
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
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setBreadcrumbs([]);
      setCurrentFolderId(null);
    } else {
      const target = breadcrumbs[index];
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
      setCurrentFolderId(target.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Work Diary
              <span className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full font-normal">
                Templates & Daily Logs
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Manage daily work diaries, blank Word documents, reports, and team templates
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-zinc-950 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>Upload Files</span>
          </button>

          <button
            onClick={handleCreateNewDoc}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            <span>New Word Doc</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Breadcrumbs Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl">
        <div className="flex items-center gap-2 text-xs text-zinc-400 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={`hover:text-white transition flex items-center gap-1 ${
              breadcrumbs.length === 0 ? "text-amber-400 font-bold" : ""
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Work Diary Root</span>
          </button>

          {breadcrumbs.map((b, i) => (
            <div key={b.id} className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className={`hover:text-white transition ${
                  i === breadcrumbs.length - 1 ? "text-amber-400 font-bold" : ""
                }`}
              >
                {b.name}
              </button>
            </div>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search diary documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-200 pl-8 pr-3 py-1.5 rounded-lg text-xs border border-zinc-700 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Main Files Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm">Loading diary files and templates...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl">
          <div className="p-4 bg-zinc-800/50 text-zinc-400 rounded-2xl mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">No documents found</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            Upload Word/Excel files, daily logs, or click "New Word Doc" to create a fresh diary entry.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-amber-500 text-zinc-950 text-xs font-bold rounded-lg hover:bg-amber-400 transition cursor-pointer"
            >
              Upload Documents
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const ext = item.fileExtension?.toLowerCase() || "";
            const isWord = ["docx", "doc"].includes(ext);
            const isExcel = ["xlsx", "xls", "csv"].includes(ext);
            const isPdf = ext === "pdf";

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between p-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all shadow-sm"
              >
                <div
                  onClick={() => handleItemClick(item)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg shrink-0">
                      {item.isFolder ? (
                        <Folder className="w-8 h-8 text-amber-400 fill-amber-400/20" />
                      ) : isWord ? (
                        <FileText className="w-8 h-8 text-blue-400" />
                      ) : isExcel ? (
                        <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                      ) : isPdf ? (
                        <FileText className="w-8 h-8 text-rose-400" />
                      ) : (
                        <FileText className="w-8 h-8 text-zinc-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition truncate" title={item.name}>
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                        {item.isFolder ? (
                          <span>Folder</span>
                        ) : (
                          <>
                            <span>{item.fileSize ? `${(item.fileSize / 1024).toFixed(0)} KB` : "Document"}</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] text-amber-500/80 font-bold">{ext || "DOC"}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 mt-3">
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    {!item.isFolder && (
                      <button
                        onClick={() => handleFileClick(item)}
                        className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition"
                        title="Open / Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!item.isFolder && item.fileUrl && (
                      <a
                        href={getSafeFileUrl(item.fileUrl)}
                        download={item.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded transition"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {(isAdmin || item.uploadedById === user?.id) && (
                      <>
                        <button
                          onClick={() => {
                            setRenameItemId(item.id);
                            setRenameItemName(item.name);
                            setShowRenameModal(true);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                          title="Rename"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create New Folder</h3>
            <p className="text-xs text-zinc-400 mb-4">Organize your diary files into sections</p>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                placeholder="Folder name (e.g. Monthly Reports)"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !folderName.trim()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {actionLoading ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Rename Item</h3>
            <p className="text-xs text-zinc-400 mb-4">Enter a new name for this file or folder</p>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                placeholder="New name"
                value={renameItemName}
                onChange={(e) => setRenameItemName(e.target.value)}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !renameItemName.trim()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Rename"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
