"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import {
  TrendingUp,
  Search,
  Filter,
  Calendar,
  CheckSquare,
  MessageSquare,
  Star,
  Users,
  Eye,
  X,
  Building,
  UserCheck,
  Briefcase,
  AlertCircle,
  Sun,
  Target,
  Sparkles,
} from "lucide-react";

export default function PerformancePage() {
  const { user: currentAdmin } = useStore();
  const [performanceList, setPerformanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<"all" | "field" | "sales" | "office" | "management">("all");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"attendance" | "tasks" | "complaints" | "feedback" | "crm">("attendance");

  useEffect(() => {
    async function fetchPerformance() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/performance");
        if (res.ok) {
          const data = await res.json();
          setPerformanceList(data.performance || []);
        }
      } catch (err) {
        console.error("Failed to fetch performance stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPerformance();
  }, []);

  const filteredList = performanceList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept ? p.department === selectedDept : true;

    let matchesCategory = true;
    if (selectedCategoryTab === "field") matchesCategory = p.isFieldStaff;
    else if (selectedCategoryTab === "sales") matchesCategory = p.isSales;
    else if (selectedCategoryTab === "management") matchesCategory = p.isManagement;
    else if (selectedCategoryTab === "office") matchesCategory = !p.isFieldStaff && !p.isManagement;

    return matchesSearch && matchesDept && matchesCategory;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 75) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    if (score >= 50) return "text-orange-400 border-orange-500/30 bg-orange-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  const getDepartmentBadgeColor = (dept: string) => {
    switch (dept) {
      case "Management": return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "HR": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "Accounts": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "Sales": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Field": return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
      default: return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  const departmentsList = Array.from(new Set(performanceList.map((p) => p.department)));

  return (
    <div className="space-y-6 animate-fade-in relative z-10 text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-amber-500" />
            <span>Staff Performance Evaluation</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Department-calibrated performance metrics: Field Staff (Attendance+Tasks+Complaints+Feedback), Sales & Office (Attendance+Tasks+CRM), Management (Tasks).
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex-wrap">
          <button
            onClick={() => setSelectedCategoryTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedCategoryTab === "all" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            All Personnel ({performanceList.length})
          </button>
          <button
            onClick={() => setSelectedCategoryTab("field")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedCategoryTab === "field" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Technical / Field Staff
          </button>
          <button
            onClick={() => setSelectedCategoryTab("sales")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedCategoryTab === "sales" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Sales & Marketing
          </button>
          <button
            onClick={() => setSelectedCategoryTab("office")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedCategoryTab === "office" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Office Staff
          </button>
          <button
            onClick={() => setSelectedCategoryTab("management")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedCategoryTab === "management" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Management
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/80">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full block glass-input rounded-xl pl-9 pr-3 py-2 text-white bg-zinc-950 focus:outline-none"
            placeholder="Search by name, role, email..."
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-44">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full block glass-input rounded-xl pl-9 pr-3 py-2 text-white bg-zinc-950 focus:outline-none appearance-none"
            >
              <option value="">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Building className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-500 animate-pulse text-sm">
          Loading performance evaluation matrix...
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-zinc-300">
              <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Staff Member</th>
                  <th className="px-5 py-3.5 font-bold">Category & Dept</th>
                  <th className="px-4 py-3.5 font-bold text-center">Attendance %</th>
                  <th className="px-4 py-3.5 font-bold text-center">Tasks %</th>
                  <th className="px-4 py-3.5 font-bold text-center">Complaints %</th>
                  <th className="px-4 py-3.5 font-bold text-center">Feedback %</th>
                  <th className="px-4 py-3.5 font-bold text-center">CRM %</th>
                  <th className="px-5 py-3.5 font-bold text-center">Overall</th>
                  <th className="px-4 py-3.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length > 0 ? (
                  filteredList.map((item) => (
                    <tr key={item.userId} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                      <td className="px-5 py-3.5 font-bold text-zinc-200">
                        <div>{item.name}</div>
                        <div className="text-[10px] text-zinc-500 font-normal mt-0.5">{item.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-zinc-300 font-medium">{item.role}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 inline-block ${getDepartmentBadgeColor(item.department)}`}>
                          {item.categoryGroup} ({item.department})
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {item.metrics.attendance.score !== null ? `${Math.round(item.metrics.attendance.score)}%` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {item.metrics.tasks.score !== null ? `${Math.round(item.metrics.tasks.score)}%` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {item.metrics.complaints.score !== null ? `${Math.round(item.metrics.complaints.score)}%` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {item.metrics.feedback.score !== null ? `${Math.round(item.metrics.feedback.score)}%` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {item.metrics.crm.score !== null ? `${Math.round(item.metrics.crm.score)}%` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black border ${getScoreColor(item.overallScore)}`}>
                          {item.overallScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => { setSelectedStaff(item); setActiveTab("attendance"); }}
                          className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-zinc-500 italic">
                      No personnel matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drilldown Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-500" />
                  <span>{selectedStaff.name} — Performance Profile</span>
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {selectedStaff.role} • {selectedStaff.categoryGroup} ({selectedStaff.department} Dept)
                </p>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Score Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase">Attendance</span>
                <span className="text-sm font-black font-mono text-zinc-200 mt-1 block">
                  {selectedStaff.metrics.attendance.score !== null ? `${Math.round(selectedStaff.metrics.attendance.score)}%` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase">Tasks</span>
                <span className="text-sm font-black font-mono text-zinc-200 mt-1 block">
                  {selectedStaff.metrics.tasks.score !== null ? `${Math.round(selectedStaff.metrics.tasks.score)}%` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase">Complaints</span>
                <span className="text-sm font-black font-mono text-zinc-200 mt-1 block">
                  {selectedStaff.metrics.complaints.score !== null ? `${Math.round(selectedStaff.metrics.complaints.score)}%` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase">Feedback</span>
                <span className="text-sm font-black font-mono text-zinc-200 mt-1 block">
                  {selectedStaff.metrics.feedback.score !== null ? `${Math.round(selectedStaff.metrics.feedback.score)}%` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase">CRM Leads</span>
                <span className="text-sm font-black font-mono text-zinc-200 mt-1 block">
                  {selectedStaff.metrics.crm.score !== null ? `${Math.round(selectedStaff.metrics.crm.score)}%` : "N/A"}
                </span>
              </div>
            </div>

            {/* Drilldown Tabs */}
            <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl w-fit flex-wrap">
              <button
                onClick={() => setActiveTab("attendance")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "attendance" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                Attendance ({selectedStaff.metrics.attendance.total})
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "tasks" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                Tasks ({selectedStaff.metrics.tasks.total})
              </button>
              <button
                onClick={() => setActiveTab("complaints")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "complaints" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                Complaints ({selectedStaff.metrics.complaints.total})
              </button>
              <button
                onClick={() => setActiveTab("feedback")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "feedback" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                Feedback ({selectedStaff.metrics.feedback.total})
              </button>
              <button
                onClick={() => setActiveTab("crm")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "crm" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                CRM Leads ({selectedStaff.metrics.crm.total})
              </button>
            </div>

            {/* Drilldown Content */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 min-h-[160px]">
              {activeTab === "attendance" && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-emerald-400 font-bold text-base block">{selectedStaff.metrics.attendance.present}</span>
                    <span className="text-[10px] text-zinc-400">Present</span>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-amber-400 font-bold text-base block">{selectedStaff.metrics.attendance.late}</span>
                    <span className="text-[10px] text-zinc-400">Late</span>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-purple-400 font-bold text-base block">{selectedStaff.metrics.attendance.halfDay}</span>
                    <span className="text-[10px] text-zinc-400">Half Day</span>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-blue-400 font-bold text-base block">{selectedStaff.metrics.attendance.leave}</span>
                    <span className="text-[10px] text-zinc-400">Leave</span>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-red-400 font-bold text-base block">{selectedStaff.metrics.attendance.absent}</span>
                    <span className="text-[10px] text-zinc-400">Absent</span>
                  </div>
                </div>
              )}

              {activeTab === "tasks" && (
                <div className="space-y-2">
                  {selectedStaff.metrics.tasks.items.length > 0 ? (
                    selectedStaff.metrics.tasks.items.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <div>
                          <p className="font-semibold text-zinc-200">{t.title}</p>
                          <p className="text-[10px] text-zinc-500">Due: {t.dueDate || "No deadline"}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-500 text-center py-6">No tasks recorded.</p>
                  )}
                </div>
              )}

              {activeTab === "complaints" && (
                <div className="space-y-2">
                  {selectedStaff.metrics.complaints.items.length > 0 ? (
                    selectedStaff.metrics.complaints.items.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <div>
                          <p className="font-semibold text-zinc-200">{c.complaintId}: {c.subject}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ["Resolved", "Closed"].includes(c.status) ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-500 text-center py-6">No complaints assigned.</p>
                  )}
                </div>
              )}

              {activeTab === "feedback" && (
                <div className="space-y-2">
                  {selectedStaff.metrics.feedback.items.length > 0 ? (
                    selectedStaff.metrics.feedback.items.map((fb: any) => (
                      <div key={fb.id} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-200">{fb.customerName}</span>
                          <span className="text-amber-400 font-bold">★ {fb.overallRating} / 5</span>
                        </div>
                        {fb.commentsSuggestions && (
                          <p className="text-zinc-400 text-[11px] mt-1 italic">"{fb.commentsSuggestions}"</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-500 text-center py-6">No customer feedback matched.</p>
                  )}
                </div>
              )}

              {activeTab === "crm" && (
                <div className="space-y-2">
                  {selectedStaff.metrics.crm.items.length > 0 ? (
                    selectedStaff.metrics.crm.items.map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <div>
                          <p className="font-semibold text-zinc-200">{l.name}</p>
                          <p className="text-[10px] text-zinc-500">{l.city}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === "Won" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {l.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-500 text-center py-6">No CRM leads recorded.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
