"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";
import {
  TrendingUp,
  Users,
  Sun,
  Award,
  Calendar,
  Megaphone,
  Download,
  Clock,
  ArrowRight,
  PlusCircle,
  FileText,
  Video,
  FileSpreadsheet,
  CheckCircle,
  CheckSquare,
  FileCode,
  DollarSign,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatPKTDateDisplay, format12HourTime } from "@/lib/dateUtils";

export default function DashboardPage() {
  const { user } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [operationsTab, setOperationsTab] = useState<"tasks" | "complaints">("tasks");

  async function fetchStats(silent = false) {
    if (!silent) setLoading(true);
    else setIsPolling(true);
    
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const statsData = await res.json();
        setData(statsData);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
      setIsPolling(false);
    }
  }

  useEffect(() => {
    fetchStats();

    // 15-second background polling
    const interval = setInterval(() => {
      fetchStats(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 w-full rounded-2xl bg-zinc-900"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 bg-zinc-900 rounded-xl"></div>
          <div className="h-24 bg-zinc-900 rounded-xl"></div>
          <div className="h-24 bg-zinc-900 rounded-xl"></div>
          <div className="h-24 bg-zinc-900 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-zinc-900 rounded-2xl"></div>
          <div className="h-80 bg-zinc-900 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // File type icons mapping
  const getFileIcon = (ext: string | null) => {
    if (!ext) return FileText;
    const e = ext.toLowerCase();
    if (["xlsx", "xls", "csv"].includes(e)) return FileSpreadsheet;
    if (["mp4", "avi", "mov", "mkv"].includes(e)) return Video;
    if (["link"].includes(e)) return Video;
    return FileText;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "In Progress":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Pending":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
    }
  };

  const formattedRevenue = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(data?.stats?.revenue || 0);

  const userRoles = (user?.role || "").split(",").map(r => r.trim());
  const isFieldStaffOnly = userRoles.includes("Field Staff") && !userRoles.some(r => ["Admin", "Super Admin", "Management", "HR", "Accountant", "Sales & Marketing Department"].includes(r));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 h-48 w-48 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 z-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white font-sans">
                Welcome back, <span className="text-amber-500">{user?.name}</span> 👋
              </h1>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-1 text-[9px] font-bold text-emerald-400 uppercase tracking-wider select-none animate-pulse font-sans">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span>Live Connected</span>
                </div>
                <button
                  onClick={() => fetchStats()}
                  disabled={loading || isPolling}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-850 rounded-lg transition cursor-pointer"
                  title="Manual Data Sync"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading || isPolling ? "animate-spin text-amber-500" : ""}`} />
                </button>
              </div>
            </div>
            <p className="mt-2 text-zinc-400 text-sm md:text-base font-sans">
              Here is what&apos;s happening at Askari Solar Energy today. You are logged in as{" "}
              <strong className="text-zinc-200">{user?.role}</strong> ({user?.department} Department).
            </p>
          </div>

          <div className="flex gap-3">
            {isFieldStaffOnly ? (
              <>
                <Link
                  href="/tasks"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold transition"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>My Tasks</span>
                </Link>
                <Link
                  href="/complaints"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-sm font-semibold border border-zinc-700 transition"
                >
                  <MessageSquare className="h-4 w-4 text-amber-500" />
                  <span>My Complaints</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/crm"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-sm font-semibold border border-zinc-700 transition"
                >
                  <PlusCircle className="h-4 w-4 text-amber-500" />
                  <span>New Lead</span>
                </Link>
                <Link
                  href="/files"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Document Center</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Stats Widgets */}
      {isFieldStaffOnly ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Assigned Tasks</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <CheckSquare className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{data?.stats?.fieldStaffTasks?.total || 0}</span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Pending Tasks</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-550 border border-amber-500/20">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-500">{data?.stats?.fieldStaffTasks?.pending || 0}</span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Completed Tasks</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">{data?.stats?.fieldStaffTasks?.completed || 0}</span>
              </div>
            </div>

            {/* Field Staff Performance Card */}
            <div className="glass-panel p-5 rounded-xl border border-zinc-850 shadow-md relative overflow-hidden flex flex-col justify-between bg-zinc-900/40">
              <div className="absolute top-0 right-0 h-20 w-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">My Performance Score</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{data?.performance?.score ?? 100}%</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium mt-1">Grade: <span className="text-amber-500 font-bold">{data?.performance?.grade ?? "Excellent"}</span></p>
                </div>
                <div className="flex flex-col text-[9px] text-zinc-500 border-l border-zinc-800 pl-3 gap-0.5 font-mono shrink-0">
                  <div>Tasks: <span className="font-bold text-zinc-300">{data?.performance?.taskScore ?? 100}%</span></div>
                  <div>Tickets: <span className="font-bold text-zinc-300">{data?.performance?.complaintScore ?? 100}%</span></div>
                  <div>Attendance: <span className="font-bold text-zinc-300">{data?.performance?.attendanceScore ?? 100}%</span></div>
                </div>
              </div>
              <div className="w-full bg-zinc-950/80 rounded-full h-1.5 mt-3 border border-zinc-800/20">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${data?.performance?.score ?? 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Complaint Performance Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-zinc-800 shadow-md text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Assigned</span>
                <p className="text-xl font-extrabold text-white">{data?.stats?.fieldStaffComplaints?.totalAssigned || 0}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-zinc-800 shadow-md text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Completed</span>
                <p className="text-xl font-extrabold text-emerald-450">{data?.stats?.fieldStaffComplaints?.completedResolved || 0}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-zinc-800 shadow-md text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pending</span>
                <p className="text-xl font-extrabold text-blue-400">{data?.stats?.fieldStaffComplaints?.pending || 0}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-zinc-800 shadow-md text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Overdue</span>
                <p className="text-xl font-extrabold text-red-400">{data?.stats?.fieldStaffComplaints?.overdue || 0}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-zinc-800 shadow-md text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Resolved &lt;= 24h</span>
                <p className="text-xl font-extrabold text-emerald-500">{data?.stats?.fieldStaffComplaints?.resolvedWithin24h || 0}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-zinc-800 shadow-md text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Resolved &gt; 24h</span>
                <p className="text-xl font-extrabold text-amber-500">{data?.stats?.fieldStaffComplaints?.resolvedNotWithin24h || 0}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-zinc-800 shadow-md text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">24h+ Overdue</span>
                <p className="text-xl font-extrabold text-red-500">{data?.stats?.fieldStaffComplaints?.overdue24hPlus || 0}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total CRM Leads */}
          <div className="glass-panel p-5 rounded-xl border border-zinc-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Leads</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{data?.stats?.leads?.total || 0}</span>
              <span className="text-xs text-zinc-500">
                {data?.stats?.leads?.new || 0} new leads
              </span>
            </div>
          </div>

          {/* Won Sales Conversion */}
          <div className="glass-panel p-5 rounded-xl border border-zinc-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Won Projects</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{data?.stats?.leads?.won || 0}</span>
              <span className="text-xs text-emerald-400 font-medium">
                {(data?.stats?.leads?.total
                  ? ((data.stats.leads.won / data.stats.leads.total) * 100).toFixed(0)
                  : 0)}
                % conversion rate
              </span>
            </div>
          </div>

          {/* Dynamic Estimated Revenue */}
          <div className="glass-panel p-5 rounded-xl border border-zinc-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Estimated Revenue</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white truncate max-w-full">{formattedRevenue}</span>
            </div>
          </div>

          {/* Installation Projects */}
          <div className="glass-panel p-5 rounded-xl border border-zinc-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Installs</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sun className="h-4 w-4 animate-spin-slow" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{data?.stats?.projects?.total || 0}</span>
              <span className="text-xs text-zinc-500">
                {data?.stats?.projects?.completed || 0} completed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart or My Tasks Summary */}
        {user?.role === "Field Staff" ? (
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-amber-500" />
                <span>My Active Roster & Operations</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">View pending task actions and unresolved complaint tickets assigned to you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Tasks Summary</h4>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                    You have <strong className="text-amber-500">{data?.stats?.fieldStaffTasks?.pending || 0} pending</strong> tasks remaining.
                  </p>
                </div>
                <Link
                  href="/tasks"
                  className="flex items-center justify-between text-xs text-amber-500 hover:text-amber-400 font-semibold mt-4 pt-2 border-t border-zinc-800"
                >
                  <span>My Tasks Panel</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Complaints Summary</h4>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                    You have <strong className="text-amber-500">{data?.stats?.fieldStaffComplaints?.pending || 0} active</strong> complaints assigned.
                  </p>
                </div>
                <Link
                  href="/complaints"
                  className="flex items-center justify-between text-xs text-amber-500 hover:text-amber-400 font-semibold mt-4 pt-2 border-t border-zinc-800"
                >
                  <span>My Complaints Panel</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Sales & Leads Performance</h3>
                <p className="text-xs text-zinc-400">Monthly conversion and generation stats (PKR Millions)</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                <span>+18.4%</span>
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.salesChartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    labelStyle={{ color: "#a1a1aa", fontSize: "12px", fontWeight: "bold" }}
                    itemStyle={{ color: "#fff", fontSize: "12px" }}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue (M)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Personal Attendance Status Widget */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span>Today&apos;s Attendance</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Check-in and verify your daily attendance hours</p>
          </div>

          <div className="my-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
            {data?.todayAttendance ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Status</p>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {data.todayAttendance.status}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 text-left border-t border-zinc-800 pt-4">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase font-bold block">Check In</span>
                    <strong className="text-sm text-zinc-200">{format12HourTime(data.todayAttendance.checkIn)}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase font-bold block">Check Out</span>
                    <strong className="text-sm text-zinc-200">{format12HourTime(data.todayAttendance.checkOut)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <p className="text-sm text-zinc-400">No attendance marked for today.</p>
                <p className="text-[10px] text-zinc-550">Contact HR or Admin to log your attendance.</p>
              </div>
            )}
          </div>

          {user?.role !== "Field Staff" && (
            <Link
              href="/hr"
              className="flex items-center justify-between text-xs text-zinc-400 hover:text-white group transition border-t border-zinc-800 pt-4"
            >
              <span>View monthly timesheet</span>
              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-amber-500 transition group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>

      {/* Bottom Row widgets */}
      {user?.role === "Field Staff" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Announcements */}
          <div className="lg:col-span-3 glass-panel p-6 rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-500" />
                <span>Company Announcements & Notices</span>
              </h3>
            </div>

            <div className="space-y-4">
              {data?.recentAnnouncements?.length > 0 ? (
                data.recentAnnouncements.map((ann: any) => (
                  <div key={ann.id} className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-850 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-xs text-zinc-200">
                        {ann.title}
                      </span>
                      <span className="text-[9px] text-zinc-550">
                        {formatPKTDateDisplay(ann.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{ann.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-550 text-center py-6">No announcements published.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Active Tasks & Complaints Operations */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 mb-4 gap-4">
              <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setOperationsTab("tasks")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    operationsTab === "tasks" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Tasks</span>
                </button>
                <button
                  onClick={() => setOperationsTab("complaints")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    operationsTab === "complaints" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Complaints</span>
                </button>
              </div>

              <Link
                href={operationsTab === "tasks" ? "/tasks" : "/complaints"}
                className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
              >
                View All
              </Link>
            </div>

            {operationsTab === "tasks" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-zinc-300 animate-fade-in">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-850 uppercase tracking-wider">
                      <th className="py-2.5 font-bold">Task Title / Details</th>
                      <th className="py-2.5 font-bold">Assigned To</th>
                      <th className="py-2.5 font-bold">Priority</th>
                      <th className="py-2.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentTasks?.length > 0 ? (
                      data.recentTasks.map((task: any) => (
                        <tr key={task.id} className="border-b border-zinc-850 hover:bg-zinc-900/10 h-12">
                          <td className="py-2 font-semibold">
                            <p className="text-zinc-200 truncate max-w-xs">{task.title}</p>
                            <span className="text-[10px] text-zinc-500 block truncate max-w-xs">{task.description}</span>
                          </td>
                          <td className="py-2 text-zinc-400">
                            {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.map((u: any) => u.name).join(", ") : "Unassigned"}
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              task.priority === "High" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                              task.priority === "Medium" ? "bg-amber-500/10 text-amber-455 border border-amber-500/20" :
                              "bg-blue-500/10 text-blue-450 border border-blue-500/20"
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              task.status === "Completed" ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/15" : "bg-blue-500/10 text-blue-400 border border-blue-500/15"
                            }`}>
                              {task.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-500">
                          No active tasks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-zinc-300 animate-fade-in">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-850 uppercase tracking-wider">
                      <th className="py-2.5 font-bold">Complaint ID / Client</th>
                      <th className="py-2.5 font-bold">Category</th>
                      <th className="py-2.5 font-bold">Priority</th>
                      <th className="py-2.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentComplaints?.length > 0 ? (
                      data.recentComplaints.map((c: any) => (
                        <tr key={c.id} className="border-b border-zinc-850 hover:bg-zinc-900/10 h-12">
                          <td className="py-2 font-semibold">
                            <p className="text-zinc-200 font-mono text-[11px] text-amber-500">{c.complaintId}</p>
                            <span className="text-[10px] text-zinc-400 block truncate max-w-xs">{c.fullName} ({c.phone})</span>
                          </td>
                          <td className="py-2 text-zinc-400">{c.category}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              c.priority === "Urgent" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                              c.priority === "High" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                              c.priority === "Medium" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                              "bg-zinc-855 text-zinc-400"
                            }`}>
                              {c.priority}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              c.status === "Resolved" || c.status === "Closed"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-500">
                          No active complaints found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Announcements & Uploads */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-amber-500" />
                  <span>Announcements</span>
                </h3>
                <Link href="/announcements" className="text-xs text-zinc-500 hover:text-white">
                  All
                </Link>
              </div>

              <div className="space-y-4">
                {data?.recentAnnouncements?.length > 0 ? (
                  data.recentAnnouncements.map((ann: any) => (
                    <div key={ann.id} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-xs text-zinc-200 hover:underline cursor-pointer">
                          <Link href="/announcements">{ann.title}</Link>
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          {formatPKTDateDisplay(ann.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{ann.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-4">No announcements</p>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Recent File Uploads</h4>
              <div className="space-y-2">
                {data?.recentFiles?.length > 0 ? (
                  data.recentFiles.map((file: any) => {
                    const Icon = getFileIcon(file.fileExtension);
                    return (
                      <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 border border-zinc-900/60 hover:bg-zinc-900/80">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="text-xs text-zinc-300 truncate max-w-[120px]">{file.name}</span>
                        </div>
                        <a
                          href={getSafeFileUrl(file.fileUrl)}
                          download
                          className="p-1 text-zinc-500 hover:text-amber-500 transition shrink-0"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-650 text-center">No recent uploads</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
