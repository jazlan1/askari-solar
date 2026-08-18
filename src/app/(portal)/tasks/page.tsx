"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  FileText,
  User,
  Paperclip,
  Download,
  Search,
  Filter,
  BarChart,
  X,
  Camera,
  FolderOpen,
  Loader2
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatPKTDateDisplay, formatPKTDateTimeDisplay } from "@/lib/dateUtils";

export default function TasksPage() {
  const { user } = useStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [fieldStaff, setFieldStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manager state inputs for new task
  const [title, setTitle] = useState("Solar Project");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [charges, setCharges] = useState("Quotation");
  const [clientName, setClientName] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [clientLocation, setClientLocation] = useState("Chakwal");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  
  // Filtering & reporting states
  const [activeTab, setActiveTab] = useState<"list" | "reports">("list");
  const [filterStaff, setFilterStaff] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState<string | null>(null);

  // Field Staff completion states
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeTaskId, setCompleteTaskId] = useState<number | null>(null);

  // Manager Edit Task states
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("Solar Project");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState("Medium");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState("Pending");
  const [editTaskAssignedToIds, setEditTaskAssignedToIds] = useState<string[]>([]);
  const [editTaskCharges, setEditTaskCharges] = useState("Quotation");
  const [editTaskClientName, setEditTaskClientName] = useState("");
  const [editTaskClientNumber, setEditTaskClientNumber] = useState("");
  const [editTaskClientLocation, setEditTaskClientLocation] = useState("Chakwal");
  const [completionPhoto, setCompletionPhoto] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const userRoles = (user?.role || "").split(",").map(r => r.trim());
  const isManager = user && userRoles.some(r => ["Admin", "Super Admin", "Management", "HR", "Accountant", "Sales & Marketing Department"].includes(r));

  const isImgUrl = (url: string) => {
    if (!url) return false;
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    return ext ? ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) : false;
  };

  async function fetchTasksData() {
    try {
      setLoading(true);
      let url = "/api/tasks";
      
      if (isManager) {
        const params = new URLSearchParams();
        if (filterStaff) params.append("assignedToId", filterStaff);
        if (filterStatus) params.append("status", filterStatus);
        if (filterPriority) params.append("priority", filterPriority);
        if (searchQuery) params.append("search", searchQuery);
        if (startDate && endDate) {
          params.append("startDate", startDate);
          params.append("endDate", endDate);
        }
        url = `/api/tasks?${params.toString()}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log("Tasks GET response data:", data);
        setTasks(data.tasks || []);
        if (data.fieldStaff) {
          console.log("Setting fieldStaff:", data.fieldStaff);
          setFieldStaff(data.fieldStaff);
        } else {
          console.warn("No fieldStaff in API response!");
        }
      } else {
        console.error("Tasks GET response failed:", res.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchTasksData();
    }
  }, [user, filterStaff, filterStatus, filterPriority, startDate, endDate, searchQuery]);

  // Assign task submit
  async function handleAssignTask(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!title.trim() || !description.trim() || assignedToIds.length === 0 || !dueDate) {
      setFormError("Title, description, assignees, and due date are required");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate,
          assignedToIds,
          charges,
          clientName: clientName,
          clientNumber: clientNumber,
          clientLocation,
          attachmentUrl,
        }),
      });

      if (res.ok) {
        setFormSuccess("Task assigned successfully!");
        setTitle("Solar Project");
        setDescription("");
        setDueDate("");
        setAssignedToIds([]);
        setCharges("Quotation");
        setClientName("");
        setClientNumber("");
        setClientLocation("Chakwal");
        setAttachmentUrl("");
        fetchTasksData();
      } else {
        const data = await res.json();
        setFormError(data.error || "Failed to assign task");
      }
    } catch (err) {
      setFormError("Failed to assign task. Try again.");
    } finally {
      setActionLoading(false);
    }
  }

  // Task delete (manager only)
  async function handleDeleteTask(taskId: number) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: "DELETE" }),
      });

      if (res.ok) {
        fetchTasksData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveTaskEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: editingTask.id,
          title: editTaskTitle,
          description: editTaskDescription,
          priority: editTaskPriority,
          dueDate: editTaskDueDate,
          status: editTaskStatus,
          assignedToIds: editTaskAssignedToIds,
          charges: editTaskCharges,
          clientName: editTaskClientName,
          clientNumber: editTaskClientNumber,
          clientLocation: editTaskClientLocation,
        }),
      });

      if (res.ok) {
        setShowEditTaskModal(false);
        setEditingTask(null);
        fetchTasksData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update task");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving task changes");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/tasks/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.fileUrl) {
        setCompletionPhoto(data.fileUrl);
      } else {
        setUploadError(data.error || "Failed to upload proof file");
      }
    } catch (err) {
      console.error(err);
      setUploadError("Error uploading file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleAttachmentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    setAttachmentUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/tasks/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.fileUrl) {
        setAttachmentUrl(data.fileUrl);
      } else {
        setAttachmentUploadError(data.error || "Failed to upload reference file");
      }
    } catch (err) {
      console.error(err);
      setAttachmentUploadError("Error uploading file. Please try again.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  // Field Staff task completion submit
  async function handleCompleteTask(e: React.FormEvent) {
    e.preventDefault();
    if (!completionPhoto) {
      alert("Upload proof is mandatory before completing task.");
      return;
    }
    if (!completionNotes.trim()) {
      alert("Please provide completion notes.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: completeTaskId,
          completionPhoto,
          completionNotes,
        }),
      });

      if (res.ok) {
        setShowCompleteModal(false);
        setCompletionPhoto("");
        setCompletionNotes("");
        setCompleteTaskId(null);
        fetchTasksData();
        alert("Task completed successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // Excel/CSV export of task logs
  function handleCSVExport() {
    const headers = [
      "Task ID",
      "Task Title",
      "Assigned To",
      "Assigned By",
      "Charges",
      "Branch",
      "Priority",
      "Due Date",
      "Status",
      "Completion Date/Time",
      "Completion Note"
    ];

    const rows = tasks.map((t: any) => [
      t.id,
      t.title,
      t.assignedTo && t.assignedTo.length > 0 ? t.assignedTo.map((u: any) => u.name).join(", ") : "N/A",
      t.assignedBy?.name || "N/A",
      t.charges || "N/A",
      t.clientLocation || "N/A",
      t.priority,
      t.dueDate,
      t.status,
      t.completedAt ? formatPKTDateTimeDisplay(t.completedAt) : "Pending",
      t.completionNotes || ""
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Task History");
    XLSX.writeFile(workbook, "Field_Tasks_Report.xlsx");
  }

  const getPriorityColor = (pri: string) => {
    switch (pri) {
      case "High": return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "Medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    }
  };

  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const pendingTasks = tasks.filter((t) => t.status === "Pending");

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-amber-500" />
            <span>Task Assignment & Field Operations</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Assign, track, and monitor task completion parameters for Field Staff workers</p>
        </div>

        {isManager && (
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "list" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              Task List
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "reports" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
            >
              Task Reports
            </button>
          </div>
        )}
      </div>

      {/* --- MANAGER TASK VIEW --- */}
      {isManager ? (
        activeTab === "list" ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Create Task Form */}
            <div className="glass-panel p-5 rounded-2xl border border-zinc-800 h-fit space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-amber-500" />
                <span>Assign New Task</span>
              </h3>

              {formError && (
                <p className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-lg">
                  {formError}
                </p>
              )}

              {formSuccess && (
                <p className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs rounded-lg">
                  {formSuccess}
                </p>
              )}

              <form onSubmit={handleAssignTask} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Assign Employee(s) *</label>
                  <div className="max-h-36 overflow-y-auto border border-zinc-800 bg-zinc-900 rounded-xl p-3 space-y-2">
                    {fieldStaff.map((staff) => (
                      <label key={staff.id} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={assignedToIds.includes(staff.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedToIds([...assignedToIds, staff.id.toString()]);
                            } else {
                              setAssignedToIds(assignedToIds.filter((id) => id !== staff.id.toString()));
                            }
                          }}
                          className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500 bg-zinc-950 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>{staff.name} - <span className="text-[10px] text-zinc-550 font-semibold">{staff.role} ({staff.department})</span></span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Task Title</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
                  >
                    <option value="Solar Project">Solar Project</option>
                    <option value="Misc/Other Work">Misc/Other Work</option>
                    <option value="Office Task">Office Task</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Charges</label>
                    <select
                      value={charges}
                      onChange={(e) => setCharges(e.target.value)}
                      className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
                    >
                      <option value="Quotation">Quotation</option>
                      <option value="Invoice">Invoice</option>
                      <option value="N/A">N/A — Not Applicable</option>
                      <option value="1000">1000</option>
                      <option value="1500">1500</option>
                      <option value="2000">2000</option>
                      <option value="3000">3000</option>
                      <option value="5000">5000</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Branch</label>
                    <select
                      value={clientLocation}
                      onChange={(e) => setClientLocation(e.target.value)}
                      className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
                    >
                      <option value="Chakwal">Chakwal</option>
                      <option value="Islamabad">Islamabad</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Task Details</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
                    placeholder="Describe specific survey details..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Client Name</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
                      placeholder="Client full name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Client Phone</label>
                    <input
                      type="text"
                      value={clientNumber}
                      onChange={(e) => setClientNumber(e.target.value)}
                      className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
                      placeholder="0300-1234567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Due Date</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Upload Reference Attachment (Optional)</label>
                  {attachmentUrl ? (
                    <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl mt-1.5">
                      <span className="text-zinc-350 truncate max-w-[180px] font-mono select-none" title={attachmentUrl}>
                        {attachmentUrl.split("/").pop()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachmentUrl("")}
                        className="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => document.getElementById("task-attachment-file")?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        <Paperclip className="h-4 w-4 text-amber-500" />
                        <span>{uploadingAttachment ? "Uploading..." : "Upload File"}</span>
                      </button>
                      {uploadingAttachment && <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />}
                      <span className="text-[10px] text-zinc-500">Supports images, PDF, DOC/DOCX, Excel (max 10MB)</span>
                      <input
                        id="task-attachment-file"
                        type="file"
                        accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                        disabled={uploadingAttachment}
                        onChange={handleAttachmentFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                  {attachmentUploadError && (
                    <p className="mt-1 bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded text-[9px]">
                      {attachmentUploadError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition cursor-pointer"
                >
                  {actionLoading ? "Assigning..." : "Assign Task"}
                </button>
              </form>
            </div>

            {/* Manager Task List */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 items-center w-full">
                  {/* Search */}
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full glass-input rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-550 focus:outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-550" />
                  </div>

                  {/* Filter by staff */}
                  <select
                    value={filterStaff}
                    onChange={(e) => setFilterStaff(e.target.value)}
                    className="glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900"
                  >
                    <option value="">All Field Workers</option>
                    {fieldStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>

                  {/* Filter by status */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-zinc-555">Loading task logs...</div>
              ) : (
                <div className="space-y-4">
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`glass-panel p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                          task.status === "Completed" ? "bg-emerald-500/5 border-emerald-500/10" : "bg-zinc-900/60 border-zinc-800"
                        }`}
                      >
                        <div className="space-y-2 max-w-xl">
                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${getPriorityColor(task.priority)}`}>
                              {task.priority} Priority
                            </span>
                            <span className="text-zinc-550">•</span>
                            <span className="text-zinc-500">Assignees: <strong className="text-zinc-350">{task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.map((u: any) => u.name).join(", ") : "Unassigned"}</strong></span>
                            <span className="text-zinc-550">•</span>
                            <span className="text-zinc-550">Assigned: <strong className="text-zinc-350">{formatPKTDateTimeDisplay(task.createdAt)}</strong></span>
                            <span className="text-zinc-550">•</span>
                            <span className="text-zinc-500">Due: <strong className="text-zinc-350">{task.dueDate}</strong></span>
                          </div>
                          <h4 className="text-sm font-bold text-white">{task.title}</h4>

                          {/* Client & Charges Meta */}
                          {(task.charges || task.clientLocation) && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 bg-zinc-950/20 border border-zinc-800/40 p-2.5 rounded-xl">
                              {task.charges && (
                                <div>Charges: <strong className="text-amber-500">{task.charges}</strong></div>
                              )}
                              {task.clientLocation && (
                                <div>Branch: <strong className="text-zinc-200">{task.clientLocation}</strong></div>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-zinc-400 leading-normal">{task.description}</p>

                           {task.attachmentUrl && (
                             <div className="mt-2 space-y-2">
                               <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Reference Attachment:</span>
                               {isImgUrl(task.attachmentUrl) ? (
                                 <div className="relative group max-w-sm rounded-xl overflow-hidden border border-zinc-800 bg-zinc-955/40">
                                   <img src={task.attachmentUrl} alt="Attachment" className="max-h-48 w-auto object-contain rounded" />
                                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                     <a href={task.attachmentUrl} download className="p-1.5 rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400">
                                       <Download className="h-3.5 w-3.5" />
                                     </a>
                                   </div>
                                 </div>
                               ) : (
                                 <a
                                   href={task.attachmentUrl}
                                   target="_blank"
                                   className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-amber-500 hover:text-amber-400 rounded-lg hover:border-amber-500/25 transition font-medium text-[10px]"
                                 >
                                   <Paperclip className="h-3.5 w-3.5" />
                                   <span>View Document ({task.attachmentUrl.split("/").pop()})</span>
                                 </a>
                               )}
                             </div>
                           )}

                          {/* Completion Proof */}
                          {task.status === "Completed" && (
                            <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850 mt-2 space-y-2 text-[11px] text-zinc-400">
                              <p className="flex items-center gap-1 text-emerald-400 font-bold">
                                <CheckCircle className="h-3.5 w-3.5" />
                                 <span>Completed on {formatPKTDateTimeDisplay(task.completedAt)}</span>
                              </p>
                              <p><strong>Worker Notes:</strong> {task.completionNotes || "No notes appended."}</p>
                              {task.completionPhoto && (
                                <div className="mt-2 space-y-2">
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Submitted Proof of Work:</span>
                                  {isImgUrl(task.completionPhoto) ? (
                                    <div className="relative group max-w-sm rounded-xl overflow-hidden border border-zinc-800 bg-zinc-955/40">
                                      <img src={task.completionPhoto} alt="Proof" className="max-h-48 w-auto object-contain rounded" />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                        <a href={task.completionPhoto} download className="p-1.5 rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400">
                                          <Download className="h-3.5 w-3.5" />
                                        </a>
                                      </div>
                                    </div>
                                  ) : (
                                    <a
                                      href={task.completionPhoto}
                                      target="_blank"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-amber-500 hover:text-amber-400 rounded-lg hover:border-amber-500/25 transition font-medium"
                                    >
                                      <Paperclip className="h-3.5 w-3.5" />
                                      <span>View Supporting File ({task.completionPhoto.split("/").pop()})</span>
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {task.status !== "Completed" && task.assignedTo?.some((u: any) => u.id === user?.id) && (
                            <button
                              onClick={() => {
                                setCompleteTaskId(task.id);
                                setCompletionPhoto("");
                                setCompletionNotes("");
                                setShowCompleteModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-[10px] transition cursor-pointer mr-2"
                            >
                              Complete Task
                            </button>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
                            task.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            {task.status}
                          </span>
                          {isManager && (
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setEditTaskTitle(task.title || "Solar Project");
                                setEditTaskDescription(task.description || "");
                                setEditTaskPriority(task.priority || "Medium");
                                setEditTaskDueDate(task.dueDate || "");
                                setEditTaskStatus(task.status || "Pending");
                                setEditTaskAssignedToIds(task.assignedTo?.map((u: any) => u.id.toString()) || []);
                                setEditTaskCharges(task.charges || "Quotation");
                                setEditTaskClientName("");
                                setEditTaskClientNumber("");
                                setEditTaskClientLocation(task.clientLocation || "Chakwal");
                                setShowEditTaskModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-[10px] font-bold transition cursor-pointer mr-2"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-red-500 border border-zinc-800 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-550 text-center py-12">No tasks assigned matching filters.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Manager Task Reports View
          <div className="space-y-6">
            {/* Filters bar */}
            <div className="glass-panel p-5 rounded-2xl border border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Start Due Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide">End Due Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Employee</label>
                <select
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                >
                  <option value="">All Employees</option>
                  {fieldStaff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 sm:pt-0 self-end">
                <button
                  onClick={handleCSVExport}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition text-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Task Logs</span>
                </button>
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-xl border border-zinc-800 text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Assigned Tasks</span>
                <p className="text-3xl font-extrabold text-white">{tasks.length}</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-zinc-800 text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pending Tasks</span>
                <p className="text-3xl font-extrabold text-amber-500">{pendingTasks.length}</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-zinc-800 text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Completed Tasks</span>
                <p className="text-3xl font-extrabold text-emerald-400">{completedTasks.length}</p>
              </div>
            </div>

            {/* Task summary logs table */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-zinc-300">
                  <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-bold">Worker</th>
                      <th className="px-4 py-3 font-bold">Task Title</th>
                      <th className="px-4 py-3 font-bold">Branch / Charges</th>
                      <th className="px-4 py-3 font-bold">Priority</th>
                      <th className="px-4 py-3 font-bold">Due Date</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Completed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-b border-zinc-800/40">
                        <td className="px-4 py-3 font-bold text-zinc-200">
                          {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.map((u: any) => u.name).join(", ") : "Unassigned"}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{task.title}</td>
                        <td className="px-4 py-3 text-zinc-400">
                          {task.clientLocation || task.charges ? (
                            <div className="space-y-0.5">
                              {task.clientLocation && <div>{task.clientLocation}</div>}
                              {task.charges && <div className="text-[10px] text-amber-500 font-bold">{task.charges} PKR</div>}
                            </div>
                          ) : "--"}
                        </td>
                        <td className="px-4 py-3">{task.priority}</td>
                        <td className="px-4 py-3 font-mono">{task.dueDate}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.status === "Completed" ? "text-emerald-400 bg-emerald-500/10" : "text-blue-400 bg-blue-500/10"
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 font-mono">
                           {task.completedAt ? formatPKTDateTimeDisplay(task.completedAt) : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : (
        // --- FIELD STAFF TASK VIEW ---
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">My Pending Tasks</span>
              <p className="text-2xl font-extrabold text-amber-500">{pendingTasks.length}</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">My Completed Tasks</span>
              <p className="text-2xl font-extrabold text-emerald-400">{completedTasks.length}</p>
            </div>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mt-6">My Assigned Tasks</h3>

          {loading ? (
            <div className="py-12 text-center text-zinc-550">Loading my task roster...</div>
          ) : (
            <div className="space-y-4">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`glass-panel p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                      task.status === "Completed" ? "bg-emerald-500/5 border-emerald-500/10" : "bg-zinc-900/60 border-zinc-800"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${getPriorityColor(task.priority)}`}>
                          {task.priority} Priority
                        </span>
                        <span className="text-zinc-550">•</span>
                        <span className="text-zinc-500">Assigned By: <strong className="text-zinc-350">{task.assignedBy?.name}</strong></span>
                        <span className="text-zinc-550">•</span>
                        <span className="text-zinc-500">Due: <strong className="text-zinc-350">{task.dueDate}</strong></span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{task.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{task.description}</p>

                       {task.attachmentUrl && (
                         <div className="mt-2 space-y-2">
                           <span className="text-[10px] text-zinc-555 font-bold uppercase tracking-wider block">Reference Attachment:</span>
                           {isImgUrl(task.attachmentUrl) ? (
                             <div className="relative group max-w-sm rounded-xl overflow-hidden border border-zinc-800 bg-zinc-955/40">
                               <img src={task.attachmentUrl} alt="Attachment" className="max-h-48 w-auto object-contain rounded" />
                               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                 <a href={task.attachmentUrl} download className="p-1.5 rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400">
                                   <Download className="h-3.5 w-3.5" />
                                 </a>
                               </div>
                             </div>
                           ) : (
                             <a
                               href={task.attachmentUrl}
                               target="_blank"
                               className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-amber-500 hover:text-amber-400 rounded-lg hover:border-amber-500/25 transition font-medium text-[10px]"
                             >
                               <Paperclip className="h-3.5 w-3.5" />
                               <span>View Document ({task.attachmentUrl.split("/").pop()})</span>
                             </a>
                           )}
                         </div>
                       )}

                      {task.status === "Completed" && (
                        <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850 mt-2 space-y-1.5 text-[11px] text-zinc-400">
                          <p className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" />
                             <span>Submitted on {formatPKTDateTimeDisplay(task.completedAt)}</span>
                          </p>
                          <p><strong>My Notes:</strong> {task.completionNotes}</p>
                          {task.completionPhoto && (
                            <div className="mt-2 space-y-2">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Submitted Proof of Work:</span>
                              {isImgUrl(task.completionPhoto) ? (
                                <div className="relative group max-w-sm rounded-xl overflow-hidden border border-zinc-800 bg-zinc-955/40">
                                  <img src={task.completionPhoto} alt="Proof" className="max-h-48 w-auto object-contain rounded" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <a href={task.completionPhoto} download className="p-1.5 rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400">
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <a
                                  href={task.completionPhoto}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-amber-500 hover:text-amber-400 rounded-lg hover:border-amber-500/25 transition font-medium"
                                >
                                  <Paperclip className="h-3.5 w-3.5" />
                                  <span>View Supporting File ({task.completionPhoto.split("/").pop()})</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="self-end sm:self-center shrink-0">
                      {task.status === "Completed" ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => { setCompleteTaskId(task.id); setCompletionNotes(""); setCompletionPhoto(""); setShowCompleteModal(true); }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-550 text-center py-12">No tasks assigned to you.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- WORKER TASK COMPLETION MODAL --- */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="h-4.5 w-4.5 text-amber-500" />
                <span>Submit Task Completion</span>
              </h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Completion Notes / Details</label>
                <textarea
                  required
                  rows={4}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-950 focus:outline-none"
                  placeholder="Describe details of the survey, measurements taken, or material details..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Upload Supporting Proof / File *</label>
                {completionPhoto ? (
                  <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl mt-1.5">
                    <span className="text-zinc-300 truncate max-w-[250px] font-mono select-none" title={completionPhoto}>
                      {completionPhoto.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCompletionPhoto("")}
                      className="text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => document.getElementById("task-proof-file")?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      <Paperclip className="h-4 w-4 text-amber-500" />
                      <span>{uploadingFile ? "Uploading..." : "Upload File"}</span>
                    </button>
                    {uploadingFile && <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />}
                    <span className="text-[10px] text-zinc-500">Supports images, PDF, DOC/DOCX, Excel (max 10MB)</span>
                    <input
                      id="task-proof-file"
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                      disabled={uploadingFile}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
                {uploadError && (
                  <p className="mt-1 bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1 rounded text-[10px]">
                    {uploadError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 bg-zinc-855 text-zinc-400 font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg"
                >
                  {actionLoading ? "Submitting..." : "Submit Completion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MANAGER TASK EDIT MODAL --- */}
      {showEditTaskModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="h-4.5 w-4.5 text-amber-500" />
                <span>Edit Assigned Task Details</span>
              </h3>
              <button onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase">Task Title</label>
                <select
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-950 focus:outline-none"
                  required
                >
                  <option value="Solar Project">Solar Project</option>
                  <option value="Misc/Other Work">Misc/Other Work</option>
                  <option value="Office Task">Office Task</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase">Description</label>
                <textarea
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-950 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Priority</label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-955 focus:outline-none"
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Status</label>
                  <select
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-955 focus:outline-none"
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Due Date</label>
                  <input
                    type="date"
                    value={editTaskDueDate}
                    onChange={(e) => setEditTaskDueDate(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-950 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Charges</label>
                  <select
                    value={editTaskCharges}
                    onChange={(e) => setEditTaskCharges(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-955 focus:outline-none"
                    required
                  >
                    <option value="Quotation">Quotation</option>
                    <option value="Invoice">Invoice</option>
                    <option value="N/A">N/A — Not Applicable</option>
                    <option value="1000">1000</option>
                    <option value="1500">1500</option>
                    <option value="2000">2000</option>
                    <option value="3000">3000</option>
                    <option value="5000">5000</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-550 uppercase">Client Name</label>
                  <input
                    type="text"
                    value={editTaskClientName}
                    onChange={(e) => setEditTaskClientName(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-950 focus:outline-none"
                    placeholder="Client full name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-550 uppercase">Client Phone</label>
                  <input
                    type="text"
                    value={editTaskClientNumber}
                    onChange={(e) => setEditTaskClientNumber(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-950 focus:outline-none"
                    placeholder="0300-1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-550 uppercase">Branch</label>
                <select
                  value={editTaskClientLocation}
                  onChange={(e) => setEditTaskClientLocation(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-white bg-zinc-950 focus:outline-none"
                >
                  <option value="Chakwal">Chakwal</option>
                  <option value="Islamabad">Islamabad</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Assign Employee(s) *</label>
                <div className="max-h-36 overflow-y-auto border border-zinc-800 bg-zinc-950 rounded-xl p-3 space-y-2">
                  {fieldStaff.map((staff: any) => (
                    <label key={staff.id} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={editTaskAssignedToIds.includes(staff.id.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditTaskAssignedToIds([...editTaskAssignedToIds, staff.id.toString()]);
                          } else {
                            setEditTaskAssignedToIds(editTaskAssignedToIds.filter((id) => id !== staff.id.toString()));
                          }
                        }}
                        className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500 bg-zinc-900 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>{staff.name} - <span className="text-[10px] text-zinc-550 font-semibold">{staff.role} ({staff.department})</span></span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
