"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";
import {
  Megaphone,
  Pin,
  Calendar,
  User,
  Plus,
  X,
  FileText,
  Download,
  Send,
  Building,
  Activity,
  Clock,
  ShieldCheck,
  Search,
} from "lucide-react";

export default function AnnouncementsPage() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<"bulletins" | "activity">("bulletins");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitySearch, setActivitySearch] = useState("");

  // Dialog / form state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetDept, setTargetDept] = useState("All");
  const [isPinned, setIsPinned] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchAnnouncements() {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          department: targetDept,
          isPinned,
          attachmentUrl: attachmentUrl.trim() || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setTitle("");
        setContent("");
        setTargetDept("All");
        setIsPinned(false);
        setAttachmentUrl("");
        fetchAnnouncements();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  const userRoles = (user?.role || "").split(",").map((r) => r.trim().toLowerCase());
  const isPublishAllowed = userRoles.some((r) =>
    ["admin", "super admin", "superadmin", "management", "hr"].includes(r)
  );

  const filteredLogs = auditLogs.filter((log) => {
    const q = activitySearch.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q) ||
      log.user?.name?.toLowerCase().includes(q) ||
      log.user?.email?.toLowerCase().includes(q) ||
      log.user?.department?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-full bg-zinc-900 rounded-lg"></div>
        <div className="h-32 bg-zinc-900 rounded-xl"></div>
        <div className="h-32 bg-zinc-900 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-amber-500" />
            <span>Company Announcements & Activity Feed</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Official announcements, SOP updates, and real-time portal activity logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Selector */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("bulletins")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "bulletins" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              Bulletins ({announcements.length})
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "activity" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Activity Stream</span>
            </button>
          </div>

          {isPublishAllowed && activeTab === "bulletins" && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Publish Notice</span>
            </button>
          )}
        </div>
      </div>

      {/* --- TAB CONTENT: BULLETINS --- */}
      {activeTab === "bulletins" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {announcements.length > 0 ? (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className={`relative overflow-hidden rounded-2xl border p-6 shadow-xl space-y-4 transition-all duration-300 ${
                  ann.isPinned
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-zinc-900/60 border-zinc-800/80"
                }`}
              >
                {ann.isPinned && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <Pin className="h-3 w-3 shrink-0" />
                    <span>Pinned</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">
                      {ann.department} Scope
                    </span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">{ann.title}</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                </div>

                {ann.attachmentUrl && (
                  <div className="flex items-center gap-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 w-fit text-xs text-zinc-400 hover:border-zinc-700 transition">
                    <FileText className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                    <span className="truncate max-w-[200px]">{ann.attachmentUrl.split("/").pop()}</span>
                    <a
                      href={getSafeFileUrl(ann.attachmentUrl)}
                      download
                      className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                <div className="border-t border-zinc-850 pt-4 flex items-center gap-2 text-[10px] text-zinc-500">
                  <User className="h-3.5 w-3.5 text-zinc-600" />
                  <span>
                    Published by <strong className="text-zinc-400">{ann.createdBy?.name}</strong> ({ann.createdBy?.role})
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
              No announcements published yet.
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: LIVE ACTIVITY STREAM --- */}
      {activeTab === "activity" && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search audit trail by user, action, detail..."
                className="w-full bg-zinc-950 text-white pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-800 focus:outline-none focus:border-amber-500"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            </div>
            <span className="text-zinc-500 text-xs font-medium">Showing {filteredLogs.length} events</span>
          </div>

          <div className="space-y-3">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200 text-xs">{log.user?.name || "System User"}</span>
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] rounded font-medium">
                          {log.user?.role || "Staff"}
                        </span>
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded font-bold uppercase">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1">{log.details}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800 rounded-xl">
                No activity logs recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PUBLISH MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-500" />
                <span>Publish Official Notice</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revised Warranty Claim Protocol"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-white bg-zinc-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Target Department</label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-white bg-zinc-950 focus:outline-none"
                >
                  <option value="All">All Departments</option>
                  <option value="Sales">Sales & Marketing</option>
                  <option value="Field">Field Operations</option>
                  <option value="Accounts">Accounts & Finance</option>
                  <option value="HR">Human Resources</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Notice Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter full notice statement..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-white bg-zinc-950 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isPinned" className="text-zinc-300 font-semibold cursor-pointer">
                  Pin this notice to top of feed
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Publishing..." : "Publish Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
