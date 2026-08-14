"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import {
  User,
  Key,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Lock,
  UserCheck,
  Paperclip
} from "lucide-react";
import { formatPKTDateDisplay, formatPKTDateTimeDisplay } from "@/lib/dateUtils";

export default function ProfilePage() {
  const { user } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const fetched = await res.json();
        setData(fetched);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchProfile();
      } else {
        setError(data.error || "Password change failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-zinc-900 rounded-xl"></div>
        <div className="h-60 bg-zinc-900 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in relative z-10 max-w-6xl mx-auto">
      {/* Profile Details Card & Documents */}
      <div className="space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-6 h-fit">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-20 w-20 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-extrabold text-2xl">
            {user?.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{user?.name}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{user?.role} • {user?.department}</p>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Email Address:</span>
            <strong className="text-zinc-200">{user?.email}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Role:</span>
            <strong className="text-zinc-200">{user?.role}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Department:</span>
            <strong className="text-zinc-200">{user?.department}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Joined System:</span>
            <strong className="text-zinc-200">
              {formatPKTDateDisplay(data?.user?.createdAt)}
            </strong>
          </div>
        </div>
      </div>

      {/* Official Personal Documents Card */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Paperclip className="h-4.5 w-4.5 text-amber-500" />
          <span>My Official Files</span>
        </h3>
        <p className="text-[10px] text-zinc-550">Download copies of your official CV, certificates, and ID files uploaded by Admin/HR</p>
        
        <div className="space-y-2 mt-2">
          {(() => {
            try {
              const docs = JSON.parse(data?.user?.documents || "[]");
              if (docs.length > 0) {
                return docs.map((doc: any, i: number) => (
                  <a
                    key={i}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 text-xs text-zinc-300 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="truncate max-w-[180px] font-medium" title={doc.fileName}>{doc.fileName}</span>
                    </div>
                    <span className="text-[9px] text-amber-500 hover:underline">Download</span>
                  </a>
                ));
              }
            } catch {}
            return <p className="text-xs text-zinc-650 italic py-2 text-center bg-zinc-950/20 rounded-xl border border-zinc-850">No files uploaded yet.</p>;
          })()}
        </div>
      </div>
      </div>

      {/* Main Panel - Password & Audit */}
      <div className="lg:col-span-2 space-y-6">
        {/* Change Password Card */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Key className="h-4.5 w-4.5 text-amber-500" />
            <span>Change Security Password</span>
          </h3>

          {error && (
            <p className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-lg flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>{error}</span>
            </p>
          )}

          {success && (
            <p className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{success}</span>
            </p>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase">Current Password</label>
                <div className="relative mt-1.5">
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 text-white bg-zinc-900 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase">New Password</label>
                <div className="relative mt-1.5">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 text-white bg-zinc-900 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase">Confirm Password</label>
                <div className="relative mt-1.5">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 text-white bg-zinc-900 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg transition"
              >
                {actionLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Security Audit Trail */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-amber-500" />
            <span>Security Audit Log Trail</span>
          </h3>
          <p className="text-[11px] text-zinc-500">List of your latest 10 login sessions and password modifications</p>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {data?.auditLogs?.length > 0 ? (
              data.auditLogs.map((log: any) => (
                <div key={log.id} className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50 border border-zinc-850 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-300">{log.action}</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {formatPKTDateTimeDisplay(log.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-650 py-4 text-center">No logs logged yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
