"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";
import {
  Users,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  UserCheck,
  CalendarDays,
  Filter,
  CheckCircle,
  HelpCircle,
  FileText,
  FileSpreadsheet,
  Folder,
  UploadCloud,
  FilePlus,
  Trash2,
  Edit,
  Loader2,
  Search,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import { getPKTDateString, getPKTTimeString, formatPKTDateDisplay, formatPKTDateTimeDisplay, format12HourTime } from "@/lib/dateUtils";
import AdminFileManager from "@/components/AdminFileManager";

export default function HRPage() {
  const { user, setActiveExcelFile, setActiveDocxFile, setActivePdfFile } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"personal" | "management" | "daily" | "timetable" | "field_sops">("personal");

  // Timetable state
  const [timetableItems, setTimetableItems] = useState<any[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableFolderId, setTimetableFolderId] = useState<number | null>(null);
  const [timetableSearch, setTimetableSearch] = useState("");
  const [timetableBreadcrumbs, setTimetableBreadcrumbs] = useState<any[]>([]);
  const [timetableUploading, setTimetableUploading] = useState(false);
  const timetableInputRef = useRef<HTMLInputElement>(null);

  // Daily Roster states
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(
    getPKTDateString()
  );
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Form state for manual adjustment
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEmpId, setManualEmpId] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualStatus, setManualStatus] = useState("Present");
  const [manualCheckIn, setManualCheckIn] = useState("");
  const [manualCheckOut, setManualCheckOut] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [modalError, setModalError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const userRoles = (user?.role || "").split(",").map(r => r.trim());
  const isHrPrivileged = user && userRoles.some(r => ["Admin", "Super Admin", "Management", "HR"].includes(r));

  // Fetch Daily Roster
  async function handleSelfCheckIn() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHECKIN" }),
      });
      if (res.ok) {
        alert("Attendance marked successfully!");
        fetchLogs();
      } else {
        const err = await res.json();
        alert(err.error || "Check-in failed");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to mark attendance.");
    } finally {
      setActionLoading(false);
    }
  }

  async function fetchDailyRecords() {
    try {
      setDailyLoading(true);
      const res = await fetch(`/api/hr/attendance?date=${selectedDailyDate}`);
      if (res.ok) {
        const data = await res.json();
        const formattedRecords = (data.dailyRecords || []).map((r: any) => ({
          ...r,
          attendance: r.attendance ? {
            ...r.attendance,
            checkIn: format12HourTime(r.attendance.checkIn),
            checkOut: format12HourTime(r.attendance.checkOut),
          } : null
        }));
        setDailyRecords(formattedRecords);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDailyLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "daily" && isHrPrivileged) {
      fetchDailyRecords();
    }
  }, [selectedDailyDate, activeTab]);

  const updateDailyRecordField = (userId: number, field: string, value: any) => {
    setDailyRecords((prev) =>
      prev.map((item) => {
        if (item.employee.id === userId) {
          const attendance = item.attendance
            ? { ...item.attendance }
            : { status: "Absent", checkIn: "", checkOut: "", notes: "" };
          attendance[field] = value;

          // If status changes to Leave, Absent, or Off, auto-clear times
          if (field === "status" && ["Leave", "Absent", "Off"].includes(value)) {
            attendance.checkIn = "";
            attendance.checkOut = "";
          }

          return { ...item, attendance };
        }
        return item;
      })
    );
  };

  // Save row
  async function handleSaveRow(userId: number, currentRecord: any) {
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualUserId: userId.toString(),
          manualDate: selectedDailyDate,
          manualStatus: currentRecord.status || "Absent",
          manualCheckIn: currentRecord.checkIn || "",
          manualCheckOut: currentRecord.checkOut || "",
          manualNotes: currentRecord.notes || "",
        }),
      });
      if (res.ok) {
        fetchDailyRecords();
        alert("Daily attendance row saved successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to server");
    }
  }

  // Instant Mark Present function
  async function handleMarkPresent(userId: number) {
    const formatTime = getPKTTimeString();
    const record = {
      status: "Present",
      checkIn: formatTime,
      checkOut: "",
      notes: "Marked Present instantly",
    };
    
    // Update client state first for fast response
    updateDailyRecordField(userId, "status", "Present");
    updateDailyRecordField(userId, "checkIn", formatTime);
    updateDailyRecordField(userId, "checkOut", "");
    updateDailyRecordField(userId, "notes", "Marked Present instantly");

    await handleSaveRow(userId, record);
  }

  // Instant Mark Check Out function
  async function handleMarkCheckOut(userId: number) {
    const formatTime = getPKTTimeString();
    
    // Find current attendance record
    const record = dailyRecords.find(r => r.employee.id === userId)?.attendance || {};
    
    const updatedRecord = {
      status: record.status || "Present",
      checkIn: record.checkIn || formatTime,
      checkOut: formatTime,
      notes: record.notes || "Checked out via Daily Register",
    };
    
    // Update client state first
    updateDailyRecordField(userId, "checkOut", formatTime);
    updateDailyRecordField(userId, "notes", updatedRecord.notes);

    await handleSaveRow(userId, updatedRecord);
  }

  // Fetch standard logs registry
  async function fetchLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (activeTab === "management" && isHrPrivileged) {
        if (selectedEmployeeId) params.append("userId", selectedEmployeeId);
        if (filterDepartment && filterDepartment !== "all") params.append("department", filterDepartment);
      } else {
        // personal tab always defaults to user logs
        params.append("userId", user?.id?.toString() || "");
      }
      
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `/api/hr/attendance?${params.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTimetableItems() {
    try {
      setTimetableLoading(true);
      let url = `/api/files?department=HR`;
      if (timetableSearch) {
        url += `&search=${encodeURIComponent(timetableSearch)}`;
      } else if (timetableFolderId) {
        url += `&parentId=${timetableFolderId}`;
      } else {
        url += `&parentId=`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setTimetableItems(d.items || []);
      }
    } catch (err) {
      console.error("Failed to load timetable files:", err);
    } finally {
      setTimetableLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [selectedEmployeeId, filterDepartment, startDate, endDate, activeTab]);

  useEffect(() => {
    if (activeTab === "timetable") {
      fetchTimetableItems();
    }
  }, [activeTab, timetableFolderId, timetableSearch]);

  const handleTimetableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setTimetableUploading(true);
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append("files", files[i]);
      }
      if (timetableFolderId) fd.append("parentId", timetableFolderId.toString());
      fd.append("department", "HR");
      fd.append("docType", "Timetable");

      const res = await fetch("/api/files/upload", { method: "POST", body: fd });
      if (res.ok) {
        fetchTimetableItems();
        if (timetableInputRef.current) timetableInputRef.current.value = "";
      } else {
        const d = await res.json();
        alert(d.error || "Upload failed");
      }
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setTimetableUploading(false);
    }
  };

  const handleCreateNewTimetableDoc = async () => {
    const title = prompt("Enter Timetable title (e.g. Weekly Duty Roster):", "Duty Timetable");
    if (!title || !title.trim()) return;

    try {
      setTimetableUploading(true);
      const blankContent = `Duty Timetable & Schedule\n\nDepartment: HR\nDate: ${new Date().toLocaleDateString()}\n\nSchedule Details:\n\n`;
      const blob = new Blob([blankContent], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const filename = `${title.trim().replace(/\.[^.]+$/, "")}.docx`;

      const fd = new FormData();
      fd.append("files", blob, filename);
      if (timetableFolderId) fd.append("parentId", timetableFolderId.toString());
      fd.append("department", "HR");
      fd.append("docType", "Timetable");

      const res = await fetch("/api/files/upload", { method: "POST", body: fd });
      if (res.ok) {
        const d = await res.json();
        await fetchTimetableItems();
        if (d.file) {
          handleTimetableFileClick(d.file);
        }
      }
    } catch (err) {
      alert("Failed to create document.");
    } finally {
      setTimetableUploading(false);
    }
  };

  const handleTimetableFileClick = (file: any) => {
    if (file.isFolder) {
      setTimetableBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
      setTimetableFolderId(file.id);
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



  // Manual Adjust submit
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");
    
    if (!manualEmpId || !manualDate) {
      setModalError("Employee and Date are required");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualUserId: manualEmpId,
          manualDate,
          manualStatus,
          manualCheckIn: ["Leave", "Absent", "Off"].includes(manualStatus) ? "" : (manualCheckIn || "09:00:00"),
          manualCheckOut: ["Leave", "Absent", "Off"].includes(manualStatus) ? "" : (manualCheckOut || "18:00:00"),
          manualNotes,
        }),
      });

      if (res.ok) {
        setShowManualModal(false);
        setManualEmpId("");
        setManualDate("");
        setManualStatus("Present");
        setManualCheckIn("");
        setManualCheckOut("");
        setManualNotes("");
        fetchLogs();
      } else {
        const errData = await res.json();
        setModalError(errData.error || "Adjustment failed");
      }
    } catch (err) {
      setModalError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  // Export logs to XLSX using SheetJS
  function handleCSVExport() {
    if (!data?.logs || data.logs.length === 0) return;
    
    const headers = ["Employee Name", "Date", "Check In", "Check Out", "Status", "Notes"];
    const rows = data.logs.map((log: any) => [
      log.user?.name || user?.name || "N/A",
      log.date,
      format12HourTime(log.checkIn),
      format12HourTime(log.checkOut),
      log.status,
      log.notes || "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Logs");
    XLSX.writeFile(workbook, `attendance_report_${getPKTDateString()}.xlsx`);
  }

  // Quick Date presets
  function applyDateRange(preset: "today" | "weekly" | "monthly" | "custom") {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "weekly") {
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      setStartDate(lastWeek.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "monthly") {
      const lastMonth = new Date();
      lastMonth.setDate(today.getDate() - 30);
      setStartDate(lastMonth.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else {
      setStartDate("");
      setEndDate("");
    }
  }

  // Calculate statistics from filtered data
  const logsCount = data?.logs || [];
  const presentCount = logsCount.filter((l: any) => ["Present", "Late", "Half Day"].includes(l.status)).length;
  const lateCount = logsCount.filter((l: any) => l.status === "Late").length;
  const absentCount = logsCount.filter((l: any) => l.status === "Absent").length;
  const workingDays = Array.from(new Set(logsCount.map((l: any) => l.date))).length;

  const todayDate = getPKTDateString();
  const todayRecord = data?.logs?.find((log: any) => log.date === todayDate && log.userId === user?.id);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "Late":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Leave":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "Half Day":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "Absent":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-500" />
            <span>Human Resource Center</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Manage employee profiles, monthly attendance timesheets, and manual logs</p>
        </div>

        {/* Tab Selection */}
        {isHrPrivileged && (
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setActiveTab("personal"); setSelectedEmployeeId(""); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "personal" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              My Attendance
            </button>
            <button
              onClick={() => { setActiveTab("management"); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "management" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              Timesheet Registry
            </button>
            <button
              onClick={() => { setActiveTab("daily"); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "daily" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              Daily Register Manager
            </button>
            <button
              onClick={() => { setActiveTab("timetable"); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "timetable" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              Timetable & Templates
            </button>
            <button
              onClick={() => { setActiveTab("field_sops"); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "field_sops" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              Field Staff SOPs & Training
            </button>
          </div>
        )}
      </div>

      {/* --- PERSONAL ATTENDANCE VIEW --- */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Action Card */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between h-fit space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <span>Today's Attendance</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Today's recorded office attendance hours ({todayDate})</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Status</p>
                <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  todayRecord ? getStatusClass(todayRecord.status) : "bg-zinc-850 text-zinc-400 border border-zinc-750"
                }`}>
                  {todayRecord ? todayRecord.status : "No attendance marked"}
                </div>

                <div className="mt-6 text-left border-t border-zinc-800 pt-4 flex justify-between items-center">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase font-bold block">Check In Time</span>
                    <strong className="text-sm text-zinc-200">{format12HourTime(todayRecord?.checkIn)}</strong>
                  </div>
                  
                  {!todayRecord && (
                    <button
                      onClick={handleSelfCheckIn}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs cursor-pointer transition font-sans"
                    >
                      {actionLoading ? "Punching..." : "Punch Attendance"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[10px] text-zinc-500 border-t border-zinc-850 pt-4">
              <AlertTriangle className="h-4 w-4 text-zinc-600 shrink-0" />
              <span>Self attendance punch is automated. Please click 'Punch Attendance' upon arrival to register your check-in automatically.</span>
            </div>
          </div>

          {/* Logs Table */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-zinc-800">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-amber-500" />
                  <span>My Timesheet Logs</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Review your recent check-in/out records</p>
              </div>

              <button
                onClick={handleCSVExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold rounded-lg text-zinc-300 transition"
              >
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-xs text-left text-zinc-300">
                <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Check In</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logsCount.length > 0 ? (
                    logsCount.map((log: any) => (
                      <tr key={log.id} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                        <td className="px-4 py-3 font-bold text-zinc-200">{formatPKTDateDisplay(log.date)}</td>
                        <td className="px-4 py-3 text-zinc-300 font-mono">{format12HourTime(log.checkIn)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusClass(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{log.notes || "--"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-550">No personal attendance logs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TIMESHEETS REGISTRY VIEW (ADMIN ONLY) --- */}
      {activeTab === "management" && isHrPrivileged && (
        <div className="space-y-6 animate-fade-in">
          {/* Advanced Filter Box */}
          <div className="glass-panel p-5 rounded-2xl border border-zinc-800 grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
            {/* Quick date presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Date Filters</span>
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => applyDateRange("today")} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] py-1 font-semibold rounded text-zinc-300">Today</button>
                <button onClick={() => applyDateRange("weekly")} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] py-1 font-semibold rounded text-zinc-300">Weekly</button>
                <button onClick={() => applyDateRange("monthly")} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] py-1 font-semibold rounded text-zinc-300">Monthly</button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-550 uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-550 uppercase tracking-wide">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-550 uppercase tracking-wide">Department</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
              >
                <option value="all">All Departments</option>
                <option value="Management">Management</option>
                <option value="Sales">Sales</option>
                <option value="Accounts">Accounts</option>
                <option value="HR">HR</option>
                <option value="Field">Field</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-550 uppercase tracking-wide">Employee Search</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
              >
                <option value="">All Employees</option>
                {data?.employees?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats dashboard panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Present (Filtered)</span>
              <p className="text-2xl font-extrabold text-emerald-400">{presentCount}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Late Check-Ins</span>
              <p className="text-2xl font-extrabold text-amber-500">{lateCount}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Absences Recorded</span>
              <p className="text-2xl font-extrabold text-red-400">{absentCount}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Working Days Count</span>
              <p className="text-2xl font-extrabold text-zinc-200">{workingDays}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                const today = getPKTDateString();
                setManualDate(today);
                setManualCheckIn("09:00 AM");
                setManualCheckOut("06:00 PM");
                setManualEmpId("");
                setManualStatus("Present");
                setManualNotes("");
                setModalError("");
                setShowManualModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Adjust Attendance Entry</span>
            </button>
            <button
              onClick={handleCSVExport}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export Roster Report</span>
            </button>
          </div>

          {/* Admin logs table */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
            {loading ? (
              <div className="py-12 text-center text-zinc-550">Querying timesheet database...</div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs text-left text-zinc-300">
                  <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-bold">Employee Name</th>
                      <th className="px-4 py-3 font-bold">Department</th>
                      <th className="px-4 py-3 font-bold">Date</th>
                      <th className="px-4 py-3 font-bold">Check In</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.logs?.length > 0 ? (
                      data.logs.map((log: any) => (
                        <tr key={log.id} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                          <td className="px-4 py-3 font-bold text-zinc-200">{log.user?.name || "N/A"}</td>
                          <td className="px-4 py-3 text-zinc-400">{log.user?.department || "N/A"}</td>
                          <td className="px-4 py-3 font-bold text-zinc-200">{formatPKTDateDisplay(log.date)}</td>
                          <td className="px-4 py-3 text-zinc-300 font-mono">{format12HourTime(log.checkIn)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusClass(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{log.notes || "--"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-550">No logs found matching filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DAILY REGISTER MANAGER VIEW (ADMIN ONLY) --- */}
      {activeTab === "daily" && isHrPrivileged && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Filter by Date */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Select Roster Date:</label>
              <input
                type="date"
                value={selectedDailyDate}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900"
              />
            </div>
            
            <p className="text-xs text-zinc-550">
              Update check-in, checkout details or click <strong className="text-amber-500">Mark Present</strong> to record attendance instantly.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
            {dailyLoading ? (
              <div className="py-8 text-center text-zinc-500 animate-pulse">Loading daily register...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-zinc-300">
                  <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-bold">Employee Name</th>
                      <th className="px-4 py-3 font-bold">Role & Dept</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Check In</th>
                      <th className="px-4 py-3 font-bold">Check Out</th>
                      <th className="px-4 py-3 font-bold">Notes</th>
                      <th className="px-4 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRecords.length > 0 ? (
                      dailyRecords.map((item: any) => (
                        <tr key={item.employee.id} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                          <td className="px-4 py-3 font-bold text-zinc-200">{item.employee.name}</td>
                          <td className="px-4 py-3 text-zinc-450">{item.employee.role} ({item.employee.department})</td>
                          <td className="px-4 py-3">
                            <select
                              value={item.attendance?.status || "Absent"}
                              onChange={(e) => updateDailyRecordField(item.employee.id, "status", e.target.value)}
                              className="glass-input rounded-xl px-2 py-1 text-xs text-white bg-zinc-900 focus:outline-none w-28 font-bold"
                            >
                              <option value="Present">Present</option>
                              <option value="Late">Late</option>
                              <option value="Leave">Leave</option>
                              <option value="Half Day">Half Day</option>
                              <option value="Absent">Absent</option>
                              <option value="Off">Off</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="--:--:--"
                              value={item.attendance?.checkIn || ""}
                              onChange={(e) => updateDailyRecordField(item.employee.id, "checkIn", e.target.value)}
                              className="glass-input rounded-xl px-2 py-1 text-xs text-white bg-zinc-900 focus:outline-none w-24 font-mono text-center animate-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="--:--:--"
                              value={item.attendance?.checkOut || ""}
                              onChange={(e) => updateDailyRecordField(item.employee.id, "checkOut", e.target.value)}
                              className="glass-input rounded-xl px-2 py-1 text-xs text-white bg-zinc-900 focus:outline-none w-24 font-mono text-center animate-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Add daily notes..."
                              value={item.attendance?.notes || ""}
                              onChange={(e) => updateDailyRecordField(item.employee.id, "notes", e.target.value)}
                              className="glass-input rounded-xl px-2 py-1 text-xs text-white bg-zinc-900 focus:outline-none w-full animate-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-right flex justify-end gap-1.5">
                            <button
                              onClick={() => handleMarkPresent(item.employee.id)}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-[10px] transition cursor-pointer"
                            >
                              Mark Present
                            </button>
                            {item.attendance && !item.attendance.checkOut && (
                              <button
                                onClick={() => handleMarkCheckOut(item.employee.id)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-[10px] transition cursor-pointer"
                              >
                                Check Out
                              </button>
                            )}
                            <button
                              onClick={() => handleSaveRow(item.employee.id, item.attendance || { status: "Absent", checkIn: "", notes: "" })}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold border border-zinc-750 rounded-lg text-[10px] transition cursor-pointer"
                            >
                              Save Row
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No employees registered in system.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TIMETABLE & TEMPLATES TAB --- */}
      {activeTab === "timetable" && (
        <AdminFileManager
          department="HR"
          docType="Documents"
          title="Timetable & Company Templates"
          description="Manage, upload, edit and organize work schedules, office timetable templates, and HR forms"
        />
      )}

      {/* --- FIELD STAFF SOPS & TRAINING VIEW --- */}
      {activeTab === "field_sops" && (
        <AdminFileManager
          department="Field"
          docType="Training"
          title="Technical & Field Staff SOPs & Training"
          description="Manage, upload, edit and organize technical procedures, installation SOPs, safety guides, and training docs"
        />
      )}

      {/* --- MANUAL ADJUSTMENT DIALOG --- */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-500" />
              <span>Manual Attendance Adjustment</span>
            </h3>

            {modalError && (
              <p className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-lg">
                {modalError}
              </p>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Select Employee</label>
                <select
                  required
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900 mt-1.5"
                >
                  <option value="">Choose Employee...</option>
                  {data?.employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Date</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Check In Time</label>
                <input
                  type="text"
                  placeholder="09:00 AM"
                  value={manualCheckIn}
                  onChange={(e) => setManualCheckIn(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Status</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900 mt-1.5"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Leave">Leave</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Audit Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Manual correction requested"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-zinc-850 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs"
                >
                  {actionLoading ? "Saving..." : "Save Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
