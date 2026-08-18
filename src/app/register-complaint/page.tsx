"use client";

import { useState, useRef } from "react";
import {
  Sun,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  FileText,
  AlignLeft,
  MessageCircle,
  Clock,
  Image,
  Paperclip,
  CheckCircle2,
  ChevronDown,
  Upload,
  Loader2,
} from "lucide-react";

const CATEGORIES = [
  "Inverter Problem",
  "Solar Panel Problem",
  "Battery Problem",
  "Monitoring/App Problem",
  "Wiring Problem",
  "Installation Problem",
  "Netmetering/Net billing problem",
  "IESCO Bill Issue",
  "Service & Maintenance",
  "Other",
];

const CONTACT_METHODS = ["Phone", "WhatsApp"];

const CONTACT_TIMES = [
  "Morning (9am–12pm)",
  "Afternoon (12pm–3pm)",
  "Evening (3pm–6pm)",
  "Anytime",
];

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  projectId: string;
  installedBy: string;
  category: string;
  subject: string;
  description: string;
  contactMethod: string;
  contactTime: string;
  screenshotUrl: string;
  attachmentUrl: string;
};

const INITIAL: FormState = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  projectId: "",
  installedBy: "",
  category: "",
  subject: "",
  description: "",
  contactMethod: "Phone",
  contactTime: "",
  screenshotUrl: "",
  attachmentUrl: "",
};

export default function ComplaintsPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [screenshotName, setScreenshotName] = useState<string>("");
  const [attachmentName, setAttachmentName] = useState<string>("");
  const screenshotRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFileUpload(
    file: File,
    fileType: "screenshot" | "attachment"
  ) {
    const setLoading = fileType === "screenshot" ? setScreenshotUploading : setAttachmentUploading;
    const setName = fileType === "screenshot" ? setScreenshotName : setAttachmentName;
    const field: keyof FormState = fileType === "screenshot" ? "screenshotUrl" : "attachmentUrl";

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", fileType);

      const res = await fetch("/api/complaints/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.fileUrl) {
        set(field, data.fileUrl);
        setName(file.name);
      } else {
        setError(data.error || "File upload failed.");
      }
    } catch {
      setError("File upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.fullName.trim() || !form.phone.trim() || !form.address.trim() || !form.category || !form.description.trim() || !form.installedBy || !form.contactMethod) {
      setError("Please fill in all required fields (Name, Phone, Address, Category, Installer, Description, Contact Method).");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        subject: form.category,
        contactMethod: form.contactMethod,
      };

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessId(data.complaintId);
        setForm(INITIAL);
        setScreenshotName("");
        setAttachmentName("");
      } else {
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center border-2 border-green-500/30">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Complaint Submitted!</h1>
          <p className="text-zinc-400 mb-6">
            Thank you for reaching out. Your complaint has been registered and our team will get back to you shortly.
          </p>
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Your Complaint ID</p>
            <p className="text-3xl font-black text-amber-400 tracking-wider">{successId}</p>
            <p className="text-xs text-zinc-500 mt-2">Please save this ID to track your complaint status.</p>
          </div>
          <button
            onClick={() => setSuccessId(null)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition"
          >
            Submit Another Complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
            <Sun className="h-3.5 w-3.5" />
            Askari Solar Energy — Customer Support
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Register a Complaint</h1>
          <p className="text-zinc-400 text-sm mt-2 max-w-lg mx-auto">
            Please fill out the form below with your installation and issue details. Our engineering team will review and contact you promptly.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Section: Customer Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-5 flex items-center gap-2">
              <User className="h-4 w-4" /> Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Muhammad Ali"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    required
                    className="w-full glass-input rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="tel"
                    placeholder="0300-1234567"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    required
                    className="w-full glass-input rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Email Address <span className="text-zinc-500">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className="w-full glass-input rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Enter your Complete Address (House/Street, Sector/Area, City)"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    required
                    className="w-full glass-input rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Complaint Details */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Complaint Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Complaint Category <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    required
                    className="w-full glass-input rounded-lg px-3 py-2.5 pr-9 text-sm text-white focus:outline-none appearance-none"
                  >
                    <option value="">Select a category...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-zinc-900">
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  System Installed By <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.installedBy}
                    onChange={(e) => set("installedBy", e.target.value)}
                    required
                    className="w-full glass-input rounded-lg px-3 py-2.5 pr-9 text-sm text-white focus:outline-none appearance-none"
                  >
                    <option value="">Select who installed your solar system...</option>
                    <option value="Askari solar" className="bg-zinc-900">Askari Solar Energy</option>
                    <option value="Other company" className="bg-zinc-900">Other company</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Detailed Description <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <textarea
                    placeholder="Describe the problem in detail..."
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    required
                    rows={5}
                    className="w-full glass-input rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Contact Preference */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-5 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Contact Preference
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Preferred Contact Method <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CONTACT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set("contactMethod", m)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition ${
                        form.contactMethod === m
                          ? "bg-amber-500 border-amber-500 text-zinc-950 font-bold"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-500/50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Preferred Contact Time <span className="text-zinc-600">(optional)</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <select
                    value={form.contactTime}
                    onChange={(e) => set("contactTime", e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2.5 pl-9 pr-9 text-sm text-white focus:outline-none appearance-none"
                  >
                    <option value="">Any time</option>
                    {CONTACT_TIMES.map((t) => (
                      <option key={t} value={t} className="bg-zinc-900">
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Attachments */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-5 flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Attachments <span className="text-zinc-600 font-normal normal-case text-xs">(optional)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Screenshot */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Screenshot / Photo
                </label>
                <input
                  ref={screenshotRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, "screenshot");
                  }}
                />
                <button
                  type="button"
                  onClick={() => screenshotRef.current?.click()}
                  disabled={screenshotUploading}
                  className="w-full border-2 border-dashed border-zinc-700 hover:border-amber-500/40 rounded-xl py-6 flex flex-col items-center gap-2 text-zinc-500 text-xs hover:text-zinc-300 transition disabled:opacity-50"
                >
                  {screenshotUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Image className="h-5 w-5" />
                  )}
                  {screenshotName ? (
                    <span className="text-amber-400 font-medium truncate max-w-full px-2">{screenshotName}</span>
                  ) : (
                    <span>Click to upload image</span>
                  )}
                </button>
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Additional File
                </label>
                <input
                  ref={attachmentRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, "attachment");
                  }}
                />
                <button
                  type="button"
                  onClick={() => attachmentRef.current?.click()}
                  disabled={attachmentUploading}
                  className="w-full border-2 border-dashed border-zinc-700 hover:border-amber-500/40 rounded-xl py-6 flex flex-col items-center gap-2 text-zinc-500 text-xs hover:text-zinc-300 transition disabled:opacity-50"
                >
                  {attachmentUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {attachmentName ? (
                    <span className="text-amber-400 font-medium truncate max-w-full px-2">{attachmentName}</span>
                  ) : (
                    <span>PDF, Word, Excel, ZIP (max 10MB)</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-bold text-base transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting Complaint...
              </>
            ) : (
              "Submit Complaint"
            )}
          </button>

          <p className="text-center text-xs text-zinc-600">
            Your information is kept confidential and used only to process your complaint.
          </p>
        </form>
      </div>
    </div>
  );
}
