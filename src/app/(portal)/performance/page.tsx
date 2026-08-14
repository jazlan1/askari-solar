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
  AlertCircle
} from "lucide-react";

export default function PerformancePage() {
  const { user: currentAdmin } = useStore();
  const [performanceList, setPerformanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"attendance" | "tasks" | "complaints" | "feedback">("attendance");

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
    return matchesSearch && matchesDept;
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

  const fieldStaffList = filteredList.filter((p) => p.isFieldStaff);
  const officeStaffList = filteredList.filter((p) => !p.isFieldStaff);

  return (
    <div className="space-y-6 animate-fade-in relative z-10 text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-amber-500" />
            <span>Staff Performance Evaluation</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Review aggregated performance statistics across attendance, tasks, complaints, and feedback.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/80">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full block glass-input rounded-xl pl-9 pr-3 py-2 text-white bg-zinc-950 focus:outline-none"
            placeholder="Search by name, role, email..."
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-650" />
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
            <Building className="absolute left-3 top-2.5 h-4 w-4 text-zinc-650" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-500 animate-pulse text-sm">Loading staff evaluation roster...</div>
      ) : (
        <div className="space-y-8">
          {/* Field Staff Section */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
            <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Briefcase className="h-4.5 w-4.5" />
              <span>Field Operations Staff ({fieldStaffList.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-zinc-300">
                <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 font-bold">Staff Name</th>
                    <th className="px-6 py-3.5 font-bold">Department</th>
                    <th className="px-6 py-3.5 font-bold text-center">Attendance %</th>
                    <th className="px-6 py-3.5 font-bold text-center">Tasks %</th>
                    <th className="px-6 py-3.5 font-bold text-center">Complaints %</th>
                    <th className="px-6 py-3.5 font-bold text-center">Feedback %</th>
                    <th className="px-6 py-3.5 font-bold text-center">Overall</th>
                    <th className="px-6 py-3.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldStaffList.length > 0 ? (
                    fieldStaffList.map((item) => (
                      <tr key={item.userId} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                        <td className="px-6 py-3.5 font-bold text-zinc-200">
                          <div>{item.name}</div>
                          <div className="text-[10px] text-zinc-500 font-normal mt-0.5">{item.role}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getDepartmentBadgeColor(item.department)}`}>
                            {item.department}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono">
                          {item.metrics.attendance.score !== null ? `${Math.round(item.metrics.attendance.score)}%` : "N/A"}
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono">
                          {item.metrics.tasks.score !== null ? `${Math.round(item.metrics.tasks.score)}%` : "N/A"}
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono">
                          {item.metrics.complaints.score !== null ? `${Math.round(item.metrics.complaints.score)}%` : "N/A"}
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono">
                          {item.metrics.feedback.score !== null ? `${Math.round(item.metrics.feedback.score)}%` : "N/A"}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black border ${getScoreColor(item.overallScore)}`}>
                            {item.overallScore}%
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => { setSelectedStaff(item); setActiveTab("attendance"); }}
                            className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
                            title="View Efficacy Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-zinc-550 italic">No field staff matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Office/Administration/Marketing/Accounts Staff Section */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
            <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="h-4.5 w-4.5" />
              <span>Office & Administration Staff ({officeStaffList.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-zinc-300">
                <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 font-bold">Staff Name</th>
                    <th className="px-6 py-3.5 font-bold">Department</th>
                    <th className="px-6 py-3.5 font-bold text-center">Attendance %</th>
                    <th className="px-6 py-3.5 font-bold text-center">Tasks %</th>
                    <th className="px-6 py-3.5 font-bold text-center">Overall</th>
                    <th className="px-6 py-3.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {officeStaffList.length > 0 ? (
                    officeStaffList.map((item) => (
                      <tr key={item.userId} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                        <td className="px-6 py-3.5 font-bold text-zinc-200">
                          <div>{item.name}</div>
                          <div className="text-[10px] text-zinc-500 font-normal mt-0.5">{item.role}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getDepartmentBadgeColor(item.department)}`}>
                            {item.department}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono">
                          {item.metrics.attendance.score !== null ? `${Math.round(item.metrics.attendance.score)}%` : "N/A"}
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono">
                          {item.metrics.tasks.score !== null ? `${Math.round(item.metrics.tasks.score)}%` : "N/A"}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black border ${getScoreColor(item.overallScore)}`}>
                            {item.overallScore}%
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => { setSelectedStaff(item); setActiveTab("attendance"); }}
                            className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
                            title="View Efficacy Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-550 italic">No office staff matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- DRILLDOWN MODAL DETAILS CARD --- */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-500" />
                  <span>{selectedStaff.name} - Performance Profile</span>
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">{selectedStaff.role} ({selectedStaff.department} Dept)</p>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Overall stats strip */}
            <div className="grid grid-cols-4 gap-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-850 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Attendance</span>
                <span className="text-sm font-black font-mono text-zinc-200 mt-1 block">
                  {selectedStaff.metrics.attendance.score !== null ? `${Math.round(selectedStaff.metrics.attendance.score)}%` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Tasks</span>
                <span className="text-sm font-black font-mono text-zinc-200 mt-1 block">
                  {selectedStaff.metrics.tasks.score !== null ? `${Math.round(selectedStaff.metrics.tasks.score)}%` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Complaints</span>
                <span className="text-sm font-black font-mono text-zinc-200 mt-1 block">
                  {selectedStaff.metrics.complaints.score !== null ? `${Math.round(selectedStaff.metrics.complaints.score)}%` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Overall Efficacy</span>
                <span className={`text-sm font-black font-mono mt-1 block ${selectedStaff.overallScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedStaff.overallScore}%
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-zinc-800 text-[11px] font-bold">
              <button
                onClick={() => setActiveTab("attendance")}
                className={`px-4 py-2 flex items-center gap-1.5 border-b-2 transition ${activeTab === "attendance" ? "border-amber-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                <Calendar className="h-4 w-4" />
                <span>Attendance Log</span>
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                className={`px-4 py-2 flex items-center gap-1.5 border-b-2 transition ${activeTab === "tasks" ? "border-amber-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                <CheckSquare className="h-4 w-4" />
                <span>Tasks Summary ({selectedStaff.metrics.tasks.total})</span>
              </button>
              {selectedStaff.isFieldStaff && (
                <>
                  <button
                    onClick={() => setActiveTab("complaints")}
                    className={`px-4 py-2 flex items-center gap-1.5 border-b-2 transition ${activeTab === "complaints" ? "border-amber-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Complaints Resolved ({selectedStaff.metrics.complaints.total})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("feedback")}
                    className={`px-4 py-2 flex items-center gap-1.5 border-b-2 transition ${activeTab === "feedback" ? "border-amber-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <Star className="h-4 w-4" />
                    <span>Customer Feedback ({selectedStaff.metrics.feedback.total})</span>
                  </button>
                </>
              )}
            </div>

            {/* Tab content panel */}
            <div className="min-h-[160px]">
              {activeTab === "attendance" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2 bg-zinc-950/20 p-3 rounded-lg border border-zinc-850 text-center text-[10px]">
                    <div className="p-2 border-r border-zinc-850/60">
                      <span className="text-zinc-500 font-semibold block uppercase">Present</span>
                      <span className="text-xs font-extrabold text-zinc-200 mt-1 block">{selectedStaff.metrics.attendance.present} Days</span>
                    </div>
                    <div className="p-2 border-r border-zinc-850/60">
                      <span className="text-zinc-500 font-semibold block uppercase">Late Check-In</span>
                      <span className="text-xs font-extrabold text-amber-400 mt-1 block">{selectedStaff.metrics.attendance.late} Days</span>
                    </div>
                    <div className="p-2 border-r border-zinc-850/60">
                      <span className="text-zinc-500 font-semibold block uppercase">Half Day</span>
                      <span className="text-xs font-extrabold text-orange-400 mt-1 block">{selectedStaff.metrics.attendance.halfDay} Days</span>
                    </div>
                    <div className="p-2 border-r border-zinc-850/60">
                      <span className="text-zinc-500 font-semibold block uppercase">Leave</span>
                      <span className="text-xs font-extrabold text-blue-400 mt-1 block">{selectedStaff.metrics.attendance.leave} Days</span>
                    </div>
                    <div className="p-2">
                      <span className="text-zinc-500 font-semibold block uppercase">Absent</span>
                      <span className="text-xs font-extrabold text-red-400 mt-1 block">{selectedStaff.metrics.attendance.absent} Days</span>
                    </div>
                  </div>
                  {selectedStaff.metrics.attendance.total === 0 && (
                    <p className="text-zinc-500 italic text-center py-4">No attendance checks recorded in the system.</p>
                  )}
                </div>
              )}

              {activeTab === "tasks" && (
                <div className="space-y-2">
                  {selectedStaff.metrics.tasks.items.length > 0 ? (
                    <div className="max-h-[220px] overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-800/40">
                      {selectedStaff.metrics.tasks.items.map((task: any) => (
                        <div key={task.id} className="flex justify-between items-center p-3 hover:bg-zinc-950/20">
                          <div>
                            <span className="font-semibold text-zinc-300">{task.title}</span>
                            <span className="block text-[10px] text-zinc-500 mt-0.5">Due: {task.dueDate}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${task.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                            {task.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 italic text-center py-4">No tasks assigned to this employee.</p>
                  )}
                </div>
              )}

              {activeTab === "complaints" && (
                <div className="space-y-2">
                  {selectedStaff.metrics.complaints.items.length > 0 ? (
                    <div className="max-h-[220px] overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-800/40">
                      {selectedStaff.metrics.complaints.items.map((comp: any) => (
                        <div key={comp.id} className="flex justify-between items-center p-3 hover:bg-zinc-950/20">
                          <div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">{comp.complaintId}</span>
                            <span className="block font-semibold text-zinc-300 mt-0.5">{comp.subject}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${["Resolved", "Closed"].includes(comp.status) ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                            {comp.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 italic text-center py-4">No complaints assigned to this employee.</p>
                  )}
                </div>
              )}

              {activeTab === "feedback" && (
                <div className="space-y-2">
                  {selectedStaff.metrics.feedback.items.length > 0 ? (
                    <div className="max-h-[220px] overflow-y-auto space-y-2.5">
                      {selectedStaff.metrics.feedback.items.map((fb: any) => (
                        <div key={fb.id} className="p-3 bg-zinc-950/30 border border-zinc-850 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-300">{fb.customerName}</span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <Star key={idx} className={`h-3.5 w-3.5 ${idx < fb.overallRating ? 'text-amber-500 fill-amber-500' : 'text-zinc-700'}`} />
                              ))}
                            </div>
                          </div>
                          {fb.commentsSuggestions && (
                            <p className="text-[11px] text-zinc-400 italic">"{fb.commentsSuggestions}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 italic text-center py-4">No customer feedback matching this staff member's records.</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold rounded-lg cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
