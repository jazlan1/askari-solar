"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Lock,
  X,
  Mail,
  ShieldCheck,
  Building,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  Loader2
} from "lucide-react";
import { formatPKTDateDisplay } from "@/lib/dateUtils";

export default function UsersAdminPage() {
  const { user: currentAdmin } = useStore();
  const adminRoles = (currentAdmin?.role || "")
    .split(",")
    .map((r: string) => r.trim().toLowerCase())
    .filter(Boolean);
  const canManageStaff = adminRoles.some((r: string) =>
    ["admin", "super admin", "superadmin", "management", "hr"].includes(r)
  );
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [department, setDepartment] = useState("HR");

  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Reset password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const roles = [
    "Admin",
    "HR",
    "Accountant",
    "Sales & Marketing Department",
    "Field Staff",
  ];

  const departments = ["Management", "HR", "Accounts", "Sales", "Field", "None"];

  const ROLE_PERMISSIONS: Record<string, string[]> = {
    "Admin": [
      "• Access to all modules (Dashboard, Staff, Tasks, Complaints, Sales/CRM, Accounts, HR, File Manager, Announcements, Settings)",
      "• Permissions: Full read, write, delete permissions system-wide"
    ],
    "HR": [
      "• Access to Dashboard, Tasks, Complaints, Staff Management (View only), HR module (Attendance adjust, staff registry, notices), File Manager, Announcements, Settings",
      "• Permissions: Modify staff attendance records, publish notices, assign tasks, view files"
    ],
    "Accountant": [
      "• Access to Dashboard, Tasks, Complaints, Accounts (View/Modify Product pricing, invoices), File Manager, Announcements, Settings",
      "• Permissions: View/Update system products rates, create invoices, assign tasks, publish notices"
    ],
    "Sales & Marketing Department": [
      "• Access to Dashboard, Tasks, Complaints, Sales & Marketing, CRM (Kanban lead pipeline, customer profiles, quotation generator), File Manager, Announcements, Settings",
      "• Permissions: Create/Modify CRM leads, customer profiles, generate quotations, drag-and-drop Kanban pipeline"
    ],
    "Field Staff": [
      "• Access to Dashboard (Task stats only), Tasks (View & complete assigned tasks), Complaints (View & complete assigned complaints), Settings",
      "• Permissions: Upload task completion proof, update status of assigned complaints, view own logs"
    ]
  };

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function handleOpenCreate() {
    setModalMode("create");
    setSelectedUserId(null);
    setName("");
    setEmail("");
    setPassword("");
    setSelectedRoles(["HR"]);
    setDepartment("HR");
    setDocumentsList([]);
    setUploadError("");
    setFormError("");
    setFormSuccess("");
    setShowModal(true);
  }

  function handleOpenEdit(user: any) {
    setModalMode("edit");
    setSelectedUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setSelectedRoles(user.role ? user.role.split(",").map((r: string) => r.trim()) : []);
    setDepartment(user.department);
    try {
      setDocumentsList(JSON.parse(user.documents || "[]"));
    } catch {
      setDocumentsList([]);
    }
    setUploadError("");
    setFormError("");
    setFormSuccess("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim() || !email.trim() || selectedRoles.length === 0) {
      setFormError("All fields are required. Please select at least one role.");
      return;
    }

    if (modalMode === "create" && !password.trim()) {
      setFormError("Initial password is required");
      return;
    }

    setActionLoading(true);
    try {
      const url = "/api/users";
      const method = modalMode === "create" ? "POST" : "PUT";
      const payload = {
        id: selectedUserId,
        name,
        email: email.trim(),
        password: password.trim() || undefined,
        role: selectedRoles.join(", "),
        department,
        documents: JSON.stringify(documentsList),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess(`User ${modalMode === "create" ? "created" : "updated"} successfully!`);
        setTimeout(() => {
          setShowModal(false);
          fetchUsers();
        }, 1500);
      } else {
        setFormError(data.error || "Action failed");
      }
    } catch (err) {
      setFormError("Network error. Please check backend connection.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: number, userName: string) {
    if (id === currentAdmin?.id) {
      alert("You cannot delete your own logged-in admin account.");
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${userName}"? This will permanently delete their timesheets, announcements, tasks, and audit log records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
        alert("User deleted successfully.");
      } else {
        const data = await res.json();
        alert(data.error || "Delete failed");
      }
    } catch (err) {
      alert("Failed to connect to server.");
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPassword.trim()) {
      alert("Please enter a new password");
      return;
    }

    setActionLoading(true);
    try {
      const targetUser = usersList.find((u) => u.id === resetUserId);
      if (!targetUser) return;

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetUserId,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          department: targetUser.department,
          password: resetPassword,
        }),
      });

      if (res.ok) {
        alert("Password reset successfully!");
        setShowResetModal(false);
        setResetPassword("");
      } else {
        const data = await res.json();
        alert(data.error || "Password reset failed");
      }
    } catch (err) {
      alert("Failed to reset password.");
    } finally {
      setActionLoading(false);
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin": return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "HR": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "Accountant": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "Sales & Marketing Department": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Field Staff": return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
      default: return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-500" />
            <span>Staff Management Panel</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Manage corporate portal log credentials, roles, and department assignments</p>
        </div>

        {canManageStaff && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer self-stretch sm:self-auto justify-center"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add New Staff</span>
          </button>
        )}
      </div>

      {/* Main Roster list table */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800">
        {loading ? (
          <div className="py-12 text-center text-zinc-500 animate-pulse">Loading portal users registry...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-zinc-300">
              <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Employee Name</th>
                  <th className="px-6 py-3.5 font-bold">Email Address</th>
                  <th className="px-6 py-3.5 font-bold">Access Role</th>
                  <th className="px-6 py-3.5 font-bold">Department</th>
                  <th className="px-6 py-3.5 font-bold">Added Date</th>
                  <th className="px-6 py-3.5 font-bold">Documents</th>
                  {canManageStaff && <th className="px-6 py-3.5 font-bold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {usersList.length > 0 ? (
                  usersList.map((userItem) => (
                    <tr key={userItem.id} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                      <td className="px-6 py-3.5 font-bold text-zinc-200">{userItem.name} {userItem.id === currentAdmin?.id && "(You)"}</td>
                      <td className="px-6 py-3.5 text-zinc-400 font-mono">{userItem.email}</td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getRoleBadgeColor(userItem.role)}`}>
                          {userItem.role}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-zinc-450 font-semibold">{userItem.department}</td>
                      <td className="px-6 py-3.5 text-zinc-500">{formatPKTDateDisplay(userItem.createdAt)}</td>
                      <td className="px-6 py-3.5">
                        {(() => {
                          try {
                            const docs = JSON.parse(userItem.documents || "[]");
                            if (docs.length > 0) {
                              return (
                                <div className="flex flex-wrap gap-1.5">
                                  {docs.map((doc: any, i: number) => (
                                    <a
                                      key={i}
                                      href={doc.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[10px] transition"
                                    >
                                      <Paperclip className="h-3 w-3 text-amber-500" />
                                      <span className="truncate max-w-[80px]">{doc.fileName}</span>
                                    </a>
                                  ))}
                                </div>
                              );
                            }
                          } catch {}
                          return <span className="text-zinc-600 italic">None</span>;
                        })()}
                      </td>
                      {canManageStaff && (
                        <td className="px-6 py-3.5 text-right flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setResetUserId(userItem.id); setResetPassword(""); setShowResetModal(true); }}
                            title="Reset Password"
                            className="p-1.5 rounded-lg bg-zinc-855 hover:bg-zinc-800 text-zinc-400 hover:text-amber-500 border border-zinc-800 transition"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(userItem)}
                            title="Edit User"
                            className="p-1.5 rounded-lg bg-zinc-855 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(userItem.id, userItem.name)}
                            disabled={userItem.id === currentAdmin?.id}
                            title="Delete User"
                            className="p-1.5 rounded-lg bg-zinc-855 hover:bg-zinc-800 text-zinc-400 hover:text-red-500 border border-zinc-800 transition disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-550">No users found in database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD / EDIT USER DIALOG MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-amber-500" />
                <span>{modalMode === "create" ? "Create New Staff Account" : "Modify Staff Credentials"}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <p className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </p>
            )}

            {formSuccess && (
              <p className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-950 focus:outline-none"
                  placeholder="e.g. Ali Ahmed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Email Address</label>
                <div className="relative mt-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full block glass-input rounded-xl pl-9 pr-3 py-2 text-white bg-zinc-950 focus:outline-none font-mono"
                    placeholder="e.g. ali@askarisolar.com"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                </div>
              </div>

              {modalMode === "create" && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Initial Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full block glass-input rounded-xl pl-9 pr-3 py-2 text-white bg-zinc-950 focus:outline-none"
                      placeholder="••••••••"
                    />
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Department</label>
                <div className="relative mt-1.5">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full block glass-input rounded-xl pl-9 pr-3 py-2 text-white bg-zinc-950 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-2">System Access Roles</label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                  {roles.map((r) => {
                    const isChecked = selectedRoles.includes(r);
                    return (
                      <label key={r} className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, r]);
                            } else {
                              setSelectedRoles(selectedRoles.filter((item) => item !== r));
                            }
                          }}
                          className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0"
                        />
                        <span className="text-[11px]">{r}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Permissions/Access Information Card */}
              <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-850 space-y-1.5 animate-fade-in">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Granted Module Permissions</span>
                <div className="space-y-2 mt-1 text-[11px] text-zinc-400 max-h-[140px] overflow-y-auto pr-1">
                  {selectedRoles.length > 0 ? (
                    selectedRoles.map((r) => (
                      <div key={r} className="space-y-0.5 border-b border-zinc-850 pb-1.5 last:border-b-0 last:pb-0">
                        <strong className="text-zinc-300 block">{r}:</strong>
                        {ROLE_PERMISSIONS[r]?.map((perm, idx) => (
                          <p key={idx} className="pl-1">{perm}</p>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="italic text-zinc-650">Select one or more roles to view permissions</p>
                  )}
                </div>
              </div>

              {/* Employee Documents Multi-file Upload */}
              <div className="space-y-2 border-t border-zinc-800 pt-3">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Employee Official Documents (CV, ID Card, Certificates)</label>
                
                {/* Uploaded Documents List */}
                {documentsList.length > 0 && (
                  <div className="space-y-1.5">
                    {documentsList.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-zinc-955 border border-zinc-850 text-[11px]">
                        <span className="text-zinc-300 truncate max-w-[220px] font-mono" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDocumentsList(documentsList.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-[10px]"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    disabled={uploadingDoc}
                    onClick={() => document.getElementById("emp-doc-input")?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-amber-500" />
                    <span>{uploadingDoc ? "Uploading..." : "Upload Document"}</span>
                  </button>
                  {uploadingDoc && <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />}
                  <span className="text-[9px] text-zinc-650">Max size 15MB</span>
                  
                  <input
                    id="emp-doc-input"
                    type="file"
                    disabled={uploadingDoc}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingDoc(true);
                      setUploadError("");
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const r = await fetch("/api/users/upload", {
                          method: "POST",
                          body: fd
                        });
                        if (r.ok) {
                          const resData = await r.json();
                          setDocumentsList([...documentsList, { fileName: resData.fileName, fileUrl: resData.fileUrl }]);
                        } else {
                          const errData = await r.json();
                          setUploadError(errData.error || "Upload failed");
                        }
                      } catch {
                        setUploadError("Upload network error");
                      } finally {
                        setUploadingDoc(false);
                        e.target.value = "";
                      }
                    }}
                    className="hidden"
                  />
                </div>

                {uploadError && (
                  <p className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                    {uploadError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-855 text-zinc-400 font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg"
                >
                  {actionLoading ? "Processing..." : modalMode === "create" ? "Add Staff" : "Update Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESET PASSWORD DIALOG MODAL --- */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-amber-500" />
                <span>Reset User Password</span>
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">New Secure Password</label>
                <input
                  type="password"
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-950 focus:outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 bg-zinc-855 text-zinc-400 font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg"
                >
                  {actionLoading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
