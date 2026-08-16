"use client";

import { useEffect, useState, useRef } from "react";
import { getSafeFileUrl } from "@/lib/file-helper";
import { useStore } from "@/store/useStore";
import {
  DollarSign,
  Search,
  Download,
  Folder,
  ArrowLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  ExternalLink,
  BookOpen,
  Send,
  Building,
  Key,
  ShieldCheck,
  CheckSquare,
  CheckCircle2,
  Clock,
  UploadCloud,
  Plus,
  Trash2,
  Edit,
  Loader2,
  FileCheck,
} from "lucide-react";

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<"training" | "invoicing" | "fastaccounts">("training");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, setActiveExcelFile, setActiveDocxFile, setActivePdfFile } = useStore();

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  // Invoicing Tab states
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<number | null>(null);

  // File management
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const userRoles = (user?.role || "").split(",").map((r) => r.trim().toLowerCase());
  const isAdminOrAccountant = userRoles.some((r) =>
    ["admin", "super admin", "superadmin", "management", "accountant", "accounts"].includes(r)
  );

  async function refreshData() {
    try {
      const res = await fetch("/api/accounts/data");
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
      }
    } catch (err) {
      console.error("Failed to load accounts data:", err);
    }
  }

  async function fetchCompletedComplaints() {
    try {
      setComplaintsLoading(true);
      const res = await fetch("/api/complaints?limit=100");
      if (res.ok) {
        const d = await res.json();
        setComplaints(d.complaints || []);
      }
    } catch (err) {
      console.error("Failed to load complaints for invoicing:", err);
    } finally {
      setComplaintsLoading(false);
    }
  }

  useEffect(() => {
    refreshData().finally(() => setLoading(false));

    const handleSave = () => {
      refreshData();
    };
    window.addEventListener("file-saved", handleSave);
    return () => window.removeEventListener("file-saved", handleSave);
  }, []);

  useEffect(() => {
    if (activeTab === "invoicing") {
      fetchCompletedComplaints();
    }
  }, [activeTab]);

  const handleToggleInvoiceGenerated = async (complaint: any) => {
    try {
      setUpdatingInvoiceId(complaint.id);
      const newStatus = !complaint.invoiceGenerated;

      const res = await fetch(`/api/complaints/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceGenerated: newStatus,
        }),
      });

      if (res.ok) {
        setComplaints((prev) =>
          prev.map((c) => (c.id === complaint.id ? { ...c, invoiceGenerated: newStatus } : c))
        );
      } else {
        alert("Failed to update invoice status.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error updating invoice status.");
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append("files", files[i]);
      }
      if (currentFolderId) fd.append("parentId", currentFolderId.toString());
      fd.append("department", "Accounts");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        refreshData();
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const d = await res.json();
        alert(d.error || "Upload failed");
      }
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (ext: string) => {
    const clean = ext?.toLowerCase() || "";
    if (["xlsx", "xls", "csv"].includes(clean)) return FileSpreadsheet;
    return FileText;
  };

  const handleFileClick = (file: any) => {
    if (file.isFolder) {
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
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-full bg-zinc-900 rounded-lg"></div>
        <div className="h-60 bg-zinc-900 rounded-xl"></div>
      </div>
    );
  }

  const getTrainingItems = () => {
    if (!data?.trainingFiles) return [];
    const items = data.trainingFiles.filter((f: any) => f.parentId === currentFolderId);
    if (searchQuery) {
      return data.trainingFiles.filter(
        (f: any) => !f.isFolder && f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  };

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

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-amber-500" />
            <span>Accounts & Finance Department</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Access Fast Accounts, completed field complaints invoicing status, and accounts documents.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit flex-wrap">
          <button
            onClick={() => { setActiveTab("training"); setCurrentFolderId(null); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "training" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Accounts SOPs & Training
          </button>
          <button
            onClick={() => { setActiveTab("invoicing"); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "invoicing" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Completed Work & Invoicing</span>
          </button>
          <button
            onClick={() => { setActiveTab("fastaccounts"); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "fastaccounts" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Fast Accounts ERP
          </button>
        </div>
      </div>

      {/* --- TAB CONTENT: ACCOUNTS TRAINING --- */}
      {activeTab === "training" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <button
                onClick={() => setCurrentFolderId(null)}
                className="text-zinc-200 hover:text-amber-500 transition cursor-pointer"
              >
                Accounts Library
              </button>
              {getTrainingBreadcrumbs().map((crumb) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className="text-zinc-200 hover:text-amber-500 transition cursor-pointer"
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              {isAdminOrAccountant && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span>Upload Files</span>
                </button>
              )}

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search training docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-input rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              </div>
            </div>
          </div>

          {/* Files grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentFolderId !== null && !searchQuery && (
              <div
                onClick={() => {
                  const currentCrumb = data?.trainingFiles?.find((f: any) => f.id === currentFolderId);
                  setCurrentFolderId(currentCrumb ? currentCrumb.parentId : null);
                }}
                className="glass-card p-4 rounded-xl border border-zinc-800 hover:bg-zinc-800/40 cursor-pointer flex items-center gap-3 transition"
              >
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                  <ArrowLeft className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-300">Go Back</h4>
                  <p className="text-[10px] text-zinc-500">Parent Folder</p>
                </div>
              </div>
            )}

            {getTrainingItems().length > 0 ? (
              getTrainingItems().map((file: any) => {
                const isFolder = file.isFolder;
                const Icon = isFolder ? Folder : getFileIcon(file.fileExtension);
                return (
                  <div
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className="glass-card p-4 rounded-xl border border-zinc-800 hover:border-amber-500/30 hover:bg-zinc-900/40 cursor-pointer flex flex-col justify-between transition group h-36"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl ${
                        isFolder ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {!isFolder && file.fileUrl && (
                        <a
                          href={getSafeFileUrl(file.fileUrl)}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-lg text-zinc-500 hover:text-white"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-zinc-200 line-clamp-2 group-hover:text-amber-400 transition">
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold">
                        {isFolder ? "Folder" : file.fileExtension || "Document"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-zinc-500 font-medium text-xs">
                No accounts documents found in this directory.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: COMPLETED WORK & INVOICING --- */}
      {activeTab === "invoicing" && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-500" />
                <span>Field Complaints & Invoice Generator Reminder</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Review completed technical field complaints, resolution proof uploads, and check "Invoice Generated" when billing is completed.
              </p>
            </div>
            <button
              onClick={fetchCompletedComplaints}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold"
            >
              Refresh
            </button>
          </div>

          {complaintsLoading ? (
            <div className="py-20 text-center text-zinc-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs">Loading complaints...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 bg-zinc-900/30 border border-zinc-800 rounded-xl text-xs">
              No complaint records found.
            </div>
          ) : (
            <div className="glass-panel rounded-xl border border-zinc-800 overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Complaint ID</th>
                    <th className="px-4 py-3">Customer & Location</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Assigned Staff</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Completion Proof</th>
                    <th className="px-4 py-3 text-center">Invoice Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => {
                    const isCompleted = ["Resolved", "Closed"].includes(c.status);
                    return (
                      <tr key={c.id} className="border-b border-zinc-800/40 hover:bg-zinc-900/20">
                        <td className="px-4 py-3 font-mono font-bold text-amber-400">
                          {c.complaintId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-200">{c.fullName}</div>
                          <div className="text-[10px] text-zinc-400">{c.address || c.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{c.category}</td>
                        <td className="px-4 py-3 text-zinc-300">
                          {c.assignedTo?.name || "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.resolutionProof ? (
                            <a
                              href={getSafeFileUrl(c.resolutionProof)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>View Proof</span>
                            </a>
                          ) : (
                            <span className="text-zinc-600 italic">No file</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(c.invoiceGenerated)}
                              disabled={updatingInvoiceId === c.id || !isAdminOrAccountant}
                              onChange={() => handleToggleInvoiceGenerated(c)}
                              className="w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <span
                              className={`text-[11px] font-bold ${
                                c.invoiceGenerated ? "text-emerald-400" : "text-zinc-500"
                              }`}
                            >
                              {c.invoiceGenerated ? "✓ Generated" : "Pending"}
                            </span>
                          </label>
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

      {/* --- TAB CONTENT: FAST ACCOUNTS --- */}
      {activeTab === "fastaccounts" && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" />
                <span>Fast Accounts ERP Cloud Integration</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Direct single-sign-on access to Askari Solar Energy's cloud ledger, invoices, and accounting portal.
              </p>
            </div>
            <a
              href="https://app.fastaccounts.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs transition shadow-sm"
            >
              <span>Launch Fast Accounts</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
