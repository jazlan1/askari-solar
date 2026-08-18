"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sun,
  User,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  Star,
  CheckCircle2,
  Upload,
  Image,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const SERVICE_TYPES = [
  "Solar Project",
  "Complain",
  "Misc/Other Work",
];

type FormState = {
  customerName: string;
  contactNumber: string;
  locationCity: string;
  installationDate: string;
  serviceType: string;
  technicalBehaviour: number;
  technicalSkills: number;
  timelines: number;
  cleanliness: number;
  problemSolved: string; // "Yes" / "No"
  overallRating: number;
  commentsSuggestions: string;
  photoUrl: string;
  warrantyReceived: string; // "Yes" / "No" / "Not Applicable"
  warrantyCardUrl: string;
  fieldStaffId: number; // which field staff member handled the work
};

const INITIAL: FormState = {
  customerName: "",
  contactNumber: "",
  locationCity: "",
  installationDate: "",
  serviceType: "",
  technicalBehaviour: 0,
  technicalSkills: 0,
  timelines: 0,
  cleanliness: 0,
  problemSolved: "",
  overallRating: 0,
  commentsSuggestions: "",
  photoUrl: "",
  warrantyReceived: "",
  warrantyCardUrl: "",
  fieldStaffId: 0,
};

export default function FeedbackPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldStaffList, setFieldStaffList] = useState<any[]>([]);

  // Load field staff for dropdown
  useEffect(() => {
    fetch("/api/users/fieldstaff")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFieldStaffList(d.fieldStaff || []);
      })
      .catch(() => {/* non-fatal */});
  }, []);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate fields
    if (
      !form.customerName ||
      !form.contactNumber ||
      !form.locationCity ||
      !form.installationDate ||
      !form.serviceType ||
      form.technicalBehaviour === 0 ||
      form.technicalSkills === 0 ||
      form.timelines === 0 ||
      form.cleanliness === 0 ||
      !form.problemSolved ||
      form.overallRating === 0 ||
      !form.warrantyReceived
    ) {
      setError("Please complete all required fields and ratings.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(true);
        setForm(INITIAL);
      } else {
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Helper component for star ratings
  const RatingInput = ({
    label,
    value,
    onChange,
    required = true,
  }: {
    label: string;
    value: number;
    onChange: (val: number) => void;
    required?: boolean;
  }) => {
    const [hoverVal, setHoverVal] = useState<number | null>(null);
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-zinc-800/50 gap-2">
        <span className="text-sm font-medium text-zinc-300">
          {label} {required && <span className="text-red-400">*</span>}
        </span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverVal(star)}
              onMouseLeave={() => setHoverVal(null)}
              className="p-1 hover:scale-110 transition cursor-pointer text-zinc-600 focus:outline-none"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= (hoverVal ?? value)
                    ? "fill-amber-400 text-amber-400 filter drop-shadow-[0_0_2px_rgba(251,191,36,0.3)]"
                    : "text-zinc-600"
                }`}
              />
            </button>
          ))}
          {value > 0 && (
            <span className="text-xs font-bold text-amber-500 ml-2 w-8 text-center bg-amber-500/10 px-1.5 py-0.5 rounded">
              {value}/5
            </span>
          )}
        </div>
      </div>
    );
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-fade-in bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-zinc-100 mb-3">Feedback Submitted!</h1>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Thank you for taking the time to share your feedback. Your input helps us maintain and improve our installation standards.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-sm transition shadow-lg cursor-pointer"
          >
            Submit Another Feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-10 shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src="/logo.png" alt="Askari Logo" className="h-9 w-9 rounded-full object-cover border border-amber-500/30" />
          <div>
            <p className="text-sm font-extrabold tracking-wider uppercase text-amber-400">Askari Solar Energy</p>
            <p className="text-xs text-zinc-555">Installation Feedback & Satisfaction Survey</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800/80 py-12 text-center px-4">
          <h1 className="text-3xl font-black text-zinc-100 tracking-tight mb-2">Customer Feedback Form</h1>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
            Your feedback matters! Please evaluate the service received from our team. It takes less than 3 minutes.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-3xl mx-auto px-4 py-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Customer Info */}
            <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/50 to-orange-500/50" />
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-amber-400 mb-6 flex items-center gap-2">
                <User className="h-4 w-4" /> Customer Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Customer Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-650" />
                    <input
                      type="text"
                      placeholder="Muhammad Ali"
                      value={form.customerName}
                      onChange={(e) => set("customerName", e.target.value)}
                      required
                      className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Contact Number <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-650" />
                    <input
                      type="tel"
                      placeholder="03xx-xxxxxxx"
                      value={form.contactNumber}
                      onChange={(e) => set("contactNumber", e.target.value)}
                      required
                      className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Location / City <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-650" />
                    <input
                      type="text"
                      placeholder="Islamabad"
                      value={form.locationCity}
                      onChange={(e) => set("locationCity", e.target.value)}
                      required
                      className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Installation / Completion Date <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-zinc-650 pointer-events-none" />
                    <input
                      type="date"
                      value={form.installationDate}
                      onChange={(e) => set("installationDate", e.target.value)}
                      required
                      className="w-full glass-input rounded-xl pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 scheme-dark cursor-pointer"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Service Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SERVICE_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set("serviceType", t)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                          form.serviceType === t
                            ? "bg-amber-500 border-amber-500 text-zinc-950 font-bold"
                            : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field Staff Dropdown */}
                {fieldStaffList.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 mb-2">
                      Field Staff Member Who Served You <span className="text-zinc-600">(optional)</span>
                    </label>
                    <select
                      value={form.fieldStaffId || ""}
                      onChange={(e) => set("fieldStaffId", e.target.value ? parseInt(e.target.value) : 0)}
                      className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-white bg-zinc-800 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="">Select team member (if known)...</option>
                      {fieldStaffList.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Service Feedback */}
            <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/50 to-orange-500/50" />
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-amber-400 mb-6 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Service Evaluation
              </h2>

              <div className="space-y-2">
                <RatingInput
                  label="Technical Behaviour"
                  value={form.technicalBehaviour}
                  onChange={(val) => set("technicalBehaviour", val)}
                />
                <RatingInput
                  label="Technical Skills"
                  value={form.technicalSkills}
                  onChange={(val) => set("technicalSkills", val)}
                />
                <RatingInput
                  label="Timelines / Punctuality"
                  value={form.timelines}
                  onChange={(val) => set("timelines", val)}
                />
                <RatingInput
                  label="Cleanliness & Organization"
                  value={form.cleanliness}
                  onChange={(val) => set("cleanliness", val)}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-zinc-800/50 gap-3">
                  <span className="text-sm font-medium text-zinc-300">
                    Was your problem fully solved? <span className="text-red-400">*</span>
                  </span>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set("problemSolved", opt)}
                        className={`px-6 py-2 rounded-xl text-xs font-bold border transition w-24 text-center cursor-pointer ${
                          form.problemSolved === opt
                            ? opt === "Yes"
                              ? "bg-emerald-500 border-emerald-500 text-zinc-950"
                              : "bg-red-500 border-red-500 text-zinc-950"
                            : "bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <RatingInput
                  label="Overall Rating"
                  value={form.overallRating}
                  onChange={(val) => set("overallRating", val)}
                />

                <div className="pt-4">
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Comments / Suggestions <span className="text-zinc-655">(optional)</span>
                  </label>
                  <textarea
                    placeholder="We want to hear from you. Tell us what we did well, or where we can improve..."
                    value={form.commentsSuggestions}
                    onChange={(e) => set("commentsSuggestions", e.target.value)}
                    rows={4}
                    className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>

                {/* Comments box */}
              </div>
            </div>

            {/* Section 3: Warranty */}
            <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/50 to-orange-500/50" />
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-amber-400 mb-6 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Warranty Details
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-3">
                    Have you received your Warranty Card? <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["Yes", "No", "Not Applicable"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          set("warrantyReceived", opt);
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          form.warrantyReceived === opt
                            ? "bg-amber-500 border-amber-500 text-zinc-950 font-bold"
                            : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 animate-pulse font-medium">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-black text-sm tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Feedback...
                </>
              ) : (
                <>
                  Submit Installation Feedback
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
