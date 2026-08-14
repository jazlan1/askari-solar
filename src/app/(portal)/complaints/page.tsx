"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import {
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  X,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  User,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Send,
  History,
} from "lucide-react";
import { formatPKTDateDisplay, formatPKTDateTimeDisplay } from "@/lib/dateUtils";

const CATEGORIES = [
  "Inverter Issue",
  "Solar Panels Not Producing",
  "Battery Issue",
  "Monitoring/App Issue",
  "Wiring Problem",
  "Installation Issue",
  "Maintenance Request",
  "Net Metering Issue",
  "Billing Issue",
  "Warranty Claim",
  "Service Request",
  "Other",
];

const STATUSES = [
  "New",
  "Pending Review",
  "Assigned",
  "In Progress",
  "Waiting for Customer",
  "Resolved",
  "Closed",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Pending Review": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Assigned: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "In Progress": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Waiting for Customer": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Resolved: "bg-green-500/10 text-green-400 border-green-500/20",
  Closed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-zinc-500/10 text-zinc-400",
  Medium: "bg-blue-500/10 text-blue-400",
  High: "bg-orange-500/10 text-orange-400",
  Urgent: "bg-red-500/10 text-red-400",
};

type Complaint = {
  id: number;
  complaintId: string;
  fullName: string;
  phone: string;
  email: string | null;
  address: string | null;
  projectId: string | null;
  installedBy: string | null;
  category: string;
  subject: string;
  description: string;
  contactMethod: string;
  contactTime: string | null;
  screenshotUrl: string | null;
  attachmentUrl: string | null;
  resolutionProof: string | null;
  status: string;
  priority: string;
  assignedToId: number | null;
  assignedTo: { id: number; name: string; role: string } | null;
  _count: { notes: number };
  createdAt: string;
  updatedAt: string;
};

type ComplaintDetail = Complaint & {
  notes: Array<{
    id: number;
    content: string;
    createdAt: string;
    author: { id: number; name: string; role: string };
  }>;
  history: Array<{
    id: number;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
    changedBy: { id: number; name: string } | null;
  }>;
};

type Stats = {
  new: number;
  inProgress: number;
  resolved: number;
  urgent: number;
};

export default function ComplaintsPortalPage() {
  const { user } = useStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<Stats>({ new: 0, inProgress: 0, resolved: 0, urgent: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  // Detail modal
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ComplaintDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string; role: string }>>([]);

  const userRoles = (user?.role || "").split(",").map(r => r.trim());
  const canAssign = user && userRoles.some(r => ["Admin", "Super Admin", "Management", "HR", "Accountant", "Sales & Marketing Department"].includes(r));
  const isFieldStaff = user && userRoles.includes("Field Staff");

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionProof, setResolutionProof] = useState("");
  const [uploadingResolveFile, setUploadingResolveFile] = useState(false);
  const [resolveUploadError, setResolveUploadError] = useState<string | null>(null);
  const [pendingStatusValue, setPendingStatusValue] = useState("");

  // Edit Complaint states
  const [isEditingComplaint, setIsEditingComplaint] = useState(false);
  const [editCompFullName, setEditCompFullName] = useState("");
  const [editCompPhone, setEditCompPhone] = useState("");
  const [editCompEmail, setEditCompEmail] = useState("");
  const [editCompAddress, setEditCompAddress] = useState("");
  const [editCompProjectId, setEditCompProjectId] = useState("");
  const [editCompCategory, setEditCompCategory] = useState("");
  const [editCompSubject, setEditCompSubject] = useState("");
  const [editCompDescription, setEditCompDescription] = useState("");
  const [editCompContactMethod, setEditCompContactMethod] = useState("Phone");
  const [editCompContactTime, setEditCompContactTime] = useState("");
  const [editCompInstalledBy, setEditCompInstalledBy] = useState("");

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      if (filterCategory) params.set("category", filterCategory);
      if (filterPriority) params.set("priority", filterPriority);
      params.set("page", String(page));

      const res = await fetch(`/api/complaints?${params}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints);
        setStats(data.stats);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterCategory, filterPriority, page]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    // Fetch users for assignment dropdown (admins / managers only)
    if (canAssign) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => { if (d.users) setAllUsers(d.users); })
        .catch(() => {});
    }
  }, [canAssign]);

  async function openDetail(id: number) {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/complaints/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data.complaint);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (detail) {
      setEditCompFullName(detail.fullName || "");
      setEditCompPhone(detail.phone || "");
      setEditCompEmail(detail.email || "");
      setEditCompAddress(detail.address || "");
      setEditCompProjectId(detail.projectId || "");
      setEditCompInstalledBy(detail.installedBy || "");
      setEditCompCategory(detail.category || "Other");
      setEditCompSubject(detail.subject || "");
      setEditCompDescription(detail.description || "");
      setEditCompContactMethod(detail.contactMethod || "Phone");
      setEditCompContactTime(detail.contactTime || "");
      setIsEditingComplaint(false);
    }
  }, [detail]);

  async function handleSaveComplaintEdit() {
    if (!detail) return;
    try {
      setUpdateLoading(true);
      const res = await fetch(`/api/complaints/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editCompFullName,
          phone: editCompPhone,
          email: editCompEmail,
          address: editCompAddress,
          projectId: editCompProjectId,
          installedBy: editCompInstalledBy,
          category: editCompCategory,
          subject: editCompSubject,
          description: editCompDescription,
          contactMethod: editCompContactMethod,
          contactTime: editCompContactTime,
        }),
      });
      if (res.ok) {
        // Refresh detail view
        openDetail(detail.id);
        fetchComplaints();
        setIsEditingComplaint(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update complaint details");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving complaint changes");
    } finally {
      setUpdateLoading(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setNoteText("");
  }

  async function handleUpdate(field: string, value: string | number | null) {
    if (!detail) return;

    if (field === "status" && ["Resolved", "Closed"].includes(String(value))) {
      if (!detail.resolutionProof && !resolutionProof) {
        setPendingStatusValue(String(value));
        setShowResolveModal(true);
        return;
      }
    }

    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/complaints/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: value,
          resolutionProof: resolutionProof || undefined
        }),
      });
      if (res.ok) {
        setResolutionProof("");
        await openDetail(detail.id);
        fetchComplaints();
      } else {
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdateLoading(false);
    }
  }

  async function handleResolveFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResolveFile(true);
    setResolveUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", "attachment");

      const res = await fetch("/api/complaints/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.fileUrl) {
        setResolutionProof(data.fileUrl);
      } else {
        setResolveUploadError(data.error || "Failed to upload resolution proof");
      }
    } catch (err) {
      console.error(err);
      setResolveUploadError("Error uploading file. Please try again.");
    } finally {
      setUploadingResolveFile(false);
    }
  }

  async function submitComplaintResolution() {
    if (!resolutionProof) {
      alert("Please upload a resolution proof file.");
      return;
    }
    setShowResolveModal(false);
    await handleUpdate("status", pendingStatusValue);
  }

  async function handleAddNote() {
    if (!detail || !noteText.trim()) return;
    setNoteSubmitting(true);
    try {
      const res = await fetch(`/api/complaints/${detail.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText }),
      });
      if (res.ok) {
        setNoteText("");
        await openDetail(detail.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNoteSubmitting(false);
    }
  }

  function formatDate(iso: string) {
    return formatPKTDateDisplay(iso);
  }

  function formatDateTime(iso: string) {
    return formatPKTDateTimeDisplay(iso);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-amber-400" />
            Complaints
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {total} total complaint{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/register-complaint"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:text-white hover:border-amber-500/40 transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Public Form
          </a>
          <button
            onClick={fetchComplaints}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "New", value: stats.new, icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Urgent", value: stats.urgent, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">{s.label}</span>
              <div className={`${s.bg} p-1.5 rounded-lg`}>
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search complaints..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full glass-input rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="glass-input rounded-lg pl-8 pr-8 py-2 text-sm text-white focus:outline-none appearance-none"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="glass-input rounded-lg px-3 pr-8 py-2 text-sm text-white focus:outline-none appearance-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterPriority}
            onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
            className="glass-input rounded-lg px-3 pr-8 py-2 text-sm text-white focus:outline-none appearance-none"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p} className="bg-zinc-900">{p}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
        </div>
        {(filterStatus || filterCategory || filterPriority || search) && (
          <button
            onClick={() => { setSearch(""); setFilterStatus(""); setFilterCategory(""); setFilterPriority(""); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:text-white transition"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No complaints found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assignee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition group">
                    <td className="px-4 py-3 font-mono text-xs text-amber-400">{c.complaintId}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-200 text-xs">{c.fullName}</p>
                      <p className="text-zinc-500 text-xs">{c.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{c.category}</td>
                    <td className="px-4 py-3 text-xs text-zinc-300 max-w-48 truncate">{c.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[c.status] || "bg-zinc-500/10 text-zinc-400"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[c.priority] || ""}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {c.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-zinc-800 border border-zinc-750 flex items-center justify-center font-bold text-[9px] text-amber-500">
                            {c.assignedTo.name.charAt(0)}
                          </div>
                          <span>{c.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      {c._count.notes > 0 && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <MessageSquare className="h-3 w-3" />
                          {c._count.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(c.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 transition opacity-0 group-hover:opacity-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 disabled:opacity-40 hover:bg-zinc-700 transition"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 disabled:opacity-40 hover:bg-zinc-700 transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl h-full bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <div>
                <p className="text-xs text-zinc-550">Complaint Detail</p>
                <p className="font-black text-amber-400 font-mono">
                  {detail?.complaintId || "Loading..."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {detail && !isFieldStaff && (
                  <button
                    onClick={() => setIsEditingComplaint(!isEditingComplaint)}
                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    {isEditingComplaint ? "Cancel" : "Edit Details"}
                  </button>
                )}
                <button onClick={closeDetail} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : detail ? (
              <div className="flex-1 p-5 space-y-6">
                {isEditingComplaint ? (
                  <div className="space-y-4 text-xs">
                    <h4 className="text-sm font-bold text-white mb-2">Edit Complaint Fields</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">Customer Full Name</label>
                        <input
                          type="text"
                          value={editCompFullName}
                          onChange={(e) => setEditCompFullName(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-950 text-white focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">Phone Number</label>
                        <input
                          type="text"
                          value={editCompPhone}
                          onChange={(e) => setEditCompPhone(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-950 text-white focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">Email Address</label>
                        <input
                          type="email"
                          value={editCompEmail}
                          onChange={(e) => setEditCompEmail(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-955 text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">Project ID</label>
                        <input
                          type="text"
                          value={editCompProjectId}
                          onChange={(e) => setEditCompProjectId(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-955 text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">System Installed By</label>
                        <select
                          value={editCompInstalledBy}
                          onChange={(e) => setEditCompInstalledBy(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-955 text-white focus:outline-none"
                        >
                          <option value="">Select Installer...</option>
                          <option value="Askari solar">Askari Solar Energy</option>
                          <option value="Other company">Other company</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">Complaint Category</label>
                        <select
                          value={editCompCategory}
                          onChange={(e) => setEditCompCategory(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-950 text-white focus:outline-none"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">Site Address</label>
                        <input
                          type="text"
                          value={editCompAddress}
                          onChange={(e) => setEditCompAddress(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-950 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">Preferred Contact Method</label>
                        <select
                          value={editCompContactMethod}
                          onChange={(e) => setEditCompContactMethod(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-950 text-white focus:outline-none"
                        >
                          <option value="Phone">Phone</option>
                          <option value="Email">Email</option>
                          <option value="WhatsApp">WhatsApp</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-555 uppercase">Preferred Contact Time</label>
                        <input
                          type="text"
                          value={editCompContactTime}
                          onChange={(e) => setEditCompContactTime(e.target.value)}
                          className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-950 text-white focus:outline-none"
                          placeholder="e.g. 10 AM - 2 PM"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-555 uppercase">Subject</label>
                      <input
                        type="text"
                        value={editCompSubject}
                        onChange={(e) => setEditCompSubject(e.target.value)}
                        className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-950 text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-555 uppercase">Complaint Description</label>
                      <textarea
                        value={editCompDescription}
                        onChange={(e) => setEditCompDescription(e.target.value)}
                        rows={4}
                        className="w-full block glass-input rounded-xl px-3 py-2 mt-1 bg-zinc-950 text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setIsEditingComplaint(false)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveComplaintEdit}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        {updateLoading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Customer</p>
                    <p className="font-semibold text-zinc-200">{detail.fullName}</p>
                    <p className="text-zinc-400 text-xs">{detail.phone}</p>
                    {detail.email && <p className="text-zinc-400 text-xs">{detail.email}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Category</p>
                    <p className="font-semibold text-zinc-200">{detail.category}</p>
                    {detail.address && <p className="text-zinc-400 text-xs mt-1">{detail.address}</p>}
                    {detail.projectId && <p className="text-zinc-400 text-xs">Project: {detail.projectId}</p>}
                    {detail.installedBy && <p className="text-zinc-400 text-xs mt-0.5">Installed By: <span className="text-amber-500 font-semibold">{detail.installedBy}</span></p>}
                  </div>
                </div>

                {/* Subject & Description */}
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-zinc-400 mb-1">Subject</p>
                  <p className="font-semibold text-zinc-200 mb-3">{detail.subject}</p>
                  <p className="text-xs font-semibold text-zinc-400 mb-1">Description</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{detail.description}</p>
                </div>

                {/* Attachments */}
                {(detail.screenshotUrl || detail.attachmentUrl) && (
                  <div className="flex gap-3">
                    {detail.screenshotUrl && (
                      <a href={detail.screenshotUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:text-white transition border border-zinc-700">
                        <ExternalLink className="h-3.5 w-3.5" /> Screenshot
                      </a>
                    )}
                    {detail.attachmentUrl && (
                      <a href={detail.attachmentUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:text-white transition border border-zinc-700">
                        <ExternalLink className="h-3.5 w-3.5" /> Attachment
                      </a>
                    )}
                  </div>
                )}

                {/* Resolution Time Statistics (Requirement 3) */}
                {detail && ["Resolved", "Closed"].includes(detail.status) && (() => {
                  let assignedAt = new Date(detail.createdAt);
                  const assignHistory = detail.history.find(h => h.field === "assignedTo" && h.newValue !== null);
                  if (assignHistory) {
                    assignedAt = new Date(assignHistory.createdAt);
                  }
                  
                  let resolvedAt = new Date(detail.updatedAt);
                  const resolveHistory = detail.history.find(h => h.field === "status" && ["Resolved", "Closed"].includes(h.newValue || ""));
                  if (resolveHistory) {
                    resolvedAt = new Date(resolveHistory.createdAt);
                  }

                  const diffMs = resolvedAt.getTime() - assignedAt.getTime();
                  const diffHours = diffMs / (1000 * 60 * 60);

                  const displayTime = diffHours < 1 
                    ? `${Math.round(diffHours * 60)} minutes`
                    : diffHours < 24 
                      ? `${diffHours.toFixed(1)} hours` 
                      : `${(diffHours / 24).toFixed(1)} days`;

                  const isWithin24h = diffHours <= 24;

                  return (
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-2">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Complaint Resolution Performance</p>
                      <div className="flex items-center justify-between text-xs border-b border-zinc-850/50 pb-1.5">
                        <span className="text-zinc-550">Resolution Time:</span>
                        <strong className="text-zinc-200">{displayTime}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-zinc-550">Standard Status (24h):</span>
                        {isWithin24h ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Resolved within 24 Hours
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Exceeded 24 Hours
                          </span>
                        )}
                      </div>
                      {detail.resolutionProof && (
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800 mt-2">
                          <span className="text-zinc-550">Resolution Proof:</span>
                          <a
                            href={detail.resolutionProof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-amber-550 hover:text-amber-400 font-bold"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>View Proof</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Overdue Check for Unresolved (Requirement 3) */}
                {detail && !["Resolved", "Closed"].includes(detail.status) && (() => {
                  let assignedAt = new Date(detail.createdAt);
                  const assignHistory = detail.history.find(h => h.field === "assignedTo" && h.newValue !== null);
                  if (assignHistory) {
                    assignedAt = new Date(assignHistory.createdAt);
                  }

                  const diffMs = new Date().getTime() - assignedAt.getTime();
                  const diffHours = diffMs / (1000 * 60 * 60);

                  if (diffHours > 24) {
                    return (
                      <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-2 text-xs text-red-400">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 animate-pulse" />
                        <span><strong>Warning:</strong> This complaint is overdue by {(diffHours - 24).toFixed(1)} hours (exceeded 24h limit since assignment/creation).</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Controls */}
                {canAssign && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1.5">Status</p>
                      <div className="relative">
                        <select
                          value={detail.status}
                          onChange={(e) => handleUpdate("status", e.target.value)}
                          disabled={updateLoading}
                          className="w-full glass-input rounded-lg px-3 py-2 pr-8 text-sm text-white focus:outline-none appearance-none bg-zinc-900"
                        >
                          {STATUSES.map((s) => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1.5">Priority</p>
                      <div className="relative">
                        <select
                          value={detail.priority}
                          onChange={(e) => handleUpdate("priority", e.target.value)}
                          disabled={updateLoading}
                          className="w-full glass-input rounded-lg px-3 py-2 pr-8 text-sm text-white focus:outline-none appearance-none bg-zinc-900"
                        >
                          {PRIORITIES.map((p) => <option key={p} value={p} className="bg-zinc-900">{p}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1.5">Assign To</p>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                        <select
                          value={detail.assignedToId ?? ""}
                          onChange={(e) => handleUpdate("assignedToId", e.target.value ? parseInt(e.target.value) : null)}
                          disabled={updateLoading}
                          className="w-full glass-input rounded-lg pl-8 pr-8 py-2 text-sm text-white focus:outline-none appearance-none bg-zinc-900"
                        >
                          <option value="">Unassigned</option>
                          {allUsers.map((u) => <option key={u.id} value={u.id} className="bg-zinc-900">{u.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                {!canAssign && isFieldStaff && detail.assignedToId === user?.id && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1.5">Status</p>
                      <div className="relative">
                        <select
                          value={detail.status}
                          onChange={(e) => handleUpdate("status", e.target.value)}
                          disabled={updateLoading}
                          className="w-full glass-input rounded-lg px-3 py-2 pr-8 text-sm text-white focus:outline-none appearance-none bg-zinc-900"
                        >
                          {STATUSES.map((s) => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1.5">Assignee</p>
                      <div className="p-2.5 bg-zinc-800/40 rounded-lg text-xs text-zinc-300 font-semibold border border-zinc-800">
                        Assigned to You
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Internal Notes ({detail.notes.length})
                  </p>
                  <div className="space-y-3 mb-4">
                    {detail.notes.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic">No notes yet.</p>
                    ) : (
                      detail.notes.map((n) => (
                        <div key={n.id} className="bg-zinc-800/60 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-amber-400">{n.author.name}</span>
                            <span className="text-xs text-zinc-600">{formatDateTime(n.createdAt)}</span>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      placeholder="Add an internal note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      className="flex-1 glass-input rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none resize-none"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={noteSubmitting || !noteText.trim()}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 transition"
                    >
                      {noteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* History */}
                {detail.history.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" /> Change History
                    </p>
                    <div className="space-y-2">
                      {detail.history.map((h) => (
                        <div key={h.id} className="flex items-start gap-2 text-xs text-zinc-500">
                          <span className="shrink-0 text-zinc-700">•</span>
                          <span>
                            {h.changedBy ? (
                              <span className="text-zinc-400">{h.changedBy.name}</span>
                            ) : (
                              <span className="text-zinc-600">System</span>
                            )}{" "}
                            changed <span className="text-zinc-300">{h.field}</span>
                            {h.oldValue && (
                              <> from <span className="text-zinc-400">{h.oldValue}</span></>
                            )}{" "}
                            to <span className="text-amber-400">{h.newValue}</span>
                            <span className="text-zinc-700 ml-2">{formatDateTime(h.createdAt)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
          </div>
        </div>
      )}

      {/* --- RESOLVE PROOF UPLOAD MODAL --- */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                <span>Upload Resolution Proof</span>
              </h3>
              <button onClick={() => { setShowResolveModal(false); setResolutionProof(""); }} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-normal font-sans">
              You are marking this complaint as <strong className="text-amber-500">{pendingStatusValue}</strong>.
              A resolution proof file (e.g. photo, report, or receipt) is required to complete this action.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Resolution Proof File</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    required
                    onChange={handleResolveFileChange}
                    className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 file:cursor-pointer"
                  />
                </div>
                {uploadingResolveFile && <p className="text-[10px] text-amber-500 animate-pulse">Uploading file...</p>}
                {resolveUploadError && <p className="text-[10px] text-red-400">{resolveUploadError}</p>}
                {resolutionProof && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>File uploaded successfully!</span>
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setShowResolveModal(false); setResolutionProof(""); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={uploadingResolveFile || !resolutionProof}
                  onClick={submitComplaintResolution}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Resolution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
