"use client";

import React from "react";
import { X, Download, FileText, Printer } from "lucide-react";
import { getSafeFileUrl } from "@/lib/file-helper";

interface PdfViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

export default function PdfViewer({ fileUrl, fileName, onClose }: PdfViewerProps) {
  const safeUrl = getSafeFileUrl(fileUrl);

  const handlePrint = () => {
    const iframe = document.getElementById("pdf-iframe") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.open(safeUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/98 backdrop-blur-md flex flex-col text-xs text-zinc-300">
      {/* Top Header Controls */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-zinc-100 truncate max-w-xs md:max-w-lg" title={fileName}>
              {fileName}
            </h3>
            <p className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider">PDF Document Viewer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-bold border border-zinc-700 transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
          <a
            href={`${safeUrl}${safeUrl.includes("?") ? "&" : "?"}download=true`}
            download={fileName}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-bold border border-zinc-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 hover:bg-zinc-700 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Main Reader Content */}
      <div className="flex-1 overflow-hidden bg-zinc-950 p-4 flex justify-center items-center">
        <iframe
          id="pdf-iframe"
          src={safeUrl}
          title={fileName}
          className="w-full h-full max-w-6xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        />
      </div>
    </div>
  );
}
