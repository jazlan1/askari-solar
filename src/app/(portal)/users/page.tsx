"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { getSafeFileUrl } from "@/lib/file-helper";
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
  Loader2,
  Phone,
  Heart,
  Plus,
  Download,
  FileText,
  FileSpreadsheet,
  Eye,
  Search,
} from "lucide-react";
import { formatPKTDateDisplay } from "@/lib/dateUtils";

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface StaffDocument {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  uploadedAt?: string;
}

export default function UsersAdminPage() {
  const { user: currentAdmin, setActiveExcelFile, setActiveDocxFile, setActivePdfFile } = useStore();
  const adminRoles = (currentAdmin?.role || "")
    .split(",")
    .map((r: string) => r.trim().toLowerCase())
    .filter(Boolean);
  const canManageStaff = adminRoles.some((r: string) =>
    ["admin", "super admin", "superadmin", "management", "hr"].includes(r)
  );

  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Contact numbers
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [additionalPhone, setAdditionalPhone] = useState("");

  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  // Documents
  const [documentsList, setDocumentsList] = useState<StaffDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Reset password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const roles = [
    "Admin",
    "HR",
    "Accountant",
    "Sales & Marketing Department",
    "Field Staff",
  ];

  const departments = ["Management", "HR", "Accounts", "Sales", "Field", "None"];

  const RELATIONSHIPS = [
    "Father",
    "Mother",
    "Brother",
    "Sister",
    "Spouse",
    "Uncle",
    "Aunt",
    "Guardian",
    "Friend",
    "Other",
  ];

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
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
    setPrimaryPhone("");
    setSecondaryPhone("");
    setAdditionalPhone("");
    setEmergencyContacts([]);
    setDocumentsList([]);
    setUploadError("");
    setFormError("");
    setFormSuccess("");
    setShowModal(true);
  }

  function handleOpenEdit(user: any) {
    setModalMode("edit");
    setSelectedUserId(user.id);
    setName(user.name || "");
    setEmail(user.email || "");
    setPassword("");
    setSelectedRoles(user.role ? user.role.split(",").map((r: string) => r.trim()) : []);
    setDepartment(user.department || "None");
    setSecondaryPhone(user.secondaryPhone || "");
    setAdditionalPhone(user.additionalPhone || "");

    // Parse emergency contacts
    try {
      const parsedEc = typeof user.emergencyContacts === "string" ? JSON.parse(user.emergencyContacts) : user.emergencyContacts;
      setEmergencyContacts(Array.isArray(parsedEc) ? parsedEc : []);
    } catch {
      setEmergencyContacts([]);
    }

    // Parse documents
    try {
      const parsedDocs = typeof user.documents === "string" ? JSON.parse(user.documents) : user.documents;
      setDocumentsList(Array.isArray(parsedDocs) ? parsedDocs : []);
    } catch {
      setDocumentsList([]);
    }

    setUploadError("");
    setFormError("");
    setFormSuccess("");
    setShowModal(true);
  }

  const handleAddEmergencyContact = () => {
    setEmergencyContacts((prev) => [
      ...prev,
      { name: "", phone: "", relationship: "Father" },
    ]);
  };

  const handleRemoveEmergencyContact = (index: number) => {
    setEmergencyContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setEmergencyContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleMultipleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingDoc(true);
    setUploadError("");

    try {
      const newDocs: StaffDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/users/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          newDocs.push({
            fileName: data.fileName || file.name,
            fileUrl: data.fileUrl,
            fileSize: data.fileSize || file.size,
            uploadedAt: new Date().toISOString(),
          });
        } else {
          const err = await res.json();
          setUploadError(`Failed to upload ${file.name}: ${err.error}`);
        }
      }

      setDocumentsList((prev) => [...prev, ...newDocs]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError("Error uploading documents. Please try again.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocumentsList((prev) => prev.filter((_, i) => i !== index));
  };

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
        name: name.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        role: selectedRoles.join(", "),
        department,
        secondaryPhone: secondaryPhone.trim() || null,
        additionalPhone: additionalPhone.trim() || null,
        emergencyContacts: JSON.stringify(emergencyContacts.filter((c) => c.name.trim() && c.phone.trim())),
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
        }, 1200);
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

    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch (err) {
      alert("Failed to delete user due to network error.");
    }
  }

  const handleDocumentClick = (doc: StaffDocument) => {
    if (!doc.fileUrl) return;
    const ext = doc.fileName.split(".").pop()?.toLowerCase() || "";

    if (["xlsx", "xls", "csv"].includes(ext)) {
      setActiveExcelFile({ name: doc.fileName, fileUrl: doc.fileUrl });
    } else if (["docx", "doc"].includes(ext)) {
      setActiveDocxFile({ name: doc.fileName, fileUrl: doc.fileUrl });
    } else if (ext === "pdf") {
      setActivePdfFile({ name: doc.fileName, fileUrl: doc.fileUrl });
    } else {
      window.open(getSafeFileUrl(doc.fileUrl), "_blank");
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in relative z-10 text-xs">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-500" />
            <span>Staff & Access Management</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Provision user accounts, assign roles & departments, manage multiple documents and emergency contacts.
          </p>
        </div>

        {canManageStaff && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add New Staff</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, email, department, role..."
            className="w-full bg-zinc-950 text-white pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-800 focus:outline-none focus:border-amber-500"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
        </div>
        <span className="text-zinc-500 text-xs font-medium">Total Staff: {filteredUsers.length}</span>
      </div>

      {/* Staff Grid Cards */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p>Loading staff database...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800 rounded-2xl">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold">No staff members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((u) => {
            let docs: StaffDocument[] = [];
            try {
              docs = typeof u.documents === "string" ? JSON.parse(u.documents) : u.documents || [];
            } catch {
              docs = [];
            }

            let ecs: EmergencyContact[] = [];
            try {
              ecs = typeof u.emergencyContacts === "string" ? JSON.parse(u.emergencyContacts) : u.emergencyContacts || [];
            } catch {
              ecs = [];
            }

            return (
              <div
                key={u.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition shadow-sm"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        {u.name}
                      </h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{u.email}</span>
                      </p>
                    </div>

                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold text-[10px]">
                      {u.department}
                    </span>
                  </div>

                  {/* Roles */}
                  <div className="mt-3">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                      Assigned Roles
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(u.role || "").split(",").map((r: string, i: number) => (
                        <span
                          key={i}
                          className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] border border-zinc-700"
                        >
                          {r.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contacts */}
                  {(u.secondaryPhone || u.additionalPhone) && (
                    <div className="mt-3 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-amber-500" /> Contact Numbers
                      </span>
                      {u.secondaryPhone && (
                        <p className="text-zinc-300 text-[11px]">Secondary: <span className="font-mono text-zinc-200">{u.secondaryPhone}</span></p>
                      )}
                      {u.additionalPhone && (
                        <p className="text-zinc-300 text-[11px]">Additional: <span className="font-mono text-zinc-200">{u.additionalPhone}</span></p>
                      )}
                    </div>
                  )}

                  {/* Emergency Contacts */}
                  {ecs.length > 0 && (
                    <div className="mt-3 bg-red-950/20 p-2.5 rounded-xl border border-red-500/20">
                      <span className="text-[10px] text-red-400 font-bold uppercase block mb-1 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-400" /> Emergency Contacts
                      </span>
                      <div className="space-y-1">
                        {ecs.map((ec, i) => (
                          <p key={i} className="text-zinc-300 text-[11px]">
                            <span className="text-red-300 font-semibold">{ec.relationship}:</span> {ec.name} — <span className="font-mono text-zinc-300">{ec.phone}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {docs.length > 0 && (
                    <div className="mt-3">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-amber-500" /> Attached Documents ({docs.length})
                      </span>
                      <div className="space-y-1.5">
                        {docs.map((doc, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px]"
                          >
                            <span className="text-zinc-300 truncate max-w-[180px]" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleDocumentClick(doc)}
                                className="p-1 text-zinc-400 hover:text-amber-400 rounded"
                                title="Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={getSafeFileUrl(doc.fileUrl)}
                                download={doc.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-zinc-400 hover:text-blue-400 rounded"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                {canManageStaff && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Staff</span>
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <span>{modalMode === "create" ? "Add New Staff Member" : `Edit Staff: ${name}`}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ali Ahmed"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ali@solarkidunya.com"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Password & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    {modalMode === "create" ? (
                      <>
                        Password <span className="text-red-400">*</span>
                      </>
                    ) : (
                      "Change Password (optional)"
                    )}
                  </label>
                  <input
                    type="password"
                    required={modalMode === "create"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modalMode === "create" ? "••••••••" : "Leave blank to keep current"}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Roles (Checkbox list) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Assigned Roles <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  {roles.map((r) => {
                    const isChecked = selectedRoles.includes(r);
                    return (
                      <label
                        key={r}
                        className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles((prev) => [...prev, r]);
                            } else {
                              setSelectedRoles((prev) => prev.filter((role) => role !== r));
                            }
                          }}
                          className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                        />
                        <span>{r}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Contact Numbers Section */}
              <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Phone className="w-3.5 h-3.5" /> Contact Numbers
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Secondary Contact Number</label>
                    <input
                      type="tel"
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Additional Contact Number</label>
                    <input
                      type="tel"
                      value={additionalPhone}
                      onChange={(e) => setAdditionalPhone(e.target.value)}
                      placeholder="0312-9876543"
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contacts Section */}
              <div className="bg-red-950/10 p-4 rounded-xl border border-red-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Heart className="w-3.5 h-3.5" /> Emergency Contacts
                  </span>
                  <button
                    type="button"
                    onClick={handleAddEmergencyContact}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-600/20 text-red-300 hover:bg-red-600/30 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Emergency Contact</span>
                  </button>
                </div>

                {emergencyContacts.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">No emergency contacts added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {emergencyContacts.map((ec, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <select
                          value={ec.relationship}
                          onChange={(e) => handleUpdateEmergencyContact(idx, "relationship", e.target.value)}
                          className="bg-zinc-800 text-white text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none"
                        >
                          {RELATIONSHIPS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Contact Name"
                          value={ec.name}
                          onChange={(e) => handleUpdateEmergencyContact(idx, "name", e.target.value)}
                          className="flex-1 bg-zinc-800 text-white text-xs rounded px-2.5 py-1 border border-zinc-700 focus:outline-none"
                        />
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={ec.phone}
                          onChange={(e) => handleUpdateEmergencyContact(idx, "phone", e.target.value)}
                          className="flex-1 bg-zinc-800 text-white text-xs rounded px-2.5 py-1 border border-zinc-700 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEmergencyContact(idx)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multiple Documents Upload Section */}
              <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Paperclip className="w-3.5 h-3.5" /> Staff Documents (CNIC, Certificates, Contract)
                  </span>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleMultipleDocumentUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingDoc}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Upload Documents</span>
                  </button>
                </div>

                {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

                {documentsList.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">No documents attached.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {documentsList.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-xs text-zinc-200"
                      >
                        <span className="truncate max-w-sm">{doc.fileName}</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={getSafeFileUrl(doc.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline text-[11px]"
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            className="text-zinc-500 hover:text-red-400 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  {actionLoading ? "Saving..." : modalMode === "create" ? "Create Staff Account" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
