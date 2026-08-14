"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
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
  Building
} from "lucide-react";

export default function AnnouncementsPage() {
  const { user } = useStore();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error(err);
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
          title,
          content,
          department: targetDept,
          isPinned,
          attachmentUrl,
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

  const isPublishAllowed = ["Super Admin", "Management", "HR"].includes(user?.role || "");

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
            <span>Company Announcements</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Stay updated with Askari Solar Energy corporate policies, targets, and SOP changes</p>
        </div>

        {isPublishAllowed && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer self-stretch sm:self-auto justify-center"
          >
            <Plus className="h-4 w-4" />
            <span>Publish Notice</span>
          </button>
        )}
      </div>

      {/* Announcements list */}
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

              {/* Attachment link if exists */}
              {ann.attachmentUrl && (
                <div className="flex items-center gap-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 w-fit text-xs text-zinc-400 hover:border-zinc-700 transition">
                  <FileText className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                  <span className="truncate max-w-[200px]">{ann.attachmentUrl.split("/").pop()}</span>
                  <a
                    href={ann.attachmentUrl}
                    download
                    className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Footer Author info */}
              <div className="border-t border-zinc-850 pt-4 flex items-center gap-2 text-[10px] text-zinc-500">
                <User className="h-3.5 w-3.5 text-zinc-600" />
                <span>Published by <strong className="text-zinc-400">{ann.createdBy?.name}</strong> ({ann.createdBy?.role})</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-zinc-500">
            No announcements published yet.
          </div>
        )}
      </div>

      {/* --- PUBLISH ANNOUNCEMENT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-855 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-500" />
                <span>Publish New Announcement</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Target Audience Department</label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900 mt-1.5"
                >
                  <option value="All">All Departments</option>
                  <option value="Sales">Sales & Marketing</option>
                  <option value="Accounts">Accounts</option>
                  <option value="HR">HR</option>
                  <option value="CRM">CRM</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="e.g. SOPs changes for bank accounts verification"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Content Description</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="Type the announcement notice details..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">File Attachment URL (Optional)</label>
                <input
                  type="text"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="e.g. /uploads/Training (Accounts Department)/SOPs.docx"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pin"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="pin" className="text-xs text-zinc-400 font-semibold cursor-pointer">
                  Pin this announcement to the top
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-850 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs"
                >
                  {actionLoading ? "Publishing..." : "Publish Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
