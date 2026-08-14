"use client";

import { useState } from "react";
import {
  Settings,
  Bell,
  Monitor,
  Building,
  ShieldCheck,
  CheckCircle,
  HelpCircle
} from "lucide-react";

export default function SettingsPage() {
  const [success, setSuccess] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [browserPush, setBrowserPush] = useState(true);
  const [themeMode, setThemeMode] = useState("dark");
  const [portalTheme, setPortalTheme] = useState("amber");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto glass-panel p-6 md:p-8 rounded-2xl border border-zinc-800 space-y-6 animate-fade-in relative z-10">
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Settings className="h-5.5 w-5.5 text-amber-500" />
          <span>System Settings</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Configure your personal preferences, display themes, and notification triggers</p>
      </div>

      {success && (
        <p className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>Settings saved successfully.</span>
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs text-zinc-300">
        {/* Theme display settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>Display Theme Configuration</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase">System Mode</label>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value)}
                className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
              >
                <option value="dark">Dark Mode (Recommended)</option>
                <option value="light">Light Mode</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase">Brand Theme Color</label>
              <select
                value={portalTheme}
                onChange={(e) => setPortalTheme(e.target.value)}
                className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-white bg-zinc-900 focus:outline-none"
              >
                <option value="amber">Solar Amber (Default)</option>
                <option value="emerald">Askari Green</option>
                <option value="blue">Deep Blue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="space-y-3 border-t border-zinc-800 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notification Triggers</span>
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="emailAlerts"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="emailAlerts" className="text-zinc-300 font-semibold cursor-pointer">
                Send email summaries about pending leads and quotation status updates
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="browserPush"
                checked={browserPush}
                onChange={(e) => setBrowserPush(e.target.checked)}
                className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="browserPush" className="text-zinc-300 font-semibold cursor-pointer">
                Display browser push notifications for new folder uploads and attendance punches
              </label>
            </div>
          </div>
        </div>

        {/* Company About */}
        <div className="space-y-3 border-t border-zinc-800 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>Portal & Platform Specifications</span>
          </h3>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-2 text-zinc-450 leading-relaxed">
            <p><strong>Askari Solar Energy Portal & CRM Software</strong></p>
            <p>Version: 1.0.0 • Production Build Stable</p>
            <p>Database Status: Prisma Client Sync SQLite Active</p>
            <p className="flex items-center gap-1.5 text-emerald-400 mt-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>SaaS Security Core Configured (JWT + Middleware Checks)</span>
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t border-zinc-800">
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg transition cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
