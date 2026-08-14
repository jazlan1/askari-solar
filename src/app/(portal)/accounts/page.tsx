"use client";

import { useEffect, useState } from "react";
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
  ShieldCheck
} from "lucide-react";

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<"training" | "fastaccounts">("training");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { setActiveExcelFile, setActiveDocxFile } = useStore();

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

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

  useEffect(() => {
    refreshData().finally(() => setLoading(false));

    const handleSave = () => {
      refreshData();
    };
    window.addEventListener("file-saved", handleSave);
    return () => window.removeEventListener("file-saved", handleSave);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-full bg-zinc-900 rounded-lg"></div>
        <div className="h-60 bg-zinc-900 rounded-xl"></div>
      </div>
    );
  }

  // --- 1. TRAINING CENTER NAVIGATION ---
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

  // --- 2. QUOTATIONS DIRECTORY NAVIGATION ---
  const getQuotationItems = () => {
    if (!data?.quotationFiles) return [];
    
    // Find the root Quotations folder if currentFolderId is null
    // Since we nested "Islamabad Office" and "Chakwal Office" inside "Quotations" folder,
    // if currentFolderId is null we want to show the top level folders/files.
    // Let's filter by parentId:
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

  const handleFileClick = (file: any, type: "training" | "quotation") => {
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

  const getFileIcon = (ext: string | null) => {
    if (!ext) return FileText;
    const e = ext.toLowerCase();
    if (["xlsx", "xls", "csv"].includes(e)) return FileSpreadsheet;
    return FileText;
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-amber-500" />
            <span>Accounts & Finance Department</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Access Fast Accounts, quotation templates, invoicing logs, and training guidelines</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab("training"); setCurrentFolderId(null); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "training" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Accounts SOPs & Training
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
                    onClick={() => handleFileClick(file, "training")}
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
              <div className="col-span-full py-12 text-center text-zinc-500 font-medium">
                No accounts SOPs found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: FAST ACCOUNTS LINK --- */}
      {activeTab === "fastaccounts" && (
        <div className="max-w-xl mx-auto animate-fade-in py-8">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 shadow-2xl text-center">
            {/* Background glowing gradients */}
            <div className="absolute -top-12 -left-12 h-32 w-32 bg-amber-500/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-12 -right-12 h-32 w-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10 space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Building className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Fast Accounts ERP Integration</h3>
                <p className="text-xs text-zinc-400 leading-relaxed px-4">
                  Fast Accounts is our central cloud enterprise resource planning (ERP) system used for ledger maintenance, balance sheets, invoice mapping, and tax compliance.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-left text-xs text-zinc-400">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Secure External Authentication</span>
                </div>
                <p className="leading-normal">
                  Make sure you have your secure departmental credentials ready. For security reasons, never share your login credentials with unauthorized staff.
                </p>
              </div>

              <a
                href="https://login.fastaccounts.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition"
              >
                <span>Open Fast Accounts</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
