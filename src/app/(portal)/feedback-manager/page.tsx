"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  X,
  RefreshCw,
  Eye,
  Star,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  User,
  Phone,
  MapPin,
  Calendar,
  Wrench,
  ShieldAlert,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { formatPKTDateDisplay, formatPKTDateTimeDisplay } from "@/lib/dateUtils";

type Feedback = {
  id: number;
  customerName: string;
  contactNumber: string;
  locationCity: string;
  installationDate: string;
  serviceType: string;
  technicalBehaviour: number;
  technicalSkills: number;
  timelines: number;
  cleanliness: number;
  problemSolved: string;
  overallRating: number;
  commentsSuggestions: string | null;
  photoUrl: string | null;
  warrantyReceived: string;
  warrantyCardUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function FeedbackManagerPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterRating, setFilterRating] = useState("");

  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const fetchFeedbacks = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      console.error("Failed to load feedbacks:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Filter logic
  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchesSearch =
      fb.customerName.toLowerCase().includes(search.toLowerCase()) ||
      fb.locationCity.toLowerCase().includes(search.toLowerCase()) ||
      fb.contactNumber.includes(search);
    const matchesService = filterService ? fb.serviceType === filterService : true;
    const matchesRating = filterRating ? fb.overallRating === Number(filterRating) : true;
    return matchesSearch && matchesService && matchesRating;
  });

  // Analytics/Stats calculations
  const totalCount = feedbacks.length;
  const avgOverall =
    totalCount > 0
      ? (feedbacks.reduce((acc, fb) => acc + fb.overallRating, 0) / totalCount).toFixed(1)
      : "0.0";
  const problemSolvedRate =
    totalCount > 0
      ? (
          (feedbacks.filter((fb) => fb.problemSolved === "Yes").length / totalCount) *
          100
        ).toFixed(0)
      : "0";
  const avgSkills =
    totalCount > 0
      ? (feedbacks.reduce((acc, fb) => acc + fb.technicalSkills, 0) / totalCount).toFixed(1)
      : "0.0";
  const avgBehaviour =
    totalCount > 0
      ? (feedbacks.reduce((acc, fb) => acc + fb.technicalBehaviour, 0) / totalCount).toFixed(1)
      : "0.0";

  // Unique service types for filtering dropdown
  const serviceTypes = Array.from(new Set(feedbacks.map((fb) => fb.serviceType)));

  const StarRating = ({ rating, size = 4 }: { rating: number; size?: number }) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-${size} w-${size} ${
              s <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in text-zinc-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Customer Feedbacks</h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Monitor installation quality, timelines, and customer satisfaction.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/feedback"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-white hover:border-amber-500/40 transition cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Public Form
          </a>
          <button
            onClick={() => fetchFeedbacks(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-amber-500" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Submissions</span>
          <span className="text-2xl font-black text-white mt-2">{totalCount}</span>
          <span className="text-[10px] text-zinc-600 mt-1">Life-time feedback form entries</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Average Rating</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-400">{avgOverall}</span>
            <span className="text-xs text-zinc-600">/ 5.0</span>
          </div>
          <div className="mt-1">
            <StarRating rating={Math.round(Number(avgOverall))} size={3} />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Problems Solved</span>
          <span className="text-2xl font-black text-emerald-400 mt-2">{problemSolvedRate}%</span>
          <span className="text-[10px] text-zinc-650 mt-1">Resolution success rate</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Field Performance</span>
          <div className="flex flex-col gap-1 mt-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Skills:</span>
              <span className="font-bold text-zinc-200">{avgSkills}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Behaviour:</span>
              <span className="font-bold text-zinc-200">{avgBehaviour}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-zinc-900 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by customer, city, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-600 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
        </div>

        {/* Service Type Filter */}
        <div className="relative w-full sm:w-48">
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="w-full glass-input rounded-xl px-3 py-2 pr-9 text-xs text-zinc-400 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">All Service Types</option>
            {serviceTypes.map((t) => (
              <option key={t} value={t} className="bg-zinc-900 text-white">
                {t}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-2.5 h-4 w-4 text-zinc-600 pointer-events-none" />
        </div>

        {/* Overall Rating Filter */}
        <div className="relative w-full sm:w-40">
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="w-full glass-input rounded-xl px-3 py-2 pr-9 text-xs text-zinc-400 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r} className="bg-zinc-900 text-white">
                {r} Star{r > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-2.5 h-4 w-4 text-zinc-600 pointer-events-none" />
        </div>

        {/* Clear Filters */}
        {(search || filterService || filterRating) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterService("");
              setFilterRating("");
            }}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="text-xs text-zinc-550">Loading customer feedbacks...</span>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-zinc-900">
          <ShieldAlert className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <span className="block text-sm font-bold text-zinc-400">No Feedbacks Found</span>
          <span className="text-xs text-zinc-600 mt-1 block">
            {feedbacks.length === 0
              ? "No feedback submissions received yet."
              : "No feedback matches the search criteria."}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className="glass-panel p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition flex flex-col justify-between gap-4 group"
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-white group-hover:text-amber-400 transition">
                      {fb.customerName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      <span>{fb.locationCity}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-850 border border-zinc-800 text-zinc-400 font-bold shrink-0">
                    {fb.serviceType}
                  </span>
                </div>

                {/* Ratings */}
                <div className="flex items-center gap-2 mt-4">
                  <StarRating rating={fb.overallRating} size={3.5} />
                  <span className="text-xs font-bold text-zinc-400 bg-zinc-850 px-1.5 py-0.5 rounded">
                    {fb.overallRating}/5
                  </span>
                </div>

                {/* Date & solved flag */}
                <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-zinc-850">
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatPKTDateDisplay(fb.installationDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {fb.problemSolved === "Yes" ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Solved
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-400 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="h-3 w-3" /> Unsolved
                      </span>
                    )}
                  </div>
                </div>

                {/* Comments snippet */}
                {fb.commentsSuggestions && (
                  <p className="text-zinc-500 text-xs italic mt-3 line-clamp-2 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900/40">
                    "{fb.commentsSuggestions}"
                  </p>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedFeedback(fb)}
                className="w-full py-2 bg-zinc-850 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                View Full Feedback
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Details View Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative flex flex-col gap-6">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-zinc-850 pb-4">
              <div>
                <h2 className="text-lg font-black text-white">{selectedFeedback.customerName}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-550 mt-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{selectedFeedback.locationCity}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{selectedFeedback.contactNumber}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {/* Installation Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 border border-zinc-850/60 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Service Type</span>
                  <span className="text-sm font-semibold text-zinc-200 mt-1 block">
                    {selectedFeedback.serviceType}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Completion Date</span>
                  <span className="text-sm font-semibold text-zinc-200 mt-1 block">
                    {formatPKTDateDisplay(selectedFeedback.installationDate)}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-zinc-900 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Submitted At</span>
                    <span className="text-xs text-zinc-400 mt-0.5 block">
                      {formatPKTDateTimeDisplay(selectedFeedback.createdAt)}
                    </span>
                  </div>
                  <div>
                    {selectedFeedback.problemSolved === "Yes" ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Problem Solved
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 font-bold text-xs border border-red-500/20 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Unresolved Issue
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Evaluation Scores */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Feedback Scores</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Technical Behaviour", score: selectedFeedback.technicalBehaviour },
                    { label: "Technical Skills", score: selectedFeedback.technicalSkills },
                    { label: "Timelines & Punctuality", score: selectedFeedback.timelines },
                    { label: "Cleanliness & Org", score: selectedFeedback.cleanliness },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-850 text-sm"
                    >
                      <span className="text-zinc-400 text-xs">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={item.score} size={3.5} />
                        <span className="font-bold text-zinc-200 text-xs w-4 text-right">
                          {item.score}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="sm:col-span-2 flex justify-between items-center p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-sm">
                    <span className="font-bold text-amber-400 text-xs">Overall Performance Rating</span>
                    <div className="flex items-center gap-2">
                      <StarRating rating={selectedFeedback.overallRating} size={4} />
                      <span className="font-black text-amber-400 text-sm bg-amber-500/10 px-2 py-0.5 rounded">
                        {selectedFeedback.overallRating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div>
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">
                  Customer Comments / Suggestions
                </h3>
                <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-2xl text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedFeedback.commentsSuggestions ? (
                    `"${selectedFeedback.commentsSuggestions}"`
                  ) : (
                    <span className="text-zinc-600 italic">No comments or suggestions provided.</span>
                  )}
                </div>
              </div>

              {/* Uploads & Attachments */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Attachments & Uploads</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo attachment */}
                  <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-2xl flex flex-col gap-3 justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-300 block">Customer Photo</span>
                      <span className="text-[10px] text-zinc-550 mt-0.5 block">
                        Captured completed job proof or customer photo
                      </span>
                    </div>
                    {selectedFeedback.photoUrl ? (
                      <div className="flex flex-col gap-2">
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-850 bg-black flex items-center justify-center">
                          <img
                            src={selectedFeedback.photoUrl}
                            alt="Customer upload"
                            className="object-contain max-h-24 max-w-full"
                          />
                        </div>
                        <a
                          href={selectedFeedback.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-bold text-zinc-200 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Image
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600 italic py-4 block text-center border border-dashed border-zinc-800 rounded-lg">
                        No photo uploaded
                      </span>
                    )}
                  </div>

                  {/* Warranty Card attachment */}
                  <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-2xl flex flex-col gap-3 justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-300 block">Warranty Card</span>
                      <span className="text-[10px] text-zinc-550 mt-0.5 block">
                        Status:{" "}
                        <span
                          className={`font-bold ${
                            selectedFeedback.warrantyReceived === "Yes"
                              ? "text-emerald-400"
                              : selectedFeedback.warrantyReceived === "No"
                              ? "text-red-400"
                              : "text-zinc-500"
                          }`}
                        >
                          {selectedFeedback.warrantyReceived}
                        </span>
                      </span>
                    </div>
                    {selectedFeedback.warrantyCardUrl ? (
                      <div className="flex flex-col gap-2">
                        <div className="aspect-video rounded-lg border border-zinc-850 bg-black/40 flex flex-col items-center justify-center gap-1 p-2">
                          <FileText className="h-8 w-8 text-amber-500" />
                          <span className="text-[10px] text-zinc-500 text-center truncate max-w-full px-2">
                            {selectedFeedback.warrantyCardUrl.split("/").pop()}
                          </span>
                        </div>
                        <a
                          href={selectedFeedback.warrantyCardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-bold text-zinc-200 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Document
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600 italic py-4 block text-center border border-dashed border-zinc-800 rounded-lg">
                        No warranty card file
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
